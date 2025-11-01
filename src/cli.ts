#!/usr/bin/env node

/**
 * Zombie Port Killer CLI
 * Main entry point for the zkill command
 */

import { Command } from "commander";
import chalk from "chalk";
import { KillCommand } from "./commands/kill.command";
import { ScanCommand } from "./commands/scan.command";
import { AutoCommand } from "./commands/auto.command";
import { ProcessService } from "./services/process.service";
import { StorageService } from "./services/storage.service";
import { ProjectService } from "./services/project.service";

// Initialize services
const processService = new ProcessService();
const storageService = new StorageService();
const projectService = new ProjectService();

// Initialize commands
const killCommand = new KillCommand(
  processService,
  storageService,
  projectService
);
const scanCommand = new ScanCommand(processService, storageService);
const autoCommand = new AutoCommand(
  processService,
  storageService,
  projectService
);

// Create CLI program
const program = new Command();

program
  .name("zkill")
  .description("Kill zombie processes blocking your ports")
  .version("1.0.0");

// Main command: zkill <port>
program
  .argument("[port]", "Port number to check and kill")
  .option("-f, --force", "Force kill without confirmation")
  .action(async (port: string | undefined, options) => {
    try {
      // If no port provided, show help
      if (!port) {
        program.help();
        return;
      }

      const portNum = parseInt(port);

      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        console.error(chalk.red("❌ Error: Invalid port number"));
        console.error(chalk.gray("Port must be a number between 1 and 65535"));
        process.exit(1);
      }

      await killCommand.execute(portNum, options.force);
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      handleError(error);
    }
  });

// Auto command: zkill auto <action>
program
  .command("auto <action>")
  .description(
    "Manage auto-kill on project switch (actions: enable, disable, check, status)"
  )
  .action(async (action: string) => {
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
          console.error(chalk.red(`❌ Error: Invalid action "${action}"`));
          console.error(
            chalk.gray("Valid actions: enable, disable, check, status")
          );
          process.exit(1);
      }
    } catch (error) {
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
    } catch (error) {
      handleError(error);
    }
  });

// Handle errors
function handleError(error: unknown): void {
  if (error instanceof Error) {
    console.error(chalk.red("❌ Error:"), error.message);

    // Show stack trace in development
    if (process.env.DEBUG === "true") {
      console.error(chalk.gray("\nStack trace:"));
      console.error(chalk.gray(error.stack));
    }
  } else {
    console.error(chalk.red("❌ An unknown error occurred"));
  }

  process.exit(1);
}

// Show system and project info
function showInfo(): void {
  const platform = processService.getPlatformName();
  const isProject = projectService.isProjectDirectory();
  const projectType = projectService.getProjectType();
  const projectName = projectService.getCurrentProjectName();
  const projectPath = projectService.getCurrentProjectPath();
  const commonPorts = projectService.getCommonPortsForProjectType();
  const autoKillEnabled = storageService.isAutoKillEnabled();
  const configPath = storageService.getConfigPath();

  console.log(chalk.bold("\n⚙️  System Information:\n"));
  console.log(chalk.cyan("Platform:    ") + chalk.white(platform));
  console.log(chalk.cyan("Config file: ") + chalk.gray(configPath));
  console.log(
    chalk.cyan("Auto-kill:   ") +
      (autoKillEnabled ? chalk.green("Enabled") : chalk.red("Disabled"))
  );

  if (isProject) {
    console.log(chalk.bold("\n📁 Current Project:\n"));
    console.log(chalk.cyan("Name:        ") + chalk.white(projectName));
    console.log(
      chalk.cyan("Type:        ") + chalk.white(projectType || "Unknown")
    );
    console.log(chalk.cyan("Path:        ") + chalk.gray(projectPath));
    console.log(
      chalk.cyan("Common ports:") + chalk.white(` ${commonPorts.join(", ")}`)
    );
  } else {
    console.log(chalk.yellow("\n⚠️  Not in a project directory"));
  }

  const mappings = storageService.getAllMappings();
  if (mappings.length > 0) {
    console.log(
      chalk.bold(
        `\n📋 Port Mappings: ${chalk.white(mappings.length)} configured\n`
      )
    );
    console.log(chalk.gray('Run "zkill list" to see all mappings'));
  }

  console.log("");
}

// Add custom help
program.on("--help", () => {
  console.log("");
  console.log(chalk.bold("Examples:"));
  console.log("");
  console.log(chalk.gray("  # Kill process on port 3000"));
  console.log("  $ zkill 3000");
  console.log("");
  console.log(chalk.gray("  # Kill without confirmation"));
  console.log("  $ zkill 3000 --force");
  console.log("");
  console.log(chalk.gray("  # List all active ports"));
  console.log("  $ zkill scan");
  console.log("");
  console.log(chalk.gray("  # Filter ports by range"));
  console.log("  $ zkill scan --range 3000-9000");
  console.log("");
  console.log(chalk.gray("  # Filter by process name"));
  console.log("  $ zkill scan --process node");
  console.log("");
  console.log(chalk.gray("  # Hide system processes"));
  console.log("  $ zkill scan --no-system");
  console.log("");
  console.log(chalk.gray("  # List port mappings"));
  console.log("  $ zkill list");
  console.log("");
  console.log(chalk.gray("  # Enable auto-kill"));
  console.log("  $ zkill auto enable");
  console.log("");
  console.log(chalk.gray("  # Show system info"));
  console.log("  $ zkill info");
  console.log("");
});

// Parse arguments
program.parse();
