/**
 * Process Service
 * Handles process detection and management across platforms
 */

import os from 'os';
import { ProcessInfo, PlatformAdapter } from '../types';
import { MacOSAdapter } from '../platform/macos.adapter';
import { LinuxAdapter } from '../platform/linux.adapter';
import { WindowsAdapter } from '../platform/windows.adapter';

export class ProcessService {
  private adapter: PlatformAdapter;

  constructor() {
    this.adapter = this.createPlatformAdapter();
  }

  /**
   * Create appropriate platform adapter based on OS
   */
  private createPlatformAdapter(): PlatformAdapter {
    const platform = os.platform();

    switch (platform) {
      case 'darwin':
        return new MacOSAdapter();
      case 'linux':
        return new LinuxAdapter();
      case 'win32':
        return new WindowsAdapter();
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Find process using a specific port
   */
  async findByPort(port: number): Promise<ProcessInfo | null> {
    this.validatePort(port);
    return await this.adapter.findProcessByPort(port);
  }

  /**
   * Kill a process by PID
   * @param pid Process ID
   * @param force Use force kill (SIGKILL) instead of graceful termination (SIGTERM)
   */
  async killProcess(pid: number, force: boolean = false): Promise<boolean> {
    if (!pid || pid <= 0) {
      throw new Error('Invalid PID');
    }

    return await this.adapter.killProcess(pid, force);
  }

  /**
   * Get all listening ports
   */
  async getAllPorts(): Promise<ProcessInfo[]> {
    return await this.adapter.getAllListeningPorts();
  }

  /**
   * Check if a process is critical/system process
   */
  isCriticalProcess(process: ProcessInfo): boolean {
    const adapter = this.adapter as any;
    if (typeof adapter.isCriticalProcess === 'function') {
      return adapter.isCriticalProcess(process.processName);
    }
    return false;
  }

  /**
   * Validate port number
   */
  private validatePort(port: number): void {
    if (!port || isNaN(port)) {
      throw new Error('Port must be a number');
    }

    if (port < 1 || port > 65535) {
      throw new Error('Port must be between 1 and 65535');
    }
  }

  /**
   * Get current platform name (for display)
   */
  getPlatformName(): string {
    const platform = os.platform();
    switch (platform) {
      case 'darwin':
        return 'macOS';
      case 'linux':
        return 'Linux';
      case 'win32':
        return 'Windows';
      default:
        return platform;
    }
  }
}
