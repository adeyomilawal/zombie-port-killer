/**
 * Scan Command
 * Lists all ports in use and port mappings
 */
import { ProcessService } from "../services/process.service";
import { StorageService } from "../services/storage.service";
export interface ScanOptions {
    range?: string;
    process?: string;
    project?: string;
    system?: boolean;
    verbose?: boolean;
}
export declare class ScanCommand {
    private processService;
    private storageService;
    constructor(processService: ProcessService, storageService: StorageService);
    /**
     * Execute scan command - list all ports in use
     */
    execute(options?: ScanOptions): Promise<void>;
    /**
     * Apply filters to process list
     */
    private applyFilters;
    /**
     * Parse port range string (e.g., "3000-9000")
     */
    private parsePortRange;
    /**
     * Show active filters
     */
    private showActiveFilters;
    /**
     * List all port-to-project mappings
     */
    listMappings(): void;
    /**
     * Display process information
     */
    private displayProcess;
    /**
     * Display detailed process context information
     */
    private displayProcessContext;
    /**
     * Format uptime in milliseconds to human-readable string
     */
    private formatUptime;
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