import { z } from "zod";

export const workTodoSchema = z.object({
  id: z.string(),
  text: z.string(),
  done: z.boolean(),
  /** 期限（YYYY-MM-DD）。未指定時は工程表や本文の日付から推定 */
  dueDate: z.string().optional(),
});
export type WorkTodo = z.infer<typeof workTodoSchema>;

export const workSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  /** 工程管理表の見出し（未指定時は initiative の currentPeriodLabel） */
  periodLabel: z.string().optional(),
  todos: z.array(workTodoSchema),
});
export type WorkSession = z.infer<typeof workSessionSchema>;

export const annualEventSchema = z.object({
  month: z.number().min(1).max(12),
  label: z.string(),
  status: z.enum(["done", "current", "planned"]).optional(),
  /** 紐づく回の ToDo からステータスを自動判定（5問ドリル等） */
  sessionId: z.string().optional(),
});
export type AnnualEvent = z.infer<typeof annualEventSchema>;

export const periodRowSchema = z.object({
  id: z.string(),
  step: z.string(),
  due: z.string(),
  owner: z.string(),
  status: z.enum(["done", "doing", "todo"]),
  /** 指定時はその回の工程管理表にだけ表示 */
  sessionId: z.string().optional(),
});
export type PeriodRow = z.infer<typeof periodRowSchema>;

export const initiativeSchema = z.object({
  id: z.string(),
  name: z.string(),
  annualEvents: z.array(annualEventSchema),
  currentPeriodLabel: z.string(),
  periodRows: z.array(periodRowSchema),
  sessions: z.array(workSessionSchema),
});
export type Initiative = z.infer<typeof initiativeSchema>;

export const workBoardSchema = z.object({
  workspaceName: z.string(),
  initiatives: z.array(initiativeSchema),
});
export type WorkBoard = z.infer<typeof workBoardSchema>;
