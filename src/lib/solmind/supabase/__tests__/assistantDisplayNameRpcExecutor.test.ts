import { describe, expect, it, vi } from "vitest";

import { ASSISTANT_DISPLAY_NAME_SETTING_KEYS } from "../../assistantDisplayNameBrowserContract";
import {
  ASSISTANT_DISPLAY_NAME_RPC_CONFLICT,
  ASSISTANT_DISPLAY_NAME_RPC_DENIED,
  ASSISTANT_DISPLAY_NAME_RPC_FAILED,
  ASSISTANT_DISPLAY_NAME_RPC_UNMAPPED,
  createAssistantDisplayNameRpcExecutor,
} from "../assistantDisplayNameRpcExecutor";

const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const OPERATION_ID = "22222222-2222-4222-8222-222222222222";
const TIMESTAMP = "2026-08-22T18:00:00.000Z";

function clientWith(result: unknown) {
  return { rpc: vi.fn().mockResolvedValue(result) } as never;
}

function mutationCall() {
  return {
    functionName: "solmind_set_assistant_display_name_setting",
    args: {
      p_actor_user_account_id: ACTOR_ID,
      p_setting_key: ASSISTANT_DISPLAY_NAME_SETTING_KEYS.GUIDE_ASSISTANT,
      p_display_name: "Solomon",
      p_expected_version: 1,
      p_operation_id: OPERATION_ID,
    },
  };
}

describe("assistantDisplayNameRpcExecutor", () => {
  it("dispatches an exact valid call and returns only a validated payload", async () => {
    const client = clientWith({
      data: [{
        outcome: "applied",
        setting_key: ASSISTANT_DISPLAY_NAME_SETTING_KEYS.GUIDE_ASSISTANT,
        display_name: "Solomon",
        version: 2,
        updated_at: TIMESTAMP,
      }],
      error: null,
    });
    const result = await createAssistantDisplayNameRpcExecutor(client).execute(mutationCall());
    expect(result.error).toBeNull();
    expect((client as { rpc: ReturnType<typeof vi.fn> }).rpc).toHaveBeenCalledWith(
      mutationCall().functionName,
      mutationCall().args,
    );
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("rejects unmapped calls without dispatch", async () => {
    const client = clientWith({ data: null, error: null });
    const result = await createAssistantDisplayNameRpcExecutor(client).execute({ functionName: "other", args: {} });
    expect(result.error).toBe(ASSISTANT_DISPLAY_NAME_RPC_UNMAPPED);
    expect((client as { rpc: ReturnType<typeof vi.fn> }).rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["solmind_assistant_display_name_admin_required", ASSISTANT_DISPLAY_NAME_RPC_DENIED],
    ["solmind_assistant_display_name_invalid_value", ASSISTANT_DISPLAY_NAME_RPC_DENIED],
    ["solmind_assistant_display_name_version_conflict", ASSISTANT_DISPLAY_NAME_RPC_CONFLICT],
    ["solmind_assistant_display_name_operation_conflict", ASSISTANT_DISPLAY_NAME_RPC_CONFLICT],
    ["solmind_assistant_display_name_lock_unavailable", ASSISTANT_DISPLAY_NAME_RPC_CONFLICT],
    ["database detail containing a private name", ASSISTANT_DISPLAY_NAME_RPC_FAILED],
  ])("maps %s to one value-free error", async (message, expected) => {
    const result = await createAssistantDisplayNameRpcExecutor(
      clientWith({ data: null, error: { message } }),
    ).execute(mutationCall());
    expect(result).toEqual({
      functionName: expected === ASSISTANT_DISPLAY_NAME_RPC_FAILED ? null : mutationCall().functionName,
      data: null,
      error: expected,
    });
    expect(JSON.stringify(result)).not.toContain("private name");
  });

  it("fails closed for thrown clients, hostile errors, malformed rows, and cross-setting results", async () => {
    const throwing = {
      rpc: vi.fn().mockRejectedValue(new Error("secret")),
    } as never;
    expect((await createAssistantDisplayNameRpcExecutor(throwing).execute(mutationCall())).error).toBe(
      ASSISTANT_DISPLAY_NAME_RPC_FAILED,
    );

    const hostileError = new Proxy({}, { has: () => { throw new Error("secret"); } });
    expect((await createAssistantDisplayNameRpcExecutor(clientWith({ data: null, error: hostileError })).execute(mutationCall())).error).toBe(
      ASSISTANT_DISPLAY_NAME_RPC_FAILED,
    );

    expect((await createAssistantDisplayNameRpcExecutor(clientWith({ data: [{}], error: null })).execute(mutationCall())).error).toBe(
      ASSISTANT_DISPLAY_NAME_RPC_FAILED,
    );

    const wrongSetting = [{
      outcome: "applied",
      setting_key: ASSISTANT_DISPLAY_NAME_SETTING_KEYS.EXPLORER_VIRTUAL_GUIDE,
      display_name: "Nivan",
      version: 2,
      updated_at: TIMESTAMP,
    }];
    expect((await createAssistantDisplayNameRpcExecutor(clientWith({ data: wrongSetting, error: null })).execute(mutationCall())).error).toBe(
      ASSISTANT_DISPLAY_NAME_RPC_FAILED,
    );
  });
});
