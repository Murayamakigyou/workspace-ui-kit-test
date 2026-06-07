import type { WorkBoard } from "@/lib/work-schema";

export type WorkBoardApiMeta = {
  mode: "upstash" | "local-file" | "unavailable";
};

function writeHeaders(): HeadersInit {
  const key = process.env.NEXT_PUBLIC_WORK_BOARD_WRITE_KEY;
  if (!key) return {};
  return { Authorization: `Bearer ${key}` };
}

export async function fetchWorkBoard(): Promise<{
  board: WorkBoard | null;
  meta: WorkBoardApiMeta | null;
  error: string | null;
}> {
  try {
    const res = await fetch("/api/work-board", { cache: "no-store" });
    if (!res.ok) {
      return {
        board: null,
        meta: null,
        error: `読み込みに失敗しました（${res.status}）`,
      };
    }
    const board = (await res.json()) as WorkBoard;
    const mode = res.headers.get("X-Work-Board-Mode");
    const meta: WorkBoardApiMeta | null =
      mode === "upstash" || mode === "local-file" || mode === "unavailable"
        ? { mode }
        : null;
    return { board, meta, error: null };
  } catch {
    return { board: null, meta: null, error: "読み込みに失敗しました" };
  }
}

export async function saveWorkBoard(
  board: WorkBoard,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/work-board", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...writeHeaders(),
      },
      body: JSON.stringify(board),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      return {
        ok: false,
        error: body?.error ?? `保存に失敗しました（${res.status}）`,
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "保存に失敗しました" };
  }
}
