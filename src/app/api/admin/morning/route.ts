import { NextResponse } from "next/server";
import { adminRequest, str } from "@/lib/admin/api";
import { addCompanyHoliday, eraseEntry, MorningError, removeCompanyHoliday, setMemberActive, updateToday, writeEntry } from "@/lib/admin/morning";
import { jsonError } from "@/lib/auth/http";

// 朝礼の操作（POST { action, ... }。いまは特級の管理者だけ）。仕組みは lib/admin/morning.ts
//   write   発表・コメントを書く { day, kind: presentation | comment, text }（その日の担当の本人。特級の管理者は代筆もできる）
//   erase   発表・コメントを消す { day, kind }（特級の管理者）
//   absent  今日いない人を変える { admin_id, absent }
//   skip    今日を朝礼なしにする・戻す { skip }
//   member  当番に入れる・外す { admin_id, active }
//   holiday 会社の休みを足す { day, name } ／ holiday_remove 消す { day }
const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

export async function POST(request: Request) {
  const r = await adminRequest(request, { body: true });
  if (r instanceof Response) return r;
  if (r.session.role !== "super") return jsonError("朝礼のページは、いまは特級の管理者だけが使えます。", 403);
  const b = r.body;
  try {
    switch (b.action) {
      case "write":
        if (!isDay(b.day) || (b.kind !== "presentation" && b.kind !== "comment") || typeof b.text !== "string") return jsonError("無効なリクエストです。", 400);
        await writeEntry(b.day, b.kind, b.text, r.session.id, r.session.role === "super");
        break;
      case "erase":
        // 朝礼のページをほかの管理者にも開いたときも、消せるのは特級の管理者だけ
        if (r.session.role !== "super") return jsonError("投稿の削除は、特級の管理者だけができます。", 403);
        if (!isDay(b.day) || (b.kind !== "presentation" && b.kind !== "comment")) return jsonError("無効なリクエストです。", 400);
        await eraseEntry(b.day, b.kind);
        break;
      case "absent":
        if (!Number.isInteger(b.admin_id) || typeof b.absent !== "boolean") return jsonError("無効なリクエストです。", 400);
        await updateToday({ absent: { adminId: b.admin_id as number, absent: b.absent } });
        break;
      case "skip":
        if (typeof b.skip !== "boolean") return jsonError("無効なリクエストです。", 400);
        await updateToday({ skip: b.skip });
        break;
      case "member":
        if (!Number.isInteger(b.admin_id) || typeof b.active !== "boolean") return jsonError("無効なリクエストです。", 400);
        await setMemberActive(b.admin_id as number, b.active);
        break;
      case "holiday":
        if (!isDay(b.day)) return jsonError("日付を選んでください。", 400);
        await addCompanyHoliday(b.day, str(b.name, 100), r.session.id);
        break;
      case "holiday_remove":
        if (!isDay(b.day)) return jsonError("無効なリクエストです。", 400);
        await removeCompanyHoliday(b.day);
        break;
      default:
        return jsonError("無効な操作です。", 400);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MorningError) return jsonError(error.message, 400);
    console.error("morning action failed:", error);
    return jsonError("保存できませんでした。時間をおいて再度お試しください。", 500);
  }
}
