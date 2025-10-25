/**
 * Project Service
 * Handles project detection and identification
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export class ProjectService {
  /**
   * Get current project name from various sources
   */
  getCurrentProjectName(): string {
    const cwd = process.cwd();

    // Try package.json first (most reliable for Node projects)
    const packageName = this.getNameFromPackageJson(cwd);
    if (packageName) return packageName;

    // Try Composer.json for PHP projects
    const composerName = this.getNameFromComposerJson(cwd);
    if (composerName) return composerName;

    // Try Cargo.toml for Rust projects
    const cargoName = this.getNameFromCargoToml(cwd);
    if (cargoName) return cargoName;

    // Try go.mod for Go projects
    const goName = this.getNameFromGoMod(cwd);
    if (goName) return goName;

    // Try git repository name
    const gitName = this.getNameFromGit(cwd);
    if (gitName) return gitName;

    // Fallback to directory name
    return path.basename(cwd);
  }

  /**
   * Get current project path
   */
  getCurrentProjectPath(): string {
    return process.cwd();
  }

  /**
   * Check if current directory is a project
   */
  isProjectDirectory(dirPath?: string): boolean {
    const targetPath = dirPath || process.cwd();

    // Check for common project indicators
    const indicators = [
      'package.json',
      'composer.json',
      'Gemfile',
      'requirements.txt',
      'go.mod',
      'Cargo.toml',
      'pom.xml',
      '.git',
      'Makefile',
    ];

    return indicators.some((indicator) =>
      fs.existsSync(path.join(targetPath, indicator))
    );
  }

  /**
   * Get project type (language/framework)
   */
  getProjectType(): string | null {
    const cwd = process.cwd();

    if (fs.existsSync(path.join(cwd, 'package.json'))) {
      return this.getNodeProjectType(cwd);
    }

    if (fs.existsSync(path.join(cwd, 'requirements.txt'))) {
      return 'Python';
    }

    if (fs.existsSync(path.join(cwd, 'Gemfile'))) {
      return 'Ruby';
    }

    if (fs.existsSync(path.join(cwd, 'go.mod'))) {
      return 'Go';
    }

    if (fs.existsSync(path.join(cwd, 'Cargo.toml'))) {
      return 'Rust';
    }

    if (fs.existsSync(path.join(cwd, 'composer.json'))) {
      return 'PHP';
    }

    if (fs.existsSync(path.join(cwd, 'pom.xml'))) {
      return 'Java';
    }

    return null;
  }

  /**
   * Extract name from package.json
   */
  private getNameFromPackageJson(dir: string): string | null {
    const packageJsonPath = path.join(dir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) return null;

    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      return pkg.name || null;
    } catch {
      return null;
    }
  }

  /**
   * Extract name from composer.json
   */
  private getNameFromComposerJson(dir: string): string | null {
    const composerPath = path.join(dir, 'composer.json');
    if (!fs.existsSync(composerPath)) return null;

    try {
      const composer = JSON.parse(fs.readFileSync(composerPath, 'utf-8'));
      if (composer.name) {
        // Composer names are like "vendor/package", extract package part
        const parts = composer.name.split('/');
        return parts[parts.length - 1];
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Extract name from Cargo.toml
   */
  private getNameFromCargoToml(dir: string): string | null {
    const cargoPath = path.join(dir, 'Cargo.toml');
    if (!fs.existsSync(cargoPath)) return null;

    try {
      const content = fs.readFileSync(cargoPath, 'utf-8');
      const nameMatch = content.match(/name\s*=\s*"([^"]+)"/);
      return nameMatch ? nameMatch[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Extract name from go.mod
   */
  private getNameFromGoMod(dir: string): string | null {
    const goModPath = path.join(dir, 'go.mod');
    if (!fs.existsSync(goModPath)) return null;

    try {
      const content = fs.readFileSync(goModPath, 'utf-8');
      const moduleMatch = content.match(/module\s+([^\s]+)/);
      if (moduleMatch) {
        // Extract last part of module path
        const parts = moduleMatch[1].split('/');
        return parts[parts.length - 1];
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get name from git repository
   */
  private getNameFromGit(dir: string): string | null {
    try {
      const gitUrl = execSync('git config --get remote.origin.url', {
        encoding: 'utf-8',
        cwd: dir,
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();

      if (!gitUrl) return null;

      // Extract repo name from URL
      // https://github.com/user/repo.git -> repo
      // git@github.com:user/repo.git -> repo
      const repoName = gitUrl.split('/').pop()?.replace('.git', '');
      return repoName || null;
    } catch {
      // Not a git repo or git not installed
      return null;
    }
  }

  /**
   * Detect Node.js project type (React, Next.js, etc.)
   */
  private getNodeProjectType(dir: string): string {
    try {
      const packageJsonPath = path.join(dir, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      const deps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      if (deps['next']) return 'Next.js';
      if (deps['react']) return 'React';
      if (deps['vue']) return 'Vue.js';
      if (deps['@angular/core']) return 'Angular';
      if (deps['express']) return 'Express';
      if (deps['fastify']) return 'Fastify';
      if (deps['@nestjs/core']) return 'NestJS';

      return 'Node.js';
    } catch {
      return 'Node.js';
    }
  }

  /**
   * Get common ports for project type
   */
  getCommonPortsForProjectType(): number[] {
    const projectType = this.getProjectType();

    const commonPorts: { [key: string]: number[] } = {
      'Next.js': [3000, 3001],
      React: [3000, 3001, 8080],
      'Vue.js': [8080, 8081],
      Angular: [4200, 4201],
      Express: [3000, 8000, 8080],
      NestJS: [3000, 8000],
      Python: [8000, 5000, 8080],
      Ruby: [3000, 4567],
      Go: [8080, 8000],
      PHP: [8000, 8080],
      Java: [8080, 8000],
    };

    return commonPorts[projectType || ''] || [3000, 8000, 8080];
  }
}
