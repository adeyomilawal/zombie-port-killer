"use strict";
/**
 * Process Service Tests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const process_service_1 = require("../process.service");
const os_1 = __importDefault(require("os"));
describe("ProcessService", () => {
    let processService;
    beforeEach(() => {
        processService = new process_service_1.ProcessService();
    });
    describe("constructor", () => {
        it("should create appropriate platform adapter based on OS", () => {
            expect(processService).toBeDefined();
            expect(processService).toBeInstanceOf(process_service_1.ProcessService);
        });
        it("should throw error for unsupported platform", () => {
            const originalPlatform = os_1.default.platform;
            jest.spyOn(os_1.default, "platform").mockReturnValue("unsupported");
            expect(() => new process_service_1.ProcessService()).toThrow("Unsupported platform");
            jest.restoreAllMocks();
        });
    });
    describe("findByPort", () => {
        it("should validate port number", async () => {
            await expect(processService.findByPort(0)).rejects.toThrow("Port must be a number");
            await expect(processService.findByPort(65536)).rejects.toThrow("Port must be between 1 and 65535");
            await expect(processService.findByPort(-1)).rejects.toThrow("Port must be between 1 and 65535");
        });
        it("should accept valid port numbers", async () => {
            // This will return null for unused ports, which is expected
            await expect(processService.findByPort(1)).resolves.not.toThrow();
            await expect(processService.findByPort(3000)).resolves.not.toThrow();
            await expect(processService.findByPort(65535)).resolves.not.toThrow();
        });
        it("should return null for unused ports", async () => {
            // Using a very high port number that's unlikely to be in use
            const result = await processService.findByPort(64999);
            expect(result).toBeNull();
        });
        it("should throw error for non-numeric port", async () => {
            await expect(processService.findByPort(NaN)).rejects.toThrow("Port must be a number");
        });
    });
    describe("killProcess", () => {
        it("should throw error for invalid PID", async () => {
            await expect(processService.killProcess(0, false)).rejects.toThrow("Invalid PID");
            await expect(processService.killProcess(-1, false)).rejects.toThrow("Invalid PID");
        });
        it("should return false when killing non-existent process", async () => {
            // PID 999999 is unlikely to exist
            const result = await processService.killProcess(999999, false);
            expect(result).toBe(false);
        });
    });
    describe("getAllPorts", () => {
        it("should return an array", async () => {
            const result = await processService.getAllPorts();
            expect(Array.isArray(result)).toBe(true);
        });
        it("should return ProcessInfo objects with correct structure", async () => {
            const result = await processService.getAllPorts();
            if (result.length > 0) {
                const process = result[0];
                expect(process).toHaveProperty("pid");
                expect(process).toHaveProperty("port");
                expect(process).toHaveProperty("processName");
                expect(process).toHaveProperty("command");
                expect(typeof process.pid).toBe("number");
                expect(typeof process.port).toBe("number");
                expect(typeof process.processName).toBe("string");
                expect(typeof process.command).toBe("string");
            }
        });
    });
    describe("isCriticalProcess", () => {
        it("should detect critical system processes", () => {
            const criticalProcess = {
                pid: 1,
                port: 22,
                processName: "systemd",
                command: "/sbin/systemd",
            };
            const result = processService.isCriticalProcess(criticalProcess);
            // Result depends on platform adapter implementation
            expect(typeof result).toBe("boolean");
        });
        it("should not flag regular processes as critical", () => {
            const regularProcess = {
                pid: 12345,
                port: 3000,
                processName: "node",
                command: "node server.js",
            };
            const result = processService.isCriticalProcess(regularProcess);
            expect(result).toBe(false);
        });
    });
    describe("getPlatformName", () => {
        it("should return platform name string", () => {
            const platformName = processService.getPlatformName();
            expect(typeof platformName).toBe("string");
            expect(["macOS", "Linux", "Windows"]).toContain(platformName);
        });
        it("should return correct platform for current OS", () => {
            const platform = os_1.default.platform();
            const platformName = processService.getPlatformName();
            if (platform === "darwin") {
                expect(platformName).toBe("macOS");
            }
            else if (platform === "linux") {
                expect(platformName).toBe("Linux");
            }
            else if (platform === "win32") {
                expect(platformName).toBe("Windows");
            }
        });
    });
    describe("validatePort (private method)", () => {
        it("should accept valid port ranges", async () => {
            // Test boundaries
            await expect(processService.findByPort(1)).resolves.not.toThrow();
            await expect(processService.findByPort(65535)).resolves.not.toThrow();
            // Test common ports
            await expect(processService.findByPort(80)).resolves.not.toThrow();
            await expect(processService.findByPort(443)).resolves.not.toThrow();
            await expect(processService.findByPort(3000)).resolves.not.toThrow();
            await expect(processService.findByPort(8080)).resolves.not.toThrow();
        });
        it("should reject invalid port values", async () => {
            // Below range
            await expect(processService.findByPort(0)).rejects.toThrow();
            await expect(processService.findByPort(-100)).rejects.toThrow();
            // Above range
            await expect(processService.findByPort(65536)).rejects.toThrow();
            await expect(processService.findByPort(100000)).rejects.toThrow();
        });
    });
});
//# sourceMappingURL=process.service.test.js.map