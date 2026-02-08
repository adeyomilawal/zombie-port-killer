/**
 * macOS Platform Adapter
 * Uses lsof and ps commands to detect and manage processes
 */
import { ProcessInfo, PlatformAdapter } from '../types';
export declare class MacOSAdapter implements PlatformAdapter {
    /**
     * Find process using a specific port
     */
    findProcessByPort(port: number): Promise<ProcessInfo | null>;
    /**
     * Kill a process by PID
     */
    killProcess(pid: number, force?: boolean): Promise<boolean>;
    /**
     * Get all listening ports
     */
    getAllListeningPorts(): Promise<ProcessInfo[]>;
    /**
     * Get detailed information about a process
     */
    private getProcessDetails;
    /**
     * Get process context information (uptime, parent process, service manager, working directory)
     */
    private getProcessContext;
    /**
     * Parse elapsed time string (DD-HH:MM:SS, HH:MM:SS, or MM:SS) to milliseconds
     */
    private parseElapsedTime;
    /**
     * Parse start time string (Mon DD HH:MM:SS YYYY) to Date
     */
    private parseStartTime;
    /**
     * Sleep utility
     */
    private sleep;
    /**
     * Check if a process is critical (system process)
     */
    isCriticalProcess(processName: string): boolean;
}
//# sourceMappingURL=macos.adapter.d.ts.map