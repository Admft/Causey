import "server-only";

type DebugPermSnapshot = {
  orgId?: string;
  competitionId?: string;
  canOperate: boolean | null;
  isCoach: boolean | null;
  canOperateError: string | null;
  isCoachError: string | null;
};

/** Runtime permission snapshot for district-operator drift debugging. */
export async function debugOperatorPermissions(
  supabase: {
    rpc: (
      fn: string,
      args: Record<string, string>
    ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
  },
  profileId: string,
  orgId?: string | null
): Promise<DebugPermSnapshot> {
  if (!orgId) {
    return {
      canOperate: null,
      isCoach: null,
      canOperateError: null,
      isCoachError: null,
    };
  }
  const [operate, coach] = await Promise.all([
    supabase.rpc("can_operate_org_competitions", {
      p_org_id: orgId,
      p_profile_id: profileId,
    }),
    supabase.rpc("is_org_coach", {
      p_org_id: orgId,
      p_profile_id: profileId,
    }),
  ]);
  return {
    orgId,
    canOperate: operate.data === true,
    isCoach: coach.data === true,
    canOperateError: operate.error?.message ?? null,
    isCoachError: coach.error?.message ?? null,
  };
}

export function debugAgentLog(payload: {
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
  runId?: string;
}) {
  // #region agent log
  fetch("http://127.0.0.1:7659/ingest/9fee0dbb-0a3b-4be1-8022-3076c5e2944e", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "2b6cc3",
    },
    body: JSON.stringify({
      sessionId: "2b6cc3",
      runId: payload.runId ?? "pre-fix",
      hypothesisId: payload.hypothesisId,
      location: payload.location,
      message: payload.message,
      data: payload.data ?? {},
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}
