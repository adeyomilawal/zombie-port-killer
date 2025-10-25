/**
 * Kill Command
 * Handles killing processes on specific ports
 */
import { ProcessService } from '../services/process.service';
import { StorageService } from '../services/storage.service';
import { ProjectService } from '../services/project.service';
export declare class KillCommand {
    private processService;
    private storageService;
    private projectService;
    constructor(processService: ProcessService, storageService: StorageService, projectService: ProjectService);
    /**
     * Execute kill command
     */
    execute(port: number, forceFlag?: boolean): Promise<void>;
    /**
     * Display process information
     */
    private displayProcessInfo;
    /**
     * Confirm kill with user
     */
    private confirmKill;
    /**
     * Perform the kill operation
     */
    private performKill;
    /**
     * Sleep utility
     */
    private sleep;
}
//# sourceMappingURL=kill.command.d.ts.map