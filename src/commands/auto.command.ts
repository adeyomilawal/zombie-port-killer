/**
 * Auto Command
 * Manages auto-kill functionality
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { ProcessService } from '../services/process.service';
import { StorageService } from '../services/storage.service';
import { ProjectService } from '../services/project.service';

export class AutoCommand {
  constructor(
    private processService: ProcessService,
    private storageService: StorageService,
    private projectService: ProjectService
  ) {}

  /**
   * Enable auto-kill
   */
  async enable(): Promise<void> {
    this.storageService.setAutoKill(true);
    console.log(chalk.green('✅ Auto-kill enabled globally'));
    console.log(
      chalk.gray(
        '\nZombie processes from other projects will be automatically killed when you switch projects.'
      )
    );
    this.printIntegrationInstructions();
  }

  /**
   * Disable auto-kill
   */
  async disable(): Promise<void> {
    this.storageService.setAutoKill(false);
    console.log(chalk.yellow('⚠️  Auto-kill disabled'));
    console.log(
      chalk.gray('\nYou will need to manually kill processes using zkill <port>')
    );
  }

  /**
   * Check for zombie processes and kill them
   */
  async checkAndKill(): Promise<void> {
    if (!this.storageService.isAutoKillEnabled()) {
      return; // Auto-kill not enabled, exit silently
    }

    const currentProject = this.projectService.getCurrentProjectName();
    const currentPath = this.projectService.getCurrentProjectPath();

    // Get all port mappings
    const mappings = this.storageService.getAllMappings();

    // Find ports from OTHER projects
    const otherProjectPorts = mappings.filter(
      (m) => m.projectPath !== currentPath && m.autoKill
    );

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
    console.log(
      chalk.cyan(`\n🔄 Project switch detected: ${chalk.bold(currentProject)}`)
    );
    console.log(
      chalk.yellow(
        `\n🔍 Found ${portsInUse.length} port(s) from previous project(s):`
      )
    );

    portsInUse.forEach(({ mapping, process }) => {
      console.log(
        chalk.gray(
          `   Port ${mapping.port} (${process.processName}, PID: ${process.pid}) - ${mapping.projectName}`
        )
      );
    });

    // Ask for confirmation
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'Auto-kill these processes?',
        default: true,
      },
    ]);

    if (!confirmed) {
      console.log(chalk.gray('Skipped auto-kill.'));
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

    console.log(chalk.green(`\n✅ Killed ${killedCount} process(es)`));
    console.log(
      chalk.green(
        `📝 Ports ${portsInUse.map((p) => p.mapping.port).join(', ')} now available`
      )
    );
  }

  /**
   * Show auto-kill status
   */
  status(): void {
    const isEnabled = this.storageService.isAutoKillEnabled();

    console.log(chalk.bold('\n⚙️  Auto-Kill Status:\n'));

    if (isEnabled) {
      console.log(chalk.green('✅ Enabled'));
      console.log(
        chalk.gray(
          '\nAuto-kill will prompt you to kill processes from other projects when you switch directories.'
        )
      );
    } else {
      console.log(chalk.red('❌ Disabled'));
      console.log(chalk.gray('\nTo enable: zkill auto enable'));
    }

    // Show ports with auto-kill enabled
    const mappings = this.storageService
      .getAllMappings()
      .filter((m) => m.autoKill);

    if (mappings.length > 0) {
      console.log(
        chalk.bold(`\n📋 Ports with auto-kill enabled (${mappings.length}):\n`)
      );
      mappings.forEach((m) => {
        console.log(
          chalk.cyan(`Port ${m.port}`) +
            chalk.gray(' → ') +
            chalk.white(m.projectName)
        );
      });
    }
  }

  /**
   * Print integration instructions for shell
   */
  private printIntegrationInstructions(): void {
    console.log(chalk.bold('\n📝 Optional: Shell Integration\n'));
    console.log(
      chalk.gray(
        'For automatic checking on directory change, add this to your shell config:\n'
      )
    );

    const bashZsh = chalk.cyan(`
# Bash/Zsh (~/.bashrc or ~/.zshrc)
function cd() {
  builtin cd "$@"
  zkill auto check
}
    `);

    const fish = chalk.cyan(`
# Fish (~/.config/fish/config.fish)
function cd
  builtin cd $argv
  zkill auto check
end
    `);

    const powershell = chalk.cyan(`
# PowerShell ($PROFILE)
function cd {
  Set-Location $args
  zkill auto check
}
    `);

    console.log(chalk.bold('Bash/Zsh:'));
    console.log(bashZsh);

    console.log(chalk.bold('Fish:'));
    console.log(fish);

    console.log(chalk.bold('PowerShell:'));
    console.log(powershell);

    console.log(
      chalk.gray(
        'After adding, restart your shell or run: source ~/.bashrc (or equivalent)\n'
      )
    );
  }

  /**
   * Toggle auto-kill for a specific port
   */
  async togglePort(port: number): Promise<void> {
    const mapping = this.storageService.getPortMapping(port);

    if (!mapping) {
      console.log(
        chalk.yellow(
          `\nNo mapping found for port ${port}. Use zkill ${port} first to create a mapping.`
        )
      );
      return;
    }

    // Toggle auto-kill
    this.storageService.addPortMapping({
      ...mapping,
      autoKill: !mapping.autoKill,
    });

    if (mapping.autoKill) {
      console.log(
        chalk.yellow(
          `\n❌ Auto-kill disabled for port ${port} (${mapping.projectName})`
        )
      );
    } else {
      console.log(
        chalk.green(
          `\n✅ Auto-kill enabled for port ${port} (${mapping.projectName})`
        )
      );
    }
  }
}
