/**
 * Core type definitions for Zombie Port Killer
 */
/**
 * Information about a process using a port
 */
export interface ProcessInfo {
    pid: number;
    port: number;
    processName: string;
    command: string;
    user?: string;
    startTime?: Date;
}
/**
 * Mapping between a port and a project
 */
export interface PortMapping {
    port: number;
    projectName: string;
    projectPath: string;
    lastUsed: Date;
    autoKill: boolean;
}
/**
 * Application configuration
 */
export interface Config {
    portMappings: PortMapping[];
    autoKillEnabled: boolean;
    confirmKill: boolean;
    version: string;
}
/**
 * Result of a kill operation
 */
export interface KillResult {
    success: boolean;
    pid: number;
    port: number;
    method: 'graceful' | 'force';
    error?: string;
}
/**
 * Platform types
 */
export type Platform = 'darwin' | 'linux' | 'win32';
/**
 * Platform adapter interface
 */
export interface PlatformAdapter {
    /**
     * Find process using a specific port
     */
    findProcessByPort(port: number): Promise<ProcessInfo | null>;
    /**
     * Kill a process by PID
     */
    killProcess(pid: number, force: boolean): Promise<boolean>;
    /**
     * Get all listening ports
     */
    getAllListeningPorts(): Promise<ProcessInfo[]>;
}
//# sourceMappingURL=types.d.ts.map