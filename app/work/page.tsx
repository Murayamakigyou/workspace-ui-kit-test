import { WorkWorkspace } from "@/components/work/WorkWorkspace";
import workBoardData from "@/data/work-board.json";
import { workBoardSchema } from "@/lib/work-schema";

export default function WorkPage() {
  const result = workBoardSchema.safeParse(workBoardData);

  if (!result.success) {
    throw new Error(
      `work-board.json: ${result.error.issues[0]?.message ?? "検証エラー"}`,
    );
  }

  return (
    <div className="work-theme min-h-screen">
      <WorkWorkspace initialBoard={result.data} />
    </div>
  );
}
