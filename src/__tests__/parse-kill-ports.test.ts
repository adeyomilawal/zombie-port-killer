import { parseKillPortTokens } from "../parse-kill-ports";

describe("parseKillPortTokens", () => {
  it("returns ordered unique ports", () => {
    expect(parseKillPortTokens(["3000", "8000", "3000"])).toEqual({
      ok: true,
      ports: [3000, 8000],
    });
  });

  it("accepts a single port", () => {
    expect(parseKillPortTokens(["443"])).toEqual({ ok: true, ports: [443] });
  });

  it("rejects invalid token", () => {
    expect(parseKillPortTokens(["3000", "abc"])).toEqual({
      ok: false,
      invalidToken: "abc",
    });
  });

  it("rejects out of range", () => {
    expect(parseKillPortTokens(["0"])).toEqual({
      ok: false,
      invalidToken: "0",
    });
    expect(parseKillPortTokens(["65536"])).toEqual({
      ok: false,
      invalidToken: "65536",
    });
  });

  it("accepts empty list as valid with no ports", () => {
    expect(parseKillPortTokens([])).toEqual({ ok: true, ports: [] });
  });
});
