import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { Redis } from "@upstash/redis";

import { workBoardSchema, type WorkBoard } from "@/lib/work-schema";

const LIVE_FILE = join(process.cwd(), "data", "work-board.live.json");
const REDIS_KEY = "work-board:default";

export type WorkBoardPersistenceMode = "upstash" | "local-file" | "unavailable";

function redisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function getWorkBoardPersistenceMode(): WorkBoardPersistenceMode {
  if (redisClient()) return "upstash";
  if (process.env.VERCEL === "1") return "unavailable";
  return "local-file";
}

function parseBoard(raw: unknown): WorkBoard | null {
  const parsed = workBoardSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function readWorkBoard(fallback: WorkBoard): Promise<WorkBoard> {
  const redis = redisClient();
  if (redis) {
    const raw = await redis.get<unknown>(REDIS_KEY);
    if (raw) {
      const board = parseBoard(raw);
      if (board) return board;
    }
    return fallback;
  }

  try {
    const text = await readFile(LIVE_FILE, "utf8");
    const board = parseBoard(JSON.parse(text));
    if (board) return board;
  } catch {
    // 初回は live ファイルが無い
  }

  return fallback;
}

export async function writeWorkBoard(
  board: WorkBoard,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const redis = redisClient();
  if (redis) {
    await redis.set(REDIS_KEY, board);
    return { ok: true };
  }

  if (process.env.VERCEL === "1") {
    return { ok: false, reason: "cloud-store-not-configured" };
  }

  try {
    await writeFile(LIVE_FILE, `${JSON.stringify(board, null, 2)}\n`, "utf8");
    return { ok: true };
  } catch {
    return { ok: false, reason: "write-failed" };
  }
}

export function isWriteAuthorized(request: Request): boolean {
  const secret = process.env.WORK_BOARD_WRITE_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}
