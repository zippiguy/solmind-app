// Browser-safe contract for the protected Assistant Display-Name setting family.
//
// The database owns the configured values. This module owns only fixed setting
// identifiers, bounded validation, and value-free browser result shapes. It does
// not contain Nivan or Solomon as fallback constants.

export const ASSISTANT_DISPLAY_NAME_SETTING_KEYS = Object.freeze({
  EXPLORER_VIRTUAL_GUIDE: "explorer_virtual_guide_default_display_name",
  GUIDE_ASSISTANT: "guide_assistant_default_display_name",
} as const);

export type AssistantDisplayNameSettingKey =
  (typeof ASSISTANT_DISPLAY_NAME_SETTING_KEYS)[keyof typeof ASSISTANT_DISPLAY_NAME_SETTING_KEYS];

export const ASSISTANT_DISPLAY_NAME_DENIED =
  "assistant_display_name_denied" as const;
export const ASSISTANT_DISPLAY_NAME_FAILED =
  "assistant_display_name_failed" as const;
export const ASSISTANT_DISPLAY_NAME_CONFLICT =
  "assistant_display_name_conflict" as const;

export type AssistantDisplayNameBrowserError =
  | typeof ASSISTANT_DISPLAY_NAME_DENIED
  | typeof ASSISTANT_DISPLAY_NAME_FAILED
  | typeof ASSISTANT_DISPLAY_NAME_CONFLICT;

export type AssistantDisplayNameSetting = Readonly<{
  settingKey: AssistantDisplayNameSettingKey;
  displayName: string;
  version: number;
}>;

export type AdminAssistantDisplayNameReadResult =
  | Readonly<{
      ok: true;
      settings: readonly [
        AssistantDisplayNameSetting,
        AssistantDisplayNameSetting,
      ];
      error: null;
    }>
  | Readonly<{
      ok: false;
      settings: null;
      error: typeof ASSISTANT_DISPLAY_NAME_DENIED | typeof ASSISTANT_DISPLAY_NAME_FAILED;
    }>;

export type AdminAssistantDisplayNameMutationOutcome =
  | "applied"
  | "already_applied"
  | "unchanged";

export type AdminAssistantDisplayNameMutationResult =
  | Readonly<{
      ok: true;
      outcome: AdminAssistantDisplayNameMutationOutcome;
      setting: AssistantDisplayNameSetting;
      error: null;
    }>
  | Readonly<{
      ok: false;
      outcome: null;
      setting: null;
      error: AssistantDisplayNameBrowserError;
    }>;

export type AdminAssistantDisplayNameMutationInput = Readonly<{
  settingKey: AssistantDisplayNameSettingKey;
  displayName: string;
  expectedVersion: number;
  operationId: string;
}>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const FORBIDDEN_DISPLAY_NAME_PATTERN =
  /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;

function hasIsolatedSurrogate(value: string): boolean {
  for (const scalar of value) {
    const codePoint = scalar.codePointAt(0);
    if (codePoint !== undefined && codePoint >= 0xd800 && codePoint <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  try {
    const actual = Object.keys(value).sort();
    const expected = [...keys].sort();
    return (
      actual.length === expected.length &&
      actual.every((key, index) => key === expected[index])
    );
  } catch {
    return false;
  }
}

export function isAssistantDisplayNameSettingKey(
  value: unknown,
): value is AssistantDisplayNameSettingKey {
  return (
    typeof value === "string" &&
    (value === ASSISTANT_DISPLAY_NAME_SETTING_KEYS.EXPLORER_VIRTUAL_GUIDE ||
      value === ASSISTANT_DISPLAY_NAME_SETTING_KEYS.GUIDE_ASSISTANT)
  );
}

export function isAssistantDisplayName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim() === value &&
    Array.from(value).length >= 1 &&
    Array.from(value).length <= 40 &&
    !hasIsolatedSurrogate(value) &&
    !FORBIDDEN_DISPLAY_NAME_PATTERN.test(value)
  );
}

export function isAssistantDisplayNameVersion(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value >= 1;
}

export function parseAdminAssistantDisplayNameMutationInput(
  value: unknown,
): AdminAssistantDisplayNameMutationInput | null {
  try {
    if (
      !isPlainRecord(value) ||
      !hasExactKeys(value, [
        "settingKey",
        "displayName",
        "expectedVersion",
        "operationId",
      ]) ||
      !isAssistantDisplayNameSettingKey(value.settingKey) ||
      !isAssistantDisplayName(value.displayName) ||
      !isAssistantDisplayNameVersion(value.expectedVersion) ||
      typeof value.operationId !== "string" ||
      !UUID_PATTERN.test(value.operationId)
    ) {
      return null;
    }
    return Object.freeze({
      settingKey: value.settingKey,
      displayName: value.displayName,
      expectedVersion: value.expectedVersion,
      operationId: value.operationId,
    });
  } catch {
    return null;
  }
}

export function createAdminAssistantDisplayNameReadFailure(
  error: typeof ASSISTANT_DISPLAY_NAME_DENIED | typeof ASSISTANT_DISPLAY_NAME_FAILED,
): AdminAssistantDisplayNameReadResult {
  return Object.freeze({ ok: false, settings: null, error });
}

export function createAdminAssistantDisplayNameMutationFailure(
  error: AssistantDisplayNameBrowserError,
): AdminAssistantDisplayNameMutationResult {
  return Object.freeze({ ok: false, outcome: null, setting: null, error });
}
