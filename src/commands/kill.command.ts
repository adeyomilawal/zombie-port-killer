/**
 * Kill Command
 * Handles killing processes on specific ports
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { ProcessService } from '../services/process.service';
import { StorageService } from '../services/storage.service';
import { ProjectService } from '../services/project.service';
import { ProcessInfo } from '../types';

export class KillCommand {
  constructor(
    private processService: ProcessService,
    private storageService: StorageService,
    private projectService: ProjectService
  ) {}

  /**
   * Execute kill command
   */
  async execute(port: number, forceFlag: boolean = false): Promise<void> {
    const spinner = ora(`Checking port ${port}...`).start();

    // Find process using the port
    const process = await this.processService.findByPort(port);

    if (!process) {
      spinner.fail(chalk.red(`Port ${port} is not in use`));
      return;
    }

    spinner.succeed(chalk.green(`Port ${port} is in use`));

    // Display process information
    this.displayProcessInfo(process);

    // Check if it's from a previous project
    const mapping = this.storageService.getPortMapping(port);
    if (mapping) {
      console.log(
        chalk.cyan(`\n📁 Last used by project: ${chalk.bold(mapping.projectName)}`)
      );
      console.log(chalk.gray(`   Path: ${mapping.projectPath}`));
    }

    // Check if process is critical
    if (this.processService.isCriticalProcess(process)) {
      console.log(
        chalk.yellow.bold('\n⚠️  Warning: This appears to be a system process!')
      );
      console.log(
        chalk.yellow('Killing it may cause system instability.')
      );
    }

    // Confirm kill (unless force flag or confirmKill is disabled)
    const shouldConfirm = !forceFlag && this.storageService.isConfirmKillEnabled();
    if (shouldConfirm) {
      const confirmed = await this.confirmKill(process);
      if (!confirmed) {
        console.log(chalk.gray('\nOperation cancelled.'));
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

      console.log(
        chalk.gray(`\n📝 Port ${port} now associated with project: ${currentProject}`)
      );
    }
  }

  /**
   * Display process information
   */
  private displayProcessInfo(process: ProcessInfo): void {
    console.log('\n' + chalk.bold('Process Details:'));
    console.log(chalk.cyan(`  Process:  ${process.processName}`));
    console.log(chalk.cyan(`  PID:      ${process.pid}`));
    console.log(chalk.cyan(`  Command:  ${process.command}`));
    if (process.user) {
      console.log(chalk.cyan(`  User:     ${process.user}`));
    }
  }

  /**
   * Confirm kill with user
   */
  private async confirmKill(process: ProcessInfo): Promise<boolean> {
    const { confirmed } = await inquirer.prompt([
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
  private async performKill(process: ProcessInfo): Promise<void> {
    const spinner = ora('Terminating process...').start();

    // Try graceful termination first
    let success = await this.processService.killProcess(process.pid, false);

    if (!success) {
      spinner.text = 'Graceful termination failed, trying force kill...';
      await this.sleep(500);
      success = await this.processService.killProcess(process.pid, true);
    }

    if (success) {
      spinner.succeed(
        chalk.green(`Process ${process.pid} terminated successfully`)
      );
      console.log(chalk.green(`\nPort ${process.port} is now available.`));
    } else {
      spinner.fail(chalk.red('Failed to terminate process'));
      console.log(
        chalk.yellow(
          '\nYou may need elevated privileges (sudo on macOS/Linux, Administrator on Windows).'
        )
      );
      console.log(
        chalk.gray(`\nTry: ${chalk.white(`sudo zkill ${process.port}`)}`)
      );
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
