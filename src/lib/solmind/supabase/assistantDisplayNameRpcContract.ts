// Closed server-only RPC contract for the protected Assistant Display-Name
// setting family. The browser never supplies the Admin actor; a trusted server
// composition root derives it and constructs one of these calls.

import "server-only";

import {
  ASSISTANT_DISPLAY_NAME_SETTING_KEYS,
  isAssistantDisplayName,
  isAssistantDisplayNameSettingKey,
  isAssistantDisplayNameVersion,
  type AssistantDisplayNameSettingKey,
} from "../assistantDisplayNameBrowserContract";

if (typeof window !== "undefined") {
  throw new Error(
    "SolMind server configuration error: assistantDisplayNameRpcContract must not be imported in browser code.",
  );
}

export const ASSISTANT_DISPLAY_NAME_RPC_FUNCTIONS = Object.freeze([
  "solmind_read_explorer_virtual_guide_default_display_name",
  "solmind_read_guide_assistant_default_display_name",
  "solmind_read_admin_assistant_display_name_settings",
  "solmind_set_assistant_display_name_setting",
] as const);

export type AssistantDisplayNameRpcFunction =
  (typeof ASSISTANT_DISPLAY_NAME_RPC_FUNCTIONS)[number];

export type AssistantDisplayNameRpcCall =
  | Readonly<{
      functionName:
        | "solmind_read_explorer_virtual_guide_default_display_name"
        | "solmind_read_guide_assistant_default_display_name";
      args: Readonly<Record<string, never>>;
    }>
  | Readonly<{
      functionName: "solmind_read_admin_assistant_display_name_settings";
      args: Readonly<{ p_actor_user_account_id: string }>;
    }>
  | Readonly<{
      functionName: "solmind_set_assistant_display_name_setting";
      args: Readonly<{
        p_actor_user_account_id: string;
        p_setting_key: AssistantDisplayNameSettingKey;
        p_display_name: string;
        p_expected_version: number;
        p_operation_id: string;
      }>;
    }>;

export type AssistantDisplayNameRoleReadRow = Readonly<{
  display_name: string;
  version: number;
  updated_at: string;
}>;

export type AssistantDisplayNameAdminReadRow = Readonly<{
  setting_key: AssistantDisplayNameSettingKey;
  display_name: string;
  version: number;
  updated_at: string;
  updated_by_user_account_id: string | null;
}>;

export type AssistantDisplayNameMutationRow = Readonly<{
  outcome: "applied" | "already_applied" | "unchanged";
  setting_key: AssistantDisplayNameSettingKey;
  display_name: string;
  version: number;
  updated_at: string;
}>;

export type AssistantDisplayNameRpcPayload =
  | readonly [AssistantDisplayNameRoleReadRow]
  | readonly [AssistantDisplayNameAdminReadRow, AssistantDisplayNameAdminReadRow]
  | readonly [AssistantDisplayNameMutationRow];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  try {
    return (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
    );
  } catch {
    return false;
  }
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  try {
    const actual = Object.keys(value).sort();
    const expected = [...keys].sort();
    return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
  } catch {
    return false;
  }
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

function freezeCall(call: AssistantDisplayNameRpcCall): AssistantDisplayNameRpcCall {
  Object.freeze(call.args);
  return Object.freeze(call);
}

export function validateAssistantDisplayNameRpcCall(
  value: unknown,
): AssistantDisplayNameRpcCall | null {
  try {
    if (!isPlainRecord(value) || !hasExactKeys(value, ["functionName", "args"]) || !isPlainRecord(value.args)) {
      return null;
    }

    if (
      value.functionName === "solmind_read_explorer_virtual_guide_default_display_name" ||
      value.functionName === "solmind_read_guide_assistant_default_display_name"
    ) {
      return hasExactKeys(value.args, [])
        ? freezeCall({ functionName: value.functionName, args: {} })
        : null;
    }

    if (value.functionName === "solmind_read_admin_assistant_display_name_settings") {
      return hasExactKeys(value.args, ["p_actor_user_account_id"]) && isUuid(value.args.p_actor_user_account_id)
        ? freezeCall({
            functionName: value.functionName,
            args: { p_actor_user_account_id: value.args.p_actor_user_account_id },
          })
        : null;
    }

    if (value.functionName === "solmind_set_assistant_display_name_setting") {
      if (
        !hasExactKeys(value.args, [
          "p_actor_user_account_id",
          "p_setting_key",
          "p_display_name",
          "p_expected_version",
          "p_operation_id",
        ]) ||
        !isUuid(value.args.p_actor_user_account_id) ||
        !isAssistantDisplayNameSettingKey(value.args.p_setting_key) ||
        !isAssistantDisplayName(value.args.p_display_name) ||
        !isAssistantDisplayNameVersion(value.args.p_expected_version) ||
        !isUuid(value.args.p_operation_id)
      ) {
        return null;
      }
      return freezeCall({
        functionName: value.functionName,
        args: {
          p_actor_user_account_id: value.args.p_actor_user_account_id,
          p_setting_key: value.args.p_setting_key,
          p_display_name: value.args.p_display_name,
          p_expected_version: value.args.p_expected_version,
          p_operation_id: value.args.p_operation_id,
        },
      });
    }
    return null;
  } catch {
    return null;
  }
}

