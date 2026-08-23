import { describe, expect, it } from "vitest";

import {
  readSuggestedWaypointWholePathSafetyConfig,
  WHOLE_PATH_APPROVAL_GATE,
  WHOLE_PATH_EFFECT_GATE,
} from "./suggestedWaypointWholePathSafety";

function validEnvironment(): Record<string, string> {
  return {
    SOLMIND_WHOLE_PATH_APPROVAL: WHOLE_PATH_APPROVAL_GATE,
    SOLMIND_WHOLE_PATH_ALLOW_LOCAL_EFFECTS: WHOLE_PATH_EFFECT_GATE,
    SOLMIND_WHOLE_PATH_RUN_ID: "S03G-20260822-safety1",
    SOLMIND_LOCAL_SUPABASE_PROJECT_ID: "solmind-app",
    SOLMIND_LOCAL_SUPABASE_URL: "http://127.0.0.1:54321",
    SOLMIND_LOCAL_DATABASE_PORT: "54322",
    SOLMIND_TRUSTED_APP_ORIGIN: "http://127.0.0.1:4627",
  };
}

describe("Suggested Waypoint whole-path safety gates", () => {
  it("returns null before reading any other value when both effect gates are absent", () => {
    const environment = new Proxy<Record<string, string | undefined>>(
      {},
      {
        get(_target, property) {
          if (
            property === "SOLMIND_WHOLE_PATH_APPROVAL" ||
            property === "SOLMIND_WHOLE_PATH_ALLOW_LOCAL_EFFECTS"
          ) {
            return undefined;
          }
          throw new Error(`unexpected read of ${String(property)}`);
        },
      },
    );

    expect(readSuggestedWaypointWholePathSafetyConfig(environment)).toBeNull();
  });

  it.each([
    ["missing approval", "SOLMIND_WHOLE_PATH_APPROVAL"],
    ["missing effect", "SOLMIND_WHOLE_PATH_ALLOW_LOCAL_EFFECTS"],
  ])("returns null with %s", (_label, missing) => {
    const environment = validEnvironment();
    delete environment[missing];
    expect(readSuggestedWaypointWholePathSafetyConfig(environment)).toBeNull();
  });

  it.each([
    [undefined, WHOLE_PATH_EFFECT_GATE],
    ["wrong-approval", WHOLE_PATH_EFFECT_GATE],
    [WHOLE_PATH_APPROVAL_GATE, undefined],
    [WHOLE_PATH_APPROVAL_GATE, "wrong-effect"],
  ])(
    "reads no post-gate configuration when the gate pair is %s / %s",
    (approval, effect) => {
      const environment = new Proxy<Record<string, string | undefined>>(
        {},
        {
          get(_target, property) {
            if (property === "SOLMIND_WHOLE_PATH_APPROVAL") {
              return approval;
            }
            if (property === "SOLMIND_WHOLE_PATH_ALLOW_LOCAL_EFFECTS") {
              return effect;
            }
            throw new Error(`unexpected post-gate read of ${String(property)}`);
          },
        },
      );
      expect(readSuggestedWaypointWholePathSafetyConfig(environment)).toBeNull();
    },
  );

  it("returns a frozen exact local configuration", () => {
    const config = readSuggestedWaypointWholePathSafetyConfig(validEnvironment());
    expect(config).not.toBeNull();
    expect(config).toMatchObject({
      runId: "S03G-20260822-safety1",
      projectId: "solmind-app",
      localSupabaseUrl: "http://127.0.0.1:54321",
      localDatabasePort: 54322,
      trustedApplicationOrigin: "http://127.0.0.1:4627",
      roles: [
        "assigned-guide",
        "assigned-explorer",
        "unrelated-guide",
        "unrelated-explorer",
        "ended-explorer",
      ],
    });
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config?.roles)).toBe(true);
  });
});

