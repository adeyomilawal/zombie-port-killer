"use strict";
/**
 * Parse and normalize port arguments for the kill command.
 * Validates every token before returning; deduplicates while preserving order.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseKillPortTokens = parseKillPortTokens;
function parseKillPortTokens(raw) {
    const parsed = [];
    for (const token of raw) {
        const portNum = parseInt(token, 10);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
            return { ok: false, invalidToken: token };
        }
        parsed.push(portNum);
    }
    const seen = new Set();
    const unique = [];
    for (const n of parsed) {
        if (!seen.has(n)) {
            seen.add(n);
            unique.push(n);
        }
    }
    return { ok: true, ports: unique };
}
//# sourceMappingURL=parse-kill-ports.js.map