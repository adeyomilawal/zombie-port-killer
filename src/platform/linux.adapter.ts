/**
 * Linux Platform Adapter
 * Uses ss/netstat and ps commands to detect and manage processes
 */

import { execSync } from 'child_process';
import { ProcessInfo, PlatformAdapter } from '../types';

export class LinuxAdapter implements PlatformAdapter {
  /**
   * Find process using a specific port
   */
  async findProcessByPort(port: number): Promise<ProcessInfo | null> {
    try {
      // Try ss first (modern Linux), fallback to netstat
      const result = this.hasSSCommand()
        ? this.findWithSS(port)
        : this.findWithNetstat(port);

      return result;
    } catch (error) {
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
      const result = this.hasSSCommand()
        ? this.getAllWithSS()
        : this.getAllWithNetstat();

      return result;
    } catch (error) {
      return [];
    }
  }

  /**
   * Find process using ss command
   */
  private findWithSS(port: number): ProcessInfo | null {
    try {
      const result = execSync(
        `ss -lptn 'sport = :${port}'`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      );

      // Parse ss output
      // Format: LISTEN 0 128 *:3000 *:* users:(("node",pid=12345,fd=20))
      const pidMatch = result.match(/pid=(\d+)/);
      if (!pidMatch) {
        return null;
      }

      const pid = parseInt(pidMatch[1]);
      if (isNaN(pid) || pid <= 0) {
        return null;
      }

      return this.getProcessDetails(pid, port);
    } catch (error) {
      return null;
    }
  }

