/**
 * Project Service Tests
 */

import { ProjectService } from "../project.service";
import fs from "fs";
import path from "path";
import os from "os";

describe("ProjectService", () => {
  let projectService: ProjectService;
  let testDir: string;

  beforeEach(() => {
    projectService = new ProjectService();
    testDir = path.join(os.tmpdir(), `zkill-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
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

      fs.writeFileSync(
        path.join(testDir, "package.json"),
        JSON.stringify(packageJson)
      );

      const originalCwd = process.cwd();
      process.chdir(testDir);

      const name = projectService.getCurrentProjectName();
      expect(name).toBe("test-project");

      process.chdir(originalCwd);
    });

    it("should detect name from Cargo.toml", () => {
      const cargoToml = 'name = "rust-project"\nversion = "0.1.0"';
      fs.writeFileSync(path.join(testDir, "Cargo.toml"), cargoToml);

      const originalCwd = process.cwd();
      process.chdir(testDir);

      const name = projectService.getCurrentProjectName();
      expect(name).toBe("rust-project");

      process.chdir(originalCwd);
    });

    it("should detect name from go.mod", () => {
      const goMod = "module github.com/user/go-project\n\ngo 1.21";
      fs.writeFileSync(path.join(testDir, "go.mod"), goMod);

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
      expect(name).toBe(path.basename(testDir));

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
      fs.writeFileSync(
        path.join(testDir, "package.json"),
        JSON.stringify({ name: "test" })
      );

      expect(projectService.isProjectDirectory(testDir)).toBe(true);
    });

    it("should return true for directory with .git", () => {
      fs.mkdirSync(path.join(testDir, ".git"));
      expect(projectService.isProjectDirectory(testDir)).toBe(true);
    });

    it("should return true for directory with Makefile", () => {
      fs.writeFileSync(path.join(testDir, "Makefile"), "");
      expect(projectService.isProjectDirectory(testDir)).toBe(true);
    });

    it("should detect Python projects (requirements.txt)", () => {
      fs.writeFileSync(path.join(testDir, "requirements.txt"), "flask==2.0.0");
      expect(projectService.isProjectDirectory(testDir)).toBe(true);
    });

    it("should detect Ruby projects (Gemfile)", () => {
      fs.writeFileSync(path.join(testDir, "Gemfile"), "");
      expect(projectService.isProjectDirectory(testDir)).toBe(true);
    });

    it("should detect Go projects (go.mod)", () => {
      fs.writeFileSync(path.join(testDir, "go.mod"), "");
      expect(projectService.isProjectDirectory(testDir)).toBe(true);
    });

    it("should detect Rust projects (Cargo.toml)", () => {
      fs.writeFileSync(path.join(testDir, "Cargo.toml"), "");
      expect(projectService.isProjectDirectory(testDir)).toBe(true);
    });

    it("should detect Java projects (pom.xml)", () => {
      fs.writeFileSync(path.join(testDir, "pom.xml"), "");
      expect(projectService.isProjectDirectory(testDir)).toBe(true);
    });

    it("should detect PHP projects (composer.json)", () => {
      fs.writeFileSync(path.join(testDir, "composer.json"), "{}");
      expect(projectService.isProjectDirectory(testDir)).toBe(true);
    });

    it("should use current directory if no path provided", () => {
      const originalCwd = process.cwd();

      // Test with actual project directory (go up from __tests__ to src to root)
      const projectRoot = path.resolve(__dirname, "../../..");
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
      fs.writeFileSync(
        path.join(testDir, "package.json"),
        JSON.stringify({ name: "test" })
      );

      const originalCwd = process.cwd();
      process.chdir(testDir);

      const type = projectService.getProjectType();
      expect(type).toBe("Node.js");

      process.chdir(originalCwd);
    });

    it("should detect Next.js projects", () => {
      fs.writeFileSync(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: { next: "^14.0.0" },
        })
      );

      const originalCwd = process.cwd();
      process.chdir(testDir);

      const type = projectService.getProjectType();
      expect(type).toBe("Next.js");

      process.chdir(originalCwd);
    });

    it("should detect React projects", () => {
      fs.writeFileSync(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: { react: "^18.0.0" },
        })
      );

      const originalCwd = process.cwd();
      process.chdir(testDir);

      const type = projectService.getProjectType();
      expect(type).toBe("React");

      process.chdir(originalCwd);
    });

    it("should detect Python projects", () => {
      fs.writeFileSync(path.join(testDir, "requirements.txt"), "");

      const originalCwd = process.cwd();
      process.chdir(testDir);

      const type = projectService.getProjectType();
      expect(type).toBe("Python");

      process.chdir(originalCwd);
    });

    it("should detect Ruby projects", () => {
      fs.writeFileSync(path.join(testDir, "Gemfile"), "");

      const originalCwd = process.cwd();
      process.chdir(testDir);

      const type = projectService.getProjectType();
      expect(type).toBe("Ruby");

      process.chdir(originalCwd);
    });

    it("should detect Go projects", () => {
      fs.writeFileSync(path.join(testDir, "go.mod"), "");

      const originalCwd = process.cwd();
      process.chdir(testDir);

      const type = projectService.getProjectType();
      expect(type).toBe("Go");

      process.chdir(originalCwd);
    });

    it("should detect Rust projects", () => {
      fs.writeFileSync(path.join(testDir, "Cargo.toml"), "");

      const originalCwd = process.cwd();
      process.chdir(testDir);

      const type = projectService.getProjectType();
      expect(type).toBe("Rust");

      process.chdir(originalCwd);
    });

    it("should detect PHP projects", () => {
      fs.writeFileSync(path.join(testDir, "composer.json"), "{}");

      const originalCwd = process.cwd();
      process.chdir(testDir);

      const type = projectService.getProjectType();
      expect(type).toBe("PHP");

      process.chdir(originalCwd);
    });

    it("should detect Java projects", () => {
      fs.writeFileSync(path.join(testDir, "pom.xml"), "");

      const originalCwd = process.cwd();
      process.chdir(testDir);

      const type = projectService.getProjectType();
      expect(type).toBe("Java");

      process.chdir(originalCwd);
    });

    it("should prioritize Next.js over React", () => {
      fs.writeFileSync(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: {
            next: "^14.0.0",
            react: "^18.0.0",
          },
        })
      );

      const originalCwd = process.cwd();
      process.chdir(testDir);

      const type = projectService.getProjectType();
      expect(type).toBe("Next.js");

      process.chdir(originalCwd);
    });

    it("should detect Express projects", () => {
      fs.writeFileSync(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: { express: "^4.0.0" },
        })
      );

      const originalCwd = process.cwd();
      process.chdir(testDir);

      const type = projectService.getProjectType();
      expect(type).toBe("Express");

      process.chdir(originalCwd);
    });

    it("should detect NestJS projects", () => {
      fs.writeFileSync(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: { "@nestjs/core": "^10.0.0" },
        })
      );

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
      fs.writeFileSync(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: { next: "^14.0.0" },
        })
      );

      const originalCwd = process.cwd();
      process.chdir(testDir);

      const ports = projectService.getCommonPortsForProjectType();
      expect(ports).toEqual([3000, 3001]);

      process.chdir(originalCwd);
    });

    it("should return Python ports", () => {
      fs.writeFileSync(path.join(testDir, "requirements.txt"), "");

      const originalCwd = process.cwd();
      process.chdir(testDir);

      const ports = projectService.getCommonPortsForProjectType();
      expect(ports).toEqual([8000, 5000, 8080]);

      process.chdir(originalCwd);
    });

    it("should return Go ports", () => {
      fs.writeFileSync(path.join(testDir, "go.mod"), "");

      const originalCwd = process.cwd();
      process.chdir(testDir);

      const ports = projectService.getCommonPortsForProjectType();
      expect(ports).toEqual([8080, 8000]);

      process.chdir(originalCwd);
    });

    it("should return Angular ports", () => {
      fs.writeFileSync(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: { "@angular/core": "^17.0.0" },
        })
      );

      const originalCwd = process.cwd();
      process.chdir(testDir);

      const ports = projectService.getCommonPortsForProjectType();
      expect(ports).toEqual([4200, 4201]);

      process.chdir(originalCwd);
    });
  });

  describe("edge cases", () => {
    it("should handle invalid package.json gracefully", () => {
      fs.writeFileSync(path.join(testDir, "package.json"), "invalid json{{{");

      const originalCwd = process.cwd();
      process.chdir(testDir);

      // Should fallback to directory name instead of crashing
      const name = projectService.getCurrentProjectName();
      expect(name).toBe(path.basename(testDir));

      process.chdir(originalCwd);
    });

    it("should handle invalid Cargo.toml gracefully", () => {
      fs.writeFileSync(path.join(testDir, "Cargo.toml"), "invalid toml");

      const originalCwd = process.cwd();
      process.chdir(testDir);

      const name = projectService.getCurrentProjectName();
      expect(typeof name).toBe("string");

      process.chdir(originalCwd);
    });

    it("should handle invalid composer.json gracefully", () => {
      fs.writeFileSync(path.join(testDir, "composer.json"), "invalid");

      const originalCwd = process.cwd();
      process.chdir(testDir);

      const name = projectService.getCurrentProjectName();
      expect(typeof name).toBe("string");

      process.chdir(originalCwd);
    });

    it("should handle package.json without name field", () => {
      fs.writeFileSync(
        path.join(testDir, "package.json"),
        JSON.stringify({ version: "1.0.0" })
      );

      const originalCwd = process.cwd();
      process.chdir(testDir);

      const name = projectService.getCurrentProjectName();
      expect(name).toBe(path.basename(testDir));

      process.chdir(originalCwd);
    });
  });
});
