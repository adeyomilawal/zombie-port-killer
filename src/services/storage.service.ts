/**
 * Storage Service
 * Handles configuration persistence and port mappings
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { Config, PortMapping } from '../types';

export class StorageService {
  private configPath: string;
  private config: Config;

  constructor() {
    this.configPath = path.join(os.homedir(), '.zkill', 'config.json');
    this.ensureConfigDir();
    this.config = this.loadConfig();
  }

  /**
   * Ensure config directory exists
   */
  private ensureConfigDir(): void {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Load configuration from disk
   */
  private loadConfig(): Config {
    if (!fs.existsSync(this.configPath)) {
      return this.createDefaultConfig();
    }

    try {
      const data = fs.readFileSync(this.configPath, 'utf-8');
      const config = JSON.parse(data);
      return this.validateAndMigrateConfig(config);
    } catch (error) {
      console.warn('Config file corrupted, creating new one...');
      return this.createDefaultConfig();
    }
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(): Config {
    const config: Config = {
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
  private saveConfig(config: Config): void {
    try {
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  /**
   * Add or update port mapping
   */
  addPortMapping(mapping: Omit<PortMapping, 'lastUsed'>): void {
    // Remove existing mapping for this port
    this.config.portMappings = this.config.portMappings.filter(
      (m) => m.port !== mapping.port
    );

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
  getPortMapping(port: number): PortMapping | null {
    return (
      this.config.portMappings.find((m) => m.port === port) || null
    );
  }

  /**
   * Get all port mappings
   */
  getAllMappings(): PortMapping[] {
    return this.config.portMappings.sort((a, b) => a.port - b.port);
  }

  /**
   * Get mappings for a specific project
   */
  getMappingsForProject(projectPath: string): PortMapping[] {
    return this.config.portMappings.filter(
      (m) => m.projectPath === projectPath
    );
  }

  /**
   * Remove port mapping
   */
  removePortMapping(port: number): void {
    this.config.portMappings = this.config.portMappings.filter(
      (m) => m.port !== port
    );
    this.saveConfig(this.config);
  }

  /**
   * Check if auto-kill is enabled
   */
  isAutoKillEnabled(): boolean {
    return this.config.autoKillEnabled;
  }

  /**
   * Enable or disable auto-kill
   */
  setAutoKill(enabled: boolean): void {
    this.config.autoKillEnabled = enabled;
    this.saveConfig(this.config);
  }

  /**
   * Check if kill confirmation is enabled
   */
  isConfirmKillEnabled(): boolean {
    return this.config.confirmKill;
  }

  /**
   * Enable or disable kill confirmation
   */
  setConfirmKill(enabled: boolean): void {
    this.config.confirmKill = enabled;
    this.saveConfig(this.config);
  }

  /**
   * Validate and migrate config if needed
   */
  private validateAndMigrateConfig(config: any): Config {
    // Ensure all required fields exist
    if (!config.version) {
      config = this.migrateFromV0toV1(config);
    }

    // Convert date strings back to Date objects
    if (config.portMappings) {
      config.portMappings = config.portMappings.map((m: any) => ({
        ...m,
        lastUsed: new Date(m.lastUsed),
      }));
    }

    return config as Config;
  }

  /**
   * Migrate from version 0 (no version) to version 1
   */
  private migrateFromV0toV1(oldConfig: any): Config {
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
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Clear all configuration (dangerous!)
   */
  clearConfig(): void {
    this.config = this.createDefaultConfig();
    this.saveConfig(this.config);
  }
}
