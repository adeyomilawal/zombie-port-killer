/**
 * Scan Command
 * Lists all ports in use and port mappings
 */
import { ProcessService } from '../services/process.service';
import { StorageService } from '../services/storage.service';
export declare class ScanCommand {
    private processService;
    private storageService;
    constructor(processService: ProcessService, storageService: StorageService);
    /**
     * Execute scan command - list all ports in use
     */
    execute(): Promise<void>;
    /**
     * List all port-to-project mappings
     */
    listMappings(): void;
    /**
     * Display process information
     */
    private displayProcess;
    /**
     * Truncate string if too long
     */
    private truncate;
    /**
     * Format date for display
     */
    private formatDate;
}
//# sourceMappingURL=scan.command.d.ts.map