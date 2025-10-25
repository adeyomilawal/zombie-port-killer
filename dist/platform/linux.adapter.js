"use strict";
/**
 * Linux Platform Adapter
 * Uses ss/netstat and ps commands to detect and manage processes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinuxAdapter = void 0;
const child_process_1 = require("child_process");
class LinuxAdapter {
    /**
     * Find process using a specific port
     */
    async findProcessByPort(port) {
        try {
            // Try ss first (modern Linux), fallback to netstat
            const result = this.hasSSCommand()
                ? this.findWithSS(port)
                : this.findWithNetstat(port);
            return result;
        }
        catch (error) {
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
            const result = this.hasSSCommand()
                ? this.getAllWithSS()
                : this.getAllWithNetstat();
            return result;
        }
        catch (error) {
            return [];
        }
    }
    /**
     * Find process using ss command
     */
    findWithSS(port) {
        try {
            const result = (0, child_process_1.execSync)(`ss -lptn 'sport = :${port}'`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
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
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Find process using netstat command
     */
    findWithNetstat(port) {
        try {
            const result = (0, child_process_1.execSync)(`netstat -ltnp 2>/dev/null | grep :${port}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
            // Parse netstat output
            // Format: tcp  0  0 0.0.0.0:3000  0.0.0.0:*  LISTEN  12345/node
            const lines = result.trim().split('\n');
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length < 7)
                    continue;
                const lastPart = parts[6];
                const pidMatch = lastPart.match(/^(\d+)/);
                if (!pidMatch)
                    continue;
                const pid = parseInt(pidMatch[1]);
                if (isNaN(pid) || pid <= 0)
                    continue;
                return this.getProcessDetails(pid, port);
            }
            return null;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Get all listening ports using ss
     */
    getAllWithSS() {
        try {
            const result = (0, child_process_1.execSync)('ss -lptn', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
            const lines = result.trim().split('\n').slice(1); // Skip header
            const processes = [];
            const seen = new Set();
            for (const line of lines) {
                const pidMatch = line.match(/pid=(\d+)/);
                const portMatch = line.match(/:(\d+)\s/);
                if (!pidMatch || !portMatch)
                    continue;
                const pid = parseInt(pidMatch[1]);
                const port = parseInt(portMatch[1]);
                if (isNaN(pid) || isNaN(port))
                    continue;
                const key = `${pid}:${port}`;
                if (seen.has(key))
                    continue;
                seen.add(key);
                const processInfo = this.getProcessDetails(pid, port);
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
     * Get all listening ports using netstat
     */
    getAllWithNetstat() {
        try {
            const result = (0, child_process_1.execSync)('netstat -ltnp 2>/dev/null', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
            const lines = result.trim().split('\n').slice(2); // Skip headers
            const processes = [];
            const seen = new Set();
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length < 7)
                    continue;
                const addressPart = parts[3];
                const portMatch = addressPart.match(/:(\d+)$/);
                if (!portMatch)
                    continue;
                const port = parseInt(portMatch[1]);
                const lastPart = parts[6];
                const pidMatch = lastPart.match(/^(\d+)/);
                if (!pidMatch)
                    continue;
                const pid = parseInt(pidMatch[1]);
                const key = `${pid}:${port}`;
                if (seen.has(key))
                    continue;
                seen.add(key);
                const processInfo = this.getProcessDetails(pid, port);
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
    getProcessDetails(pid, port) {
        try {
            const psResult = (0, child_process_1.execSync)(`ps -p ${pid} -o comm=,cmd=,user=`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
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
            return {
                pid,
                port,
                processName,
                command,
                user,
            };
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Check if ss command is available
     */
    hasSSCommand() {
        try {
            (0, child_process_1.execSync)('which ss', { stdio: 'ignore' });
            return true;
        }
        catch {
            return false;
        }
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
            'dbus',
            'NetworkManager',
            'sshd',
        ];
        return criticalProcesses.some((name) => processName.toLowerCase().includes(name.toLowerCase()));
    }
}
exports.LinuxAdapter = LinuxAdapter;
//# sourceMappingURL=linux.adapter.js.map