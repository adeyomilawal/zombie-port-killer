/**
 * Storage Service
 * Handles configuration persistence and port mappings
 */
import { PortMapping } from '../types';
export declare class StorageService {
    private configPath;
    private config;
    constructor();
    /**
     * Ensure config directory exists
     */
    private ensureConfigDir;
    /**
     * Load configuration from disk
     */
    private loadConfig;
    /**
     * Create default configuration
     */
    private createDefaultConfig;
    /**
     * Save configuration to disk
     */
    private saveConfig;
    /**
     * Add or update port mapping
     */
    addPortMapping(mapping: Omit<PortMapping, 'lastUsed'>): void;
    /**
     * Get port mapping for a specific port
     */
    getPortMapping(port: number): PortMapping | null;
    /**
     * Get all port mappings
     */
    getAllMappings(): PortMapping[];
    /**
     * Get mappings for a specific project
     */
    getMappingsForProject(projectPath: string): PortMapping[];
    /**
     * Remove port mapping
     */
    removePortMapping(port: number): void;
    /**
     * Check if auto-kill is enabled
     */
    isAutoKillEnabled(): boolean;
    /**
     * Enable or disable auto-kill
     */
    setAutoKill(enabled: boolean): void;
    /**
     * Check if kill confirmation is enabled
     */
    isConfirmKillEnabled(): boolean;
    /**
     * Enable or disable kill confirmation
     */
    setConfirmKill(enabled: boolean): void;
    /**
     * Validate and migrate config if needed
     */
    private validateAndMigrateConfig;
    /**
     * Migrate from version 0 (no version) to version 1
     */
    private migrateFromV0toV1;
    /**
     * Get config file path (for display/debugging)
     */
    getConfigPath(): string;
    /**
     * Clear all configuration (dangerous!)
     */
    clearConfig(): void;
}
//# sourceMappingURL=storage.service.d.ts.map