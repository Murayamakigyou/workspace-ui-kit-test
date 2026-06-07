import { NextResponse } from "next/server";

import workBoardData from "@/data/work-board.json";
import {
  getWorkBoardPersistenceMode,
  isWriteAuthorized,
  readWorkBoard,
  writeWorkBoard,
} from "@/lib/work-board-store";
import { workBoardSchema } from "@/lib/work-schema";

const defaultBoard = workBoardSchema.parse(workBoardData);

function jsonWithMode<T>(body: T, status = 200) {
  const mode = getWorkBoardPersistenceMode();
  return NextResponse.json(body, {
    status,
    headers: { "X-Work-Board-Mode": mode },
  });
}

export async function GET() {
  const board = await readWorkBoard(defaultBoard);
  return jsonWithMode(board);
}

export async function PUT(request: Request) {
  if (!isWriteAuthorized(request)) {
    return jsonWithMode({ error: "保存の許可がありません" }, 401);
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonWithMode({ error: "データの形式が正しくありません" }, 400);
  }

  const parsed = workBoardSchema.safeParse(json);
  if (!parsed.success) {
    return jsonWithMode(
      { error: parsed.error.issues[0]?.message ?? "検証エラー" },
      400,
    );
  }

  const result = await writeWorkBoard(parsed.data);
  if (!result.ok) {
    const message =
      result.reason === "cloud-store-not-configured"
        ? "クラウドの保存先が未設定です（Upstash の設定が必要です）"
        : "保存できませんでした";
    return jsonWithMode({ error: message }, 503);
  }

  return jsonWithMode({ ok: true });
}
