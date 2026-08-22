import { describe, expect, it } from "vitest";

import {
  ASSISTANT_DISPLAY_NAME_SETTING_KEYS,
  isAssistantDisplayName,
  parseAdminAssistantDisplayNameMutationInput,
} from "../assistantDisplayNameBrowserContract";

const OPERATION_ID = "22222222-2222-4222-8222-222222222222";

describe("assistantDisplayNameBrowserContract", () => {
  it("accepts an exact bounded mutation and returns an immutable snapshot", () => {
    const input = {
      settingKey: ASSISTANT_DISPLAY_NAME_SETTING_KEYS.EXPLORER_VIRTUAL_GUIDE,
      displayName: "Nivan",
      expectedVersion: 1,
      operationId: OPERATION_ID,
    };
    const parsed = parseAdminAssistantDisplayNameMutationInput(input);
    expect(parsed).toEqual(input);
    expect(Object.isFrozen(parsed)).toBe(true);
    input.displayName = "Changed later";
    expect(parsed?.displayName).toBe("Nivan");
  });

  it.each([
    "",
    " Nivan",
    "Nivan ",
    "Nivan\nOther",
    "Nivan\u2028Other",
    "Nivan\u202eOther",
    "Nivan\ud800",
    "x".repeat(41),
  ])("rejects unsafe display name %j", (value) => {
    expect(isAssistantDisplayName(value)).toBe(false);
  });

  it("counts Unicode scalars rather than UTF-16 code units", () => {
    expect(isAssistantDisplayName("🙂".repeat(40))).toBe(true);
    expect(isAssistantDisplayName("🙂".repeat(41))).toBe(false);
  });

  it("rejects extra keys, unknown setting keys, invalid versions, and invalid operation ids", () => {
    const base = {
      settingKey: ASSISTANT_DISPLAY_NAME_SETTING_KEYS.GUIDE_ASSISTANT,
      displayName: "Solomon",
      expectedVersion: 1,
      operationId: OPERATION_ID,
    };
    expect(parseAdminAssistantDisplayNameMutationInput({ ...base, extra: true })).toBeNull();
    expect(parseAdminAssistantDisplayNameMutationInput({ ...base, settingKey: "other" })).toBeNull();
    expect(parseAdminAssistantDisplayNameMutationInput({ ...base, expectedVersion: 0 })).toBeNull();
    expect(parseAdminAssistantDisplayNameMutationInput({ ...base, operationId: "not-a-uuid" })).toBeNull();
  });

  it("fails closed for hostile getters and proxies", () => {
    const hostile = Object.create(null, {
      settingKey: {
        enumerable: true,
        get() {
          throw new Error("must not escape");
        },
      },
    });
    expect(parseAdminAssistantDisplayNameMutationInput(hostile)).toBeNull();
    expect(
      parseAdminAssistantDisplayNameMutationInput(
        new Proxy({}, { ownKeys: () => { throw new Error("must not escape"); } }),
      ),
    ).toBeNull();
  });
});
