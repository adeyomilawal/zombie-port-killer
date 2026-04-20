/**
 * Parse and normalize port arguments for the kill command.
 * Validates every token before returning; deduplicates while preserving order.
 */
export type ParseKillPortsResult = {
    ok: true;
    ports: number[];
} | {
    ok: false;
    invalidToken: string;
};
export declare function parseKillPortTokens(raw: string[]): ParseKillPortsResult;
//# sourceMappingURL=parse-kill-ports.d.ts.map