function validateRoleRow(value: unknown): AssistantDisplayNameRoleReadRow | null {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(value, ["display_name", "version", "updated_at"]) ||
    !isAssistantDisplayName(value.display_name) ||
    !isAssistantDisplayNameVersion(value.version) ||
    !isTimestamp(value.updated_at)
  ) {
    return null;
  }
  return Object.freeze({
    display_name: value.display_name,
    version: value.version,
    updated_at: value.updated_at,
  });
}

function validateAdminRow(value: unknown): AssistantDisplayNameAdminReadRow | null {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(value, [
      "setting_key",
      "display_name",
      "version",
      "updated_at",
      "updated_by_user_account_id",
    ]) ||
    !isAssistantDisplayNameSettingKey(value.setting_key) ||
    !isAssistantDisplayName(value.display_name) ||
    !isAssistantDisplayNameVersion(value.version) ||
    !isTimestamp(value.updated_at) ||
    !(value.updated_by_user_account_id === null || isUuid(value.updated_by_user_account_id))
  ) {
    return null;
  }
  return Object.freeze({
    setting_key: value.setting_key,
    display_name: value.display_name,
    version: value.version,
    updated_at: value.updated_at,
    updated_by_user_account_id: value.updated_by_user_account_id,
  });
}

function validateMutationRow(value: unknown): AssistantDisplayNameMutationRow | null {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(value, ["outcome", "setting_key", "display_name", "version", "updated_at"]) ||
    !(value.outcome === "applied" || value.outcome === "already_applied" || value.outcome === "unchanged") ||
    !isAssistantDisplayNameSettingKey(value.setting_key) ||
    !isAssistantDisplayName(value.display_name) ||
    !isAssistantDisplayNameVersion(value.version) ||
    !isTimestamp(value.updated_at)
  ) {
    return null;
  }
  return Object.freeze({
    outcome: value.outcome,
    setting_key: value.setting_key,
    display_name: value.display_name,
    version: value.version,
    updated_at: value.updated_at,
  });
}

export function validateAssistantDisplayNameRpcPayload(
  functionName: AssistantDisplayNameRpcFunction,
  value: unknown,
): AssistantDisplayNameRpcPayload | null {
  try {
    if (!Array.isArray(value)) return null;
    if (
      functionName === "solmind_read_explorer_virtual_guide_default_display_name" ||
      functionName === "solmind_read_guide_assistant_default_display_name"
    ) {
      if (value.length !== 1) return null;
      const row = validateRoleRow(value[0]);
      return row === null ? null : Object.freeze([row]);
    }
    if (functionName === "solmind_read_admin_assistant_display_name_settings") {
      if (value.length !== 2) return null;
      const rows = value.map(validateAdminRow);
      if (rows.some((row) => row === null)) return null;
      const typed = rows as [AssistantDisplayNameAdminReadRow, AssistantDisplayNameAdminReadRow];
      const keys = new Set(typed.map((row) => row.setting_key));
      if (
        keys.size !== 2 ||
        !keys.has(ASSISTANT_DISPLAY_NAME_SETTING_KEYS.EXPLORER_VIRTUAL_GUIDE) ||
        !keys.has(ASSISTANT_DISPLAY_NAME_SETTING_KEYS.GUIDE_ASSISTANT)
      ) return null;
      return Object.freeze(typed);
    }
    if (value.length !== 1) return null;
    const row = validateMutationRow(value[0]);
    return row === null ? null : Object.freeze([row]);
  } catch {
    return null;
  }
}

export function isAssistantDisplayNameRpcPayloadBoundToCall(
  call: AssistantDisplayNameRpcCall,
  payload: AssistantDisplayNameRpcPayload,
): boolean {
  if (call.functionName === "solmind_set_assistant_display_name_setting") {
    const row = payload[0];
    if (
      !("setting_key" in row) ||
      !("outcome" in row) ||
      row.setting_key !== call.args.p_setting_key ||
      row.display_name !== call.args.p_display_name
    ) {
      return false;
    }
    return row.outcome === "unchanged"
      ? row.version === call.args.p_expected_version
      : row.version === call.args.p_expected_version + 1;
  }
  return true;
}
