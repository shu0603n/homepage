import { NextResponse } from "next/server";
import { isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { getSession } from "@/lib/auth/session";
import { APPLICATION_NOTIFY_TO, isMailConfigured, sendMail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

const DAYS_OFF = ["月", "火", "水", "木", "金", "土", "日", "祝"];

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function positiveInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// 案件への応募。応募者の情報はログイン中のスタッフ情報から取り、画面から送られた氏名等は使わない
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);

  const session = await getSession();
  if (!session) return jsonError("ログインが必要です。", 401);
  if (session.staffId === null) return jsonError("スタッフ情報が見つかりません。お電話にてお問い合わせください。", 400);

  const body = (await readJson(request)) as Record<string, unknown> | null;
  const projectId = positiveInt(body?.project_id);
  const recruitProjectId = positiveInt(body?.recruit_project_id);
  if ((projectId === null) === (recruitProjectId === null)) return jsonError("応募する案件が正しくありません。", 400);

  const daysOff = Array.isArray(body?.days_off) ? body.days_off.filter((d): d is string => typeof d === "string" && DAYS_OFF.includes(d)) : [];

  try {
    const staff = await prisma.staff.findUnique({
      where: { id: session.staffId },
      select: { id: true, name: true, mail: true, gender: true, birthday: true, phone_number: true },
    });
    if (!staff) return jsonError("スタッフ情報が見つかりません。お電話にてお問い合わせください。", 400);

    // 掲載中の案件にだけ応募できる。応募先の名前はメール通知に使う
    let title: string | null;
    if (projectId !== null) {
      const now = new Date();
      const project = await prisma.project.findFirst({
        where: { id: projectId, hp_posting_flag: true, start_date: { lte: now }, OR: [{ end_date: null }, { end_date: { gte: now } }] },
        select: { project_title: true },
      });
      title = project?.project_title ?? null;
      if (!project) return jsonError("この案件は現在募集していません。", 404);
    } else {
      const recruit = await prisma.recruit_project.findFirst({ where: { id: recruitProjectId!, is_recruiting: true }, select: { title: true } });
      title = recruit?.title ?? null;
      if (!recruit) return jsonError("この案件は現在募集していません。", 404);
    }

    const already = await prisma.application.findFirst({
      where: { staff_id: staff.id, ...(projectId !== null ? { project_id: projectId } : { recruit_project_id: recruitProjectId }) },
      select: { id: true },
    });
    if (already) return jsonError("この案件には既に応募済みです。担当者からの連絡をお待ちください。", 409);

    const data = {
      staff_id: staff.id,
      project_id: projectId,
      recruit_project_id: recruitProjectId,
      name: staff.name,
      tel: staff.phone_number,
      mail: staff.mail,
      gender: staff.gender,
      birthday: staff.birthday,
      desired_time: text(body?.desired_time, 20),
      days_off: daysOff,
      other_days_off: text(body?.other_days_off, 255),
      other_inquiries: text(body?.other_inquiries, 2000),
    };
    await prisma.application.create({ data });
    if (projectId !== null) await prisma.project.update({ where: { id: projectId }, data: { applications: { increment: 1 } } });
    else await prisma.recruit_project.update({ where: { id: recruitProjectId! }, data: { applications: { increment: 1 } } });

    if (isMailConfigured()) {
      const lines = [
        `${data.name ?? ""} 様が応募しました。`,
        "",
        "応募経路 ： WEB応募（ログイン）",
        `応募案件名 ： ${title ?? ""}`,
        `氏名 ： ${data.name ?? ""}`,
        `連絡先電話番号 ： ${data.tel ?? ""}`,
        `メールアドレス ： ${data.mail ?? ""}`,
        `性別 ： ${data.gender ?? ""}`,
        `生年月日 ： ${data.birthday ? data.birthday.toISOString().slice(0, 10) : ""}`,
        `シフト希望時間 ： ${data.desired_time ?? ""}`,
        `休み希望 ： ${data.days_off.join(",")}`,
        `その他の休み希望 ： ${data.other_days_off ?? ""}`,
        `備考 ： ${data.other_inquiries ?? ""}`,
      ];
      await sendMail({ to: APPLICATION_NOTIFY_TO, subject: `${data.name ?? ""} 様からのご応募 (${title ?? ""})`, text: lines.join("\n") }).catch((e) =>
        console.error("application mail failed:", e),
      );
    } else {
      console.warn("SMTP が未設定のため、応募通知メールは送信していません");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("application failed:", error);
    return jsonError("応募に失敗しました。お電話にてお問い合わせください。", 500);
  }
}
