"use strict";
/**
 * macOS Platform Adapter
 * Uses lsof and ps commands to detect and manage processes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MacOSAdapter = void 0;
const child_process_1 = require("child_process");
class MacOSAdapter {
    /**
     * Find process using a specific port
     */
    async findProcessByPort(port) {
        try {
            // Use lsof to find process ID using the port
            const pidResult = (0, child_process_1.execSync)(`lsof -ti :${port}`, {
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
        }
        catch (error) {
            // Port not in use or permission denied
            return null;
        }
    }
    /**
     * Kill a process by PID
     */
    async killProcess(pid, force = false) {
        try {
            const signal = force ? '-9' : '-15'; // SIGKILL or SIGTERM
            (0, child_process_1.execSync)(`kill ${signal} ${pid}`, {
                stdio: 'ignore',
            });
            // Wait a moment and verify process is dead
            await this.sleep(100);
            try {
                (0, child_process_1.execSync)(`ps -p ${pid}`, { stdio: 'ignore' });
                // If we get here, process is still alive
                return false;
            }
            catch {
                // Process is dead (ps command failed)
                return true;
            }
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get all listening ports
     */
    async getAllListeningPorts() {
        try {
            // Use lsof to get all listening TCP ports
            const result = (0, child_process_1.execSync)('lsof -iTCP -sTCP:LISTEN -n -P', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
            const lines = result.trim().split('\n').slice(1); // Skip header
            const processes = [];
            const seen = new Set();
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length < 9)
                    continue;
                const pid = parseInt(parts[1]);
                const addressPart = parts[8];
                // Extract port from address (format: *:3000 or 127.0.0.1:3000)
                const portMatch = addressPart.match(/:(\d+)$/);
                if (!portMatch)
                    continue;
                const port = parseInt(portMatch[1]);
                const key = `${pid}:${port}`;
                // Skip duplicates
                if (seen.has(key))
                    continue;
                seen.add(key);
                const processInfo = await this.getProcessDetails(pid, port);
                if (processInfo) {
                    processes.push(processInfo);
                }
            }
            return processes;
        }
        catch (error) {
            return [];
        }
    }
    /**
     * Get detailed information about a process
     */
    async getProcessDetails(pid, port) {
        try {
            // Get process name, command, user using ps
            const psResult = (0, child_process_1.execSync)(`ps -p ${pid} -o comm=,command=,user=`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
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
            // Gather additional context information
            const context = await this.getProcessContext(pid);
            return {
                pid,
                port,
                processName,
                command,
                user,
                ...context,
            };
        }
        catch (error) {
            // Process might have exited or permission denied
            return null;
        }
    }
    /**
     * Get process context information (uptime, parent process, service manager, working directory)
     */
    async getProcessContext(pid) {
        const context = {};
        try {
            // Get uptime (etime) and start time (lstart) in one call
            const timeResult = (0, child_process_1.execSync)(`ps -p ${pid} -o etime=,lstart=`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
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
        }
        catch {
            // Ignore errors - uptime/startTime are optional
        }
        try {
            // Get parent PID and parent process name
            const parentResult = (0, child_process_1.execSync)(`ps -p ${pid} -o ppid=,ppidcmd=`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
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
        }
        catch {
            // Ignore errors - parent info is optional
        }
        try {
            // Get working directory
            const cwdResult = (0, child_process_1.execSync)(`ps -p ${pid} -o cwd=`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
            if (cwdResult) {
                context.workingDirectory = cwdResult;
            }
        }
        catch {
            // Ignore errors - working directory is optional
        }
        try {
            // Check if managed by launchd
            // Use launchctl list with PID filter for more accurate detection
            const launchctlResult = (0, child_process_1.execSync)(`launchctl list | grep "^${pid}\\s"`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
            if (launchctlResult) {
                // Format: PID Status Label [other columns...]
                // Example: "631 0 com.apple.airplayd"
                const parts = launchctlResult.split(/\s+/);
                if (parts.length >= 3) {
                    context.serviceManager = 'launchd';
                    // Label (service name) is typically the 3rd column
                    context.serviceName = parts[2];
                }
                else if (parts.length >= 2) {
                    // If only 2 parts, it's still a launchd service
                    context.serviceManager = 'launchd';
                }
            }
        }
        catch {
            // Ignore errors - service detection is optional
            // grep will exit with code 1 if no match found, which is expected
        }
        return context;
    }
    /**
     * Parse elapsed time string (DD-HH:MM:SS, HH:MM:SS, or MM:SS) to milliseconds
     */
    parseElapsedTime(etime) {
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
            }
            else {
                // Format: HH:MM:SS or MM:SS
                const parts = etime.split(':');
                if (parts.length === 3) {
                    // HH:MM:SS
                    hours = parseInt(parts[0]) || 0;
                    minutes = parseInt(parts[1]) || 0;
                    seconds = parseInt(parts[2]) || 0;
                }
                else if (parts.length === 2) {
                    // MM:SS
                    minutes = parseInt(parts[0]) || 0;
                    seconds = parseInt(parts[1]) || 0;
                }
            }
            return (days * 24 * 60 * 60 * 1000 +
                hours * 60 * 60 * 1000 +
                minutes * 60 * 1000 +
                seconds * 1000);
        }
        catch {
            return 0;
        }
    }
    /**
     * Parse start time string (Mon DD HH:MM:SS YYYY) to Date
     */
    parseStartTime(lstart) {
        try {
            // Format: Mon DD HH:MM:SS YYYY (e.g., "Dec 13 10:30:45 2025")
            const date = new Date(lstart);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
        catch {
            // Ignore parse errors
        }
        return undefined;
    }
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Check if a process is critical (system process)
     */
    isCriticalProcess(processName) {
        const criticalProcesses = [
            'systemd',
            'init',
            'kernel',
            'launchd',
            'WindowServer',
            'loginwindow',
        ];
        return criticalProcesses.some((name) => processName.toLowerCase().includes(name.toLowerCase()));
    }
}
exports.MacOSAdapter = MacOSAdapter;
//# sourceMappingURL=macos.adapter.js.map