  /**
   * Find process using netstat command
   */
  private findWithNetstat(port: number): ProcessInfo | null {
    try {
      const result = execSync(
        `netstat -ltnp 2>/dev/null | grep :${port}`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      );

      // Parse netstat output
      // Format: tcp  0  0 0.0.0.0:3000  0.0.0.0:*  LISTEN  12345/node
      const lines = result.trim().split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 7) continue;

        const lastPart = parts[6];
        const pidMatch = lastPart.match(/^(\d+)/);
        if (!pidMatch) continue;

        const pid = parseInt(pidMatch[1]);
        if (isNaN(pid) || pid <= 0) continue;

        return this.getProcessDetails(pid, port);
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all listening ports using ss
   */
  private getAllWithSS(): ProcessInfo[] {
    try {
      const result = execSync(
        'ss -lptn',
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      );

      const lines = result.trim().split('\n').slice(1); // Skip header
      const processes: ProcessInfo[] = [];
      const seen = new Set<string>();

      for (const line of lines) {
        const pidMatch = line.match(/pid=(\d+)/);
        const portMatch = line.match(/:(\d+)\s/);

        if (!pidMatch || !portMatch) continue;

        const pid = parseInt(pidMatch[1]);
        const port = parseInt(portMatch[1]);

        if (isNaN(pid) || isNaN(port)) continue;

        const key = `${pid}:${port}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const processInfo = this.getProcessDetails(pid, port);
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
   * Get all listening ports using netstat
   */
  private getAllWithNetstat(): ProcessInfo[] {
    try {
      const result = execSync(
        'netstat -ltnp 2>/dev/null',
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      );

      const lines = result.trim().split('\n').slice(2); // Skip headers
      const processes: ProcessInfo[] = [];
      const seen = new Set<string>();

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 7) continue;

        const addressPart = parts[3];
        const portMatch = addressPart.match(/:(\d+)$/);
        if (!portMatch) continue;

        const port = parseInt(portMatch[1]);

        const lastPart = parts[6];
        const pidMatch = lastPart.match(/^(\d+)/);
        if (!pidMatch) continue;

        const pid = parseInt(pidMatch[1]);

        const key = `${pid}:${port}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const processInfo = this.getProcessDetails(pid, port);
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
  private getProcessDetails(pid: number, port: number): ProcessInfo | null {
    try {
      const psResult = execSync(
        `ps -p ${pid} -o comm=,cmd=,user=`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      ).trim();

      if (!psResult) {
        return null;
      }

      const parts = psResult.split(/\s+/);
      if (parts.length < 3) {
        return null;
      }

      const processName = parts[0];
      const user = parts[parts.length - 1];
      const command = parts.slice(1, parts.length - 1).join(' ');

      // Gather additional context information
      const context = this.getProcessContext(pid);

      return {
        pid,
        port,
        processName,
        command,
        user,
        ...context,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get process context information (uptime, parent process, service manager, working directory)
   */
  private getProcessContext(pid: number): Partial<ProcessInfo> {
    const context: Partial<ProcessInfo> = {};

    try {
      // Get uptime (etime) and start time (lstart) in one call
      const timeResult = execSync(
        `ps -p ${pid} -o etime=,lstart=`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      ).trim();

      if (timeResult) {
        const parts = timeResult.split(/\s+/);
        if (parts.length >= 2) {
          // Parse elapsed time (format: DD-HH:MM:SS or HH:MM:SS or MM:SS)
          const etime = parts[0];
          context.uptime = this.parseElapsedTime(etime);

          // Parse start time (format: Mon DD HH:MM:SS YYYY)
          const lstart = parts.slice(1).join(' ');
          context.startTime = this.parseStartTime(lstart);
        }
      }
    } catch {
      // Ignore errors - uptime/startTime are optional
    }

    try {
      // Get parent PID and parent process name
      const parentResult = execSync(
        `ps -p ${pid} -o ppid=,ppidcmd=`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      ).trim();

      if (parentResult) {
        const parts = parentResult.split(/\s+/);
        if (parts.length >= 1) {
          const ppid = parseInt(parts[0]);
          if (!isNaN(ppid) && ppid > 0) {
            context.parentPid = ppid;
            if (parts.length > 1) {
              context.parentProcessName = parts.slice(1).join(' ');
            }
          }
        }
      }
    } catch {
      // Ignore errors - parent info is optional
    }

    try {
      // Get working directory
      const cwdResult = execSync(
        `ps -p ${pid} -o cwd=`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      ).trim();

      if (cwdResult) {
        context.workingDirectory = cwdResult;
      }
    } catch {
      // Ignore errors - working directory is optional
    }

    try {
      // Check if managed by systemd
      // Method 1: Check /proc/$PID/cgroup for systemd
      try {
        const cgroup = execSync(
          `cat /proc/${pid}/cgroup 2>/dev/null`,
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
        ).trim();

        if (cgroup.includes('systemd')) {
          context.serviceManager = 'systemd';

          // Try to get service name from systemctl
          try {
            const systemctlResult = execSync(
              `systemctl status ${pid} 2>/dev/null | head -1`,
              { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
            ).trim();

            // Extract service name (format: ● service-name.service)
            const serviceMatch = systemctlResult.match(/(\S+\.service)/);
            if (serviceMatch) {
              context.serviceName = serviceMatch[1];
            }
          } catch {
            // Ignore - service name is optional
          }
        }
      } catch {
        // Ignore - cgroup check failed
      }

      // Method 2: Check if parent is systemd (PID 1)
      if (context.parentPid === 1) {
        // Could be a systemd service, but not definitive
        // We'll only set it if we found systemd in cgroup
      }
    } catch {
      // Ignore errors - service detection is optional
    }

    return context;
  }

  /**
   * Parse elapsed time string (DD-HH:MM:SS, HH:MM:SS, or MM:SS) to milliseconds
   */
  private parseElapsedTime(etime: string): number {
    try {
      // Format: DD-HH:MM:SS or HH:MM:SS or MM:SS
      let days = 0;
      let hours = 0;
      let minutes = 0;
      let seconds = 0;

      if (etime.includes('-')) {
        // Format: DD-HH:MM:SS
        const [daysPart, timePart] = etime.split('-');
        days = parseInt(daysPart) || 0;
        const [h, m, s] = timePart.split(':').map(Number);
        hours = h || 0;
        minutes = m || 0;
        seconds = s || 0;
      } else {
        // Format: HH:MM:SS or MM:SS
        const parts = etime.split(':');
        if (parts.length === 3) {
          // HH:MM:SS
          hours = parseInt(parts[0]) || 0;
          minutes = parseInt(parts[1]) || 0;
          seconds = parseInt(parts[2]) || 0;
        } else if (parts.length === 2) {
          // MM:SS
          minutes = parseInt(parts[0]) || 0;
          seconds = parseInt(parts[1]) || 0;
        }
      }

      return (
        days * 24 * 60 * 60 * 1000 +
        hours * 60 * 60 * 1000 +
        minutes * 60 * 1000 +
        seconds * 1000
      );
    } catch {
      return 0;
    }
  }

  /**
   * Parse start time string (Mon DD HH:MM:SS YYYY) to Date
   */
  private parseStartTime(lstart: string): Date | undefined {
    try {
      // Format: Mon DD HH:MM:SS YYYY (e.g., "Dec 13 10:30:45 2025")
      const date = new Date(lstart);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch {
      // Ignore parse errors
    }
    return undefined;
  }

  /**
   * Check if ss command is available
   */
  private hasSSCommand(): boolean {
    try {
      execSync('which ss', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
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
      'dbus',
      'NetworkManager',
      'sshd',
    ];

    return criticalProcesses.some((name) =>
      processName.toLowerCase().includes(name.toLowerCase())
    );
  }
}
