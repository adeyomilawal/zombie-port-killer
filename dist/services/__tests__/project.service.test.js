"use strict";
/**
 * Project Service Tests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const project_service_1 = require("../project.service");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
describe("ProjectService", () => {
    let projectService;
    let testDir;
    beforeEach(() => {
        projectService = new project_service_1.ProjectService();
        testDir = path_1.default.join(os_1.default.tmpdir(), `zkill-test-${Date.now()}`);
        fs_1.default.mkdirSync(testDir, { recursive: true });
    });
    afterEach(() => {
        if (fs_1.default.existsSync(testDir)) {
            fs_1.default.rmSync(testDir, { recursive: true, force: true });
        }
    });
    describe("getCurrentProjectName", () => {
        it("should return directory name as fallback", () => {
            const name = projectService.getCurrentProjectName();
            expect(typeof name).toBe("string");
            expect(name.length).toBeGreaterThan(0);
        });
        it("should detect name from package.json", () => {
            const packageJson = {
                name: "test-project",
                version: "1.0.0",
            };
            fs_1.default.writeFileSync(path_1.default.join(testDir, "package.json"), JSON.stringify(packageJson));
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const name = projectService.getCurrentProjectName();
            expect(name).toBe("test-project");
            process.chdir(originalCwd);
        });
        it("should detect name from Cargo.toml", () => {
            const cargoToml = 'name = "rust-project"\nversion = "0.1.0"';
            fs_1.default.writeFileSync(path_1.default.join(testDir, "Cargo.toml"), cargoToml);
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const name = projectService.getCurrentProjectName();
            expect(name).toBe("rust-project");
            process.chdir(originalCwd);
        });
        it("should detect name from go.mod", () => {
            const goMod = "module github.com/user/go-project\n\ngo 1.21";
            fs_1.default.writeFileSync(path_1.default.join(testDir, "go.mod"), goMod);
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const name = projectService.getCurrentProjectName();
            expect(name).toBe("go-project");
            process.chdir(originalCwd);
        });
        it("should fallback to directory name when no project files exist", () => {
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const name = projectService.getCurrentProjectName();
            expect(name).toBe(path_1.default.basename(testDir));
            process.chdir(originalCwd);
        });
    });
    describe("getCurrentProjectPath", () => {
        it("should return current working directory", () => {
            const projectPath = projectService.getCurrentProjectPath();
            expect(projectPath).toBe(process.cwd());
        });
    });
    describe("isProjectDirectory", () => {
        it("should return false for empty directory", () => {
            expect(projectService.isProjectDirectory(testDir)).toBe(false);
        });
        it("should return true for directory with package.json", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "package.json"), JSON.stringify({ name: "test" }));
            expect(projectService.isProjectDirectory(testDir)).toBe(true);
        });
        it("should return true for directory with .git", () => {
            fs_1.default.mkdirSync(path_1.default.join(testDir, ".git"));
            expect(projectService.isProjectDirectory(testDir)).toBe(true);
        });
        it("should return true for directory with Makefile", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "Makefile"), "");
            expect(projectService.isProjectDirectory(testDir)).toBe(true);
        });
        it("should detect Python projects (requirements.txt)", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "requirements.txt"), "flask==2.0.0");
            expect(projectService.isProjectDirectory(testDir)).toBe(true);
        });
        it("should detect Ruby projects (Gemfile)", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "Gemfile"), "");
            expect(projectService.isProjectDirectory(testDir)).toBe(true);
        });
        it("should detect Go projects (go.mod)", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "go.mod"), "");
            expect(projectService.isProjectDirectory(testDir)).toBe(true);
        });
        it("should detect Rust projects (Cargo.toml)", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "Cargo.toml"), "");
            expect(projectService.isProjectDirectory(testDir)).toBe(true);
        });
        it("should detect Java projects (pom.xml)", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "pom.xml"), "");
            expect(projectService.isProjectDirectory(testDir)).toBe(true);
        });
        it("should detect PHP projects (composer.json)", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "composer.json"), "{}");
            expect(projectService.isProjectDirectory(testDir)).toBe(true);
        });
        it("should use current directory if no path provided", () => {
            const originalCwd = process.cwd();
            // Test with actual project directory (go up from __tests__ to src to root)
            const projectRoot = path_1.default.resolve(__dirname, "../../..");
            process.chdir(projectRoot);
            expect(projectService.isProjectDirectory()).toBe(true);
            process.chdir(originalCwd);
        });
    });
    describe("getProjectType", () => {
        it("should return null for non-project directory", () => {
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const type = projectService.getProjectType();
            expect(type).toBeNull();
            process.chdir(originalCwd);
        });
        it("should detect Node.js projects", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "package.json"), JSON.stringify({ name: "test" }));
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const type = projectService.getProjectType();
            expect(type).toBe("Node.js");
            process.chdir(originalCwd);
        });
        it("should detect Next.js projects", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "package.json"), JSON.stringify({
                name: "test",
                dependencies: { next: "^14.0.0" },
            }));
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const type = projectService.getProjectType();
            expect(type).toBe("Next.js");
            process.chdir(originalCwd);
        });
        it("should detect React projects", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "package.json"), JSON.stringify({
                name: "test",
                dependencies: { react: "^18.0.0" },
            }));
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const type = projectService.getProjectType();
            expect(type).toBe("React");
            process.chdir(originalCwd);
        });
        it("should detect Python projects", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "requirements.txt"), "");
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const type = projectService.getProjectType();
            expect(type).toBe("Python");
            process.chdir(originalCwd);
        });
        it("should detect Ruby projects", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "Gemfile"), "");
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const type = projectService.getProjectType();
            expect(type).toBe("Ruby");
            process.chdir(originalCwd);
        });
        it("should detect Go projects", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "go.mod"), "");
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const type = projectService.getProjectType();
            expect(type).toBe("Go");
            process.chdir(originalCwd);
        });
        it("should detect Rust projects", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "Cargo.toml"), "");
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const type = projectService.getProjectType();
            expect(type).toBe("Rust");
            process.chdir(originalCwd);
        });
        it("should detect PHP projects", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "composer.json"), "{}");
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const type = projectService.getProjectType();
            expect(type).toBe("PHP");
            process.chdir(originalCwd);
        });
        it("should detect Java projects", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "pom.xml"), "");
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const type = projectService.getProjectType();
            expect(type).toBe("Java");
            process.chdir(originalCwd);
        });
        it("should prioritize Next.js over React", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "package.json"), JSON.stringify({
                name: "test",
                dependencies: {
                    next: "^14.0.0",
                    react: "^18.0.0",
                },
            }));
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const type = projectService.getProjectType();
            expect(type).toBe("Next.js");
            process.chdir(originalCwd);
        });
        it("should detect Express projects", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "package.json"), JSON.stringify({
                name: "test",
                dependencies: { express: "^4.0.0" },
            }));
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const type = projectService.getProjectType();
            expect(type).toBe("Express");
            process.chdir(originalCwd);
        });
        it("should detect NestJS projects", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "package.json"), JSON.stringify({
                name: "test",
                dependencies: { "@nestjs/core": "^10.0.0" },
            }));
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const type = projectService.getProjectType();
            expect(type).toBe("NestJS");
            process.chdir(originalCwd);
        });
    });
    describe("getCommonPortsForProjectType", () => {
        it("should return default ports for unknown project type", () => {
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const ports = projectService.getCommonPortsForProjectType();
            expect(Array.isArray(ports)).toBe(true);
            expect(ports).toEqual([3000, 8000, 8080]);
            process.chdir(originalCwd);
        });
        it("should return Next.js ports", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "package.json"), JSON.stringify({
                name: "test",
                dependencies: { next: "^14.0.0" },
            }));
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const ports = projectService.getCommonPortsForProjectType();
            expect(ports).toEqual([3000, 3001]);
            process.chdir(originalCwd);
        });
        it("should return Python ports", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "requirements.txt"), "");
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const ports = projectService.getCommonPortsForProjectType();
            expect(ports).toEqual([8000, 5000, 8080]);
            process.chdir(originalCwd);
        });
        it("should return Go ports", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "go.mod"), "");
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const ports = projectService.getCommonPortsForProjectType();
            expect(ports).toEqual([8080, 8000]);
            process.chdir(originalCwd);
        });
        it("should return Angular ports", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "package.json"), JSON.stringify({
                name: "test",
                dependencies: { "@angular/core": "^17.0.0" },
            }));
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const ports = projectService.getCommonPortsForProjectType();
            expect(ports).toEqual([4200, 4201]);
            process.chdir(originalCwd);
        });
    });
    describe("edge cases", () => {
        it("should handle invalid package.json gracefully", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "package.json"), "invalid json{{{");
            const originalCwd = process.cwd();
            process.chdir(testDir);
            // Should fallback to directory name instead of crashing
            const name = projectService.getCurrentProjectName();
            expect(name).toBe(path_1.default.basename(testDir));
            process.chdir(originalCwd);
        });
        it("should handle invalid Cargo.toml gracefully", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "Cargo.toml"), "invalid toml");
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const name = projectService.getCurrentProjectName();
            expect(typeof name).toBe("string");
            process.chdir(originalCwd);
        });
        it("should handle invalid composer.json gracefully", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "composer.json"), "invalid");
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const name = projectService.getCurrentProjectName();
            expect(typeof name).toBe("string");
            process.chdir(originalCwd);
        });
        it("should handle package.json without name field", () => {
            fs_1.default.writeFileSync(path_1.default.join(testDir, "package.json"), JSON.stringify({ version: "1.0.0" }));
            const originalCwd = process.cwd();
            process.chdir(testDir);
            const name = projectService.getCurrentProjectName();
            expect(name).toBe(path_1.default.basename(testDir));
            process.chdir(originalCwd);
        });
    });
});
//# sourceMappingURL=project.service.test.js.map