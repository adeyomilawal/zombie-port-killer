/**
 * Versioned JSON output for `zkill scan --json`.
 * Bump schemaVersion only for breaking shape changes; additive fields are OK within the same version.
 */
import type { ProcessInfo, ServiceManager } from "./types";
export declare const SCAN_JSON_SCHEMA_VERSION: "1";
export type ScanJsonSchemaVersion = typeof SCAN_JSON_SCHEMA_VERSION;
export interface ScanJsonFilters {
    range: string | null;
    process: string | null;
    project: string | null;
    hideSystemProcesses: boolean;
}
/** Included when scan runs with --verbose; null otherwise (keys stay stable). */
export interface ScanJsonProcessContext {
    uptimeMs: number | null;
    startTime: string | null;
    parentPid: number | null;
    parentProcessName: string | null;
    serviceManager: ServiceManager;
    serviceName: string | null;
    workingDirectory: string | null;
}
export interface ScanJsonProcess {
    port: number;
    pid: number;
    processName: string;
    command: string;
    user: string | null;
    isSystemProcess: boolean;
    projectName: string | null;
    projectPath: string | null;
    context: ScanJsonProcessContext | null;
}
export interface ScanJsonDocument {
    schemaVersion: ScanJsonSchemaVersion;
    meta: {
        zkillVersion: string;
        platform: string;
    };
    filters: ScanJsonFilters;
    count: number;
    processes: ScanJsonProcess[];
}
export interface BuildScanJsonInput {
    processes: ProcessInfo[];
    verbose: boolean;
    zkillVersion: string;
    platform: string;
    filters: {
        range?: string;
        process?: string;
        project?: string;
        hideSystemProcesses: boolean;
    };
    isCriticalProcess: (p: ProcessInfo) => boolean;
    getPortMapping: (port: number) => {
        projectName: string;
        projectPath: string;
    } | null | undefined;
}
/**
 * Builds the scan JSON document. Callers must pass processes already filtered and sorted.
 */
export declare function buildScanJsonDocument(input: BuildScanJsonInput): ScanJsonDocument;
/**
 * Returns human-readable validation errors for a parsed JSON value against
 * scan JSON schema v1. Empty array means the payload matches the contract
 * consumers should rely on for `zkill scan --json`.
 */
export declare function scanJsonV1ValidationErrors(value: unknown): string[];
export declare function isValidScanJsonV1(value: unknown): value is ScanJsonDocument;
//# sourceMappingURL=scan-json-schema.d.ts.map