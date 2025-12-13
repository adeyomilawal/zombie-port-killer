"use strict";
/**
 * Unit tests for KillCommand
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const kill_command_1 = require("../kill.command");
const process_service_1 = require("../../services/process.service");
const storage_service_1 = require("../../services/storage.service");
const project_service_1 = require("../../services/project.service");
const inquirer_1 = __importDefault(require("inquirer"));
// Mock dependencies
jest.mock('../../services/process.service');
jest.mock('../../services/storage.service');
jest.mock('../../services/project.service');
jest.mock('inquirer');
jest.mock('ora', () => {
    return jest.fn(() => ({
        start: jest.fn().mockReturnThis(),
        succeed: jest.fn().mockReturnThis(),
        fail: jest.fn().mockReturnThis(),
        text: '',
    }));
});
describe('KillCommand', () => {
    let killCommand;
    let mockProcessService;
    let mockStorageService;
    let mockProjectService;
    const mockProcess = {
        pid: 1234,
        port: 3000,
        processName: 'node',
        command: 'node server.js',
        user: 'testuser',
    };
    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        // Create mock instances
        mockProcessService = new process_service_1.ProcessService();
        mockStorageService = new storage_service_1.StorageService();
        mockProjectService = new project_service_1.ProjectService();
        // Create command instance
        killCommand = new kill_command_1.KillCommand(mockProcessService, mockStorageService, mockProjectService);
        // Mock console methods to avoid test output clutter
        jest.spyOn(console, 'log').mockImplementation();
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    describe('execute', () => {
        it('should fail when port is not in use', async () => {
            mockProcessService.findByPort.mockResolvedValue(null);
            await killCommand.execute(3000);
            expect(mockProcessService.findByPort).toHaveBeenCalledWith(3000);
            expect(console.log).not.toHaveBeenCalled();
        });
        it('should display process info when port is in use', async () => {
            mockProcessService.findByPort.mockResolvedValue(mockProcess);
            mockProcessService.isCriticalProcess.mockReturnValue(false);
            mockStorageService.getPortMapping.mockReturnValue(null);
            mockStorageService.isConfirmKillEnabled.mockReturnValue(false);
            mockProcessService.killProcess.mockResolvedValue(true);
            mockProjectService.isProjectDirectory.mockReturnValue(false);
            await killCommand.execute(3000, true);
            expect(mockProcessService.findByPort).toHaveBeenCalledWith(3000);
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Process Details:'));
        });
        it('should show port mapping if exists', async () => {
            mockProcessService.findByPort.mockResolvedValue(mockProcess);
            mockProcessService.isCriticalProcess.mockReturnValue(false);
            mockStorageService.getPortMapping.mockReturnValue({
                port: 3000,
                projectName: 'test-project',
                projectPath: '/test/path',
                autoKill: false,
                lastUsed: new Date(),
            });
            mockStorageService.isConfirmKillEnabled.mockReturnValue(false);
            mockProcessService.killProcess.mockResolvedValue(true);
            mockProjectService.isProjectDirectory.mockReturnValue(false);
            await killCommand.execute(3000, true);
            expect(mockStorageService.getPortMapping).toHaveBeenCalledWith(3000);
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Last used by project'));
        });
        it('should warn about critical system process', async () => {
            mockProcessService.findByPort.mockResolvedValue(mockProcess);
            mockProcessService.isCriticalProcess.mockReturnValue(true);
            mockStorageService.getPortMapping.mockReturnValue(null);
            mockStorageService.isConfirmKillEnabled.mockReturnValue(false);
            mockProcessService.killProcess.mockResolvedValue(true);
            mockProjectService.isProjectDirectory.mockReturnValue(false);
            await killCommand.execute(3000, true);
            expect(mockProcessService.isCriticalProcess).toHaveBeenCalledWith(mockProcess);
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('system process'));
        });
        it('should ask for confirmation when confirmKill is enabled and no force flag', async () => {
            mockProcessService.findByPort.mockResolvedValue(mockProcess);
            mockProcessService.isCriticalProcess.mockReturnValue(false);
            mockStorageService.getPortMapping.mockReturnValue(null);
            mockStorageService.isConfirmKillEnabled.mockReturnValue(true);
            inquirer_1.default.prompt.mockResolvedValue({ confirmed: true });
            mockProcessService.killProcess.mockResolvedValue(true);
            mockProjectService.isProjectDirectory.mockReturnValue(false);
            await killCommand.execute(3000, false);
            expect(inquirer_1.default.prompt).toHaveBeenCalled();
            expect(mockProcessService.killProcess).toHaveBeenCalled();
        });
        it('should cancel operation when user declines confirmation', async () => {
            mockProcessService.findByPort.mockResolvedValue(mockProcess);
            mockProcessService.isCriticalProcess.mockReturnValue(false);
            mockStorageService.getPortMapping.mockReturnValue(null);
            mockStorageService.isConfirmKillEnabled.mockReturnValue(true);
            inquirer_1.default.prompt.mockResolvedValue({ confirmed: false });
            await killCommand.execute(3000, false);
            expect(inquirer_1.default.prompt).toHaveBeenCalled();
            expect(mockProcessService.killProcess).not.toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('cancelled'));
        });
        it('should skip confirmation with force flag', async () => {
            mockProcessService.findByPort.mockResolvedValue(mockProcess);
            mockProcessService.isCriticalProcess.mockReturnValue(false);
            mockStorageService.getPortMapping.mockReturnValue(null);
            mockStorageService.isConfirmKillEnabled.mockReturnValue(true);
            mockProcessService.killProcess.mockResolvedValue(true);
            mockProjectService.isProjectDirectory.mockReturnValue(false);
            await killCommand.execute(3000, true);
            expect(inquirer_1.default.prompt).not.toHaveBeenCalled();
            expect(mockProcessService.killProcess).toHaveBeenCalled();
        });
        it('should perform graceful kill and succeed', async () => {
            mockProcessService.findByPort.mockResolvedValue(mockProcess);
            mockProcessService.isCriticalProcess.mockReturnValue(false);
            mockStorageService.getPortMapping.mockReturnValue(null);
            mockStorageService.isConfirmKillEnabled.mockReturnValue(false);
            mockProcessService.killProcess.mockResolvedValue(true);
            mockProjectService.isProjectDirectory.mockReturnValue(false);
            await killCommand.execute(3000, true);
            expect(mockProcessService.killProcess).toHaveBeenCalledWith(1234, false);
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('now available'));
        });
        it('should try force kill if graceful kill fails', async () => {
            mockProcessService.findByPort.mockResolvedValue(mockProcess);
            mockProcessService.isCriticalProcess.mockReturnValue(false);
            mockStorageService.getPortMapping.mockReturnValue(null);
            mockStorageService.isConfirmKillEnabled.mockReturnValue(false);
            mockProcessService.killProcess
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(true);
            mockProjectService.isProjectDirectory.mockReturnValue(false);
            await killCommand.execute(3000, true);
            expect(mockProcessService.killProcess).toHaveBeenCalledTimes(2);
            expect(mockProcessService.killProcess).toHaveBeenNthCalledWith(1, 1234, false);
            expect(mockProcessService.killProcess).toHaveBeenNthCalledWith(2, 1234, true);
        });
        it('should show error message when kill fails', async () => {
            mockProcessService.findByPort.mockResolvedValue(mockProcess);
            mockProcessService.isCriticalProcess.mockReturnValue(false);
            mockStorageService.getPortMapping.mockReturnValue(null);
            mockStorageService.isConfirmKillEnabled.mockReturnValue(false);
            mockProcessService.killProcess.mockResolvedValue(false);
            mockProjectService.isProjectDirectory.mockReturnValue(false);
            await killCommand.execute(3000, true);
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('elevated privileges'));
        });
        it('should update port mapping for current project', async () => {
            mockProcessService.findByPort.mockResolvedValue(mockProcess);
            mockProcessService.isCriticalProcess.mockReturnValue(false);
            mockStorageService.getPortMapping.mockReturnValue(null);
            mockStorageService.isConfirmKillEnabled.mockReturnValue(false);
            mockProcessService.killProcess.mockResolvedValue(true);
            mockProjectService.isProjectDirectory.mockReturnValue(true);
            mockProjectService.getCurrentProjectName.mockReturnValue('my-project');
            mockProjectService.getCurrentProjectPath.mockReturnValue('/my/path');
            await killCommand.execute(3000, true);
            expect(mockStorageService.addPortMapping).toHaveBeenCalledWith({
                port: 3000,
                projectName: 'my-project',
                projectPath: '/my/path',
                autoKill: false,
            });
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('associated with project'));
        });
        it('should not update port mapping when not in project directory', async () => {
            mockProcessService.findByPort.mockResolvedValue(mockProcess);
            mockProcessService.isCriticalProcess.mockReturnValue(false);
            mockStorageService.getPortMapping.mockReturnValue(null);
            mockStorageService.isConfirmKillEnabled.mockReturnValue(false);
            mockProcessService.killProcess.mockResolvedValue(true);
            mockProjectService.isProjectDirectory.mockReturnValue(false);
            await killCommand.execute(3000, true);
            expect(mockStorageService.addPortMapping).not.toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=kill.command.test.js.map