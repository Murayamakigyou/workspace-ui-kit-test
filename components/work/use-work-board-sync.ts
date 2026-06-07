"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchWorkBoard,
  saveWorkBoard,
  type WorkBoardApiMeta,
} from "@/lib/work-board-client";
import type { Initiative, WorkBoard } from "@/lib/work-schema";

export type WorkBoardSaveState =
  | "loading"
  | "idle"
  | "saving"
  | "saved"
  | "error";

export function useWorkBoardSync(initialBoard: WorkBoard) {
  const [initiatives, setInitiatives] = useState<Initiative[]>(
    initialBoard.initiatives,
  );
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<WorkBoardSaveState>("loading");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [meta, setMeta] = useState<WorkBoardApiMeta | null>(null);
  const skipSaveRef = useRef(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { board, meta: loadedMeta, error } = await fetchWorkBoard();
      if (cancelled) return;

      if (board) {
        setInitiatives(board.initiatives);
      }
      setMeta(loadedMeta);
      setSaveError(error);
      setReady(true);
      setSaveState(error ? "error" : "idle");
      skipSaveRef.current = false;
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const buildBoard = useCallback(
    (): WorkBoard => ({
      workspaceName: initialBoard.workspaceName,
      initiatives,
    }),
    [initialBoard.workspaceName, initiatives],
  );

  useEffect(() => {
    if (!ready || skipSaveRef.current) return;

    setSaveState("saving");
    const timer = window.setTimeout(() => {
      void (async () => {
        const result = await saveWorkBoard(buildBoard());
        if (result.ok) {
          setSaveError(null);
          setSaveState("saved");
          return;
        }
        setSaveError(result.error);
        setSaveState("error");
      })();
    }, 600);

    return () => window.clearTimeout(timer);
  }, [buildBoard, ready]);

  return {
    initiatives,
    setInitiatives,
    ready,
    saveState,
    saveError,
    meta,
  };
}

export function persistenceHint(meta: WorkBoardApiMeta | null): string {
  if (!meta) return "";
  if (meta.mode === "upstash") return "クラウドに保存";
  if (meta.mode === "local-file") return "このPCに保存";
  return "表示のみ（保存先未設定）";
}

export function saveStateLabel(
  saveState: WorkBoardSaveState,
  saveError: string | null,
): string {
  if (saveState === "loading") return "読み込み中…";
  if (saveState === "saving") return "保存中…";
  if (saveState === "saved") return "保存しました";
  if (saveState === "error") return saveError ?? "保存できませんでした";
  return "";
}
