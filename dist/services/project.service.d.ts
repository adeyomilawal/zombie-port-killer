/**
 * Project Service
 * Handles project detection and identification
 */
export declare class ProjectService {
    /**
     * Get current project name from various sources
     */
    getCurrentProjectName(): string;
    /**
     * Get current project path
     */
    getCurrentProjectPath(): string;
    /**
     * Check if current directory is a project
     */
    isProjectDirectory(dirPath?: string): boolean;
    /**
     * Get project type (language/framework)
     */
    getProjectType(): string | null;
    /**
     * Extract name from package.json
     */
    private getNameFromPackageJson;
    /**
     * Extract name from composer.json
     */
    private getNameFromComposerJson;
    /**
     * Extract name from Cargo.toml
     */
    private getNameFromCargoToml;
    /**
     * Extract name from go.mod
     */
    private getNameFromGoMod;
    /**
     * Get name from git repository
     */
    private getNameFromGit;
    /**
     * Detect Node.js project type (React, Next.js, etc.)
     */
    private getNodeProjectType;
    /**
     * Get common ports for project type
     */
    getCommonPortsForProjectType(): number[];
}
//# sourceMappingURL=project.service.d.ts.map