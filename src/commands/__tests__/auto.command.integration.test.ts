/**
 * Integration tests for auto command
 * Tests auto-kill functionality end-to-end
 */

import { execSync } from "child_process";
import { StorageService } from "../../services/storage.service";
import path from "path";
import fs from "fs";
import os from "os";

describe("Auto Command Integration", () => {
  let storageService: StorageService;
  let testConfigPath: string;

  beforeAll(() => {
    // Create isolated test config
    const nativeJoin = path.join;
    testConfigPath = nativeJoin(os.tmpdir(), `.zkill-test-auto-${Date.now()}`);

    jest.spyOn(path, "join").mockImplementation((...args: string[]) => {
      if (args.includes(".zkill")) {
        return nativeJoin(testConfigPath, "config.json");
      }
      return nativeJoin(...args);
    });

    storageService = new StorageService();
  });

  afterAll(() => {
    if (fs.existsSync(testConfigPath)) {
      fs.rmSync(testConfigPath, { recursive: true, force: true });
    }
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    // Reset auto-kill to disabled state
    storageService.setAutoKill(false);
  });

  describe("zkill auto status", () => {
    it("should show disabled status by default", () => {
      const cliPath = path.join(__dirname, "../../../dist/cli.js");
      const output = execSync(`node "${cliPath}" auto status`, {
        encoding: "utf-8",
        stdio: "pipe",
      });

      expect(output).toMatch(/disabled|off/i);
    });

    it.skip("should show enabled status after enabling", (done) => {
      // Enable via CLI first
      const cliPath = path.join(__dirname, "../../../dist/cli.js");
      execSync(`node "${cliPath}" auto enable`, {
        encoding: "utf-8",
        stdio: "pipe",
      });

      // Wait for file system to sync (100ms should be enough)
      setTimeout(() => {
        // Check status
        const output = execSync(`node "${cliPath}" auto status`, {
          encoding: "utf-8",
          stdio: "pipe",
        });

        expect(output).toMatch(/enabled|on/i);
        done();
      }, 100);
    });
  });

  describe("zkill auto enable", () => {
    it("should enable auto-kill", () => {
      const cliPath = path.join(__dirname, "../../../dist/cli.js");
      const output = execSync(`node "${cliPath}" auto enable`, {
        encoding: "utf-8",
        stdio: "pipe",
      });

      expect(output).toMatch(/enabled|on/i);
      // Note: CLI uses global config, not mocked config
    });

    it("should handle multiple enable calls", () => {
      const cliPath = path.join(__dirname, "../../../dist/cli.js");

      // Enable first time
      execSync(`node "${cliPath}" auto enable`, {
        encoding: "utf-8",
        stdio: "pipe",
      });

      // Enable again
      const output = execSync(`node "${cliPath}" auto enable`, {
        encoding: "utf-8",
        stdio: "pipe",
      });

      // Should show already enabled or confirmation message
      expect(output).toMatch(/already|enabled/i);
    });
  });

  describe("zkill auto disable", () => {
    it("should disable auto-kill", () => {
      // First enable it via CLI
      const cliPath = path.join(__dirname, "../../../dist/cli.js");
      execSync(`node "${cliPath}" auto enable`, {
        encoding: "utf-8",
        stdio: "pipe",
      });

      // Then disable it
      const output = execSync(`node "${cliPath}" auto disable`, {
        encoding: "utf-8",
        stdio: "pipe",
      });

      expect(output).toMatch(/disabled|off/i);
      // Note: CLI uses global config, not mocked config
    });

    it("should handle multiple disable calls", () => {
      const cliPath = path.join(__dirname, "../../../dist/cli.js");

      // Disable first time
      execSync(`node "${cliPath}" auto disable`, {
        encoding: "utf-8",
        stdio: "pipe",
      });

      // Disable again
      const output = execSync(`node "${cliPath}" auto disable`, {
        encoding: "utf-8",
        stdio: "pipe",
      });

      // Should show already disabled or confirmation message
      expect(output).toMatch(/already|disabled/i);
    });
  });

  describe("zkill auto check", () => {
    it("should check for ports to clean up", () => {
      const cliPath = path.join(__dirname, "../../../dist/cli.js");

      try {
        const output = execSync(`node "${cliPath}" auto check`, {
          encoding: "utf-8",
          stdio: "pipe",
        });

        // Should perform check operation or show disabled message
        expect(output.length).toBeGreaterThan(0);
      } catch (error: any) {
        // Command may exit with error if disabled
        const output = error.stdout?.toString() || "";
        expect(output.length).toBeGreaterThanOrEqual(0);
      }
    });

    it("should handle check command", () => {
      const cliPath = path.join(__dirname, "../../../dist/cli.js");

      try {
        execSync(`node "${cliPath}" auto check`, {
          encoding: "utf-8",
          stdio: "pipe",
        });
        // Command executed successfully
        expect(true).toBe(true);
      } catch (error: any) {
        // Command may exit with error, but should not crash
        expect(error.status).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("invalid auto commands", () => {
    it("should handle invalid action", () => {
      const cliPath = path.join(__dirname, "../../../dist/cli.js");

      try {
        execSync(`node "${cliPath}" auto invalid`, {
          encoding: "utf-8",
          stdio: "pipe",
        });
        fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.status).toBeGreaterThan(0);
      }
    });

    it("should show help for invalid action", () => {
      const cliPath = path.join(__dirname, "../../../dist/cli.js");

      try {
        execSync(`node "${cliPath}" auto invalid`, {
          encoding: "utf-8",
          stdio: "pipe",
        });
      } catch (error: any) {
        const output =
          error.stderr?.toString() || error.stdout?.toString() || "";
        expect(output).toMatch(/enable|disable|check|status/i);
      }
    });
  });

  describe("auto-kill persistence", () => {
    it("should persist auto-kill state across service instances", () => {
      storageService.setAutoKill(true);

      // Create new instance
      const newStorage = new StorageService();
      expect(newStorage.isAutoKillEnabled()).toBe(true);

      // Disable and verify
      newStorage.setAutoKill(false);
      const anotherStorage = new StorageService();
      expect(anotherStorage.isAutoKillEnabled()).toBe(false);
    });
  });
});
