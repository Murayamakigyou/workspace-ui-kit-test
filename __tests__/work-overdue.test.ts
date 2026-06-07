import { describe, expect, it } from "vitest";

import { getOverdueTodos, isTodoOverdue } from "@/lib/work-overdue";
import type { WorkSession } from "@/lib/work-schema";

const session: WorkSession = {
  id: "5q-s2",
  title: "第2回",
  date: "2026-06-03",
  todos: [
    { id: "a", text: "配信完了（6/3）", done: true },
    { id: "b", text: "リマインド（6/8）", done: false },
    { id: "c", text: "メモ", done: false },
  ],
};

const periodRows = [
  {
    id: "p1",
    step: "配信",
    due: "6/3",
    owner: "自分",
    status: "done" as const,
    sessionId: "5q-s2",
  },
  {
    id: "p2",
    step: "リマインド",
    due: "6/8",
    owner: "自分",
    status: "todo" as const,
    sessionId: "5q-s2",
  },
  {
    id: "p3",
    step: "メモ",
    due: "6/12",
    owner: "自分",
    status: "todo" as const,
    sessionId: "5q-s2",
  },
];

describe("isTodoOverdue", () => {
  it("returns true when unchecked todo is past due", () => {
    expect(
      isTodoOverdue(
        session.todos[1],
        session,
        periodRows,
        1,
        new Date(2026, 5, 10),
      ),
    ).toBe(true);
  });

  it("returns false when todo is done", () => {
    expect(
      isTodoOverdue(
        session.todos[0],
        session,
        periodRows,
        0,
        new Date(2026, 5, 10),
      ),
    ).toBe(false);
  });

  it("returns false before due date", () => {
    expect(
      isTodoOverdue(
        session.todos[1],
        session,
        periodRows,
        1,
        new Date(2026, 5, 7),
      ),
    ).toBe(false);
  });
});

describe("getOverdueTodos", () => {
  it("lists only overdue unchecked todos", () => {
    const overdue = getOverdueTodos(session, periodRows, new Date(2026, 5, 13));
    expect(overdue.map((t) => t.id)).toEqual(["b", "c"]);
  });
});
