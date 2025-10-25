/**
 * Auto Command
 * Manages auto-kill functionality
 */
import { ProcessService } from '../services/process.service';
import { StorageService } from '../services/storage.service';
import { ProjectService } from '../services/project.service';
export declare class AutoCommand {
    private processService;
    private storageService;
    private projectService;
    constructor(processService: ProcessService, storageService: StorageService, projectService: ProjectService);
    /**
     * Enable auto-kill
     */
    enable(): Promise<void>;
    /**
     * Disable auto-kill
     */
    disable(): Promise<void>;
    /**
     * Check for zombie processes and kill them
     */
    checkAndKill(): Promise<void>;
    /**
     * Show auto-kill status
     */
    status(): void;
    /**
     * Print integration instructions for shell
     */
    private printIntegrationInstructions;
    /**
     * Toggle auto-kill for a specific port
     */
    togglePort(port: number): Promise<void>;
}
//# sourceMappingURL=auto.command.d.ts.map