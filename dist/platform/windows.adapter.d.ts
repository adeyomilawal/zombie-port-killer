/**
 * Windows Platform Adapter
 * Uses netstat and tasklist/taskkill commands to detect and manage processes
 */
import { ProcessInfo, PlatformAdapter } from '../types';
export declare class WindowsAdapter implements PlatformAdapter {
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
     * Sleep utility
     */
    private sleep;
    /**
     * Check if a process is critical (system process)
     */
    isCriticalProcess(processName: string): boolean;
}
//# sourceMappingURL=windows.adapter.d.ts.map