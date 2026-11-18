import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/auth/http";
import { getSession } from "@/lib/auth/session";
import { parseJobKey, recordJobEvent, type JobEvent, type JobKey } from "@/lib/jobs-activity";

// 案件への反応を数える（管理ページの「案件の反応」用）。{ event: "list" | "click" | "detail", jobs: [{ kind, id }] }
//   list   一覧に表示された（画面に出た案件ごとに1回）
//   click  一覧から案件を押した
//   detail 案件の詳細ページを開いた
// 案件一覧はログインしたスタッフだけが見られるので、ログイン中の人からの記録だけを受け付ける。
// 画面の動きを止めないよう、うまくいかなくても常に 204（中身なし）を返す
const EVENTS = new Set<JobEvent>(["list", "click", "detail"]);

export async function POST(request: Request) {
  const done = new NextResponse(null, { status: 204 });
  if (!isSameOrigin(request)) return done;
  try {
    if (!(await getSession())) return done;
    const body = JSON.parse(await request.text()) as { event?: unknown; jobs?: unknown };
    const event = body.event as JobEvent;
    if (!EVENTS.has(event) || !Array.isArray(body.jobs)) return done;
    const jobs = body.jobs.slice(0, 50).map(parseJobKey).filter((j): j is JobKey => j !== null);
    await recordJobEvent(event, jobs);
  } catch (error) {
    console.error("job track failed:", error);
  }
  return done;
}
