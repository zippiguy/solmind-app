// Local-only safety kernel for the future Suggested Waypoint whole-path runner.
//
// This module is deliberately effect-free. It reads no key, creates no client,
// starts no process, writes no file, and contacts no service. A future runner
// must receive a non-null frozen result before it may inspect credentials or
// attempt any local fixture effect. These code-visible gates are necessary
// safety interlocks only; they never grant or replace operating authority.

export const WHOLE_PATH_APPROVAL_GATE =
  "approved-local-synthetic-suggested-waypoint-whole-path" as const;
export const WHOLE_PATH_EFFECT_GATE =
  "approved-exact-run-local-auth-and-database-cleanup" as const;

const EXPECTED_PROJECT_ID = "solmind-app" as const;
const EXPECTED_API_PORT = 54321 as const;
const EXPECTED_DATABASE_PORT = 54322 as const;
const RUN_ID_PATTERN = /^S03G-[0-9]{8}-[a-z0-9][a-z0-9-]{5,31}$/u;
const UNRESOLVED_VALUE = /(?:\$\{|\$env:|%[A-Za-z_][A-Za-z0-9_]*%)/iu;
const WHOLE_PATH_ROLES = [
  "assigned-guide",
  "assigned-explorer",
  "unrelated-guide",
  "unrelated-explorer",
  "ended-explorer",
] as const;

export type SuggestedWaypointWholePathRole =
  (typeof WHOLE_PATH_ROLES)[number];

type WholePathEnvironment = Readonly<Record<string, string | undefined>>;

export type SuggestedWaypointWholePathSafetyConfig = Readonly<{
  runId: string;
  projectId: typeof EXPECTED_PROJECT_ID;
  localSupabaseUrl: string;
  localDatabasePort: typeof EXPECTED_DATABASE_PORT;
  trustedApplicationOrigin: string;
  roles: readonly SuggestedWaypointWholePathRole[];
  syntheticEmailFor(role: SuggestedWaypointWholePathRole): string;
}>;

function required(environment: WholePathEnvironment, name: string): string {
  const value = environment[name];
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value !== value.trim() ||
    UNRESOLVED_VALUE.test(value)
  ) {
    throw new Error(`whole_path_missing_or_unresolved_${name.toLowerCase()}`);
  }
  return value;
}

function parseExactLoopbackOrigin(
  raw: string,
  expectedPort: number | null,
  errorCode: string,
): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(errorCode);
  }

  const port = Number(url.port);
  if (
    raw !== url.origin ||
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== "" ||
    !Number.isSafeInteger(port) ||
    port < 1 ||
    port > 65535 ||
    (expectedPort !== null && port !== expectedPort)
  ) {
    throw new Error(errorCode);
  }

  return url;
}

function parseRunId(raw: string): string {
  if (!RUN_ID_PATTERN.test(raw)) {
    throw new Error("whole_path_invalid_run_id");
  }
  return raw;
}

function parseProjectId(raw: string): typeof EXPECTED_PROJECT_ID {
  if (raw !== EXPECTED_PROJECT_ID) {
    throw new Error("whole_path_wrong_local_project");
  }
  return raw;
}

function parseDatabasePort(raw: string): typeof EXPECTED_DATABASE_PORT {
  if (raw !== String(EXPECTED_DATABASE_PORT)) {
    throw new Error("whole_path_wrong_local_database_port");
  }
  return EXPECTED_DATABASE_PORT;
}

function parseApplicationOrigin(raw: string): string {
  const url = parseExactLoopbackOrigin(
    raw,
    null,
    "whole_path_invalid_application_origin",
  );
  const port = Number(url.port);
  if (port < 4100 || port > 4999 || port === EXPECTED_API_PORT) {
    throw new Error("whole_path_unapproved_application_port");
  }
  return url.origin;
}

function syntheticEmail(runId: string, role: SuggestedWaypointWholePathRole): string {
  if (!WHOLE_PATH_ROLES.includes(role)) {
    throw new Error("whole_path_unapproved_role");
  }
  const localPart = `${runId.toLowerCase()}.${role}`;
  if (localPart.length > 64) {
    throw new Error("whole_path_synthetic_email_too_long");
  }
  return `${localPart}@synthetic.invalid`;
}

export function readSuggestedWaypointWholePathSafetyConfig(
  environment: WholePathEnvironment,
): SuggestedWaypointWholePathSafetyConfig | null {
  if (
    environment.SOLMIND_WHOLE_PATH_APPROVAL !== WHOLE_PATH_APPROVAL_GATE ||
    environment.SOLMIND_WHOLE_PATH_ALLOW_LOCAL_EFFECTS !==
      WHOLE_PATH_EFFECT_GATE
  ) {
    return null;
  }

  const runId = parseRunId(
    required(environment, "SOLMIND_WHOLE_PATH_RUN_ID"),
  );
  const projectId = parseProjectId(
    required(environment, "SOLMIND_LOCAL_SUPABASE_PROJECT_ID"),
  );
  const localSupabaseUrl = parseExactLoopbackOrigin(
    required(environment, "SOLMIND_LOCAL_SUPABASE_URL"),
    EXPECTED_API_PORT,
    "whole_path_invalid_local_supabase_url",
  ).origin;
  const localDatabasePort = parseDatabasePort(
    required(environment, "SOLMIND_LOCAL_DATABASE_PORT"),
  );
  const trustedApplicationOrigin = parseApplicationOrigin(
    required(environment, "SOLMIND_TRUSTED_APP_ORIGIN"),
  );
  const roles = Object.freeze([...WHOLE_PATH_ROLES]);

  const config: SuggestedWaypointWholePathSafetyConfig = {
    runId,
    projectId,
    localSupabaseUrl,
    localDatabasePort,
    trustedApplicationOrigin,
    roles,
    syntheticEmailFor: (role) => syntheticEmail(runId, role),
  };

  return Object.freeze(config);
}
