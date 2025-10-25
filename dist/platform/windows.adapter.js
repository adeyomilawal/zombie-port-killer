"use strict";
/**
 * Windows Platform Adapter
 * Uses netstat and tasklist/taskkill commands to detect and manage processes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowsAdapter = void 0;
const child_process_1 = require("child_process");
class WindowsAdapter {
    /**
     * Find process using a specific port
     */
    async findProcessByPort(port) {
        try {
            // Use netstat to find process
            const result = (0, child_process_1.execSync)(`netstat -ano | findstr :${port}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
            // Parse netstat output
            // Format: TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    12345
            const lines = result.trim().split('\n');
            for (const line of lines) {
                // Look for LISTENING state
                if (!line.includes('LISTENING'))
                    continue;
                const parts = line.trim().split(/\s+/);
                if (parts.length < 5)
                    continue;
                const pid = parseInt(parts[parts.length - 1]);
                if (isNaN(pid) || pid <= 0)
                    continue;
                return await this.getProcessDetails(pid, port);
            }
            return null;
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
            const flag = force ? '/F' : '';
            (0, child_process_1.execSync)(`taskkill /PID ${pid} ${flag}`, {
                stdio: 'ignore',
            });
            // Wait a moment and verify process is dead
            await this.sleep(100);
            try {
                (0, child_process_1.execSync)(`tasklist /FI "PID eq ${pid}"`, { stdio: 'ignore' });
                const result = (0, child_process_1.execSync)(`tasklist /FI "PID eq ${pid}" /NH`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
                // If result contains "INFO: No tasks", process is dead
                if (result.includes('INFO: No tasks')) {
                    return true;
                }
                return false;
            }
            catch {
                // Command failed, assume process is dead
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
            const result = (0, child_process_1.execSync)('netstat -ano | findstr LISTENING', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
            const lines = result.trim().split('\n');
            const processes = [];
            const seen = new Set();
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length < 5)
                    continue;
                const addressPart = parts[1];
                const portMatch = addressPart.match(/:(\d+)$/);
                if (!portMatch)
                    continue;
                const port = parseInt(portMatch[1]);
                const pid = parseInt(parts[parts.length - 1]);
                if (isNaN(pid) || isNaN(port))
                    continue;
                const key = `${pid}:${port}`;
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
            // Get process details using tasklist
            const result = (0, child_process_1.execSync)(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
            if (!result || result.includes('INFO: No tasks')) {
                return null;
            }
            // Parse CSV output
            // Format: "node.exe","12345","Console","1","12,345 K"
            const csvLine = result.trim().split('\n')[0];
            if (!csvLine)
                return null;
            // Remove quotes and split by comma
            const parts = csvLine.split(',').map(p => p.replace(/"/g, ''));
            if (parts.length < 2)
                return null;
            const processName = parts[0];
            // Try to get command line (this might fail due to permissions)
            let command = processName;
            try {
                const wmic = (0, child_process_1.execSync)(`wmic process where "ProcessId=${pid}" get CommandLine /format:list`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
                const cmdMatch = wmic.match(/CommandLine=(.*)/);
                if (cmdMatch && cmdMatch[1].trim()) {
                    command = cmdMatch[1].trim();
                }
            }
            catch {
                // Permission denied or wmic not available, use processName
                command = processName;
            }
            return {
                pid,
                port,
                processName,
                command,
            };
        }
        catch (error) {
            return null;
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
            'svchost.exe',
            'csrss.exe',
            'winlogon.exe',
            'explorer.exe',
            'System',
            'smss.exe',
            'services.exe',
            'lsass.exe',
        ];
        return criticalProcesses.some((name) => processName.toLowerCase().includes(name.toLowerCase()));
    }
}
exports.WindowsAdapter = WindowsAdapter;
//# sourceMappingURL=windows.adapter.js.map