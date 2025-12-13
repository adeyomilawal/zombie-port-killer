/**
 * Unit tests for AutoCommand
 */

import { AutoCommand } from '../auto.command';
import { ProcessService } from '../../services/process.service';
import { StorageService } from '../../services/storage.service';
import { ProjectService } from '../../services/project.service';
import { ProcessInfo } from '../../types';
import inquirer from 'inquirer';

// Mock dependencies
jest.mock('../../services/process.service');
jest.mock('../../services/storage.service');
jest.mock('../../services/project.service');
jest.mock('inquirer');

describe('AutoCommand', () => {
  let autoCommand: AutoCommand;
  let mockProcessService: jest.Mocked<ProcessService>;
  let mockStorageService: jest.Mocked<StorageService>;
  let mockProjectService: jest.Mocked<ProjectService>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockProcessService = new ProcessService() as jest.Mocked<ProcessService>;
    mockStorageService = new StorageService() as jest.Mocked<StorageService>;
    mockProjectService = new ProjectService(
      mockStorageService
    ) as jest.Mocked<ProjectService>;

    // Create command instance
    autoCommand = new AutoCommand(
      mockProcessService,
      mockStorageService,
      mockProjectService
    );

    // Mock console methods to avoid test output clutter
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('enable', () => {
    it('should enable auto-kill and show confirmation', async () => {
      await autoCommand.enable();

      expect(mockStorageService.setAutoKill).toHaveBeenCalledWith(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Auto-kill enabled')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Shell Integration')
      );
    });
  });

  describe('disable', () => {
    it('should disable auto-kill and show confirmation', async () => {
      await autoCommand.disable();

      expect(mockStorageService.setAutoKill).toHaveBeenCalledWith(false);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Auto-kill disabled')
      );
    });
  });

  describe('status', () => {
    it('should show enabled status when auto-kill is on', () => {
      mockStorageService.isAutoKillEnabled.mockReturnValue(true);
      mockStorageService.getAllMappings.mockReturnValue([]);

      autoCommand.status();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Enabled')
      );
    });

    it('should show disabled status when auto-kill is off', () => {
      mockStorageService.isAutoKillEnabled.mockReturnValue(false);
      mockStorageService.getAllMappings.mockReturnValue([]);

      autoCommand.status();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Disabled')
      );
    });

    it('should show ports with auto-kill enabled', () => {
      mockStorageService.isAutoKillEnabled.mockReturnValue(true);
      mockStorageService.getAllMappings.mockReturnValue([
        {
          port: 3000,
          projectName: 'project-1',
          projectPath: '/path/1',
          autoKill: true,
        },
        {
          port: 4000,
          projectName: 'project-2',
          projectPath: '/path/2',
          autoKill: true,
        },
        {
          port: 5000,
          projectName: 'project-3',
          projectPath: '/path/3',
          autoKill: false,
        },
      ]);

      autoCommand.status();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Ports with auto-kill enabled (2)')
      );
    });
  });

  describe('checkAndKill', () => {
    it('should exit silently when auto-kill is disabled', async () => {
      mockStorageService.isAutoKillEnabled.mockReturnValue(false);

      await autoCommand.checkAndKill();

      expect(mockStorageService.getAllMappings).not.toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should exit when no ports from other projects', async () => {
      mockStorageService.isAutoKillEnabled.mockReturnValue(true);
      mockProjectService.getCurrentProjectPath.mockReturnValue('/current/path');
      mockStorageService.getAllMappings.mockReturnValue([
        {
          port: 3000,
          projectName: 'current-project',
          projectPath: '/current/path',
          autoKill: true,
        },
      ]);

      await autoCommand.checkAndKill();

      expect(mockProcessService.findByPort).not.toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should exit when other project ports are not in use', async () => {
      mockStorageService.isAutoKillEnabled.mockReturnValue(true);
      mockProjectService.getCurrentProjectPath.mockReturnValue('/current/path');
      mockStorageService.getAllMappings.mockReturnValue([
        {
          port: 3000,
          projectName: 'other-project',
          projectPath: '/other/path',
          autoKill: true,
        },
      ]);
      mockProcessService.findByPort.mockResolvedValue(null);

      await autoCommand.checkAndKill();

      expect(mockProcessService.findByPort).toHaveBeenCalledWith(3000);
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should prompt to kill processes from other projects', async () => {
      const mockProcess: ProcessInfo = {
        pid: 1234,
        port: 3000,
        processName: 'node',
        command: 'node server.js',
      };

      mockStorageService.isAutoKillEnabled.mockReturnValue(true);
      mockProjectService.getCurrentProjectName.mockReturnValue(
        'current-project'
      );
      mockProjectService.getCurrentProjectPath.mockReturnValue('/current/path');
      mockStorageService.getAllMappings.mockReturnValue([
        {
          port: 3000,
          projectName: 'other-project',
          projectPath: '/other/path',
          autoKill: true,
        },
      ]);
      mockProcessService.findByPort.mockResolvedValue(mockProcess);
      (inquirer.prompt as jest.Mock).mockResolvedValue({ confirmed: false });

      await autoCommand.checkAndKill();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Project switch detected')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Found 1 port')
      );
      expect(inquirer.prompt).toHaveBeenCalled();
    });

    it('should skip auto-kill when user declines', async () => {
      const mockProcess: ProcessInfo = {
        pid: 1234,
        port: 3000,
        processName: 'node',
        command: 'node server.js',
      };

      mockStorageService.isAutoKillEnabled.mockReturnValue(true);
      mockProjectService.getCurrentProjectPath.mockReturnValue('/current/path');
      mockStorageService.getAllMappings.mockReturnValue([
        {
          port: 3000,
          projectName: 'other-project',
          projectPath: '/other/path',
          autoKill: true,
        },
      ]);
      mockProcessService.findByPort.mockResolvedValue(mockProcess);
      (inquirer.prompt as jest.Mock).mockResolvedValue({ confirmed: false });

      await autoCommand.checkAndKill();

      expect(mockProcessService.killProcess).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Skipped')
      );
    });

    it('should kill processes when user confirms', async () => {
      const mockProcess: ProcessInfo = {
        pid: 1234,
        port: 3000,
        processName: 'node',
        command: 'node server.js',
      };

      mockStorageService.isAutoKillEnabled.mockReturnValue(true);
      mockProjectService.getCurrentProjectPath.mockReturnValue('/current/path');
      mockStorageService.getAllMappings.mockReturnValue([
        {
          port: 3000,
          projectName: 'other-project',
          projectPath: '/other/path',
          autoKill: true,
        },
      ]);
      mockProcessService.findByPort.mockResolvedValue(mockProcess);
      (inquirer.prompt as jest.Mock).mockResolvedValue({ confirmed: true });
      mockProcessService.killProcess.mockResolvedValue(true);

      await autoCommand.checkAndKill();

      expect(mockProcessService.killProcess).toHaveBeenCalledWith(1234, false);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Killed 1 process')
      );
    });

    it('should handle multiple ports from other projects', async () => {
      const mockProcess1: ProcessInfo = {
        pid: 1234,
        port: 3000,
        processName: 'node',
        command: 'node server.js',
      };
      const mockProcess2: ProcessInfo = {
        pid: 5678,
        port: 4000,
        processName: 'python',
        command: 'python app.py',
      };

      mockStorageService.isAutoKillEnabled.mockReturnValue(true);
      mockProjectService.getCurrentProjectPath.mockReturnValue('/current/path');
      mockStorageService.getAllMappings.mockReturnValue([
        {
          port: 3000,
          projectName: 'project-1',
          projectPath: '/path/1',
          autoKill: true,
        },
        {
          port: 4000,
          projectName: 'project-2',
          projectPath: '/path/2',
          autoKill: true,
        },
      ]);
      mockProcessService.findByPort
        .mockResolvedValueOnce(mockProcess1)
        .mockResolvedValueOnce(mockProcess2);
      (inquirer.prompt as jest.Mock).mockResolvedValue({ confirmed: true });
      mockProcessService.killProcess.mockResolvedValue(true);

      await autoCommand.checkAndKill();

      expect(mockProcessService.killProcess).toHaveBeenCalledTimes(2);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Killed 2 process')
      );
    });
  });

  describe('togglePort', () => {
    it('should show error when no mapping exists', async () => {
      mockStorageService.getPortMapping.mockReturnValue(null);

      await autoCommand.togglePort(3000);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No mapping found')
      );
      expect(mockStorageService.addPortMapping).not.toHaveBeenCalled();
    });

    it('should enable auto-kill when currently disabled', async () => {
      mockStorageService.getPortMapping.mockReturnValue({
        port: 3000,
        projectName: 'test-project',
        projectPath: '/test/path',
        autoKill: false,
      });

      await autoCommand.togglePort(3000);

      expect(mockStorageService.addPortMapping).toHaveBeenCalledWith({
        port: 3000,
        projectName: 'test-project',
        projectPath: '/test/path',
        autoKill: true,
      });
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Auto-kill enabled for port 3000')
      );
    });

    it('should disable auto-kill when currently enabled', async () => {
      mockStorageService.getPortMapping.mockReturnValue({
        port: 3000,
        projectName: 'test-project',
        projectPath: '/test/path',
        autoKill: true,
      });

      await autoCommand.togglePort(3000);

      expect(mockStorageService.addPortMapping).toHaveBeenCalledWith({
        port: 3000,
        projectName: 'test-project',
        projectPath: '/test/path',
        autoKill: false,
      });
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Auto-kill disabled for port 3000')
      );
    });
  });
});
