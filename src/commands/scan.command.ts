/**
 * Scan Command
 * Lists all ports in use and port mappings
 */

import chalk from "chalk";
import ora from "ora";
import { ProcessService } from "../services/process.service";
import { StorageService } from "../services/storage.service";
import { ProcessInfo } from "../types";

export interface ScanOptions {
  range?: string;
  process?: string;
  system?: boolean; // true to show system, false to hide
}

export class ScanCommand {
  constructor(
    private processService: ProcessService,
    private storageService: StorageService
  ) {}

  /**
   * Execute scan command - list all ports in use
   */
  async execute(options: ScanOptions = {}): Promise<void> {
    const spinner = ora("Scanning for active ports...").start();

    let processes = await this.processService.getAllPorts();

    spinner.stop();

    // Apply filters
    processes = this.applyFilters(processes, options);

    if (processes.length === 0) {
      console.log(
        chalk.yellow("\nNo ports currently in use matching your filters.")
      );
      return;
    }

    // Show active filters
    this.showActiveFilters(options);

    console.log(chalk.bold(`\n📊 Active Ports (${processes.length} found):\n`));

    // Sort by port number
    const sorted = processes.sort((a, b) => a.port - b.port);

    // Display each process
    for (const process of sorted) {
      this.displayProcess(process);
    }

    console.log(""); // Empty line at the end
  }

  /**
   * Apply filters to process list
   */
  private applyFilters(
    processes: ProcessInfo[],
    options: ScanOptions
  ): ProcessInfo[] {
    let filtered = [...processes];

    // Filter by port range
    if (options.range) {
      const { min, max } = this.parsePortRange(options.range);
      filtered = filtered.filter((p) => p.port >= min && p.port <= max);
    }

    // Filter by process name
    if (options.process) {
      const searchTerm = options.process.toLowerCase();
      filtered = filtered.filter((p) =>
        p.processName.toLowerCase().includes(searchTerm)
      );
    }

    // Hide system processes
    if (options.system === false) {
      filtered = filtered.filter(
        (p) => !this.processService.isCriticalProcess(p)
      );
    }

    return filtered;
  }

  /**
   * Parse port range string (e.g., "3000-9000")
   */
  private parsePortRange(range: string): { min: number; max: number } {
    const parts = range.split("-").map((s) => s.trim());

    if (parts.length !== 2) {
      throw new Error("Invalid port range format. Use: --range 3000-9000");
    }

    const min = parseInt(parts[0]);
    const max = parseInt(parts[1]);

    if (isNaN(min) || isNaN(max)) {
      throw new Error("Port range must contain valid numbers");
    }

    if (min < 1 || max > 65535 || min > max) {
      throw new Error(
        "Invalid port range. Ports must be 1-65535 and min <= max"
      );
    }

    return { min, max };
  }

  /**
   * Show active filters
   */
  private showActiveFilters(options: ScanOptions): void {
    const filters: string[] = [];

    if (options.range) {
      filters.push(chalk.cyan(`Port range: ${options.range}`));
    }

    if (options.process) {
      filters.push(chalk.cyan(`Process: ${options.process}`));
    }

    if (options.system === false) {
      filters.push(chalk.cyan("Hiding system processes"));
    }

    if (filters.length > 0) {
      console.log(chalk.gray("\n🔍 Filters: " + filters.join(", ")));
    }
  }

  /**
   * List all port-to-project mappings
   */
  listMappings(): void {
    const mappings = this.storageService.getAllMappings();

    if (mappings.length === 0) {
      console.log(chalk.yellow("\nNo port mappings configured yet."));
      console.log(
        chalk.gray(
          "\nPort mappings are created automatically when you kill a process from within a project directory."
        )
      );
      return;
    }

    console.log(
      chalk.bold(`\n📋 Port Mappings (${mappings.length} configured):\n`)
    );

    for (const mapping of mappings) {
      const lastUsed = this.formatDate(mapping.lastUsed);
      const autoKill = mapping.autoKill ? chalk.green(" [auto-kill]") : "";

      console.log(
        chalk.cyan(`Port ${chalk.bold(mapping.port)}`) +
          chalk.gray(" → ") +
          chalk.white(mapping.projectName) +
          autoKill
      );
      console.log(chalk.gray(`     ${mapping.projectPath}`));
      console.log(chalk.gray(`     Last used: ${lastUsed}\n`));
    }

    console.log(
      chalk.gray(`Config file: ${this.storageService.getConfigPath()}`)
    );
  }

  /**
   * Display process information
   */
  private displayProcess(process: ProcessInfo): void {
    const mapping = this.storageService.getPortMapping(process.port);
    const projectInfo = mapping ? chalk.gray(` (${mapping.projectName})`) : "";

    console.log(
      chalk.cyan(`Port ${chalk.bold(process.port)}`) +
        chalk.gray(" - ") +
        chalk.white(process.processName) +
        projectInfo
    );
    console.log(chalk.gray(`     PID: ${process.pid}`));
    console.log(
      chalk.gray(`     Command: ${this.truncate(process.command, 60)}`)
    );

    if (process.user) {
      console.log(chalk.gray(`     User: ${process.user}`));
    }

    console.log(""); // Empty line between processes
  }

  /**
   * Truncate string if too long
   */
  private truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + "...";
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

    if (diffMins < 1) return "just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

    return date.toLocaleDateString();
  }
}
