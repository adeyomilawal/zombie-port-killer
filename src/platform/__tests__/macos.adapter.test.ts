/**
 * macOS Platform Adapter Tests
 */

import { MacOSAdapter } from '../macos.adapter';
import { execSync } from 'child_process';

jest.mock('child_process');

describe('MacOSAdapter', () => {
  let adapter: MacOSAdapter;
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  beforeEach(() => {
    adapter = new MacOSAdapter();
    jest.clearAllMocks();
    mockExecSync.mockReset();
    mockExecSync.mockClear();
  });

  describe('findProcessByPort', () => {
    it('should return null when port is not in use', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('No process found');
      });

      const result = await adapter.findProcessByPort(3000);
      expect(result).toBeNull();
    });

    it('should return null when lsof returns empty string', async () => {
      mockExecSync.mockReturnValue('');

      const result = await adapter.findProcessByPort(3000);
      expect(result).toBeNull();
    });

    it('should return null when PID is invalid', async () => {
      mockExecSync
        .mockReturnValueOnce('invalid')
        .mockReturnValueOnce('node\nnode server.js\nuser');

      const result = await adapter.findProcessByPort(3000);
      expect(result).toBeNull();
    });

    it('should return null when PID is zero or negative', async () => {
      mockExecSync
        .mockReturnValueOnce('0')
        .mockReturnValueOnce('node\nnode server.js\nuser');

      const result = await adapter.findProcessByPort(3000);
      expect(result).toBeNull();
    });

    it('should find process by port successfully', async () => {
      // Use sequential mocks in the exact order they're called
      mockExecSync
        .mockReturnValueOnce('12345') // lsof -ti :3000
        .mockReturnValueOnce('node node server.js user') // ps -p 12345 -o comm=,command=,user=
        .mockReturnValueOnce('00:05:30 Dec 13 10:30:45 2025') // ps -p 12345 -o etime=,lstart=
        .mockReturnValueOnce('1 launchd') // ps -p 12345 -o ppid=,ppidcmd=
        .mockReturnValueOnce('/Users/test') // ps -p 12345 -o cwd=
        .mockImplementationOnce(() => {
          throw new Error('grep: no match'); // launchctl list | grep
        });

      const result = await adapter.findProcessByPort(3000);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.pid).toBe(12345);
        expect(result.port).toBe(3000);
        expect(result.processName).toBe('node');
        expect(result.command).toBe('node server.js');
        expect(result.user).toBe('user');
      }
    });

    it('should handle permission denied errors', async () => {
      mockExecSync.mockImplementation(() => {
        const error = new Error('Permission denied');
        (error as any).code = 'EACCES';
        throw error;
      });

      const result = await adapter.findProcessByPort(3000);
      expect(result).toBeNull();
    });
  });

  describe('killProcess', () => {
    it('should kill process with SIGTERM by default', async () => {
      mockExecSync
        .mockReturnValueOnce(undefined as any) // kill -15 12345 succeeds
        .mockImplementationOnce(() => {
          throw new Error('No such process'); // ps -p 12345 fails (process is dead)
        });

      const result = await adapter.killProcess(12345, false);

      expect(mockExecSync).toHaveBeenCalledWith('kill -15 12345', {
        stdio: 'ignore',
      });
      expect(result).toBe(true);
    });

    it('should kill process with SIGKILL when force is true', async () => {
      mockExecSync
        .mockReturnValueOnce(undefined as any) // kill -9 12345 succeeds
        .mockImplementationOnce(() => {
          throw new Error('No such process'); // ps -p 12345 fails (process is dead)
        });

      const result = await adapter.killProcess(12345, true);

      expect(mockExecSync).toHaveBeenCalledWith('kill -9 12345', {
        stdio: 'ignore',
      });
      expect(result).toBe(true);
    });

    it('should return false when process is still alive', async () => {
      mockExecSync
        .mockReturnValueOnce(undefined as any) // kill -15 12345 succeeds
        .mockReturnValueOnce('12345 node'); // ps -p 12345 succeeds (process still alive)

      const result = await adapter.killProcess(12345, false);
      expect(result).toBe(false);
    });

    it('should return false when kill command fails', async () => {
      mockExecSync.mockImplementationOnce((command: string) => {
        if (command.includes('kill')) {
          throw new Error('No such process');
        }
        throw new Error(`Unexpected command: ${command}`);
      });

      const result = await adapter.killProcess(12345, false);
      expect(result).toBe(false);
    });
  });

  describe('getAllListeningPorts', () => {
    it('should return empty array when no ports are listening', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('No processes');
      });

      const result = await adapter.getAllListeningPorts();
      expect(result).toEqual([]);
    });

    it('should return empty array when lsof returns empty', async () => {
      mockExecSync.mockReturnValue('');

      const result = await adapter.getAllListeningPorts();
      expect(result).toEqual([]);
    });

    it('should parse lsof output correctly', async () => {
      const lsofOutput = `COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
node    12345 user   20u  IPv4 0x1234      0t0  TCP *:3000 (LISTEN)
python  12346 user   21u  IPv4 0x5678      0t0  TCP 127.0.0.1:8000 (LISTEN)`;

      let callCount = 0;
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('lsof -iTCP -sTCP:LISTEN')) {
          return lsofOutput;
        }
        if (command.includes('ps -p 12345 -o comm=,command=,user=')) {
          callCount++;
          return 'node node server.js user';
        }
        if (command.includes('ps -p 12345 -o etime=,lstart=')) {
          return '00:05:30 Dec 13 10:30:45 2025';
        }
        if (command.includes('ps -p 12345 -o ppid=,ppidcmd=')) {
          return '1 launchd';
        }
        if (command.includes('ps -p 12345 -o cwd=')) {
          return '/Users/test';
        }
        if (command.includes('ps -p 12346 -o comm=,command=,user=')) {
          return 'python python app.py user';
        }
        if (command.includes('ps -p 12346 -o etime=,lstart=')) {
          return '00:10:00 Dec 13 11:00:00 2025';
        }
        if (command.includes('ps -p 12346 -o ppid=,ppidcmd=')) {
          return '1 launchd';
        }
        if (command.includes('ps -p 12346 -o cwd=')) {
          return '/Users/test';
        }
        if (command.includes('launchctl list')) {
          throw new Error('grep: no match');
        }
        throw new Error(`Unexpected command: ${command}`);
      });

      const result = await adapter.getAllListeningPorts();

      expect(result.length).toBe(2);
      expect(result[0].port).toBe(3000);
      expect(result[1].port).toBe(8000);
    });

    it('should skip duplicate PID:port combinations', async () => {
      const lsofOutput = `COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
node    12345 user   20u  IPv4 0x1234      0t0  TCP *:3000 (LISTEN)
node    12345 user   21u  IPv6 0x5678      0t0  TCP *:3000 (LISTEN)`;

      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('lsof -iTCP -sTCP:LISTEN')) {
          return lsofOutput;
        }
        if (command.includes('ps -p 12345 -o comm=,command=,user=')) {
          return 'node node server.js user';
        }
        if (command.includes('ps -p 12345 -o etime=,lstart=')) {
          return '00:05:30 Dec 13 10:30:45 2025';
        }
        if (command.includes('ps -p 12345 -o ppid=,ppidcmd=')) {
          return '1 launchd';
        }
        if (command.includes('ps -p 12345 -o cwd=')) {
          return '/Users/test';
        }
        if (command.includes('launchctl list')) {
          throw new Error('grep: no match');
        }
        throw new Error(`Unexpected command: ${command}`);
      });

      const result = await adapter.getAllListeningPorts();

      expect(result.length).toBe(1);
    });

    it('should skip lines with invalid format', async () => {
      const lsofOutput = `COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
invalid line
node    12345 user   20u  IPv4 0x1234      0t0  TCP *:3000 (LISTEN)`;

      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('lsof -iTCP -sTCP:LISTEN')) {
          return lsofOutput;
        }
        if (command.includes('ps -p 12345 -o comm=,command=,user=')) {
          return 'node node server.js user';
        }
        if (command.includes('ps -p 12345 -o etime=,lstart=')) {
          return '00:05:30 Dec 13 10:30:45 2025';
        }
        if (command.includes('ps -p 12345 -o ppid=,ppidcmd=')) {
          return '1 launchd';
        }
        if (command.includes('ps -p 12345 -o cwd=')) {
          return '/Users/test';
        }
        if (command.includes('launchctl list')) {
          throw new Error('grep: no match');
        }
        throw new Error(`Unexpected command: ${command}`);
      });

      const result = await adapter.getAllListeningPorts();

      expect(result.length).toBe(1);
    });
  });

  describe('isCriticalProcess', () => {
    it('should identify systemd as critical', () => {
      expect(adapter.isCriticalProcess('systemd')).toBe(true);
    });

    it('should identify launchd as critical', () => {
      expect(adapter.isCriticalProcess('launchd')).toBe(true);
    });

    it('should identify init as critical', () => {
      expect(adapter.isCriticalProcess('init')).toBe(true);
    });

    it('should identify kernel as critical', () => {
      expect(adapter.isCriticalProcess('kernel')).toBe(true);
    });

    it('should identify WindowServer as critical', () => {
      expect(adapter.isCriticalProcess('WindowServer')).toBe(true);
    });

    it('should identify loginwindow as critical', () => {
      expect(adapter.isCriticalProcess('loginwindow')).toBe(true);
    });

    it('should not identify regular processes as critical', () => {
      expect(adapter.isCriticalProcess('node')).toBe(false);
      expect(adapter.isCriticalProcess('python')).toBe(false);
      expect(adapter.isCriticalProcess('java')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(adapter.isCriticalProcess('SYSTEMD')).toBe(true);
      expect(adapter.isCriticalProcess('LaunchD')).toBe(true);
    });
  });

  describe('getProcessContext', () => {
    it('should parse elapsed time in DD-HH:MM:SS format', async () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('lsof -ti :3000')) {
          return '12345';
        }
        if (command.includes('ps -p 12345 -o comm=,command=,user=')) {
          return 'node node server.js user';
        }
        if (command.includes('ps -p 12345 -o etime=,lstart=')) {
          return '2-10:30:45 Dec 13 10:30:45 2025';
        }
        if (command.includes('ps -p 12345 -o ppid=,ppidcmd=')) {
          return '1 launchd';
        }
        if (command.includes('ps -p 12345 -o cwd=')) {
          return '/Users/test';
        }
        if (command.includes('launchctl list')) {
          throw new Error('grep: no match');
        }
        throw new Error(`Unexpected command: ${command}`);
      });

      const result = await adapter.findProcessByPort(3000);
      expect(result).not.toBeNull();
      expect(result?.uptime).toBeGreaterThan(0);
    });

    it('should parse elapsed time in HH:MM:SS format', async () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('lsof -ti :3000')) {
          return '12345';
        }
        if (command.includes('ps -p 12345 -o comm=,command=,user=')) {
          return 'node node server.js user';
        }
        if (command.includes('ps -p 12345 -o etime=,lstart=')) {
          return '10:30:45 Dec 13 10:30:45 2025';
        }
        if (command.includes('ps -p 12345 -o ppid=,ppidcmd=')) {
          return '1 launchd';
        }
        if (command.includes('ps -p 12345 -o cwd=')) {
          return '/Users/test';
        }
        if (command.includes('launchctl list')) {
          throw new Error('grep: no match');
        }
        throw new Error(`Unexpected command: ${command}`);
      });

      const result = await adapter.findProcessByPort(3000);
      expect(result).not.toBeNull();
      expect(result?.uptime).toBeGreaterThan(0);
    });

    it('should parse elapsed time in MM:SS format', async () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('lsof -ti :3000')) {
          return '12345';
        }
        if (command.includes('ps -p 12345 -o comm=,command=,user=')) {
          return 'node node server.js user';
        }
        if (command.includes('ps -p 12345 -o etime=,lstart=')) {
          return '30:45 Dec 13 10:30:45 2025';
        }
        if (command.includes('ps -p 12345 -o ppid=,ppidcmd=')) {
          return '1 launchd';
        }
        if (command.includes('ps -p 12345 -o cwd=')) {
          return '/Users/test';
        }
        if (command.includes('launchctl list')) {
          throw new Error('grep: no match');
        }
        throw new Error(`Unexpected command: ${command}`);
      });

      const result = await adapter.findProcessByPort(3000);
      expect(result).not.toBeNull();
      expect(result?.uptime).toBeGreaterThan(0);
    });

    it('should handle missing parent process info gracefully', async () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('lsof -ti :3000')) {
          return '12345';
        }
        if (command.includes('ps -p 12345 -o comm=,command=,user=')) {
          return 'node node server.js user';
        }
        if (command.includes('ps -p 12345 -o etime=,lstart=')) {
          return '00:05:30 Dec 13 10:30:45 2025';
        }
        if (command.includes('ps -p 12345 -o ppid=,ppidcmd=')) {
          throw new Error('No parent');
        }
        if (command.includes('ps -p 12345 -o cwd=')) {
          return '/Users/test';
        }
        if (command.includes('launchctl list')) {
          throw new Error('grep: no match');
        }
        throw new Error(`Unexpected command: ${command}`);
      });

      const result = await adapter.findProcessByPort(3000);
      // Should still return process info even if parent info is missing
      expect(result).not.toBeNull();
      if (result) {
        expect(result.parentPid).toBeUndefined();
      }
    });

    it('should detect launchd service when present', async () => {
      // launchctl list | grep "^12345\\s" - must match PID at start of line
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('lsof -ti :3000')) {
          return '12345';
        }
        if (command.includes('ps -p 12345 -o comm=,command=,user=')) {
          return 'node node server.js user';
        }
        if (command.includes('ps -p 12345 -o etime=,lstart=')) {
          return '00:05:30 Dec 13 10:30:45 2025';
        }
        if (command.includes('ps -p 12345 -o ppid=,ppidcmd=')) {
          return '1 launchd';
        }
        if (command.includes('ps -p 12345 -o cwd=')) {
          return '/Users/test';
        }
        if (command.includes('launchctl list')) {
          return '12345 0 com.apple.airplayd';
        }
        throw new Error(`Unexpected command: ${command}`);
      });

      const result = await adapter.findProcessByPort(3000);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.serviceManager).toBe('launchd');
        expect(result.serviceName).toBe('com.apple.airplayd');
      }
    });
  });
});
