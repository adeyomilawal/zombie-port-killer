import {
  SCAN_JSON_SCHEMA_VERSION,
  buildScanJsonDocument,
  isValidScanJsonV1,
  scanJsonV1ValidationErrors,
} from "../scan-json-schema";
import type { ProcessInfo } from "../types";

describe("scan JSON v1 contract (consumer safety)", () => {
  const minimalInput = {
    processes: [] as ProcessInfo[],
    verbose: false,
    zkillVersion: "1.0.0",
    platform: "linux",
    filters: { hideSystemProcesses: false },
    isCriticalProcess: () => false,
    getPortMapping: () => null as null,
  };

  it("rejects wrong schemaVersion", () => {
    expect(
      scanJsonV1ValidationErrors({
        schemaVersion: "0",
        meta: { zkillVersion: "1", platform: "linux" },
        filters: {
          range: null,
          process: null,
          project: null,
          hideSystemProcesses: false,
        },
        count: 0,
        processes: [],
      })
    ).not.toEqual([]);
  });

  it("rejects count mismatch", () => {
    expect(
      scanJsonV1ValidationErrors({
        schemaVersion: SCAN_JSON_SCHEMA_VERSION,
        meta: { zkillVersion: "1.0.0", platform: "linux" },
        filters: {
          range: null,
          process: null,
          project: null,
          hideSystemProcesses: false,
        },
        count: 2,
        processes: [],
      })
    ).toContain("count must equal processes.length");
  });

  it("rejects invalid port range on a process", () => {
    const doc = buildScanJsonDocument({
      ...minimalInput,
      processes: [
        {
          pid: 1,
          port: 70000,
          processName: "x",
          command: "x",
        },
      ],
    });
    expect(scanJsonV1ValidationErrors(doc)).toContain(
      "processes[0].port must be a number 1–65535"
    );
  });

  it("rejects verbose context missing keys", () => {
    expect(
      scanJsonV1ValidationErrors({
        schemaVersion: SCAN_JSON_SCHEMA_VERSION,
        meta: { zkillVersion: "1.0.0", platform: "linux" },
        filters: {
          range: null,
          process: null,
          project: null,
          hideSystemProcesses: false,
        },
        count: 1,
        processes: [
          {
            port: 3000,
            pid: 1,
            processName: "n",
            command: "c",
            user: null,
            isSystemProcess: false,
            projectName: null,
            projectPath: null,
            context: { uptimeMs: null },
          },
        ],
      })
    ).toEqual(expect.arrayContaining([expect.stringContaining('missing key')]));
  });

  it("rejects unknown serviceManager string", () => {
    const doc = buildScanJsonDocument({
      ...minimalInput,
      verbose: true,
      processes: [
        {
          pid: 1,
          port: 3000,
          processName: "n",
          command: "c",
          serviceManager: "unknown" as ProcessInfo["serviceManager"],
        },
      ],
    });
    expect(scanJsonV1ValidationErrors(doc).join(" ")).toMatch(
      /serviceManager|service manager/i
    );
  });

  it("accepts every document produced by buildScanJsonDocument", () => {
    const cases: ProcessInfo[][] = [
      [],
      [{ pid: 1, port: 1, processName: "a", command: "b" }],
      [
        {
          pid: 99999,
          port: 65535,
          processName: "unicode \u2014 \n \t",
          command: 'cmd "quotes" \\ and \u2028',
          user: undefined,
        },
      ],
      [
        {
          pid: 2,
          port: 80,
          processName: "nginx",
          command: "nginx",
          user: "www-data",
          serviceManager: "systemd",
          serviceName: "nginx.service",
        },
      ],
    ];
    for (const processes of cases) {
      for (const verbose of [false, true]) {
        const doc = buildScanJsonDocument({
          ...minimalInput,
          processes,
          verbose,
          filters: {
            range: "1-1024",
            process: "node",
            project: "p",
            hideSystemProcesses: true,
          },
          getPortMapping: (port) =>
            port === 80
              ? { projectName: "web", projectPath: "/var/www" }
              : null,
        });
        expect(scanJsonV1ValidationErrors(doc)).toEqual([]);
        expect(isValidScanJsonV1(doc)).toBe(true);
      }
    }
  });

  it("survives JSON.parse(JSON.stringify()) round-trip for consumers", () => {
    const doc = buildScanJsonDocument({
      ...minimalInput,
      verbose: true,
      processes: [
        {
          pid: 42,
          port: 3000,
          processName: "node",
          command: "node server.js",
          uptime: 1,
          startTime: new Date("2026-01-01T00:00:00.000Z"),
          parentPid: 1,
          parentProcessName: "launchd",
          serviceManager: "launchd",
          serviceName: "com.test",
          workingDirectory: "/tmp",
        },
      ],
    });
    const wire = JSON.stringify(doc);
    const again = JSON.parse(wire);
    expect(scanJsonV1ValidationErrors(again)).toEqual([]);
    expect(isValidScanJsonV1(again)).toBe(true);
  });
});
