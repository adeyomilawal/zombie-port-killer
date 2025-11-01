#!/usr/bin/env node
"use strict";
/**
 * Zombie Port Killer CLI
 * Main entry point for the zkill command
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const kill_command_1 = require("./commands/kill.command");
const scan_command_1 = require("./commands/scan.command");
const auto_command_1 = require("./commands/auto.command");
const process_service_1 = require("./services/process.service");
const storage_service_1 = require("./services/storage.service");
const project_service_1 = require("./services/project.service");
// Initialize services
const processService = new process_service_1.ProcessService();
const storageService = new storage_service_1.StorageService();
const projectService = new project_service_1.ProjectService();
// Initialize commands
const killCommand = new kill_command_1.KillCommand(processService, storageService, projectService);
const scanCommand = new scan_command_1.ScanCommand(processService, storageService);
const autoCommand = new auto_command_1.AutoCommand(processService, storageService, projectService);
// Create CLI program
const program = new commander_1.Command();
// Read version from package.json
const package_json_1 = __importDefault(require("../package.json"));
program
    .name("zkill")
    .description("Kill zombie processes blocking your ports")
    .version(package_json_1.default.version);
// Main command: zkill <port>
program
    .argument("[port]", "Port number to check and kill")
    .option("-f, --force", "Force kill without confirmation")
    .action(async (port, options) => {
    try {
        // If no port provided, show help
        if (!port) {
            program.help();
            return;
        }
        const portNum = parseInt(port);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
            console.error(chalk_1.default.red("❌ Error: Invalid port number"));
            console.error(chalk_1.default.gray("Port must be a number between 1 and 65535"));
            process.exit(1);
        }
        await killCommand.execute(portNum, options.force);
    }
    catch (error) {
        handleError(error);
    }
});
// Scan command: zkill scan
program
    .command("scan")
    .description("List all ports in use")
    .option("-r, --range <range>", "Filter by port range (e.g., 3000-9000)")
    .option("-p, --process <name>", "Filter by process name")
    .option("--no-system", "Hide system processes")
    .action(async (options) => {
    try {
        await scanCommand.execute(options);
    }
    catch (error) {
        handleError(error);
    }
});
// List command: zkill list
program
    .command("list")
    .description("List all port-to-project mappings")
    .action(() => {
    try {
        scanCommand.listMappings();
    }
    catch (error) {
        handleError(error);
    }
});
// Auto command: zkill auto <action>
program
    .command("auto <action>")
    .description("Manage auto-kill on project switch (actions: enable, disable, check, status)")
    .action(async (action) => {
    try {
        switch (action.toLowerCase()) {
            case "enable":
                await autoCommand.enable();
                break;
            case "disable":
                await autoCommand.disable();
                break;
            case "check":
                await autoCommand.checkAndKill();
                break;
            case "status":
                autoCommand.status();
                break;
            default:
                console.error(chalk_1.default.red(`❌ Error: Invalid action "${action}"`));
                console.error(chalk_1.default.gray("Valid actions: enable, disable, check, status"));
                process.exit(1);
        }
    }
    catch (error) {
        handleError(error);
    }
});
// Info command: zkill info
program
    .command("info")
    .description("Show system and project information")
    .action(() => {
    try {
        showInfo();
    }
    catch (error) {
        handleError(error);
    }
});
// Handle errors
function handleError(error) {
    if (error instanceof Error) {
        console.error(chalk_1.default.red("❌ Error:"), error.message);
        // Show stack trace in development
        if (process.env.DEBUG === "true") {
            console.error(chalk_1.default.gray("\nStack trace:"));
            console.error(chalk_1.default.gray(error.stack));
        }
    }
    else {
        console.error(chalk_1.default.red("❌ An unknown error occurred"));
    }
    process.exit(1);
}
// Show system and project info
function showInfo() {
    const platform = processService.getPlatformName();
    const isProject = projectService.isProjectDirectory();
    const projectType = projectService.getProjectType();
    const projectName = projectService.getCurrentProjectName();
    const projectPath = projectService.getCurrentProjectPath();
    const commonPorts = projectService.getCommonPortsForProjectType();
    const autoKillEnabled = storageService.isAutoKillEnabled();
    const configPath = storageService.getConfigPath();
    console.log(chalk_1.default.bold("\n⚙️  System Information:\n"));
    console.log(chalk_1.default.cyan("Platform:    ") + chalk_1.default.white(platform));
    console.log(chalk_1.default.cyan("Config file: ") + chalk_1.default.gray(configPath));
    console.log(chalk_1.default.cyan("Auto-kill:   ") +
        (autoKillEnabled ? chalk_1.default.green("Enabled") : chalk_1.default.red("Disabled")));
    if (isProject) {
        console.log(chalk_1.default.bold("\n📁 Current Project:\n"));
        console.log(chalk_1.default.cyan("Name:        ") + chalk_1.default.white(projectName));
        console.log(chalk_1.default.cyan("Type:        ") + chalk_1.default.white(projectType || "Unknown"));
        console.log(chalk_1.default.cyan("Path:        ") + chalk_1.default.gray(projectPath));
        console.log(chalk_1.default.cyan("Common ports:") + chalk_1.default.white(` ${commonPorts.join(", ")}`));
    }
    else {
        console.log(chalk_1.default.yellow("\n⚠️  Not in a project directory"));
    }
    const mappings = storageService.getAllMappings();
    if (mappings.length > 0) {
        console.log(chalk_1.default.bold(`\n📋 Port Mappings: ${chalk_1.default.white(mappings.length)} configured\n`));
        console.log(chalk_1.default.gray('Run "zkill list" to see all mappings'));
    }
    console.log("");
}
// Add custom help
program.on("--help", () => {
    console.log("");
    console.log(chalk_1.default.bold("Examples:"));
    console.log("");
    console.log(chalk_1.default.gray("  # Kill process on port 3000"));
    console.log("  $ zkill 3000");
    console.log("");
    console.log(chalk_1.default.gray("  # Kill without confirmation"));
    console.log("  $ zkill 3000 --force");
    console.log("");
    console.log(chalk_1.default.gray("  # List all active ports"));
    console.log("  $ zkill scan");
    console.log("");
    console.log(chalk_1.default.gray("  # Filter ports by range"));
    console.log("  $ zkill scan --range 3000-9000");
    console.log("");
    console.log(chalk_1.default.gray("  # Filter by process name"));
    console.log("  $ zkill scan --process node");
    console.log("");
    console.log(chalk_1.default.gray("  # Hide system processes"));
    console.log("  $ zkill scan --no-system");
    console.log("");
    console.log(chalk_1.default.gray("  # List port mappings"));
    console.log("  $ zkill list");
    console.log("");
    console.log(chalk_1.default.gray("  # Enable auto-kill"));
    console.log("  $ zkill auto enable");
    console.log("");
    console.log(chalk_1.default.gray("  # Show system info"));
    console.log("  $ zkill info");
    console.log("");
});
// Parse arguments
program.parse();
//# sourceMappingURL=cli.js.map