describe("Suggested Waypoint whole-path local target refusal", () => {
  it.each([
    "https://127.0.0.1:54321",
    "http://localhost:54321",
    "http://[::1]:54321",
    "http://127.1:54321",
    "http://2130706433:54321",
    "http://0177.0.0.1:54321",
    "http://0x7f.0.0.1:54321",
    "http://project.supabase.co:54321",
    "http://127.0.0.1:54320",
    "http://127.0.0.1",
    "http://127.0.0.1:54321/",
    "http://user@127.0.0.1:54321",
    "http://127.0.0.1:54321/path",
    "http://127.0.0.1:54321/?query=1",
    "http://127.0.0.1:54321/#fragment",
    "${SOLMIND_LOCAL_SUPABASE_URL}",
    "$env:SOLMIND_LOCAL_SUPABASE_URL",
    "%SOLMIND_LOCAL_SUPABASE_URL%",
  ])("rejects non-exact Supabase URL %s", (value) => {
    const environment = validEnvironment();
    environment.SOLMIND_LOCAL_SUPABASE_URL = value;
    expect(() => readSuggestedWaypointWholePathSafetyConfig(environment)).toThrow();
  });

  it.each(["other-project", "solmind-app ", "${PROJECT_ID}"])(
    "rejects project identity %s",
    (value) => {
      const environment = validEnvironment();
      environment.SOLMIND_LOCAL_SUPABASE_PROJECT_ID = value;
      expect(() => readSuggestedWaypointWholePathSafetyConfig(environment)).toThrow(
        /whole_path_/,
      );
    },
  );

  it.each(["54321", "54323", "054322", "54322 ", "${DB_PORT}"])(
    "rejects database port %s",
    (value) => {
      const environment = validEnvironment();
      environment.SOLMIND_LOCAL_DATABASE_PORT = value;
      expect(() => readSuggestedWaypointWholePathSafetyConfig(environment)).toThrow(
        /whole_path_/,
      );
    },
  );

  it.each([
    "https://127.0.0.1:4627",
    "http://localhost:4627",
    "http://127.1:4627",
    "http://2130706433:4627",
    "http://127.0.0.1:04627",
    "http://127.0.0.1:54321",
    "http://127.0.0.1:4099",
    "http://127.0.0.1:5000",
    "http://127.0.0.1:4627/",
    "http://127.0.0.1:4627/path",
    "http://127.0.0.1:4627/?query=1",
    "http://127.0.0.1:4627/#fragment",
  ])("rejects unowned application origin %s", (value) => {
    const environment = validEnvironment();
    environment.SOLMIND_TRUSTED_APP_ORIGIN = value;
    expect(() => readSuggestedWaypointWholePathSafetyConfig(environment)).toThrow();
  });
});

describe("Suggested Waypoint whole-path synthetic identity boundary", () => {
  it.each([
    "S03G-20260822-short1",
    "S03G-20260822-abcdef",
    "S03G-20260822-abc-123",
  ])("accepts bounded run ID %s", (runId) => {
    const environment = validEnvironment();
    environment.SOLMIND_WHOLE_PATH_RUN_ID = runId;
    const config = readSuggestedWaypointWholePathSafetyConfig(environment);
    expect(config?.runId).toBe(runId);
  });

  it.each([
    "s03g-20260822-abcdef",
    "S03G-2026822-abcdef",
    "S03G-20260822-abc",
    "S03G-20260822-ABCDEF",
    "S03G-20260822-abcdef ",
    "${RUN_ID}",
  ])("rejects unbounded run ID %s", (runId) => {
    const environment = validEnvironment();
    environment.SOLMIND_WHOLE_PATH_RUN_ID = runId;
    expect(() => readSuggestedWaypointWholePathSafetyConfig(environment)).toThrow(
      /whole_path_/,
    );
  });

  it("derives five unique reserved-domain addresses without accepting free-form recipients", () => {
    const config = readSuggestedWaypointWholePathSafetyConfig(validEnvironment());
    expect(config).not.toBeNull();
    const emails = config!.roles.map((role) => config!.syntheticEmailFor(role));
    expect(new Set(emails).size).toBe(5);
    expect(emails.every((email) => email.endsWith("@synthetic.invalid"))).toBe(
      true,
    );
    expect(emails.every((email) => email.includes("s03g-20260822-safety1"))).toBe(
      true,
    );
  });

  it("rejects an unapproved role even if a caller bypasses TypeScript", () => {
    const config = readSuggestedWaypointWholePathSafetyConfig(validEnvironment());
    expect(() => config!.syntheticEmailFor("admin" as never)).toThrow(
      "whole_path_unapproved_role",
    );
  });
});
