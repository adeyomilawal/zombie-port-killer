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
            // Gather additional context information
            const context = await this.getProcessContext(pid);
            return {
                pid,
                port,
                processName,
                command,
                ...context,
            };
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Get process context information (uptime, parent process, service manager, working directory)
     */
    async getProcessContext(pid) {
        const context = {};
        try {
            // Get CreationDate, ParentProcessId, and ExecutablePath using wmic
            const wmicResult = (0, child_process_1.execSync)(`wmic process where "ProcessId=${pid}" get CreationDate,ParentProcessId,ExecutablePath /format:list`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
            // Parse CreationDate (format: YYYYMMDDHHmmss.microseconds+timezone)
            const creationDateMatch = wmicResult.match(/CreationDate=([^\r\n]+)/);
            if (creationDateMatch) {
                const creationDateStr = creationDateMatch[1].trim();
                const startTime = this.parseWindowsCreationDate(creationDateStr);
                if (startTime) {
                    context.startTime = startTime;
                    // Calculate uptime
                    context.uptime = Date.now() - startTime.getTime();
                }
            }
            // Parse ParentProcessId
            const parentPidMatch = wmicResult.match(/ParentProcessId=([^\r\n]+)/);
            if (parentPidMatch) {
                const parentPid = parseInt(parentPidMatch[1].trim());
                if (!isNaN(parentPid) && parentPid > 0) {
                    context.parentPid = parentPid;
                    // Try to get parent process name
                    try {
                        const parentWmic = (0, child_process_1.execSync)(`wmic process where "ProcessId=${parentPid}" get Name /format:list`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
                        const parentNameMatch = parentWmic.match(/Name=([^\r\n]+)/);
                        if (parentNameMatch) {
                            context.parentProcessName = parentNameMatch[1].trim();
                        }
                    }
                    catch {
                        // Ignore - parent name is optional
                    }
                }
            }
            // Parse ExecutablePath (working directory is the directory of the executable)
            const executablePathMatch = wmicResult.match(/ExecutablePath=([^\r\n]+)/);
            if (executablePathMatch) {
                const executablePath = executablePathMatch[1].trim();
                // Extract directory from path
                const path = require('path');
                context.workingDirectory = path.dirname(executablePath);
            }
        }
        catch {
            // Ignore errors - context info is optional
        }
        try {
            // Check if managed by Windows Service
            // Use sc query to find services, then match by PID
            const scResult = (0, child_process_1.execSync)('sc query type= service state= all', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
            // This is a simplified check - Windows services are complex
            // We'll check if the process name matches common service patterns
            // A more accurate method would require WMI queries which are slower
            const servicePatterns = [
                /^svchost\.exe$/i,
                /^services\.exe$/i,
                /^spoolsv\.exe$/i,
            ];
            // Note: Full service detection on Windows requires more complex logic
            // For now, we'll mark it if parent is services.exe (PID 4 or system)
            if (context.parentPid === 4 || context.parentProcessName?.toLowerCase().includes('services')) {
                context.serviceManager = 'windows-service';
            }
        }
        catch {
            // Ignore errors - service detection is optional
        }
        return context;
    }
    /**
     * Parse Windows CreationDate format (YYYYMMDDHHmmss.microseconds+timezone) to Date
     */
    parseWindowsCreationDate(dateStr) {
        try {
            // Format: YYYYMMDDHHmmss.microseconds+timezone
            // Example: 20251213103045.123456+060
            // Extract: YYYYMMDDHHmmss
            const datePart = dateStr.substring(0, 14);
            if (datePart.length !== 14) {
                return undefined;
            }
            const year = parseInt(datePart.substring(0, 4));
            const month = parseInt(datePart.substring(4, 6)) - 1; // Month is 0-indexed
            const day = parseInt(datePart.substring(6, 8));
            const hour = parseInt(datePart.substring(8, 10));
            const minute = parseInt(datePart.substring(10, 12));
            const second = parseInt(datePart.substring(12, 14));
            const date = new Date(year, month, day, hour, minute, second);
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