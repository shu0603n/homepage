import { checkVerification, clearVerification, startVerification, VERIFY_MESSAGES } from "@/lib/auth/verify-code";

// メールアドレス変更の確認コード（仕組みは lib/auth/verify-code.ts。間違えられる回数に上限あり）
export { generateCode, reserveSend } from "@/lib/auth/verify-code";

export async function startEmailChange(staffId: number, newEmail: string, code: string): Promise<void> {
  await startVerification("email-change", `${staffId}:${newEmail}`, code);
}

// コードが正しければ変更先のメールアドレスを、だめなら画面に出すメッセージを返す（別のスタッフのコードも不可）
export async function checkEmailChange(staffId: number, code: string): Promise<{ ok: true; newEmail: string } | { ok: false; message: string }> {
  const result = await checkVerification("email-change", code);
  if (!result.ok) return { ok: false, message: VERIFY_MESSAGES[result.reason] };
  const prefix = `${staffId}:`;
  if (!result.target.startsWith(prefix)) return { ok: false, message: VERIFY_MESSAGES.missing };
  return { ok: true, newEmail: result.target.slice(prefix.length) };
}

export async function clearEmailChange(): Promise<void> {
  await clearVerification("email-change");
}
