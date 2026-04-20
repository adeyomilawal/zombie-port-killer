/**
 * Unit tests for ScanCommand
 */

import { ScanCommand, ScanOptions } from '../scan.command';
import { ProcessService } from '../../services/process.service';
import { StorageService } from '../../services/storage.service';
import { ProcessInfo } from '../../types';
import {
  SCAN_JSON_SCHEMA_VERSION,
  isValidScanJsonV1,
  scanJsonV1ValidationErrors,
} from '../../scan-json-schema';

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

    it('should not emit v1 JSON on console when json option is omitted', async () => {
      mockProcessService.getAllPorts.mockResolvedValue(mockProcesses);
      mockStorageService.getPortMapping.mockReturnValue(null);

      await scanCommand.execute({});

      const rawJsonLines = (console.log as jest.Mock).mock.calls.filter(
        (c) =>
          typeof c[0] === 'string' &&
          c[0].trimStart().startsWith('{"schemaVersion"')
      );
      expect(rawJsonLines.length).toBe(0);
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

    it('should display verbose context when verbose option is true', async () => {
      const processWithContext: ProcessInfo = {
        pid: 1234,
        port: 3000,
        processName: 'node',
        command: 'node server.js',
        user: 'testuser',
        uptime: 2 * 60 * 60 * 1000 + 15 * 60 * 1000, // 2h 15m
        startTime: new Date('2025-12-13T10:30:00'),
        parentPid: 5678,
        parentProcessName: 'node',
        workingDirectory: '/Users/test/my-app',
        serviceManager: null,
      };

      mockProcessService.getAllPorts.mockResolvedValue([processWithContext]);
      mockStorageService.getPortMapping.mockReturnValue(null);

      await scanCommand.execute({ verbose: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Running for:')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Started by:')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Working dir:')
      );
    });

    it('should not display verbose context when verbose option is false', async () => {
      const processWithContext: ProcessInfo = {
        pid: 1234,
        port: 3000,
        processName: 'node',
        command: 'node server.js',
        user: 'testuser',
        uptime: 2 * 60 * 60 * 1000,
        parentPid: 5678,
        workingDirectory: '/Users/test/my-app',
      };

      mockProcessService.getAllPorts.mockResolvedValue([processWithContext]);
      mockStorageService.getPortMapping.mockReturnValue(null);

      await scanCommand.execute({ verbose: false });

      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Running for:')
      );
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Working dir:')
      );
    });

    it('should display service manager information when available', async () => {
      const processWithService: ProcessInfo = {
        pid: 1234,
        port: 3000,
        processName: 'nginx',
        command: 'nginx -g daemon off;',
        user: 'www-data',
        serviceManager: 'systemd',
        serviceName: 'nginx.service',
      };

      mockProcessService.getAllPorts.mockResolvedValue([processWithService]);
      mockStorageService.getPortMapping.mockReturnValue(null);

      await scanCommand.execute({ verbose: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Service:')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('nginx.service')
      );
    });

    it('should format uptime correctly for different durations', async () => {
      const processWithUptime: ProcessInfo = {
        pid: 1234,
        port: 3000,
        processName: 'node',
        command: 'node server.js',
        user: 'testuser',
        uptime: 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000 + 30 * 60 * 1000, // 2d 5h 30m
      };

      mockProcessService.getAllPorts.mockResolvedValue([processWithUptime]);
      mockStorageService.getPortMapping.mockReturnValue(null);

      await scanCommand.execute({ verbose: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Running for:')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('2d')
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

    it('should print versioned JSON when json option is true', async () => {
      mockProcessService.getAllPorts.mockResolvedValue([mockProcesses[0]]);
      mockProcessService.isCriticalProcess.mockReturnValue(false);
      mockStorageService.getPortMapping.mockReturnValue(null);

      await scanCommand.execute({ json: true });

      expect(mockProcessService.getAllPorts).toHaveBeenCalled();
      const jsonCall = (console.log as jest.Mock).mock.calls.find(
        (c) => typeof c[0] === 'string' && c[0].startsWith('{')
      );
      expect(jsonCall).toBeDefined();
      const doc = JSON.parse(jsonCall![0] as string);
      expect(scanJsonV1ValidationErrors(doc)).toEqual([]);
      expect(isValidScanJsonV1(doc)).toBe(true);
      expect(doc.schemaVersion).toBe(SCAN_JSON_SCHEMA_VERSION);
      expect(doc.meta.zkillVersion).toMatch(/\d+\.\d+\.\d+/);
      expect(doc.meta.platform).toBeTruthy();
      expect(doc.count).toBe(1);
      expect(doc.processes).toHaveLength(1);
      expect(doc.processes[0].port).toBe(3000);
      expect(doc.processes[0].context).toBeNull();
      expect(doc.filters.hideSystemProcesses).toBe(false);
    });

    it('should emit JSON with count zero when no ports match', async () => {
      mockProcessService.getAllPorts.mockResolvedValue([]);

      await scanCommand.execute({ json: true });

      const jsonCall = (console.log as jest.Mock).mock.calls.find(
        (c) => typeof c[0] === 'string' && c[0].startsWith('{')
      );
      expect(jsonCall).toBeDefined();
      const doc = JSON.parse(jsonCall![0] as string);
      expect(scanJsonV1ValidationErrors(doc)).toEqual([]);
      expect(isValidScanJsonV1(doc)).toBe(true);
      expect(doc.count).toBe(0);
      expect(doc.processes).toEqual([]);
    });

    it('should not use human headings when json is true', async () => {
      mockProcessService.getAllPorts.mockResolvedValue(mockProcesses);
      mockStorageService.getPortMapping.mockReturnValue(null);

      await scanCommand.execute({ json: true });

      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Active Ports')
      );
    });

    it('should include context in JSON when verbose and json are true', async () => {
      const processWithContext: ProcessInfo = {
        pid: 1234,
        port: 3000,
        processName: 'node',
        command: 'node server.js',
        user: 'testuser',
        uptime: 1000,
        startTime: new Date('2026-03-01T00:00:00.000Z'),
        parentPid: 1,
        parentProcessName: 'launchd',
        workingDirectory: '/tmp',
        serviceManager: null,
      };
      mockProcessService.getAllPorts.mockResolvedValue([processWithContext]);
      mockProcessService.isCriticalProcess.mockReturnValue(false);
      mockStorageService.getPortMapping.mockReturnValue(null);

      await scanCommand.execute({ json: true, verbose: true });

      const jsonCall = (console.log as jest.Mock).mock.calls.find(
        (c) => typeof c[0] === 'string' && c[0].startsWith('{')
      );
      const doc = JSON.parse(jsonCall![0] as string);
      expect(scanJsonV1ValidationErrors(doc)).toEqual([]);
      expect(isValidScanJsonV1(doc)).toBe(true);
      expect(doc.processes[0].context).not.toBeNull();
      expect(doc.processes[0].context.uptimeMs).toBe(1000);
      expect(doc.processes[0].context.startTime).toBe(
        '2026-03-01T00:00:00.000Z'
      );
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
