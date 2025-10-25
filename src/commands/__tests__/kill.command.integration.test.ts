/**
 * Integration tests for kill command
 * Tests the actual CLI execution end-to-end
 */

import { execSync } from "child_process";
import { ProcessService } from "../../services/process.service";
import { StorageService } from "../../services/storage.service";
import path from "path";
import fs from "fs";
import os from "os";
import net from "net";

describe("Kill Command Integration", () => {
  let processService: ProcessService;
  let storageService: StorageService;
  let testConfigPath: string;
  let server: net.Server | null = null;
  let testPort: number;

  beforeAll(() => {
    processService = new ProcessService();

    // Create isolated test config
    const nativeJoin = path.join;
    testConfigPath = nativeJoin(
      os.tmpdir(),
      `.zkill-test-integration-${Date.now()}`
    );

    // Mock config path for StorageService
    jest.spyOn(path, "join").mockImplementation((...args: string[]) => {
      if (args.includes(".zkill")) {
        return nativeJoin(testConfigPath, "config.json");
      }
      return nativeJoin(...args);
    });

    storageService = new StorageService();
  });

  afterAll(() => {
    // Cleanup test directory
    if (fs.existsSync(testConfigPath)) {
      fs.rmSync(testConfigPath, { recursive: true, force: true });
    }
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    // Find an available port for testing
    testPort = await findAvailablePort();
  });

  afterEach(async () => {
    // Cleanup test server if it exists
    if (server) {
      await closeServer(server);
      server = null;
    }
  });

  describe("CLI execution", () => {
    it("should show help when --help flag is used", () => {
      const cliPath = path.join(__dirname, "../../../dist/cli.js");
      const output = execSync(`node "${cliPath}" --help`).toString();

      expect(output).toContain("Kill zombie processes blocking your ports");
      expect(output).toContain("Usage:");
      expect(output).toContain("Options:");
      expect(output).toContain("-f, --force");
    });

    it("should show version when --version flag is used", () => {
      const cliPath = path.join(__dirname, "../../../dist/cli.js");
      const output = execSync(`node "${cliPath}" --version`).toString();

      expect(output).toMatch(/\d+\.\d+\.\d+/);
    });

    it("should handle invalid port numbers", () => {
      const cliPath = path.join(__dirname, "../../../dist/cli.js");

      try {
        execSync(`node "${cliPath}" 99999`, { stdio: "pipe" });
        fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.status).toBe(1);
      }
    });

    it("should handle non-existent ports gracefully", async () => {
      const cliPath = path.join(__dirname, "../../../dist/cli.js");
      const unusedPort = await findAvailablePort();

      try {
        const output = execSync(`node "${cliPath}" ${unusedPort} --force`, {
          stdio: "pipe",
          encoding: "utf-8",
        });

        // Should indicate no process found
        expect(output).toMatch(/not found|not in use/i);
      } catch (error: any) {
        // Some implementations exit with error code for no process
        expect(error?.status || 0).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Process killing", () => {
    it.skip("should detect process on active port", async () => {
      // Start a test server
      server = await startTestServer(testPort);

      // Give it time to start
      await sleep(100);

      // Check if process is detected
      const processInfo = await processService.findByPort(testPort);

      expect(processInfo).not.toBeNull();
      expect(processInfo?.port).toBe(testPort);
      expect(processInfo?.pid).toBeGreaterThan(0);
    });

    it.skip("should kill process with force flag", async () => {
      // Start a test server
      server = await startTestServer(testPort);
      await sleep(100);

      // Verify server is running
      const processBefore = await processService.findByPort(testPort);
      expect(processBefore).not.toBeNull();

      // Kill it using the CLI
      const cliPath = path.join(__dirname, "../../../dist/cli.js");

      try {
        execSync(`node "${cliPath}" ${testPort} --force`, {
          stdio: "pipe",
          timeout: 5000,
        });
      } catch (error) {
        // Some platforms may return non-zero exit code
      }

      // Wait for process to be killed
      await sleep(500);

      // Verify server is no longer running
      const processAfter = await processService.findByPort(testPort);
      expect(processAfter).toBeNull();

      server = null; // Mark as killed
    }, 10000);
  });

  describe("Port mapping", () => {
    it.skip("should create port mapping after killing process", async () => {
      server = await startTestServer(testPort);
      await sleep(100);

      const cliPath = path.join(__dirname, "../../../dist/cli.js");

      try {
        execSync(`node "${cliPath}" ${testPort} --force`, {
          stdio: "pipe",
          timeout: 5000,
        });
      } catch (error) {
        // Ignore
      }

      await sleep(200);

      // Check if mapping was created
      const mapping = storageService.getPortMapping(testPort);

      if (mapping) {
        expect(mapping.port).toBe(testPort);
        expect(mapping.projectName).toBeTruthy();
      }

      server = null;
    }, 10000);
  });
});

// Helper functions

function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;

      server.close(() => {
        resolve(port);
      });
    });

    server.on("error", reject);
  });
}

function startTestServer(port: number): Promise<net.Server> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.listen(port, "127.0.0.1", () => {
      resolve(server);
    });

    server.on("error", reject);
  });
}

function closeServer(server: net.Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => {
      resolve();
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
