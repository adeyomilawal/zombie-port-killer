/**
 * Linux Platform Adapter Tests
 */

import { LinuxAdapter } from '../linux.adapter';
import { execSync } from 'child_process';

jest.mock('child_process');

describe('LinuxAdapter', () => {
  let adapter: LinuxAdapter;
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  beforeEach(() => {
    adapter = new LinuxAdapter();
    jest.clearAllMocks();
  });

  describe('findProcessByPort', () => {
    it('should use ss command when available', async () => {
      mockExecSync
        .mockReturnValueOnce('ss found') // hasSSCommand check
        .mockReturnValueOnce('LISTEN 0 128 *:3000 *:* users:(("node",pid=12345,fd=20))')
        .mockReturnValueOnce('node\nnode server.js\nuser')
        .mockReturnValueOnce('00:05:30\nDec 13 10:30:45 2025')
        .mockReturnValueOnce('1\nsystemd')
        .mockReturnValueOnce('/home/user')
        .mockReturnValueOnce('1:name=systemd:/system.slice/node.service')
        .mockReturnValueOnce('● node.service');

      const result = await adapter.findProcessByPort(3000);

      expect(mockExecSync).toHaveBeenCalledWith('which ss', { stdio: 'ignore' });
      expect(mockExecSync).toHaveBeenCalledWith(
        "ss -lptn 'sport = :3000'",
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      expect(result).not.toBeNull();
    });

    it('should fallback to netstat when ss is not available', async () => {
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('ss not found');
        })
        .mockReturnValueOnce('tcp  0  0 0.0.0.0:3000  0.0.0.0:*  LISTEN  12345/node')
        .mockReturnValueOnce('node\nnode server.js\nuser')
        .mockReturnValueOnce('00:05:30\nDec 13 10:30:45 2025')
        .mockReturnValueOnce('1\nsystemd')
        .mockReturnValueOnce('/home/user')
        .mockReturnValueOnce('1:name=systemd:/system.slice/node.service')
        .mockReturnValueOnce('● node.service');

      const result = await adapter.findProcessByPort(3000);

      expect(mockExecSync).toHaveBeenCalledWith(
        'netstat -ltnp 2>/dev/null | grep :3000',
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      expect(result).not.toBeNull();
    });

    it('should return null when port is not in use', async () => {
      mockExecSync
        .mockReturnValueOnce('ss found')
        .mockImplementationOnce(() => {
          throw new Error('No process found');
        });

      const result = await adapter.findProcessByPort(3000);
      expect(result).toBeNull();
    });

    it('should return null when PID is invalid in ss output', async () => {
      mockExecSync
        .mockReturnValueOnce('ss found')
        .mockReturnValueOnce('LISTEN 0 128 *:3000 *:* users:(("node",pid=invalid,fd=20))');

      const result = await adapter.findProcessByPort(3000);
      expect(result).toBeNull();
    });

    it('should parse netstat output correctly', async () => {
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('ss not found');
        })
        .mockReturnValueOnce('tcp  0  0 0.0.0.0:3000  0.0.0.0:*  LISTEN  12345/node')
        .mockReturnValueOnce('node\nnode server.js\nuser')
        .mockReturnValueOnce('00:05:30\nDec 13 10:30:45 2025')
        .mockReturnValueOnce('1\nsystemd')
        .mockReturnValueOnce('/home/user')
        .mockReturnValueOnce('1:name=systemd:/system.slice/node.service')
        .mockReturnValueOnce('● node.service');

      const result = await adapter.findProcessByPort(3000);

      expect(result).not.toBeNull();
      expect(result?.pid).toBe(12345);
      expect(result?.port).toBe(3000);
    });
  });

  describe('killProcess', () => {
    it('should kill process with SIGTERM by default', async () => {
      mockExecSync
        .mockReturnValueOnce(undefined as any)
        .mockImplementationOnce(() => {
          throw new Error('No such process');
        });

      const result = await adapter.killProcess(12345, false);

      expect(mockExecSync).toHaveBeenCalledWith('kill -15 12345', {
        stdio: 'ignore',
      });
      expect(result).toBe(true);
    });

    it('should kill process with SIGKILL when force is true', async () => {
      mockExecSync
        .mockReturnValueOnce(undefined as any)
        .mockImplementationOnce(() => {
          throw new Error('No such process');
        });

      const result = await adapter.killProcess(12345, true);

      expect(mockExecSync).toHaveBeenCalledWith('kill -9 12345', {
        stdio: 'ignore',
      });
      expect(result).toBe(true);
    });

    it('should return false when process is still alive', async () => {
      mockExecSync
        .mockReturnValueOnce(undefined as any)
        .mockReturnValueOnce('12345');

      const result = await adapter.killProcess(12345, false);
      expect(result).toBe(false);
    });
  });

  describe('getAllListeningPorts', () => {
    it('should use ss command when available', async () => {
      const ssOutput = `State   Recv-Q  Send-Q  Local Address:Port  Peer Address:Port
LISTEN 0       128     *:3000              *:*    users:(("node",pid=12345,fd=20))
LISTEN 0       128     *:8000              *:*    users:(("python",pid=12346,fd=21))`;

      mockExecSync
        .mockReturnValueOnce('ss found')
        .mockReturnValueOnce(ssOutput)
        .mockReturnValueOnce('node\nnode server.js\nuser')
        .mockReturnValueOnce('00:05:30\nDec 13 10:30:45 2025')
        .mockReturnValueOnce('1\nsystemd')
        .mockReturnValueOnce('/home/user')
        .mockReturnValueOnce('1:name=systemd:/system.slice/node.service')
        .mockReturnValueOnce('● node.service')
        .mockReturnValueOnce('python\npython app.py\nuser')
        .mockReturnValueOnce('00:10:00\nDec 13 11:00:00 2025')
        .mockReturnValueOnce('1\nsystemd')
        .mockReturnValueOnce('/home/user')
        .mockReturnValueOnce('1:name=systemd:/system.slice/python.service')
        .mockReturnValueOnce('● python.service');

      const result = await adapter.getAllListeningPorts();

      expect(result.length).toBe(2);
      expect(result[0].port).toBe(3000);
      expect(result[1].port).toBe(8000);
    });

    it('should use netstat when ss is not available', async () => {
      const netstatOutput = `Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name
tcp        0      0 0.0.0.0:3000            0.0.0.0:*               LISTEN      12345/node
tcp        0      0 0.0.0.0:8000            0.0.0.0:*               LISTEN      12346/python`;

      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('ss not found');
        })
        .mockReturnValueOnce(netstatOutput)
        .mockReturnValueOnce('node\nnode server.js\nuser')
        .mockReturnValueOnce('00:05:30\nDec 13 10:30:45 2025')
        .mockReturnValueOnce('1\nsystemd')
        .mockReturnValueOnce('/home/user')
        .mockReturnValueOnce('1:name=systemd:/system.slice/node.service')
        .mockReturnValueOnce('● node.service')
        .mockReturnValueOnce('python\npython app.py\nuser')
        .mockReturnValueOnce('00:10:00\nDec 13 11:00:00 2025')
        .mockReturnValueOnce('1\nsystemd')
        .mockReturnValueOnce('/home/user')
        .mockReturnValueOnce('1:name=systemd:/system.slice/python.service')
        .mockReturnValueOnce('● python.service');

      const result = await adapter.getAllListeningPorts();

      expect(result.length).toBe(2);
    });

    it('should return empty array when no ports are listening', async () => {
      mockExecSync
        .mockReturnValueOnce('ss found')
        .mockImplementationOnce(() => {
          throw new Error('No processes');
        });

      const result = await adapter.getAllListeningPorts();
      expect(result).toEqual([]);
    });

    it('should skip duplicate PID:port combinations', async () => {
      const ssOutput = `State   Recv-Q  Send-Q  Local Address:Port  Peer Address:Port
LISTEN 0       128     *:3000              *:*    users:(("node",pid=12345,fd=20))
LISTEN 0       128     *:3000              *:*    users:(("node",pid=12345,fd=21))`;

      mockExecSync
        .mockReturnValueOnce('ss found')
        .mockReturnValueOnce(ssOutput)
        .mockReturnValueOnce('node\nnode server.js\nuser')
        .mockReturnValueOnce('00:05:30\nDec 13 10:30:45 2025')
        .mockReturnValueOnce('1\nsystemd')
        .mockReturnValueOnce('/home/user')
        .mockReturnValueOnce('1:name=systemd:/system.slice/node.service')
        .mockReturnValueOnce('● node.service');

      const result = await adapter.getAllListeningPorts();

      expect(result.length).toBe(1);
    });
  });

  describe('isCriticalProcess', () => {
    it('should identify systemd as critical', () => {
      expect(adapter.isCriticalProcess('systemd')).toBe(true);
    });

    it('should identify init as critical', () => {
      expect(adapter.isCriticalProcess('init')).toBe(true);
    });

    it('should identify kernel as critical', () => {
      expect(adapter.isCriticalProcess('kernel')).toBe(true);
    });

    it('should identify dbus as critical', () => {
      expect(adapter.isCriticalProcess('dbus')).toBe(true);
    });

    it('should identify NetworkManager as critical', () => {
      expect(adapter.isCriticalProcess('NetworkManager')).toBe(true);
    });

    it('should identify sshd as critical', () => {
      expect(adapter.isCriticalProcess('sshd')).toBe(true);
    });

    it('should not identify regular processes as critical', () => {
      expect(adapter.isCriticalProcess('node')).toBe(false);
      expect(adapter.isCriticalProcess('python')).toBe(false);
      expect(adapter.isCriticalProcess('java')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(adapter.isCriticalProcess('SYSTEMD')).toBe(true);
      expect(adapter.isCriticalProcess('Init')).toBe(true);
    });
  });

  describe('getProcessContext', () => {
    it('should detect systemd service from cgroup', async () => {
      mockExecSync
        .mockReturnValueOnce('ss found')
        .mockReturnValueOnce('LISTEN 0 128 *:3000 *:* users:(("node",pid=12345,fd=20))')
        .mockReturnValueOnce('node\nnode server.js\nuser')
        .mockReturnValueOnce('00:05:30\nDec 13 10:30:45 2025')
        .mockReturnValueOnce('1\nsystemd')
        .mockReturnValueOnce('/home/user')
        .mockReturnValueOnce('1:name=systemd:/system.slice/node.service')
        .mockReturnValueOnce('● node.service');

      const result = await adapter.findProcessByPort(3000);

      expect(result?.serviceManager).toBe('systemd');
      expect(result?.serviceName).toBe('node.service');
    });

    it('should handle missing cgroup gracefully', async () => {
      mockExecSync
        .mockReturnValueOnce('ss found')
        .mockReturnValueOnce('LISTEN 0 128 *:3000 *:* users:(("node",pid=12345,fd=20))')
        .mockReturnValueOnce('node\nnode server.js\nuser')
        .mockReturnValueOnce('00:05:30\nDec 13 10:30:45 2025')
        .mockReturnValueOnce('1\nsystemd')
        .mockReturnValueOnce('/home/user')
        .mockImplementationOnce(() => {
          throw new Error('No cgroup');
        });

      const result = await adapter.findProcessByPort(3000);

      expect(result).not.toBeNull();
      expect(result?.serviceManager).toBeUndefined();
    });

    it('should parse elapsed time correctly', async () => {
      mockExecSync
        .mockReturnValueOnce('ss found')
        .mockReturnValueOnce('LISTEN 0 128 *:3000 *:* users:(("node",pid=12345,fd=20))')
        .mockReturnValueOnce('node\nnode server.js\nuser')
        .mockReturnValueOnce('2-10:30:45\nDec 13 10:30:45 2025')
        .mockReturnValueOnce('1\nsystemd')
        .mockReturnValueOnce('/home/user')
        .mockReturnValueOnce('1:name=systemd:/system.slice/node.service')
        .mockReturnValueOnce('● node.service');

      const result = await adapter.findProcessByPort(3000);

      expect(result?.uptime).toBeGreaterThan(0);
    });
  });
});
