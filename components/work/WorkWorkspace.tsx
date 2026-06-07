"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  persistenceHint,
  saveStateLabel,
  useWorkBoardSync,
} from "@/components/work/use-work-board-sync";
import { resolveAnnualEventStatus } from "@/lib/work-annual-status";
import { defaultSessionId } from "@/lib/work-default-session";
import { getOverdueTodos, isTodoOverdue } from "@/lib/work-overdue";
import type { PeriodRow, WorkBoard, WorkSession } from "@/lib/work-schema";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Pane1Toggle } from "@/components/workspace/Pane1Toggle";
import {
  ArrowRight,
  Calendar,
  Circle,
  CircleCheck,
  CircleDot,
  Zap,
} from "lucide-react";

type WorkWorkspaceProps = {
  initialBoard: WorkBoard;
};

function statusBadgeVariant(
  status: "done" | "doing" | "todo",
): "default" | "secondary" | "outline" {
  if (status === "done") return "secondary";
  if (status === "doing") return "default";
  return "outline";
}

function annualStatusLabel(
  status: "done" | "current" | "planned" | undefined,
): string {
  if (status === "done") return "完了";
  if (status === "current") return "進行中";
  if (status === "planned") return "予定";
  return "";
}

function annualStatusBadgeVariant(
  status: "done" | "current" | "planned",
): "default" | "secondary" | "outline" {
  if (status === "done") return "secondary";
  if (status === "current") return "default";
  return "outline";
}

function AnnualStatusIcon({
  status,
}: {
  status: "done" | "current" | "planned";
}) {
  if (status === "done") {
    return <CircleCheck className="size-3 shrink-0" aria-hidden />;
  }
  if (status === "current") {
    return <CircleDot className="size-3 shrink-0" aria-hidden />;
  }
  return <Calendar className="size-3 shrink-0" aria-hidden />;
}

function PeriodRowStatusIcon({
  status,
}: {
  status: "done" | "doing" | "todo";
}) {
  if (status === "done") {
    return <CircleCheck className="size-3 shrink-0" aria-hidden />;
  }
  if (status === "doing") {
    return <ArrowRight className="size-3 shrink-0" aria-hidden />;
  }
  return <Circle className="size-3 shrink-0" aria-hidden />;
}

function visiblePeriodRows(
  rows: PeriodRow[],
  sessionId: string | undefined,
): PeriodRow[] {
  const hasLinkedRows = rows.some((row) => row.sessionId);
  if (!hasLinkedRows || !sessionId) return rows;
  return rows.filter((row) => row.sessionId === sessionId);
}

function nextPeriodRowStatus(
  status: "done" | "doing" | "todo",
): "done" | "doing" | "todo" {
  if (status === "todo") return "doing";
  if (status === "doing") return "done";
  return "todo";
}

