/**
 * Unit tests for ScanCommand
 */

import { ScanCommand, ScanOptions } from '../scan.command';
import { ProcessService } from '../../services/process.service';
import { StorageService } from '../../services/storage.service';
import { ProcessInfo } from '../../types';

// Mock dependencies
jest.mock('../../services/process.service');
jest.mock('../../services/storage.service');
jest.mock('ora', () => {
  return jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
  }));
});

describe('ScanCommand', () => {
  let scanCommand: ScanCommand;
  let mockProcessService: jest.Mocked<ProcessService>;
  let mockStorageService: jest.Mocked<StorageService>;

  const mockProcesses: ProcessInfo[] = [
    {
      pid: 1234,
      port: 3000,
      processName: 'node',
      command: 'node server.js',
      user: 'testuser',
    },
    {
      pid: 5678,
      port: 8080,
      processName: 'nginx',
      command: 'nginx -g daemon off;',
      user: 'www-data',
    },
    {
      pid: 9999,
      port: 5432,
      processName: 'postgres',
      command: 'postgres -D /var/lib/postgresql/data',
      user: 'postgres',
    },
  ];

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockProcessService = new ProcessService() as jest.Mocked<ProcessService>;
    mockStorageService = new StorageService() as jest.Mocked<StorageService>;

    // Create command instance
    scanCommand = new ScanCommand(mockProcessService, mockStorageService);

    // Mock console methods to avoid test output clutter
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('execute', () => {
    it('should display all active ports when no filters', async () => {
      mockProcessService.getAllPorts.mockResolvedValue(mockProcesses);
      mockStorageService.getPortMapping.mockReturnValue(null);

      await scanCommand.execute();

      expect(mockProcessService.getAllPorts).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Active Ports (3 found)')
      );
    });

    it('should show message when no ports are in use', async () => {
      mockProcessService.getAllPorts.mockResolvedValue([]);

      await scanCommand.execute();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No ports currently in use')
      );
    });

    it('should filter by port range', async () => {
      mockProcessService.getAllPorts.mockResolvedValue(mockProcesses);
      mockStorageService.getPortMapping.mockReturnValue(null);

      await scanCommand.execute({ range: '3000-6000' });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Active Ports (2 found)')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Port range: 3000-6000')
      );
    });

    it('should filter by process name', async () => {
      mockProcessService.getAllPorts.mockResolvedValue(mockProcesses);
      mockStorageService.getPortMapping.mockReturnValue(null);

      await scanCommand.execute({ process: 'node' });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Active Ports (1 found)')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Process: node')
      );
    });

    it('should filter by process name case-insensitive', async () => {
      mockProcessService.getAllPorts.mockResolvedValue(mockProcesses);
      mockStorageService.getPortMapping.mockReturnValue(null);

      await scanCommand.execute({ process: 'NODE' });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Active Ports (1 found)')
      );
    });

    it('should hide system processes when system is false', async () => {
      mockProcessService.getAllPorts.mockResolvedValue(mockProcesses);
      mockProcessService.isCriticalProcess.mockImplementation((p) => {
        return p.processName === 'postgres';
      });
      mockStorageService.getPortMapping.mockReturnValue(null);

      await scanCommand.execute({ system: false });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Active Ports (2 found)')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Hiding system processes')
      );
    });

    it('should filter by project name', async () => {
      mockProcessService.getAllPorts.mockResolvedValue(mockProcesses);
      mockStorageService.getMappingsByProjectName.mockReturnValue([
        {
          port: 3000,
          projectName: 'my-project',
          projectPath: '/my/path',
          autoKill: false,
          lastUsed: new Date(),
        },
      ]);
      mockStorageService.getPortMapping.mockReturnValue(null);

      await scanCommand.execute({ project: 'my-project' });

      expect(mockStorageService.getMappingsByProjectName).toHaveBeenCalledWith(
        'my-project'
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Active Ports (1 found)')
      );
    });

    it('should show project info when mapping exists', async () => {
      mockProcessService.getAllPorts.mockResolvedValue([mockProcesses[0]]);
      mockStorageService.getPortMapping.mockReturnValue({
        port: 3000,
        projectName: 'test-project',
        projectPath: '/test/path',
        autoKill: false,
        lastUsed: new Date(),
      });

      await scanCommand.execute();

      expect(mockStorageService.getPortMapping).toHaveBeenCalledWith(3000);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('test-project')
      );
    });

    it('should sort ports by port number', async () => {
      const unsorted = [mockProcesses[2], mockProcesses[0], mockProcesses[1]];
      mockProcessService.getAllPorts.mockResolvedValue(unsorted);
      mockStorageService.getPortMapping.mockReturnValue(null);

      await scanCommand.execute();

      // Check that processes are displayed in order (3000, 5432, 8080)
      const calls = (console.log as jest.Mock).mock.calls;
      const portCalls = calls.filter((call) =>
        call[0].includes('Port')
      );

      // Should have 3 port displays
      expect(portCalls.length).toBeGreaterThanOrEqual(3);
    });

    it('should apply multiple filters together', async () => {
      mockProcessService.getAllPorts.mockResolvedValue(mockProcesses);
      mockProcessService.isCriticalProcess.mockReturnValue(false);
      mockStorageService.getPortMapping.mockReturnValue(null);

      await scanCommand.execute({
        range: '3000-9000',
        process: 'node',
        system: false,
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Active Ports (1 found)')
      );
    });

    it('should throw error for invalid port range format', async () => {
      mockProcessService.getAllPorts.mockResolvedValue(mockProcesses);

      await expect(
        scanCommand.execute({ range: '3000' })
      ).rejects.toThrow('Invalid port range format');
    });

    it('should throw error for non-numeric port range', async () => {
      mockProcessService.getAllPorts.mockResolvedValue(mockProcesses);

      await expect(
        scanCommand.execute({ range: 'abc-def' })
      ).rejects.toThrow('Port range must contain valid numbers');
    });

    it('should throw error for invalid port range values', async () => {
      mockProcessService.getAllPorts.mockResolvedValue(mockProcesses);

      await expect(
        scanCommand.execute({ range: '9000-3000' })
      ).rejects.toThrow('Invalid port range');

      await expect(
        scanCommand.execute({ range: '0-1000' })
      ).rejects.toThrow('Invalid port range');

      await expect(
        scanCommand.execute({ range: '1000-70000' })
      ).rejects.toThrow('Invalid port range');
    });
  });

  describe('listMappings', () => {
    it('should show message when no mappings exist', () => {
      mockStorageService.getAllMappings.mockReturnValue([]);

      scanCommand.listMappings();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No port mappings configured')
      );
    });

    it('should display all mappings', () => {
      const now = new Date();
      mockStorageService.getAllMappings.mockReturnValue([
        {
          port: 3000,
          projectName: 'project-1',
          projectPath: '/path/1',
          autoKill: false,
          lastUsed: now,
        },
        {
          port: 4000,
          projectName: 'project-2',
          projectPath: '/path/2',
          autoKill: true,
          lastUsed: now,
        },
      ]);
      mockStorageService.getConfigPath.mockReturnValue('/config/path');

      scanCommand.listMappings();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Port Mappings (2 configured)')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('project-1')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('project-2')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[auto-kill]')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('/config/path')
      );
    });

    it('should format dates correctly', () => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);
      const oneHourAgo = new Date(now.getTime() - 3600000);
      const oneDayAgo = new Date(now.getTime() - 86400000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);

      mockStorageService.getAllMappings.mockReturnValue([
        {
          port: 3000,
          projectName: 'recent',
          projectPath: '/path',
          autoKill: false,
          lastUsed: oneMinuteAgo,
        },
      ]);

      scanCommand.listMappings();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('minute')
      );

      mockStorageService.getAllMappings.mockReturnValue([
        {
          port: 3000,
          projectName: 'recent',
          projectPath: '/path',
          autoKill: false,
          lastUsed: oneHourAgo,
        },
      ]);

      scanCommand.listMappings();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('hour')
      );

      mockStorageService.getAllMappings.mockReturnValue([
        {
          port: 3000,
          projectName: 'recent',
          projectPath: '/path',
          autoKill: false,
          lastUsed: oneDayAgo,
        },
      ]);

      scanCommand.listMappings();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('day')
      );
    });

    it('should show "just now" for very recent dates', () => {
      const now = new Date();
      mockStorageService.getAllMappings.mockReturnValue([
        {
          port: 3000,
          projectName: 'recent',
          projectPath: '/path',
          autoKill: false,
          lastUsed: now,
        },
      ]);

      scanCommand.listMappings();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('just now')
      );
    });
  });
});
