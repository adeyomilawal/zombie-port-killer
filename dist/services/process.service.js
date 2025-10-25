"use strict";
/**
 * Process Service
 * Handles process detection and management across platforms
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessService = void 0;
const os_1 = __importDefault(require("os"));
const macos_adapter_1 = require("../platform/macos.adapter");
const linux_adapter_1 = require("../platform/linux.adapter");
const windows_adapter_1 = require("../platform/windows.adapter");
class ProcessService {
    constructor() {
        this.adapter = this.createPlatformAdapter();
    }
    /**
     * Create appropriate platform adapter based on OS
     */
    createPlatformAdapter() {
        const platform = os_1.default.platform();
        switch (platform) {
            case 'darwin':
                return new macos_adapter_1.MacOSAdapter();
            case 'linux':
                return new linux_adapter_1.LinuxAdapter();
            case 'win32':
                return new windows_adapter_1.WindowsAdapter();
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    }
    /**
     * Find process using a specific port
     */
    async findByPort(port) {
        this.validatePort(port);
        return await this.adapter.findProcessByPort(port);
    }
    /**
     * Kill a process by PID
     * @param pid Process ID
     * @param force Use force kill (SIGKILL) instead of graceful termination (SIGTERM)
     */
    async killProcess(pid, force = false) {
        if (!pid || pid <= 0) {
            throw new Error('Invalid PID');
        }
        return await this.adapter.killProcess(pid, force);
    }
    /**
     * Get all listening ports
     */
    async getAllPorts() {
        return await this.adapter.getAllListeningPorts();
    }
    /**
     * Check if a process is critical/system process
     */
    isCriticalProcess(process) {
        const adapter = this.adapter;
        if (typeof adapter.isCriticalProcess === 'function') {
            return adapter.isCriticalProcess(process.processName);
        }
        return false;
    }
    /**
     * Validate port number
     */
    validatePort(port) {
        if (!port || isNaN(port)) {
            throw new Error('Port must be a number');
        }
        if (port < 1 || port > 65535) {
            throw new Error('Port must be between 1 and 65535');
        }
    }
    /**
     * Get current platform name (for display)
     */
    getPlatformName() {
        const platform = os_1.default.platform();
        switch (platform) {
            case 'darwin':
                return 'macOS';
            case 'linux':
                return 'Linux';
            case 'win32':
                return 'Windows';
            default:
                return platform;
        }
    }
}
exports.ProcessService = ProcessService;
//# sourceMappingURL=process.service.js.map