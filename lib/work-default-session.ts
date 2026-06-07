import { resolveAnnualEventStatus } from "@/lib/work-annual-status";
import type { Initiative } from "@/lib/work-schema";

/** 進行中の回を優先し、なければ最初に紐づいた回を選ぶ */
export function defaultSessionId(init: Initiative): string {
  const current = init.annualEvents.find((ev) => {
    if (!ev.sessionId) return false;
    return resolveAnnualEventStatus(ev, init.sessions) === "current";
  });
  if (current?.sessionId) return current.sessionId;

  const linked = init.annualEvents.find((ev) => ev.sessionId);
  if (linked?.sessionId) return linked.sessionId;

  return init.sessions[0]?.id ?? "";
}
