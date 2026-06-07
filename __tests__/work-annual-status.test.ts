import { describe, expect, it } from "vitest";

import {
  deriveAnnualStatusFromTodos,
  resolveAnnualEventStatus,
} from "@/lib/work-annual-status";

describe("deriveAnnualStatusFromTodos", () => {
  it("returns done when all todos are checked", () => {
    expect(
      deriveAnnualStatusFromTodos([
        { id: "a", text: "a", done: true },
        { id: "b", text: "b", done: true },
      ]),
    ).toBe("done");
  });

  it("returns current when some todos are checked", () => {
    expect(
      deriveAnnualStatusFromTodos([
        { id: "a", text: "a", done: true },
        { id: "b", text: "b", done: false },
      ]),
    ).toBe("current");
  });

  it("returns planned when no todos are checked", () => {
    expect(
      deriveAnnualStatusFromTodos([
        { id: "a", text: "a", done: false },
        { id: "b", text: "b", done: false },
      ]),
    ).toBe("planned");
  });
});

describe("resolveAnnualEventStatus", () => {
  it("derives status from linked session todos", () => {
    const status = resolveAnnualEventStatus(
      {
        month: 6,
        label: "第2回",
        sessionId: "5q-s2",
      },
      [
        {
          id: "5q-s2",
          title: "第2回",
          date: "2026-06-03",
          todos: [
            { id: "a", text: "a", done: true },
            { id: "b", text: "b", done: false },
          ],
        },
      ],
    );

    expect(status).toBe("current");
  });

  it("falls back to manual status when sessionId is absent", () => {
    expect(
      resolveAnnualEventStatus(
        { month: 8, label: "第7回", status: "planned" },
        [],
      ),
    ).toBe("planned");
  });
});
