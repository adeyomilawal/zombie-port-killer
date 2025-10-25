/**
 * Scan Command
 * Lists all ports in use and port mappings
 */

import chalk from 'chalk';
import ora from 'ora';
import { ProcessService } from '../services/process.service';
import { StorageService } from '../services/storage.service';
import { ProcessInfo } from '../types';

export class ScanCommand {
  constructor(
    private processService: ProcessService,
    private storageService: StorageService
  ) {}

  /**
   * Execute scan command - list all ports in use
   */
  async execute(): Promise<void> {
    const spinner = ora('Scanning for active ports...').start();

    const processes = await this.processService.getAllPorts();

    spinner.stop();

    if (processes.length === 0) {
      console.log(chalk.yellow('\nNo ports currently in use.'));
      return;
    }

    console.log(chalk.bold(`\n📊 Active Ports (${processes.length} found):\n`));

    // Sort by port number
    const sorted = processes.sort((a, b) => a.port - b.port);

    // Display each process
    for (const process of sorted) {
      this.displayProcess(process);
    }

    console.log(''); // Empty line at the end
  }

  /**
   * List all port-to-project mappings
   */
  listMappings(): void {
    const mappings = this.storageService.getAllMappings();

    if (mappings.length === 0) {
      console.log(chalk.yellow('\nNo port mappings configured yet.'));
      console.log(
        chalk.gray(
          '\nPort mappings are created automatically when you kill a process from within a project directory.'
        )
      );
      return;
    }

    console.log(chalk.bold(`\n📋 Port Mappings (${mappings.length} configured):\n`));

    for (const mapping of mappings) {
      const lastUsed = this.formatDate(mapping.lastUsed);
      const autoKill = mapping.autoKill ? chalk.green(' [auto-kill]') : '';

      console.log(
        chalk.cyan(`Port ${chalk.bold(mapping.port)}`) +
          chalk.gray(' → ') +
          chalk.white(mapping.projectName) +
          autoKill
      );
      console.log(chalk.gray(`     ${mapping.projectPath}`));
      console.log(chalk.gray(`     Last used: ${lastUsed}\n`));
    }

    console.log(
      chalk.gray(
        `Config file: ${this.storageService.getConfigPath()}`
      )
    );
  }

  /**
   * Display process information
   */
  private displayProcess(process: ProcessInfo): void {
    const mapping = this.storageService.getPortMapping(process.port);
    const projectInfo = mapping
      ? chalk.gray(` (${mapping.projectName})`)
      : '';

    console.log(
      chalk.cyan(`Port ${chalk.bold(process.port)}`) +
        chalk.gray(' - ') +
        chalk.white(process.processName) +
        projectInfo
    );
    console.log(chalk.gray(`     PID: ${process.pid}`));
    console.log(chalk.gray(`     Command: ${this.truncate(process.command, 60)}`));

    if (process.user) {
      console.log(chalk.gray(`     User: ${process.user}`));
    }

    console.log(''); // Empty line between processes
  }

  /**
   * Truncate string if too long
   */
  private truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

    return date.toLocaleDateString();
  }
}
