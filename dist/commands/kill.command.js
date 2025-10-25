"use strict";
/**
 * Kill Command
 * Handles killing processes on specific ports
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KillCommand = void 0;
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const ora_1 = __importDefault(require("ora"));
class KillCommand {
    constructor(processService, storageService, projectService) {
        this.processService = processService;
        this.storageService = storageService;
        this.projectService = projectService;
    }
    /**
     * Execute kill command
     */
    async execute(port, forceFlag = false) {
        const spinner = (0, ora_1.default)(`Checking port ${port}...`).start();
        // Find process using the port
        const process = await this.processService.findByPort(port);
        if (!process) {
            spinner.fail(chalk_1.default.red(`Port ${port} is not in use`));
            return;
        }
        spinner.succeed(chalk_1.default.green(`Port ${port} is in use`));
        // Display process information
        this.displayProcessInfo(process);
        // Check if it's from a previous project
        const mapping = this.storageService.getPortMapping(port);
        if (mapping) {
            console.log(chalk_1.default.cyan(`\n📁 Last used by project: ${chalk_1.default.bold(mapping.projectName)}`));
            console.log(chalk_1.default.gray(`   Path: ${mapping.projectPath}`));
        }
        // Check if process is critical
        if (this.processService.isCriticalProcess(process)) {
            console.log(chalk_1.default.yellow.bold('\n⚠️  Warning: This appears to be a system process!'));
            console.log(chalk_1.default.yellow('Killing it may cause system instability.'));
        }
        // Confirm kill (unless force flag or confirmKill is disabled)
        const shouldConfirm = !forceFlag && this.storageService.isConfirmKillEnabled();
        if (shouldConfirm) {
            const confirmed = await this.confirmKill(process);
            if (!confirmed) {
                console.log(chalk_1.default.gray('\nOperation cancelled.'));
                return;
            }
        }
        // Perform kill
        await this.performKill(process);
        // Update port mapping for current project
        const currentProject = this.projectService.getCurrentProjectName();
        const currentPath = this.projectService.getCurrentProjectPath();
        if (this.projectService.isProjectDirectory()) {
            this.storageService.addPortMapping({
                port,
                projectName: currentProject,
                projectPath: currentPath,
                autoKill: false,
            });
            console.log(chalk_1.default.gray(`\n📝 Port ${port} now associated with project: ${currentProject}`));
        }
    }
    /**
     * Display process information
     */
    displayProcessInfo(process) {
        console.log('\n' + chalk_1.default.bold('Process Details:'));
        console.log(chalk_1.default.cyan(`  Process:  ${process.processName}`));
        console.log(chalk_1.default.cyan(`  PID:      ${process.pid}`));
        console.log(chalk_1.default.cyan(`  Command:  ${process.command}`));
        if (process.user) {
            console.log(chalk_1.default.cyan(`  User:     ${process.user}`));
        }
    }
    /**
     * Confirm kill with user
     */
    async confirmKill(process) {
        const { confirmed } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'confirmed',
                message: `Are you sure you want to kill process ${process.pid}?`,
                default: false,
            },
        ]);
        return confirmed;
    }
    /**
     * Perform the kill operation
     */
    async performKill(process) {
        const spinner = (0, ora_1.default)('Terminating process...').start();
        // Try graceful termination first
        let success = await this.processService.killProcess(process.pid, false);
        if (!success) {
            spinner.text = 'Graceful termination failed, trying force kill...';
            await this.sleep(500);
            success = await this.processService.killProcess(process.pid, true);
        }
        if (success) {
            spinner.succeed(chalk_1.default.green(`Process ${process.pid} terminated successfully`));
            console.log(chalk_1.default.green(`\nPort ${process.port} is now available.`));
        }
        else {
            spinner.fail(chalk_1.default.red('Failed to terminate process'));
            console.log(chalk_1.default.yellow('\nYou may need elevated privileges (sudo on macOS/Linux, Administrator on Windows).'));
            console.log(chalk_1.default.gray(`\nTry: ${chalk_1.default.white(`sudo zkill ${process.port}`)}`));
        }
    }
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.KillCommand = KillCommand;
//# sourceMappingURL=kill.command.js.map