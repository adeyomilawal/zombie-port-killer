"use strict";
/**
 * Unit tests for AutoCommand
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auto_command_1 = require("../auto.command");
const process_service_1 = require("../../services/process.service");
const storage_service_1 = require("../../services/storage.service");
const project_service_1 = require("../../services/project.service");
const inquirer_1 = __importDefault(require("inquirer"));
// Mock dependencies
jest.mock('../../services/process.service');
jest.mock('../../services/storage.service');
jest.mock('../../services/project.service');
jest.mock('inquirer');
describe('AutoCommand', () => {
    let autoCommand;
    let mockProcessService;
    let mockStorageService;
    let mockProjectService;
    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        // Create mock instances
        mockProcessService = new process_service_1.ProcessService();
        mockStorageService = new storage_service_1.StorageService();
        mockProjectService = new project_service_1.ProjectService();
        // Create command instance
        autoCommand = new auto_command_1.AutoCommand(mockProcessService, mockStorageService, mockProjectService);
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
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Auto-kill enabled'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Shell Integration'));
        });
    });
    describe('disable', () => {
        it('should disable auto-kill and show confirmation', async () => {
            await autoCommand.disable();
            expect(mockStorageService.setAutoKill).toHaveBeenCalledWith(false);
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Auto-kill disabled'));
        });
    });
    describe('status', () => {
        it('should show enabled status when auto-kill is on', () => {
            mockStorageService.isAutoKillEnabled.mockReturnValue(true);
            mockStorageService.getAllMappings.mockReturnValue([]);
            autoCommand.status();
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Enabled'));
        });
        it('should show disabled status when auto-kill is off', () => {
            mockStorageService.isAutoKillEnabled.mockReturnValue(false);
            mockStorageService.getAllMappings.mockReturnValue([]);
            autoCommand.status();
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Disabled'));
        });
        it('should show ports with auto-kill enabled', () => {
            mockStorageService.isAutoKillEnabled.mockReturnValue(true);
            mockStorageService.getAllMappings.mockReturnValue([
                {
                    port: 3000,
                    projectName: 'project-1',
                    projectPath: '/path/1',
                    autoKill: true,
                    lastUsed: new Date(),
                },
                {
                    port: 4000,
                    projectName: 'project-2',
                    projectPath: '/path/2',
                    autoKill: true,
                    lastUsed: new Date(),
                },
                {
                    port: 5000,
                    projectName: 'project-3',
                    projectPath: '/path/3',
                    autoKill: false,
                    lastUsed: new Date(),
                },
            ]);
            autoCommand.status();
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Ports with auto-kill enabled (2)'));
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
                    lastUsed: new Date(),
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
                    lastUsed: new Date(),
                },
            ]);
            mockProcessService.findByPort.mockResolvedValue(null);
            await autoCommand.checkAndKill();
            expect(mockProcessService.findByPort).toHaveBeenCalledWith(3000);
            expect(console.log).not.toHaveBeenCalled();
        });
        it('should prompt to kill processes from other projects', async () => {
            const mockProcess = {
                pid: 1234,
                port: 3000,
                processName: 'node',
                command: 'node server.js',
            };
            mockStorageService.isAutoKillEnabled.mockReturnValue(true);
            mockProjectService.getCurrentProjectName.mockReturnValue('current-project');
            mockProjectService.getCurrentProjectPath.mockReturnValue('/current/path');
            mockStorageService.getAllMappings.mockReturnValue([
                {
                    port: 3000,
                    projectName: 'other-project',
                    projectPath: '/other/path',
                    autoKill: true,
                    lastUsed: new Date(),
                },
            ]);
            mockProcessService.findByPort.mockResolvedValue(mockProcess);
            inquirer_1.default.prompt.mockResolvedValue({ confirmed: false });
            await autoCommand.checkAndKill();
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Project switch detected'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Found 1 port'));
            expect(inquirer_1.default.prompt).toHaveBeenCalled();
        });
        it('should skip auto-kill when user declines', async () => {
            const mockProcess = {
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
                    lastUsed: new Date(),
                },
            ]);
            mockProcessService.findByPort.mockResolvedValue(mockProcess);
            inquirer_1.default.prompt.mockResolvedValue({ confirmed: false });
            await autoCommand.checkAndKill();
            expect(mockProcessService.killProcess).not.toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Skipped'));
        });
        it('should kill processes when user confirms', async () => {
            const mockProcess = {
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
                    lastUsed: new Date(),
                },
            ]);
            mockProcessService.findByPort.mockResolvedValue(mockProcess);
            inquirer_1.default.prompt.mockResolvedValue({ confirmed: true });
            mockProcessService.killProcess.mockResolvedValue(true);
            await autoCommand.checkAndKill();
            expect(mockProcessService.killProcess).toHaveBeenCalledWith(1234, false);
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Killed 1 process'));
        });
        it('should handle multiple ports from other projects', async () => {
            const mockProcess1 = {
                pid: 1234,
                port: 3000,
                processName: 'node',
                command: 'node server.js',
            };
            const mockProcess2 = {
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
                    lastUsed: new Date(),
                },
                {
                    port: 4000,
                    projectName: 'project-2',
                    projectPath: '/path/2',
                    autoKill: true,
                    lastUsed: new Date(),
                },
            ]);
            mockProcessService.findByPort
                .mockResolvedValueOnce(mockProcess1)
                .mockResolvedValueOnce(mockProcess2);
            inquirer_1.default.prompt.mockResolvedValue({ confirmed: true });
            mockProcessService.killProcess.mockResolvedValue(true);
            await autoCommand.checkAndKill();
            expect(mockProcessService.killProcess).toHaveBeenCalledTimes(2);
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Killed 2 process'));
        });
    });
    describe('togglePort', () => {
        it('should show error when no mapping exists', async () => {
            mockStorageService.getPortMapping.mockReturnValue(null);
            await autoCommand.togglePort(3000);
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No mapping found'));
            expect(mockStorageService.addPortMapping).not.toHaveBeenCalled();
        });
        it('should enable auto-kill when currently disabled', async () => {
            mockStorageService.getPortMapping.mockReturnValue({
                port: 3000,
                projectName: 'test-project',
                projectPath: '/test/path',
                autoKill: false,
                lastUsed: new Date(),
            });
            await autoCommand.togglePort(3000);
            expect(mockStorageService.addPortMapping).toHaveBeenCalledWith({
                port: 3000,
                projectName: 'test-project',
                projectPath: '/test/path',
                autoKill: true,
                lastUsed: expect.any(Date),
            });
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Auto-kill enabled for port 3000'));
        });
        it('should disable auto-kill when currently enabled', async () => {
            mockStorageService.getPortMapping.mockReturnValue({
                port: 3000,
                projectName: 'test-project',
                projectPath: '/test/path',
                autoKill: true,
                lastUsed: new Date(),
            });
            await autoCommand.togglePort(3000);
            expect(mockStorageService.addPortMapping).toHaveBeenCalledWith({
                port: 3000,
                projectName: 'test-project',
                projectPath: '/test/path',
                autoKill: false,
                lastUsed: expect.any(Date),
            });
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Auto-kill disabled for port 3000'));
        });
    });
});
//# sourceMappingURL=auto.command.test.js.map