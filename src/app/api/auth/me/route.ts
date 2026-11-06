import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

// ヘッダーのログイン表示用。ログイン中かどうかだけを返す
export async function GET() {
  const session = await getSession();
  return NextResponse.json({ loggedIn: session !== null }, { headers: { "Cache-Control": "no-store" } });
}
