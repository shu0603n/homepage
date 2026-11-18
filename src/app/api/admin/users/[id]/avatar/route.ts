import { NextResponse } from "next/server";
import sharp from "sharp";
import { isSameOrigin, jsonError } from "@/lib/auth/http";
import { getAdminSession } from "@/lib/admin/session";
import { findAdminById, getAdminAvatar, setAdminAvatar } from "@/lib/admin/store";

// 管理者のアイコン。
//   GET    画像を返す（管理ページにログインしている人なら誰でも見られる）
//   POST   画像を登録する（特級の管理者だけ）。500×500 を想定。正方形でなければ中央を切り取り、256×256 の WebP にして保存する
//   DELETE 画像を消す（特級の管理者だけ）。消すと頭文字の丸に戻る
const MAX_BYTES = 5 * 1024 * 1024;
const SIZE = 256;
const ACCEPT = new Set(["jpeg", "png", "webp"]);

async function targetId(params: Promise<{ id: string }>): Promise<number | null> {
  const id = Number((await params).id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return new NextResponse(null, { status: 401 });
  const id = await targetId(params);
  const avatar = id ? await getAdminAvatar(id) : null;
  if (!avatar) return new NextResponse(null, { status: 404 });
  // URL に ?v=登録日時 を付けて読むので、同じ URL の画像は変わらない＝ブラウザに1日覚えさせてよい（ログインした人のブラウザだけ）
  return new NextResponse(new Uint8Array(avatar.data), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=86400, immutable", "X-Content-Type-Options": "nosniff" },
  });
}

async function superOnly(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);
  const session = await getAdminSession();
  if (!session) return jsonError("ログインが必要です。", 401);
  if (session.role !== "super") return jsonError("アイコンを登録できるのは、特級の管理者だけです。", 403);
  return null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await superOnly(request);
  if (denied) return denied;
  const id = await targetId(params);
  if (!id || !(await findAdminById(id))) return jsonError("管理者が見つかりません。", 404);

  let file: File | null = null;
  try {
    const value = (await request.formData()).get("file");
    file = value instanceof File ? value : null;
  } catch {
    return jsonError("画像を受け取れませんでした。", 400);
  }
  if (!file || file.size === 0) return jsonError("画像を選んでください。", 400);
  if (file.size > MAX_BYTES) return jsonError("画像は5MBまでにしてください。", 400);

  try {
    const input = Buffer.from(await file.arrayBuffer());
    // 中身を実際に読んで、画像の種類を確かめる（拡張子や申告された種類は信用しない）
    const meta = await sharp(input).metadata();
    if (!meta.format || !ACCEPT.has(meta.format)) return jsonError("JPEG・PNG・WebP の画像を選んでください。", 400);
    if ((meta.width ?? 0) > 6000 || (meta.height ?? 0) > 6000) return jsonError("画像が大きすぎます（縦横6000ピクセルまで）。", 400);
    const webp = await sharp(input).rotate().resize(SIZE, SIZE, { fit: "cover", position: "centre" }).webp({ quality: 86 }).toBuffer();
    await setAdminAvatar(id, webp);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("avatar upload failed:", error);
    return jsonError("画像を読み込めませんでした。別の画像でお試しください。", 400);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await superOnly(request);
  if (denied) return denied;
  const id = await targetId(params);
  if (!id || !(await setAdminAvatar(id, null))) return jsonError("管理者が見つかりません。", 404);
  return NextResponse.json({ ok: true });
}
