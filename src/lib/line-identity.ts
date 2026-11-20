import { prisma } from '@/lib/prisma';
import { ensureAdminTables } from '@/lib/admin/store';

// ホームページで LINE ログイン・LINE 連携・フォーム回答をしたときに、LINE が確かめたその人の LINE の表示名とアイコンを覚えておく（表 hp_line_identity）。
// 公式アカウントの友だちでない人（ブロックした人・別の LINE アカウントで友だち追加した人）のプロフィールは、公式アカウントからは取れない。
// ここに覚えておけば、社内システム（next-app）のスタッフ一覧の「LINE(友だち未確認)」で、どの LINE アカウントが連携されているか分かる。
// via：login＝LINE ログイン、link＝スタッフとの連携、form＝フォーム回答。
// 失敗してもログインなど本来の処理は止めない（記録できなかったことをログに出すだけ）
export type LineVia = 'login' | 'link' | 'form';

export async function recordLineIdentity(p: {
  userId: string;
  name?: string | null;
  picture?: string | null;
  staffId?: number | null;
  via: LineVia;
}): Promise<void> {
  try {
    await ensureAdminTables();
    const name = p.name?.slice(0, 200) || null;
    await prisma.$executeRaw`
      INSERT INTO hp_line_identity (line_user_id, display_name, picture_url, staff_id, last_via)
      VALUES (${p.userId}, ${name}, ${p.picture ?? null}, ${p.staffId ?? null}, ${p.via})
      ON CONFLICT (line_user_id) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, hp_line_identity.display_name),
        picture_url = COALESCE(EXCLUDED.picture_url, hp_line_identity.picture_url),
        staff_id = COALESCE(EXCLUDED.staff_id, hp_line_identity.staff_id),
        last_via = EXCLUDED.last_via,
        last_seen_at = now()`;
  } catch (error) {
    console.error('LINE identity record failed:', error);
  }
}
