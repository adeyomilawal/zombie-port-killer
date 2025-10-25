/**
 * macOS Platform Adapter
 * Uses lsof and ps commands to detect and manage processes
 */

import { execSync } from 'child_process';
import { ProcessInfo, PlatformAdapter } from '../types';

export class MacOSAdapter implements PlatformAdapter {
  /**
   * Find process using a specific port
   */
  async findProcessByPort(port: number): Promise<ProcessInfo | null> {
    try {
      // Use lsof to find process ID using the port
      const pidResult = execSync(`lsof -ti :${port}`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'], // Suppress stderr
      }).trim();

      if (!pidResult) {
        return null;
      }

      const pid = parseInt(pidResult);
      if (isNaN(pid) || pid <= 0) {
        return null;
      }

      // Get detailed process information
      return await this.getProcessDetails(pid, port);
    } catch (error) {
      // Port not in use or permission denied
      return null;
    }
  }

  /**
   * Kill a process by PID
   */
  async killProcess(pid: number, force: boolean = false): Promise<boolean> {
    try {
      const signal = force ? '-9' : '-15'; // SIGKILL or SIGTERM
      execSync(`kill ${signal} ${pid}`, {
        stdio: 'ignore',
      });

      // Wait a moment and verify process is dead
      await this.sleep(100);

      try {
        execSync(`ps -p ${pid}`, { stdio: 'ignore' });
        // If we get here, process is still alive
        return false;
      } catch {
        // Process is dead (ps command failed)
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all listening ports
   */
  async getAllListeningPorts(): Promise<ProcessInfo[]> {
    try {
      // Use lsof to get all listening TCP ports
      const result = execSync(
        'lsof -iTCP -sTCP:LISTEN -n -P',
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      );

      const lines = result.trim().split('\n').slice(1); // Skip header
      const processes: ProcessInfo[] = [];
      const seen = new Set<string>();

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 9) continue;

        const pid = parseInt(parts[1]);
        const addressPart = parts[8];

        // Extract port from address (format: *:3000 or 127.0.0.1:3000)
        const portMatch = addressPart.match(/:(\d+)$/);
        if (!portMatch) continue;

        const port = parseInt(portMatch[1]);
        const key = `${pid}:${port}`;

        // Skip duplicates
        if (seen.has(key)) continue;
        seen.add(key);

        const processInfo = await this.getProcessDetails(pid, port);
        if (processInfo) {
          processes.push(processInfo);
        }
      }

      return processes;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get detailed information about a process
   */
  private async getProcessDetails(
    pid: number,
    port: number
  ): Promise<ProcessInfo | null> {
    try {
      // Get process name, command, user, and start time using ps
      const psResult = execSync(
        `ps -p ${pid} -o comm=,command=,user=`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      ).trim();

      if (!psResult) {
        return null;
      }

      const lines = psResult.split('\n');
      const line = lines[0];

      // Parse the ps output
      // Format: COMM COMMAND USER
      // We need to be careful because COMMAND can contain spaces
      const parts = line.trim().split(/\s+/);

      if (parts.length < 3) {
        return null;
      }

      const processName = parts[0];
      const user = parts[parts.length - 1];
      const command = parts.slice(1, parts.length - 1).join(' ');

      return {
        pid,
        port,
        processName,
        command,
        user,
      };
    } catch (error) {
      // Process might have exited or permission denied
      return null;
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if a process is critical (system process)
   */
  isCriticalProcess(processName: string): boolean {
    const criticalProcesses = [
      'systemd',
      'init',
      'kernel',
      'launchd',
      'WindowServer',
      'loginwindow',
    ];

    return criticalProcesses.some((name) =>
      processName.toLowerCase().includes(name.toLowerCase())
    );
  }
}
