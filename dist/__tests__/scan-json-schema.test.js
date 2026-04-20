"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scan_json_schema_1 = require("../scan-json-schema");
describe("buildScanJsonDocument", () => {
    const baseProcess = {
        pid: 100,
        port: 3000,
        processName: "node",
        command: "node app.js",
        user: "dev",
    };
    it("uses schema version 1", () => {
        const doc = (0, scan_json_schema_1.buildScanJsonDocument)({
            processes: [],
            verbose: false,
            zkillVersion: "9.9.9",
            platform: "darwin",
            filters: { hideSystemProcesses: false },
            isCriticalProcess: () => false,
            getPortMapping: () => null,
        });
        expect(doc.schemaVersion).toBe(scan_json_schema_1.SCAN_JSON_SCHEMA_VERSION);
        expect(doc.schemaVersion).toBe("1");
    });
    it("includes meta and normalized filters", () => {
        const doc = (0, scan_json_schema_1.buildScanJsonDocument)({
            processes: [],
            verbose: false,
            zkillVersion: "1.2.3",
            platform: "linux",
            filters: {
                range: "3000-4000",
                process: "node",
                project: "my-app",
                hideSystemProcesses: true,
            },
            isCriticalProcess: () => false,
            getPortMapping: () => null,
        });
        expect(doc.meta).toEqual({ zkillVersion: "1.2.3", platform: "linux" });
        expect(doc.filters).toEqual({
            range: "3000-4000",
            process: "node",
            project: "my-app",
            hideSystemProcesses: true,
        });
        expect(doc.count).toBe(0);
        expect(doc.processes).toEqual([]);
    });
    it("maps processes sorted by caller order with stable keys", () => {
        const p1 = { ...baseProcess, port: 4000, pid: 2 };
        const p2 = { ...baseProcess, port: 3000, pid: 1 };
        const doc = (0, scan_json_schema_1.buildScanJsonDocument)({
            processes: [p1, p2],
            verbose: false,
            zkillVersion: "0.0.1",
            platform: "win32",
            filters: { hideSystemProcesses: false },
            isCriticalProcess: (p) => p.processName === "node",
            getPortMapping: (port) => port === 3000
                ? { projectName: "app", projectPath: "/tmp/app" }
                : null,
        });
        expect(doc.count).toBe(2);
        expect(doc.processes[0].port).toBe(4000);
        expect(doc.processes[0].isSystemProcess).toBe(true);
        expect(doc.processes[0].context).toBeNull();
        expect(doc.processes[0].projectName).toBeNull();
        expect(doc.processes[1].port).toBe(3000);
        expect(doc.processes[1].projectName).toBe("app");
        expect(doc.processes[1].projectPath).toBe("/tmp/app");
        expect(doc.processes[1].user).toBe("dev");
    });
    it("omits verbose context when verbose is false", () => {
        const p = {
            ...baseProcess,
            uptime: 5000,
            startTime: new Date("2026-01-15T12:00:00.000Z"),
            parentPid: 1,
            parentProcessName: "launchd",
            workingDirectory: "/app",
            serviceManager: "launchd",
            serviceName: "com.example",
        };
        const doc = (0, scan_json_schema_1.buildScanJsonDocument)({
            processes: [p],
            verbose: false,
            zkillVersion: "1.0.0",
            platform: "darwin",
            filters: { hideSystemProcesses: false },
            isCriticalProcess: () => false,
            getPortMapping: () => null,
        });
        expect(doc.processes[0].context).toBeNull();
    });
    it("includes full context when verbose is true", () => {
        const start = new Date("2026-02-01T08:30:00.000Z");
        const p = {
            ...baseProcess,
            uptime: 120000,
            startTime: start,
            parentPid: 999,
            parentProcessName: "bash",
            workingDirectory: "/home/u/proj",
            serviceManager: "systemd",
            serviceName: "myservice.service",
        };
        const doc = (0, scan_json_schema_1.buildScanJsonDocument)({
            processes: [p],
            verbose: true,
            zkillVersion: "1.0.0",
            platform: "linux",
            filters: { hideSystemProcesses: false },
            isCriticalProcess: () => false,
            getPortMapping: () => null,
        });
        const ctx = doc.processes[0].context;
        expect(ctx).not.toBeNull();
        expect(ctx.uptimeMs).toBe(120000);
        expect(ctx.startTime).toBe(start.toISOString());
        expect(ctx.parentPid).toBe(999);
        expect(ctx.parentProcessName).toBe("bash");
        expect(ctx.workingDirectory).toBe("/home/u/proj");
        expect(ctx.serviceManager).toBe("systemd");
        expect(ctx.serviceName).toBe("myservice.service");
    });
    it("uses nulls in context for missing optional fields when verbose", () => {
        const doc = (0, scan_json_schema_1.buildScanJsonDocument)({
            processes: [baseProcess],
            verbose: true,
            zkillVersion: "1.0.0",
            platform: "darwin",
            filters: { hideSystemProcesses: false },
            isCriticalProcess: () => false,
            getPortMapping: () => null,
        });
        const ctx = doc.processes[0].context;
        expect(ctx.uptimeMs).toBeNull();
        expect(ctx.startTime).toBeNull();
        expect(ctx.parentPid).toBeNull();
        expect(ctx.parentProcessName).toBeNull();
        expect(ctx.serviceManager).toBeNull();
        expect(ctx.serviceName).toBeNull();
        expect(ctx.workingDirectory).toBeNull();
    });
});
//# sourceMappingURL=scan-json-schema.test.js.map