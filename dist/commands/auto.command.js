"use strict";
/**
 * Auto Command
 * Manages auto-kill functionality
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoCommand = void 0;
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
class AutoCommand {
    constructor(processService, storageService, projectService) {
        this.processService = processService;
        this.storageService = storageService;
        this.projectService = projectService;
    }
    /**
     * Enable auto-kill
     */
    async enable() {
        this.storageService.setAutoKill(true);
        console.log(chalk_1.default.green('✅ Auto-kill enabled globally'));
        console.log(chalk_1.default.gray('\nZombie processes from other projects will be automatically killed when you switch projects.'));
        this.printIntegrationInstructions();
    }
    /**
     * Disable auto-kill
     */
    async disable() {
        this.storageService.setAutoKill(false);
        console.log(chalk_1.default.yellow('⚠️  Auto-kill disabled'));
        console.log(chalk_1.default.gray('\nYou will need to manually kill processes using zkill <port>'));
    }
    /**
     * Check for zombie processes and kill them
     */
    async checkAndKill() {
        if (!this.storageService.isAutoKillEnabled()) {
            return; // Auto-kill not enabled, exit silently
        }
        const currentProject = this.projectService.getCurrentProjectName();
        const currentPath = this.projectService.getCurrentProjectPath();
        // Get all port mappings
        const mappings = this.storageService.getAllMappings();
        // Find ports from OTHER projects
        const otherProjectPorts = mappings.filter((m) => m.projectPath !== currentPath && m.autoKill);
        if (otherProjectPorts.length === 0) {
            return; // No ports from other projects with auto-kill enabled
        }
        // Find which of these ports are actually in use
        const portsInUse = [];
        for (const mapping of otherProjectPorts) {
            const process = await this.processService.findByPort(mapping.port);
            if (process) {
                portsInUse.push({ mapping, process });
            }
        }
        if (portsInUse.length === 0) {
            return; // Ports not actually in use
        }
        // Show what we found
        console.log(chalk_1.default.cyan(`\n🔄 Project switch detected: ${chalk_1.default.bold(currentProject)}`));
        console.log(chalk_1.default.yellow(`\n🔍 Found ${portsInUse.length} port(s) from previous project(s):`));
        portsInUse.forEach(({ mapping, process }) => {
            console.log(chalk_1.default.gray(`   Port ${mapping.port} (${process.processName}, PID: ${process.pid}) - ${mapping.projectName}`));
        });
        // Ask for confirmation
        const { confirmed } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'confirmed',
                message: 'Auto-kill these processes?',
                default: true,
            },
        ]);
        if (!confirmed) {
            console.log(chalk_1.default.gray('Skipped auto-kill.'));
            return;
        }
        // Kill all processes
        let killedCount = 0;
        for (const { process } of portsInUse) {
            const success = await this.processService.killProcess(process.pid, false);
            if (success) {
                killedCount++;
            }
        }
        console.log(chalk_1.default.green(`\n✅ Killed ${killedCount} process(es)`));
        console.log(chalk_1.default.green(`📝 Ports ${portsInUse.map((p) => p.mapping.port).join(', ')} now available`));
    }
    /**
     * Show auto-kill status
     */
    status() {
        const isEnabled = this.storageService.isAutoKillEnabled();
        console.log(chalk_1.default.bold('\n⚙️  Auto-Kill Status:\n'));
        if (isEnabled) {
            console.log(chalk_1.default.green('✅ Enabled'));
            console.log(chalk_1.default.gray('\nAuto-kill will prompt you to kill processes from other projects when you switch directories.'));
        }
        else {
            console.log(chalk_1.default.red('❌ Disabled'));
            console.log(chalk_1.default.gray('\nTo enable: zkill auto enable'));
        }
        // Show ports with auto-kill enabled
        const mappings = this.storageService
            .getAllMappings()
            .filter((m) => m.autoKill);
        if (mappings.length > 0) {
            console.log(chalk_1.default.bold(`\n📋 Ports with auto-kill enabled (${mappings.length}):\n`));
            mappings.forEach((m) => {
                console.log(chalk_1.default.cyan(`Port ${m.port}`) +
                    chalk_1.default.gray(' → ') +
                    chalk_1.default.white(m.projectName));
            });
        }
    }
    /**
     * Print integration instructions for shell
     */
    printIntegrationInstructions() {
        console.log(chalk_1.default.bold('\n📝 Optional: Shell Integration\n'));
        console.log(chalk_1.default.gray('For automatic checking on directory change, add this to your shell config:\n'));
        const bashZsh = chalk_1.default.cyan(`
# Bash/Zsh (~/.bashrc or ~/.zshrc)
function cd() {
  builtin cd "$@"
  zkill auto check
}
    `);
        const fish = chalk_1.default.cyan(`
# Fish (~/.config/fish/config.fish)
function cd
  builtin cd $argv
  zkill auto check
end
    `);
        const powershell = chalk_1.default.cyan(`
# PowerShell ($PROFILE)
function cd {
  Set-Location $args
  zkill auto check
}
    `);
        console.log(chalk_1.default.bold('Bash/Zsh:'));
        console.log(bashZsh);
        console.log(chalk_1.default.bold('Fish:'));
        console.log(fish);
        console.log(chalk_1.default.bold('PowerShell:'));
        console.log(powershell);
        console.log(chalk_1.default.gray('After adding, restart your shell or run: source ~/.bashrc (or equivalent)\n'));
    }
    /**
     * Toggle auto-kill for a specific port
     */
    async togglePort(port) {
        const mapping = this.storageService.getPortMapping(port);
        if (!mapping) {
            console.log(chalk_1.default.yellow(`\nNo mapping found for port ${port}. Use zkill ${port} first to create a mapping.`));
            return;
        }
        // Toggle auto-kill
        this.storageService.addPortMapping({
            ...mapping,
            autoKill: !mapping.autoKill,
        });
        if (mapping.autoKill) {
            console.log(chalk_1.default.yellow(`\n❌ Auto-kill disabled for port ${port} (${mapping.projectName})`));
        }
        else {
            console.log(chalk_1.default.green(`\n✅ Auto-kill enabled for port ${port} (${mapping.projectName})`));
        }
    }
}
exports.AutoCommand = AutoCommand;
//# sourceMappingURL=auto.command.js.map