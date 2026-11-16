import { handleStaffRegistration } from "@/lib/auth/register";

// スタッフ登録（1/2）：ホームページの登録フォーム（/register/）。処理の中身は lib/auth/register.ts
export async function POST(request: Request) {
  return handleStaffRegistration(request, "フォーム");
}
