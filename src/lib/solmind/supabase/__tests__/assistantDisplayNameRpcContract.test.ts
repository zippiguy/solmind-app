import { describe, expect, it } from "vitest";

import { ASSISTANT_DISPLAY_NAME_SETTING_KEYS } from "../../assistantDisplayNameBrowserContract";
import {
  isAssistantDisplayNameRpcPayloadBoundToCall,
  validateAssistantDisplayNameRpcCall,
  validateAssistantDisplayNameRpcPayload,
} from "../assistantDisplayNameRpcContract";

const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const OPERATION_ID = "22222222-2222-4222-8222-222222222222";
const TIMESTAMP = "2026-08-22T18:00:00.000Z";

describe("assistantDisplayNameRpcContract", () => {
  it("validates and freezes all four exact call shapes", () => {
    const calls = [
      { functionName: "solmind_read_explorer_virtual_guide_default_display_name", args: {} },
      { functionName: "solmind_read_guide_assistant_default_display_name", args: {} },
      {
        functionName: "solmind_read_admin_assistant_display_name_settings",
        args: { p_actor_user_account_id: ACTOR_ID },
      },
      {
        functionName: "solmind_set_assistant_display_name_setting",
        args: {
          p_actor_user_account_id: ACTOR_ID,
          p_setting_key: ASSISTANT_DISPLAY_NAME_SETTING_KEYS.GUIDE_ASSISTANT,
          p_display_name: "Solomon",
          p_expected_version: 1,
          p_operation_id: OPERATION_ID,
        },
      },
    ];
    for (const call of calls) {
      const parsed = validateAssistantDisplayNameRpcCall(call);
      expect(parsed).not.toBeNull();
      expect(Object.isFrozen(parsed)).toBe(true);
      expect(Object.isFrozen(parsed?.args)).toBe(true);
    }
  });

  it("rejects unknown functions, extra arguments, malformed ids, and hostile records", () => {
    expect(validateAssistantDisplayNameRpcCall({ functionName: "other", args: {} })).toBeNull();
    expect(
      validateAssistantDisplayNameRpcCall({
        functionName: "solmind_read_admin_assistant_display_name_settings",
        args: { p_actor_user_account_id: ACTOR_ID, extra: true },
      }),
    ).toBeNull();
    expect(
      validateAssistantDisplayNameRpcCall({
        functionName: "solmind_read_admin_assistant_display_name_settings",
        args: { p_actor_user_account_id: "bad" },
      }),
    ).toBeNull();
    expect(
      validateAssistantDisplayNameRpcCall(
        new Proxy({}, { getPrototypeOf: () => { throw new Error("must not escape"); } }),
      ),
    ).toBeNull();
  });

  it("requires exactly both fixed Admin rows", () => {
    const rows = [
      {
        setting_key: ASSISTANT_DISPLAY_NAME_SETTING_KEYS.EXPLORER_VIRTUAL_GUIDE,
        display_name: "Nivan",
        version: 1,
        updated_at: TIMESTAMP,
        updated_by_user_account_id: null,
      },
      {
        setting_key: ASSISTANT_DISPLAY_NAME_SETTING_KEYS.GUIDE_ASSISTANT,
        display_name: "Solomon",
        version: 1,
        updated_at: TIMESTAMP,
        updated_by_user_account_id: ACTOR_ID,
      },
    ];
    const payload = validateAssistantDisplayNameRpcPayload(
      "solmind_read_admin_assistant_display_name_settings",
      rows,
    );
    expect(payload).not.toBeNull();
    expect(Object.isFrozen(payload)).toBe(true);
    expect(
      validateAssistantDisplayNameRpcPayload(
        "solmind_read_admin_assistant_display_name_settings",
        [rows[0], rows[0]],
      ),
    ).toBeNull();
  });

  it("binds a mutation result to the exact requested setting", () => {
    const call = validateAssistantDisplayNameRpcCall({
      functionName: "solmind_set_assistant_display_name_setting",
      args: {
        p_actor_user_account_id: ACTOR_ID,
        p_setting_key: ASSISTANT_DISPLAY_NAME_SETTING_KEYS.GUIDE_ASSISTANT,
        p_display_name: "Solomon",
        p_expected_version: 1,
        p_operation_id: OPERATION_ID,
      },
    });
    const payload = validateAssistantDisplayNameRpcPayload(
      "solmind_set_assistant_display_name_setting",
      [{
        outcome: "applied",
        setting_key: ASSISTANT_DISPLAY_NAME_SETTING_KEYS.EXPLORER_VIRTUAL_GUIDE,
        display_name: "Nivan",
        version: 2,
        updated_at: TIMESTAMP,
      }],
    );
    expect(call).not.toBeNull();
    expect(payload).not.toBeNull();
    expect(isAssistantDisplayNameRpcPayloadBoundToCall(call!, payload!)).toBe(false);

    const wrongVersion = validateAssistantDisplayNameRpcPayload(
      "solmind_set_assistant_display_name_setting",
      [{
        outcome: "applied",
        setting_key: ASSISTANT_DISPLAY_NAME_SETTING_KEYS.GUIDE_ASSISTANT,
        display_name: "Solomon",
        version: 1,
        updated_at: TIMESTAMP,
      }],
    );
    expect(isAssistantDisplayNameRpcPayloadBoundToCall(call!, wrongVersion!)).toBe(false);
  });
});
