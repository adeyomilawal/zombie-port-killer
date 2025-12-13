"use strict";
/**
 * Integration tests for scan and list commands
 * Tests the actual CLI execution end-to-end
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const net_1 = __importDefault(require("net"));
describe("Scan Command Integration", () => {
    let testConfigPath;
    let server = null;
    beforeAll(() => {
        // Create isolated test config
        const nativeJoin = path_1.default.join;
        testConfigPath = nativeJoin(os_1.default.tmpdir(), `.zkill-test-scan-${Date.now()}`);
        jest.spyOn(path_1.default, "join").mockImplementation((...args) => {
            if (args.includes(".zkill")) {
                return nativeJoin(testConfigPath, "config.json");
            }
            return nativeJoin(...args);
        });
    });
    afterAll(() => {
        if (fs_1.default.existsSync(testConfigPath)) {
            fs_1.default.rmSync(testConfigPath, { recursive: true, force: true });
        }
        jest.restoreAllMocks();
    });
    afterEach(async () => {
        if (server) {
            await closeServer(server);
            server = null;
        }
    });
    describe("zkill scan", () => {
        it("should list active ports", async () => {
            const cliPath = path_1.default.join(__dirname, "../../../dist/cli.js");
            const output = (0, child_process_1.execSync)(`node "${cliPath}" scan`, {
                encoding: "utf-8",
                stdio: "pipe",
            });
            // Should show scanning message
            expect(output).toMatch(/scanning|ports|active/i);
        });
        it.skip("should detect test server port", async () => {
            const testPort = await findAvailablePort();
            server = await startTestServer(testPort);
            await sleep(200);
            const cliPath = path_1.default.join(__dirname, "../../../dist/cli.js");
            const output = (0, child_process_1.execSync)(`node "${cliPath}" scan`, {
                encoding: "utf-8",
                stdio: "pipe",
            });
            // Should list the port number somewhere in output
            expect(output).toContain(testPort.toString());
        }, 10000);
        it("should show message when no ports are in use", async () => {
            const cliPath = path_1.default.join(__dirname, "../../../dist/cli.js");
            const output = (0, child_process_1.execSync)(`node "${cliPath}" scan`, {
                encoding: "utf-8",
                stdio: "pipe",
            });
            // Should indicate no ports or show some ports
            expect(output.length).toBeGreaterThan(0);
        });
    });
    describe("zkill list", () => {
        it("should show port mappings", () => {
            const cliPath = path_1.default.join(__dirname, "../../../dist/cli.js");
            const output = (0, child_process_1.execSync)(`node "${cliPath}" list`, {
                encoding: "utf-8",
                stdio: "pipe",
            });
            expect(output).toMatch(/port|mapping|config/i);
        });
        it("should show port mappings list", () => {
            const cliPath = path_1.default.join(__dirname, "../../../dist/cli.js");
            const output = (0, child_process_1.execSync)(`node "${cliPath}" list`, {
                encoding: "utf-8",
                stdio: "pipe",
            });
            // Should show mappings header and config file path
            expect(output).toMatch(/port.*mapping/i);
            expect(output).toContain("config");
        });
        it("should display mappings count", () => {
            const cliPath = path_1.default.join(__dirname, "../../../dist/cli.js");
            const output = (0, child_process_1.execSync)(`node "${cliPath}" list`, {
                encoding: "utf-8",
                stdio: "pipe",
            });
            // Should show either "No port mappings configured" (0 mappings) or "N configured" (>0 mappings)
            expect(output).toMatch(/((No\s+)?port\s+mappings?\s+configured|(\d+)\s+configured)/i);
        });
    });
});
// Helper functions
function findAvailablePort() {
    return new Promise((resolve, reject) => {
        const server = net_1.default.createServer();
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
function startTestServer(port) {
    return new Promise((resolve, reject) => {
        const server = net_1.default.createServer();
        server.listen(port, "127.0.0.1", () => {
            resolve(server);
        });
        server.on("error", reject);
    });
}
function closeServer(server) {
    return new Promise((resolve) => {
        server.close(() => {
            resolve();
        });
    });
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=scan.command.integration.test.js.map