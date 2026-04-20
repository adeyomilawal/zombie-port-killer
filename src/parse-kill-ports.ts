/**
 * Parse and normalize port arguments for the kill command.
 * Validates every token before returning; deduplicates while preserving order.
 */

export type ParseKillPortsResult =
  | { ok: true; ports: number[] }
  | { ok: false; invalidToken: string };

export function parseKillPortTokens(raw: string[]): ParseKillPortsResult {
  const parsed: number[] = [];
  for (const token of raw) {
    const portNum = parseInt(token, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return { ok: false, invalidToken: token };
    }
    parsed.push(portNum);
  }

  const seen = new Set<number>();
  const unique: number[] = [];
  for (const n of parsed) {
    if (!seen.has(n)) {
      seen.add(n);
      unique.push(n);
    }
  }
  return { ok: true, ports: unique };
}
