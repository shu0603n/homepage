import { handleStaffRegistration } from "@/lib/auth/register";
import { lineFriendUrl } from "@/lib/line-friend";

// 来社登録（/register/visit/）：来社されたスタッフが入力する、項目の少ない登録フォーム。
// 登録方法は「来社」。パスワード設定のご案内メールは通常の登録と同じく送る（後でスタッフに設定してもらう）。
// 登録後の画面で LINE 友だち追加（来社用の流入経路）を案内するため、そのリンクを返す
export async function POST(request: Request) {
  return handleStaffRegistration(request, "来社", (staffId) => ({ lineUrl: lineFriendUrl(staffId, "visit") }));
}
