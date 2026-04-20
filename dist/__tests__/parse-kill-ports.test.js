"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parse_kill_ports_1 = require("../parse-kill-ports");
describe("parseKillPortTokens", () => {
    it("returns ordered unique ports", () => {
        expect((0, parse_kill_ports_1.parseKillPortTokens)(["3000", "8000", "3000"])).toEqual({
            ok: true,
            ports: [3000, 8000],
        });
    });
    it("accepts a single port", () => {
        expect((0, parse_kill_ports_1.parseKillPortTokens)(["443"])).toEqual({ ok: true, ports: [443] });
    });
    it("rejects invalid token", () => {
        expect((0, parse_kill_ports_1.parseKillPortTokens)(["3000", "abc"])).toEqual({
            ok: false,
            invalidToken: "abc",
        });
    });
    it("rejects out of range", () => {
        expect((0, parse_kill_ports_1.parseKillPortTokens)(["0"])).toEqual({
            ok: false,
            invalidToken: "0",
        });
        expect((0, parse_kill_ports_1.parseKillPortTokens)(["65536"])).toEqual({
            ok: false,
            invalidToken: "65536",
        });
    });
    it("accepts empty list as valid with no ports", () => {
        expect((0, parse_kill_ports_1.parseKillPortTokens)([])).toEqual({ ok: true, ports: [] });
    });
});
//# sourceMappingURL=parse-kill-ports.test.js.map