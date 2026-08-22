// Server-only executor for the exact protected Assistant Display-Name RPC family.

import "server-only";

import { type SupabaseClient } from "@supabase/supabase-js";

import {
  isAssistantDisplayNameRpcPayloadBoundToCall,
  validateAssistantDisplayNameRpcCall,
  validateAssistantDisplayNameRpcPayload,
  type AssistantDisplayNameRpcCall,
  type AssistantDisplayNameRpcFunction,
  type AssistantDisplayNameRpcPayload,
} from "./assistantDisplayNameRpcContract";

if (typeof window !== "undefined") {
  throw new Error(
    "SolMind server configuration error: assistantDisplayNameRpcExecutor must not be imported in browser code.",
  );
}

export const ASSISTANT_DISPLAY_NAME_RPC_UNMAPPED = "assistant_display_name_rpc_unmapped" as const;
export const ASSISTANT_DISPLAY_NAME_RPC_DENIED = "assistant_display_name_rpc_denied" as const;
export const ASSISTANT_DISPLAY_NAME_RPC_CONFLICT = "assistant_display_name_rpc_conflict" as const;
export const ASSISTANT_DISPLAY_NAME_RPC_FAILED = "assistant_display_name_rpc_failed" as const;

export type AssistantDisplayNameRpcResult =
  | Readonly<{
      functionName: AssistantDisplayNameRpcFunction;
      data: AssistantDisplayNameRpcPayload;
      error: null;
    }>
  | Readonly<{
      functionName: AssistantDisplayNameRpcFunction | null;
      data: null;
      error:
        | typeof ASSISTANT_DISPLAY_NAME_RPC_UNMAPPED
        | typeof ASSISTANT_DISPLAY_NAME_RPC_DENIED
        | typeof ASSISTANT_DISPLAY_NAME_RPC_CONFLICT
        | typeof ASSISTANT_DISPLAY_NAME_RPC_FAILED;
    }>;

export type AssistantDisplayNameRpcExecutor = Readonly<{
  execute(call: AssistantDisplayNameRpcCall | unknown): Promise<AssistantDisplayNameRpcResult>;
}>;

function errorMessage(error: unknown): string | null {
  try {
    if (typeof error !== "object" || error === null || !("message" in error)) return null;
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : null;
  } catch {
    return null;
  }
}

function classifyError(
  functionName: AssistantDisplayNameRpcFunction,
  error: unknown,
): AssistantDisplayNameRpcResult {
  const message = errorMessage(error);
  if (
    message === "solmind_assistant_display_name_admin_required" ||
    message === "solmind_assistant_display_name_invalid_request" ||
    message === "solmind_assistant_display_name_setting_not_allowed" ||
    message === "solmind_assistant_display_name_invalid_value"
  ) {
    return Object.freeze({ functionName, data: null, error: ASSISTANT_DISPLAY_NAME_RPC_DENIED });
  }
  if (
    message === "solmind_assistant_display_name_version_conflict" ||
    message === "solmind_assistant_display_name_operation_conflict" ||
    message === "solmind_assistant_display_name_lock_unavailable"
  ) {
    return Object.freeze({ functionName, data: null, error: ASSISTANT_DISPLAY_NAME_RPC_CONFLICT });
  }
  return Object.freeze({ functionName: null, data: null, error: ASSISTANT_DISPLAY_NAME_RPC_FAILED });
}

export function createAssistantDisplayNameRpcExecutor(
  client: SupabaseClient,
): AssistantDisplayNameRpcExecutor {
  return Object.freeze({
    async execute(call: unknown): Promise<AssistantDisplayNameRpcResult> {
      const validated = validateAssistantDisplayNameRpcCall(call);
      if (validated === null) {
        return Object.freeze({ functionName: null, data: null, error: ASSISTANT_DISPLAY_NAME_RPC_UNMAPPED });
      }
      try {
        const { data, error } = await client.rpc(validated.functionName, validated.args);
        if (error !== null && error !== undefined) {
          return classifyError(validated.functionName, error);
        }
        const payload = validateAssistantDisplayNameRpcPayload(validated.functionName, data);
        if (payload === null || !isAssistantDisplayNameRpcPayloadBoundToCall(validated, payload)) {
          return Object.freeze({ functionName: null, data: null, error: ASSISTANT_DISPLAY_NAME_RPC_FAILED });
        }
        return Object.freeze({ functionName: validated.functionName, data: payload, error: null });
      } catch {
        return Object.freeze({ functionName: null, data: null, error: ASSISTANT_DISPLAY_NAME_RPC_FAILED });
      }
    },
  });
}
