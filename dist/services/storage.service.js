"use strict";
/**
 * Storage Service
 * Handles configuration persistence and port mappings
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
class StorageService {
    constructor() {
        this.configPath = path_1.default.join(os_1.default.homedir(), '.zkill', 'config.json');
        this.ensureConfigDir();
        this.config = this.loadConfig();
    }
    /**
     * Ensure config directory exists
     */
    ensureConfigDir() {
        const dir = path_1.default.dirname(this.configPath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
    }
    /**
     * Load configuration from disk
     */
    loadConfig() {
        if (!fs_1.default.existsSync(this.configPath)) {
            return this.createDefaultConfig();
        }
        try {
            const data = fs_1.default.readFileSync(this.configPath, 'utf-8');
            const config = JSON.parse(data);
            return this.validateAndMigrateConfig(config);
        }
        catch (error) {
            console.warn('Config file corrupted, creating new one...');
            return this.createDefaultConfig();
        }
    }
    /**
     * Create default configuration
     */
    createDefaultConfig() {
        const config = {
            portMappings: [],
            autoKillEnabled: false,
            confirmKill: true,
            version: '1.0.0',
        };
        this.saveConfig(config);
        return config;
    }
    /**
     * Save configuration to disk
     */
    saveConfig(config) {
        try {
            fs_1.default.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
        }
        catch (error) {
            console.error('Failed to save config:', error);
        }
    }
    /**
     * Add or update port mapping
     */
    addPortMapping(mapping) {
        // Remove existing mapping for this port
        this.config.portMappings = this.config.portMappings.filter((m) => m.port !== mapping.port);
        // Add new mapping
        this.config.portMappings.push({
            ...mapping,
            lastUsed: new Date(),
        });
        this.saveConfig(this.config);
    }
    /**
     * Get port mapping for a specific port
     */
    getPortMapping(port) {
        return (this.config.portMappings.find((m) => m.port === port) || null);
    }
    /**
     * Get all port mappings
     */
    getAllMappings() {
        return this.config.portMappings.sort((a, b) => a.port - b.port);
    }
    /**
     * Get mappings for a specific project
     */
    getMappingsForProject(projectPath) {
        return this.config.portMappings.filter((m) => m.projectPath === projectPath);
    }
    /**
     * Remove port mapping
     */
    removePortMapping(port) {
        this.config.portMappings = this.config.portMappings.filter((m) => m.port !== port);
        this.saveConfig(this.config);
    }
    /**
     * Check if auto-kill is enabled
     */
    isAutoKillEnabled() {
        return this.config.autoKillEnabled;
    }
    /**
     * Enable or disable auto-kill
     */
    setAutoKill(enabled) {
        this.config.autoKillEnabled = enabled;
        this.saveConfig(this.config);
    }
    /**
     * Check if kill confirmation is enabled
     */
    isConfirmKillEnabled() {
        return this.config.confirmKill;
    }
    /**
     * Enable or disable kill confirmation
     */
    setConfirmKill(enabled) {
        this.config.confirmKill = enabled;
        this.saveConfig(this.config);
    }
    /**
     * Validate and migrate config if needed
     */
    validateAndMigrateConfig(config) {
        // Ensure all required fields exist
        if (!config.version) {
            config = this.migrateFromV0toV1(config);
        }
        // Convert date strings back to Date objects
        if (config.portMappings) {
            config.portMappings = config.portMappings.map((m) => ({
                ...m,
                lastUsed: new Date(m.lastUsed),
            }));
        }
        return config;
    }
    /**
     * Migrate from version 0 (no version) to version 1
     */
    migrateFromV0toV1(oldConfig) {
        return {
            portMappings: oldConfig.portMappings || [],
            autoKillEnabled: oldConfig.autoKillEnabled || false,
            confirmKill: true, // New field in v1
            version: '1.0.0',
        };
    }
    /**
     * Get config file path (for display/debugging)
     */
    getConfigPath() {
        return this.configPath;
    }
    /**
     * Clear all configuration (dangerous!)
     */
    clearConfig() {
        this.config = this.createDefaultConfig();
        this.saveConfig(this.config);
    }
}
exports.StorageService = StorageService;
//# sourceMappingURL=storage.service.js.map