import type { AnnualEvent, WorkSession, WorkTodo } from "@/lib/work-schema";

export function deriveAnnualStatusFromTodos(
  todos: WorkTodo[],
): "done" | "current" | "planned" | undefined {
  if (todos.length === 0) return undefined;

  const doneCount = todos.filter((t) => t.done).length;
  if (doneCount === todos.length) return "done";
  if (doneCount > 0) return "current";
  return "planned";
}

export function resolveAnnualEventStatus(
  event: AnnualEvent,
  sessions: WorkSession[],
): "done" | "current" | "planned" | undefined {
  if (event.sessionId) {
    const session = sessions.find((s) => s.id === event.sessionId);
    if (session) {
      return deriveAnnualStatusFromTodos(session.todos);
    }
  }
  return event.status;
}
