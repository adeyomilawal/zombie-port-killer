/**
 * Storage Service Tests
 */

import { StorageService } from "../storage.service";
import { PortMapping } from "../../types";
import fs from "fs";
import path from "path";
import os from "os";

describe("StorageService", () => {
  let storageService: StorageService;
  let testConfigPath: string;

  beforeEach(() => {
    // Create a unique test config directory
    const nativeJoin = path.join;
    testConfigPath = nativeJoin(os.tmpdir(), `.zkill-test-${Date.now()}`);

    // Mock the config path
    jest.spyOn(path, "join").mockImplementation((...args: string[]) => {
      if (args.includes(".zkill")) {
        return nativeJoin(testConfigPath, "config.json");
      }
      return nativeJoin(...args);
    });

    storageService = new StorageService();
  });

  afterEach(() => {
    // Cleanup test directory
    if (fs.existsSync(testConfigPath)) {
      fs.rmSync(testConfigPath, { recursive: true, force: true });
    }
    jest.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create config directory if not exists", () => {
      expect(fs.existsSync(testConfigPath)).toBe(true);
    });

    it("should create default config if none exists", () => {
      const configPath = storageService.getConfigPath();
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it("should load existing config", () => {
      const service1 = new StorageService();
      service1.setAutoKill(true);

      // Create new instance - should load existing config
      const service2 = new StorageService();
      expect(service2.isAutoKillEnabled()).toBe(true);
    });
  });

  describe("addPortMapping", () => {
    it("should add new port mapping", () => {
      storageService.addPortMapping({
        port: 3000,
        projectName: "test-project",
        projectPath: "/path/to/project",
        autoKill: false,
      });

      const mapping = storageService.getPortMapping(3000);
      expect(mapping).toBeDefined();
      expect(mapping?.port).toBe(3000);
      expect(mapping?.projectName).toBe("test-project");
      expect(mapping?.projectPath).toBe("/path/to/project");
      expect(mapping?.autoKill).toBe(false);
      expect(mapping?.lastUsed).toBeInstanceOf(Date);
    });

    it("should update existing port mapping", () => {
      storageService.addPortMapping({
        port: 3000,
        projectName: "project-1",
        projectPath: "/path/1",
        autoKill: false,
      });

      storageService.addPortMapping({
        port: 3000,
        projectName: "project-2",
        projectPath: "/path/2",
        autoKill: true,
      });

      const mapping = storageService.getPortMapping(3000);
      expect(mapping?.projectName).toBe("project-2");
      expect(mapping?.projectPath).toBe("/path/2");
      expect(mapping?.autoKill).toBe(true);

      // Should only have one mapping for port 3000
      const allMappings = storageService.getAllMappings();
      const port3000Mappings = allMappings.filter((m) => m.port === 3000);
      expect(port3000Mappings.length).toBe(1);
    });

    it("should persist mappings to disk", () => {
      storageService.addPortMapping({
        port: 8000,
        projectName: "api-server",
        projectPath: "/path/to/api",
        autoKill: true,
      });

      // Create new instance - should load from disk
      const newService = new StorageService();
      const mapping = newService.getPortMapping(8000);

      expect(mapping).toBeDefined();
      expect(mapping?.projectName).toBe("api-server");
    });
  });

  describe("getPortMapping", () => {
    it("should return null for non-existent port", () => {
      const mapping = storageService.getPortMapping(9999);
      expect(mapping).toBeNull();
    });

    it("should return mapping for existing port", () => {
      storageService.addPortMapping({
        port: 5000,
        projectName: "test",
        projectPath: "/test",
        autoKill: false,
      });

      const mapping = storageService.getPortMapping(5000);
      expect(mapping).not.toBeNull();
      expect(mapping?.port).toBe(5000);
    });
  });

  describe("getAllMappings", () => {
    it("should return empty array when no mappings", () => {
      const mappings = storageService.getAllMappings();
      expect(mappings).toEqual([]);
    });

    it("should return all mappings sorted by port", () => {
      storageService.addPortMapping({
        port: 8000,
        projectName: "project-2",
        projectPath: "/path/2",
        autoKill: false,
      });

      storageService.addPortMapping({
        port: 3000,
        projectName: "project-1",
        projectPath: "/path/1",
        autoKill: false,
      });

      storageService.addPortMapping({
        port: 5000,
        projectName: "project-3",
        projectPath: "/path/3",
        autoKill: false,
      });

      const mappings = storageService.getAllMappings();
      expect(mappings.length).toBe(3);
      expect(mappings[0].port).toBe(3000);
      expect(mappings[1].port).toBe(5000);
      expect(mappings[2].port).toBe(8000);
    });
  });

  describe("getMappingsForProject", () => {
    beforeEach(() => {
      storageService.addPortMapping({
        port: 3000,
        projectName: "project-a",
        projectPath: "/path/a",
        autoKill: false,
      });

      storageService.addPortMapping({
        port: 8000,
        projectName: "project-a",
        projectPath: "/path/a",
        autoKill: false,
      });

      storageService.addPortMapping({
        port: 5000,
        projectName: "project-b",
        projectPath: "/path/b",
        autoKill: false,
      });
    });

    it("should return mappings for specific project", () => {
      const mappings = storageService.getMappingsForProject("/path/a");
      expect(mappings.length).toBe(2);
      expect(mappings.every((m) => m.projectPath === "/path/a")).toBe(true);
    });

    it("should return empty array for project with no mappings", () => {
      const mappings = storageService.getMappingsForProject("/path/c");
      expect(mappings).toEqual([]);
    });
  });

  describe("removePortMapping", () => {
    it("should remove existing mapping", () => {
      storageService.addPortMapping({
        port: 3000,
        projectName: "test",
        projectPath: "/test",
        autoKill: false,
      });

      expect(storageService.getPortMapping(3000)).not.toBeNull();

      storageService.removePortMapping(3000);

      expect(storageService.getPortMapping(3000)).toBeNull();
    });

    it("should do nothing when removing non-existent mapping", () => {
      storageService.removePortMapping(9999);
      // Should not throw error
      expect(storageService.getAllMappings()).toEqual([]);
    });
  });

  describe("isAutoKillEnabled", () => {
    it("should return false by default", () => {
      expect(storageService.isAutoKillEnabled()).toBe(false);
    });

    it("should return true after enabling", () => {
      storageService.setAutoKill(true);
      expect(storageService.isAutoKillEnabled()).toBe(true);
    });
  });

  describe("setAutoKill", () => {
    it("should enable auto-kill", () => {
      storageService.setAutoKill(true);
      expect(storageService.isAutoKillEnabled()).toBe(true);
    });

    it("should disable auto-kill", () => {
      storageService.setAutoKill(true);
      storageService.setAutoKill(false);
      expect(storageService.isAutoKillEnabled()).toBe(false);
    });

    it("should persist setting to disk", () => {
      storageService.setAutoKill(true);

      const newService = new StorageService();
      expect(newService.isAutoKillEnabled()).toBe(true);
    });
  });

  describe("isConfirmKillEnabled", () => {
    it("should return true by default", () => {
      expect(storageService.isConfirmKillEnabled()).toBe(true);
    });
  });

  describe("setConfirmKill", () => {
    it("should disable confirmation", () => {
      storageService.setConfirmKill(false);
      expect(storageService.isConfirmKillEnabled()).toBe(false);
    });

    it("should enable confirmation", () => {
      storageService.setConfirmKill(false);
      storageService.setConfirmKill(true);
      expect(storageService.isConfirmKillEnabled()).toBe(true);
    });
  });

  describe("getConfigPath", () => {
    it("should return config file path", () => {
      const configPath = storageService.getConfigPath();
      expect(typeof configPath).toBe("string");
      expect(configPath).toContain(".zkill");
      expect(configPath).toContain("config.json");
    });
  });

  describe("clearConfig", () => {
    it("should reset to default configuration", () => {
      storageService.addPortMapping({
        port: 3000,
        projectName: "test",
        projectPath: "/test",
        autoKill: false,
      });
      storageService.setAutoKill(true);
      storageService.setConfirmKill(false);

      storageService.clearConfig();

      expect(storageService.getAllMappings()).toEqual([]);
      expect(storageService.isAutoKillEnabled()).toBe(false);
      expect(storageService.isConfirmKillEnabled()).toBe(true);
    });
  });

  describe("config migration", () => {
    it("should handle config without version field", () => {
      // Create old config format
      const configPath = storageService.getConfigPath();
      const oldConfig = {
        portMappings: [],
        autoKillEnabled: false,
      };

      fs.writeFileSync(configPath, JSON.stringify(oldConfig));

      // Load with new service
      const newService = new StorageService();
      expect(newService.isConfirmKillEnabled()).toBe(true);
    });

    it("should deserialize date strings in port mappings", () => {
      const configPath = storageService.getConfigPath();
      const isoDate = new Date().toISOString();

      const config = {
        portMappings: [
          {
            port: 3000,
            projectName: "test",
            projectPath: "/test",
            autoKill: false,
            lastUsed: isoDate,
          },
        ],
        autoKillEnabled: false,
        confirmKill: true,
        version: "1.0.0",
      };

      fs.writeFileSync(configPath, JSON.stringify(config));

      const newService = new StorageService();
      const mapping = newService.getPortMapping(3000);

      expect(mapping?.lastUsed).toBeInstanceOf(Date);
    });
  });

  describe("error handling", () => {
    it("should handle corrupted config file", () => {
      const configPath = storageService.getConfigPath();
      fs.writeFileSync(configPath, "invalid json{{{");

      // Should create new default config instead of crashing
      expect(() => new StorageService()).not.toThrow();
    });
  });
});
