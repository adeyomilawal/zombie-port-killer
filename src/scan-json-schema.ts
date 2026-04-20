/**
 * Versioned JSON output for `zkill scan --json`.
 * Bump schemaVersion only for breaking shape changes; additive fields are OK within the same version.
 */

import type { ProcessInfo, ServiceManager } from "./types";

export const SCAN_JSON_SCHEMA_VERSION = "1" as const;

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
  getPortMapping: (
    port: number
  ) => { projectName: string; projectPath: string } | null | undefined;
}

function toIsoStartTime(d: Date | undefined): string | null {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) {
    return null;
  }
  return d.toISOString();
}

function buildProcessContext(
  p: ProcessInfo,
  verbose: boolean
): ScanJsonProcessContext | null {
  if (!verbose) {
    return null;
  }
  return {
    uptimeMs: p.uptime ?? null,
    startTime: toIsoStartTime(p.startTime),
    parentPid: p.parentPid ?? null,
    parentProcessName: p.parentProcessName ?? null,
    serviceManager: p.serviceManager ?? null,
    serviceName: p.serviceName ?? null,
    workingDirectory: p.workingDirectory ?? null,
  };
}

/**
 * Builds the scan JSON document. Callers must pass processes already filtered and sorted.
 */
export function buildScanJsonDocument(
  input: BuildScanJsonInput
): ScanJsonDocument {
  const {
    processes,
    verbose,
    zkillVersion,
    platform,
    filters,
    isCriticalProcess,
    getPortMapping,
  } = input;

  const mapped: ScanJsonProcess[] = processes.map((p) => {
    const mapping = getPortMapping(p.port);
    return {
      port: p.port,
      pid: p.pid,
      processName: p.processName,
      command: p.command,
      user: p.user ?? null,
      isSystemProcess: isCriticalProcess(p),
      projectName: mapping?.projectName ?? null,
      projectPath: mapping?.projectPath ?? null,
      context: buildProcessContext(p, verbose),
    };
  });

  return {
    schemaVersion: SCAN_JSON_SCHEMA_VERSION,
    meta: {
      zkillVersion,
      platform,
    },
    filters: {
      range: filters.range ?? null,
      process: filters.process ?? null,
      project: filters.project ?? null,
      hideSystemProcesses: filters.hideSystemProcesses,
    },
    count: mapped.length,
    processes: mapped,
  };
}

const ALLOWED_SERVICE_MANAGERS = new Set<
  NonNullable<ScanJsonProcessContext["serviceManager"]>
>(["systemd", "launchd", "windows-service"]);

function isNullableString(v: unknown): v is string | null {
  return v === null || typeof v === "string";
}

function validateProcessContext(
  ctx: unknown,
  path: string,
  errors: string[]
): void {
  if (ctx === null || typeof ctx !== "object" || Array.isArray(ctx)) {
    errors.push(`${path} must be null or an object`);
    return;
  }
  const c = ctx as Record<string, unknown>;
  const keys: (keyof ScanJsonProcessContext)[] = [
    "uptimeMs",
    "startTime",
    "parentPid",
    "parentProcessName",
    "serviceManager",
    "serviceName",
    "workingDirectory",
  ];
  for (const k of keys) {
    if (!(k in c)) {
      errors.push(`${path} missing key "${k}"`);
    }
  }
  if (c.uptimeMs !== null && typeof c.uptimeMs !== "number") {
    errors.push(`${path}.uptimeMs must be null or number`);
  }
  if (c.startTime !== null && typeof c.startTime !== "string") {
    errors.push(`${path}.startTime must be null or string`);
  }
  if (c.parentPid !== null && typeof c.parentPid !== "number") {
    errors.push(`${path}.parentPid must be null or number`);
  }
  if (!isNullableString(c.parentProcessName)) {
    errors.push(`${path}.parentProcessName must be null or string`);
  }
  if (!isNullableString(c.serviceName)) {
    errors.push(`${path}.serviceName must be null or string`);
  }
  if (!isNullableString(c.workingDirectory)) {
    errors.push(`${path}.workingDirectory must be null or string`);
  }
  if (
    c.serviceManager !== null &&
    (typeof c.serviceManager !== "string" ||
      !ALLOWED_SERVICE_MANAGERS.has(
        c.serviceManager as NonNullable<ScanJsonProcessContext["serviceManager"]>
      ))
  ) {
    errors.push(`${path}.serviceManager must be null or a known service manager string`);
  }
}

