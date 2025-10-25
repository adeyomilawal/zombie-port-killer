/**
 * Linux Platform Adapter
 * Uses ss/netstat and ps commands to detect and manage processes
 */
import { ProcessInfo, PlatformAdapter } from '../types';
export declare class LinuxAdapter implements PlatformAdapter {
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
     * Find process using ss command
     */
    private findWithSS;
    /**
     * Find process using netstat command
     */
    private findWithNetstat;
    /**
     * Get all listening ports using ss
     */
    private getAllWithSS;
    /**
     * Get all listening ports using netstat
     */
    private getAllWithNetstat;
    /**
     * Get detailed information about a process
     */
    private getProcessDetails;
    /**
     * Check if ss command is available
     */
    private hasSSCommand;
    /**
     * Sleep utility
     */
    private sleep;
    /**
     * Check if a process is critical (system process)
     */
    isCriticalProcess(processName: string): boolean;
}
//# sourceMappingURL=linux.adapter.d.ts.map