export function WorkWorkspace({ initialBoard }: WorkWorkspaceProps) {
  const { initiatives, setInitiatives, ready, saveState, saveError, meta } =
    useWorkBoardSync(initialBoard);
  const [selectedId, setSelectedId] = useState(
    initialBoard.initiatives[0]?.id ?? "",
  );
  const [sessionId, setSessionId] = useState(
    initialBoard.initiatives[0]?.sessions[0]?.id ?? "",
  );
  const [showOverdueFlash, setShowOverdueFlash] = useState(false);

  const active = useMemo(
    () => initiatives.find((i) => i.id === selectedId) ?? initiatives[0],
    [initiatives, selectedId],
  );

  const activeSession: WorkSession | undefined = useMemo(() => {
    if (!active) return undefined;
    return (
      active.sessions.find((s) => s.id === sessionId) ?? active.sessions[0]
    );
  }, [active, sessionId]);

  const periodRowsForSession = useMemo(() => {
    if (!active) return [];
    return visiblePeriodRows(active.periodRows, activeSession?.id);
  }, [active, activeSession?.id]);

  const periodLabel = activeSession?.periodLabel ?? active?.currentPeriodLabel;

  const overdueTodos = useMemo(() => {
    if (!active || !activeSession) return [];
    return getOverdueTodos(activeSession, active.periodRows);
  }, [active, activeSession]);

  useEffect(() => {
    if (!activeSession || overdueTodos.length === 0) {
      setShowOverdueFlash(false);
      return;
    }

    setShowOverdueFlash(true);
    const timer = window.setTimeout(() => setShowOverdueFlash(false), 1200);
    return () => window.clearTimeout(timer);
  }, [activeSession?.id, overdueTodos.length]);

  const selectInitiative = useCallback(
    (id: string) => {
      setSelectedId(id);
      const next = initiatives.find((i) => i.id === id);
      setSessionId(next ? defaultSessionId(next) : "");
    },
    [initiatives],
  );

  const togglePeriodRow = useCallback(
    (rowId: string) => {
      setInitiatives((prev) =>
        prev.map((init) => {
          if (init.id !== active.id) return init;
          return {
            ...init,
            periodRows: init.periodRows.map((row) =>
              row.id === rowId
                ? { ...row, status: nextPeriodRowStatus(row.status) }
                : row,
            ),
          };
        }),
      );
    },
    [active.id],
  );

  const toggleTodo = useCallback(
    (sessionIdTarget: string, todoId: string) => {
      setInitiatives((prev) =>
        prev.map((init) => {
          if (init.id !== active.id) return init;
          return {
            ...init,
            sessions: init.sessions.map((s) => {
              if (s.id !== sessionIdTarget) return s;
              return {
                ...s,
                todos: s.todos.map((t) =>
                  t.id === todoId ? { ...t, done: !t.done } : t,
                ),
              };
            }),
          };
        }),
      );
    },
    [active.id],
  );

  const statusText = saveStateLabel(saveState, saveError);
  const hintText = persistenceHint(meta);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        取組データを読み込んでいます…
      </div>
    );
  }

  if (!active) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        取組データがありません。`data/work-board.json` を確認してください。
      </div>
    );
  }

  return (
    <SidebarProvider
      defaultOpen
      className="work-theme h-screen w-full overflow-hidden bg-background text-foreground"
    >
      <Sidebar
        collapsible="icon"
        className="border-r border-sidebar-border [&_[data-slot=sidebar-container]]:bg-sidebar"
      >
        <SidebarHeader className="border-b border-sidebar-border p-0">
          <div className="flex h-12 items-center justify-between gap-2 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[state=expanded]:px-5">
            <h2 className="truncate text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              {initialBoard.workspaceName}
            </h2>
            <Pane1Toggle />
          </div>
        </SidebarHeader>
        <SidebarContent className="px-1 py-3 group-data-[collapsible=icon]:hidden">
          <div className="px-2 pb-2 text-xs font-semibold tracking-wide text-sidebar-foreground/70 uppercase">
            取組項目
          </div>
          <SidebarMenu>
            {initiatives.map((init) => (
              <SidebarMenuItem key={init.id}>
                <SidebarMenuButton
                  isActive={init.id === active.id}
                  onClick={() => selectInitiative(init.id)}
                  className="w-full"
                >
                  <span className="truncate">{init.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="flex min-w-0 flex-col bg-background">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
          <Breadcrumb
            className="min-w-0 flex-1 overflow-hidden"
            aria-label="いまの場所"
          >
            <BreadcrumbList className="flex-nowrap text-[11px]">
              <BreadcrumbItem className="shrink-0">
                <BreadcrumbPage className="font-medium">
                  {active.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate text-muted-foreground">
                  {active.currentPeriodLabel}
                </BreadcrumbPage>
              </BreadcrumbItem>
              {activeSession ? (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem className="min-w-0">
                    <BreadcrumbPage className="truncate">
                      {activeSession.title}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              ) : null}
            </BreadcrumbList>
          </Breadcrumb>
          {statusText || hintText ? (
            <div
              className="flex shrink-0 flex-col items-end gap-0.5 text-muted-foreground"
              aria-live="polite"
            >
              {statusText ? <span>{statusText}</span> : null}
              {hintText ? <span>{hintText}</span> : null}
            </div>
          ) : null}
        </header>

        <div className="flex min-h-0 flex-1">
          {/* Pane 2: 年間スケジュール（項目ごと） */}
          <section className="flex w-[300px] shrink-0 flex-col border-r border-border bg-card">
            <div className="flex h-10 shrink-0 items-center border-b border-border px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              年間スケジュール
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-2 p-3">
                {active.annualEvents.map((ev, idx) => {
                  const displayStatus = resolveAnnualEventStatus(
                    ev,
                    active.sessions,
                  );
                  const linkedSessionId = ev.sessionId;
                  const isSelectedSession = linkedSessionId === activeSession?.id;
                  return (
                    <Card
                      key={`${ev.month}-${idx}`}
                      className={cn(
                        "shadow-none",
                        linkedSessionId &&
                          "cursor-pointer transition-colors hover:bg-muted/40",
                        isSelectedSession && "ring-2 ring-ring",
                      )}
                      onClick={
                        linkedSessionId
                          ? () => setSessionId(linkedSessionId)
                          : undefined
                      }
                      title={
                        linkedSessionId
                          ? "クリックしてこの回の工程・やることを表示"
                          : undefined
                      }
                    >
                      <CardContent className="flex items-start gap-3 p-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted text-xs font-semibold">
                          {ev.month}月
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col gap-1">
                          <p className="text-sm font-medium leading-snug">
                            {ev.label}
                          </p>
                          {displayStatus ? (
                            <Badge
                              variant={annualStatusBadgeVariant(displayStatus)}
                              className="gap-1 text-[10px]"
                            >
                              <AnnualStatusIcon status={displayStatus} />
                              {annualStatusLabel(displayStatus)}
                            </Badge>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </section>

          {/* Pane 3: 今の区間の工程管理表 */}
          <section className="flex min-w-0 flex-1 flex-col border-r border-border bg-muted/45">
            <div className="flex h-10 shrink-0 items-center border-b border-border bg-background px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              工程管理
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="p-3">
                <Card className="shadow-none">
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-sm font-medium">
                      {periodLabel}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-0 px-0 pb-2">
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-0 border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <span>工程</span>
                      <span className="text-right">期限</span>
                      <span>担当</span>
                      <span className="text-right">状態</span>
                    </div>
                    {periodRowsForSession.map((row) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 border-b border-border px-4 py-2.5 text-sm last:border-b-0"
                      >
                        <span className="min-w-0 font-medium leading-snug">
                          {row.step}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {row.due}
                        </span>
                        <span className="shrink-0 text-xs">{row.owner}</span>
                        <span className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => togglePeriodRow(row.id)}
                            title="クリックで状態を切り替え（未着手→着手→完了）"
                            className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Badge
                              variant={statusBadgeVariant(row.status)}
                              className="cursor-pointer gap-1 text-[10px]"
                            >
                              <PeriodRowStatusIcon status={row.status} />
                              {row.status === "done"
                                ? "完了"
                                : row.status === "doing"
                                  ? "着手"
                                  : "未着手"}
                            </Badge>
                          </button>
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </section>

          {/* Pane 4: その回のやること */}
          <section className="relative flex w-[min(100%,360px)] shrink-0 flex-col bg-background sm:w-[360px]">
            {showOverdueFlash ? (
              <div
                className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/55"
                aria-live="assertive"
                role="status"
              >
                <div className="work-overdue-flash flex flex-col items-center gap-1">
                  <Zap
                    className="size-16 fill-primary/25 text-primary"
                    aria-hidden
                  />
                  <span className="text-lg font-bold tracking-wide text-primary">
                    ガーン
                  </span>
                  <span className="text-xs text-muted-foreground">
                    期限を過ぎたやることがあります
                  </span>
                </div>
              </div>
            ) : null}
            <div className="flex h-10 shrink-0 flex-col justify-center gap-1 border-b border-border px-3 py-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                その回のやること
              </div>
              {active.sessions.length > 1 ? (
                <select
                  className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={activeSession?.id}
                  onChange={(e) => setSessionId(e.target.value)}
                  aria-label="回の選択"
                >
                  {active.sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}（{s.date}）
                    </option>
                  ))}
                </select>
              ) : activeSession ? (
                <div className="truncate text-xs text-muted-foreground">
                  {activeSession.title} · {activeSession.date}
                </div>
              ) : null}
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <ul className="space-y-1 p-3">
                {activeSession?.todos.map((todo, todoIndex) => {
                  const overdue =
                    active &&
                    activeSession &&
                    isTodoOverdue(
                      todo,
                      activeSession,
                      active.periodRows,
                      todoIndex,
                    );
                  return (
                  <li key={todo.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-2 rounded-md border border-transparent px-2 py-2 text-sm hover:bg-muted/60",
                        todo.done && "text-muted-foreground",
                        overdue && "border-destructive/30 bg-destructive/5",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={todo.done}
                        onChange={() =>
                          activeSession &&
                          toggleTodo(activeSession.id, todo.id)
                        }
                        className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
                      />
                      <span
                        className={cn(
                          "min-w-0 flex-1 leading-snug",
                          todo.done && "line-through",
                        )}
                      >
                        {todo.text}
                      </span>
                      {overdue ? (
                        <Zap
                          className="mt-0.5 size-4 shrink-0 text-destructive"
                          aria-label="期限超過"
                        />
                      ) : null}
                    </label>
                  </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </section>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
