import type { PeriodRow, WorkSession, WorkTodo } from "@/lib/work-schema";

const MD_DUE = /^(\d{1,2})\/(\d{1,2})$/;
const TEXT_DATE = /[（(](\d{1,2})\/(\d{1,2})/;

function sessionYear(session: WorkSession): number {
  const parsed = new Date(session.date);
  return Number.isNaN(parsed.getTime()) ? new Date().getFullYear() : parsed.getFullYear();
}

function toDateAtMidnight(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

function parseMdDue(due: string, year: number): Date | null {
  const match = due.trim().match(MD_DUE);
  if (!match) return null;
  return toDateAtMidnight(year, Number(match[1]), Number(match[2]));
}

function parseDateFromTodoText(text: string, year: number): Date | null {
  const match = text.match(TEXT_DATE);
  if (!match) return null;
  return toDateAtMidnight(year, Number(match[1]), Number(match[2]));
}

export function resolveTodoDueDate(
  todo: WorkTodo,
  session: WorkSession,
  periodRows: PeriodRow[],
  todoIndex: number,
): Date | null {
  if (todo.dueDate) {
    const explicit = new Date(todo.dueDate);
    return Number.isNaN(explicit.getTime()) ? null : explicit;
  }

  const year = sessionYear(session);
  const rowsForSession = periodRows.filter((row) => row.sessionId === session.id);
  const rowDue = rowsForSession[todoIndex]?.due;
  if (rowDue) {
    const fromRow = parseMdDue(rowDue, year);
    if (fromRow) return fromRow;
  }

  return parseDateFromTodoText(todo.text, year);
}

export function isTodoOverdue(
  todo: WorkTodo,
  session: WorkSession,
  periodRows: PeriodRow[],
  todoIndex: number,
  referenceDate: Date = new Date(),
): boolean {
  if (todo.done) return false;

  const due = resolveTodoDueDate(todo, session, periodRows, todoIndex);
  if (!due) return false;

  const today = toDateAtMidnight(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    referenceDate.getDate(),
  );

  return due.getTime() < today.getTime();
}

export function getOverdueTodos(
  session: WorkSession,
  periodRows: PeriodRow[],
  referenceDate: Date = new Date(),
): WorkTodo[] {
  return session.todos.filter((todo, index) =>
    isTodoOverdue(todo, session, periodRows, index, referenceDate),
  );
}
