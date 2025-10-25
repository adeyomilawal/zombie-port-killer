/**
 * Process Service
 * Handles process detection and management across platforms
 */
import { ProcessInfo } from '../types';
export declare class ProcessService {
    private adapter;
    constructor();
    /**
     * Create appropriate platform adapter based on OS
     */
    private createPlatformAdapter;
    /**
     * Find process using a specific port
     */
    findByPort(port: number): Promise<ProcessInfo | null>;
    /**
     * Kill a process by PID
     * @param pid Process ID
     * @param force Use force kill (SIGKILL) instead of graceful termination (SIGTERM)
     */
    killProcess(pid: number, force?: boolean): Promise<boolean>;
    /**
     * Get all listening ports
     */
    getAllPorts(): Promise<ProcessInfo[]>;
    /**
     * Check if a process is critical/system process
     */
    isCriticalProcess(process: ProcessInfo): boolean;
    /**
     * Validate port number
     */
    private validatePort;
    /**
     * Get current platform name (for display)
     */
    getPlatformName(): string;
}
//# sourceMappingURL=process.service.d.ts.map