function validateProcessEntry(
  p: unknown,
  index: number,
  errors: string[]
): void {
  const path = `processes[${index}]`;
  if (!p || typeof p !== "object" || Array.isArray(p)) {
    errors.push(`${path} must be an object`);
    return;
  }
  const o = p as Record<string, unknown>;
  const requiredKeys: (keyof ScanJsonProcess)[] = [
    "port",
    "pid",
    "processName",
    "command",
    "user",
    "isSystemProcess",
    "projectName",
    "projectPath",
    "context",
  ];
  for (const k of requiredKeys) {
    if (!(k in o)) {
      errors.push(`${path} missing key "${k}"`);
    }
  }
  if (typeof o.port !== "number" || o.port < 1 || o.port > 65535) {
    errors.push(`${path}.port must be a number 1–65535`);
  }
  if (typeof o.pid !== "number" || !Number.isFinite(o.pid) || o.pid < 1) {
    errors.push(`${path}.pid must be a finite number ≥ 1`);
  }
  if (typeof o.processName !== "string") {
    errors.push(`${path}.processName must be a string`);
  }
  if (typeof o.command !== "string") {
    errors.push(`${path}.command must be a string`);
  }
  if (!isNullableString(o.user)) {
    errors.push(`${path}.user must be null or string`);
  }
  if (typeof o.isSystemProcess !== "boolean") {
    errors.push(`${path}.isSystemProcess must be boolean`);
  }
  if (!isNullableString(o.projectName)) {
    errors.push(`${path}.projectName must be null or string`);
  }
  if (!isNullableString(o.projectPath)) {
    errors.push(`${path}.projectPath must be null or string`);
  }
  if (o.context === null) {
    return;
  }
  if (typeof o.context !== "object" || Array.isArray(o.context)) {
    errors.push(`${path}.context must be null or an object`);
    return;
  }
  validateProcessContext(o.context, `${path}.context`, errors);
}

/**
 * Returns human-readable validation errors for a parsed JSON value against
 * scan JSON schema v1. Empty array means the payload matches the contract
 * consumers should rely on for `zkill scan --json`.
 */
export function scanJsonV1ValidationErrors(value: unknown): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push("root must be a JSON object");
    return errors;
  }
  const root = value as Record<string, unknown>;

  if (root.schemaVersion !== SCAN_JSON_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be "${SCAN_JSON_SCHEMA_VERSION}"`);
  }

  if (!root.meta || typeof root.meta !== "object" || Array.isArray(root.meta)) {
    errors.push("meta must be an object");
  } else {
    const m = root.meta as Record<string, unknown>;
    if (typeof m.zkillVersion !== "string" || m.zkillVersion.length === 0) {
      errors.push("meta.zkillVersion must be a non-empty string");
    }
    if (typeof m.platform !== "string" || m.platform.length === 0) {
      errors.push("meta.platform must be a non-empty string");
    }
  }

  if (
    !root.filters ||
    typeof root.filters !== "object" ||
    Array.isArray(root.filters)
  ) {
    errors.push("filters must be an object");
  } else {
    const f = root.filters as Record<string, unknown>;
    if (!isNullableString(f.range)) {
      errors.push("filters.range must be null or string");
    }
    if (!isNullableString(f.process)) {
      errors.push("filters.process must be null or string");
    }
    if (!isNullableString(f.project)) {
      errors.push("filters.project must be null or string");
    }
    if (typeof f.hideSystemProcesses !== "boolean") {
      errors.push("filters.hideSystemProcesses must be boolean");
    }
  }

  if (typeof root.count !== "number" || !Number.isInteger(root.count) || root.count < 0) {
    errors.push("count must be a non-negative integer");
  }

  if (!Array.isArray(root.processes)) {
    errors.push("processes must be an array");
    return errors;
  }

  if (root.count !== root.processes.length) {
    errors.push("count must equal processes.length");
  }

  root.processes.forEach((p, i) => validateProcessEntry(p, i, errors));

  return errors;
}

export function isValidScanJsonV1(value: unknown): value is ScanJsonDocument {
  return scanJsonV1ValidationErrors(value).length === 0;
}
