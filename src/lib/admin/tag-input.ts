import { intOrNull, str } from "@/lib/admin/api";
import { TAG_TRIGGER_LABEL, type TagInput } from "@/lib/admin/crm";

// タグの作成・更新で送られてきた内容を確かめる（だめならエラーメッセージを返す）
export function parseTag(body: Record<string, unknown>): TagInput | string {
  const name = str(body.name, 100);
  if (!name) return "タグ名を入力してください。";
  const color = typeof body.color === "string" && /^#[0-9a-fA-F]{6}$/.test(body.color) ? body.color : null;
  if (!color) return "色は #RRGGBB の形で指定してください。";
  const category = intOrNull(body.category_id ?? null);
  if (category === undefined) return "カテゴリが正しくありません。";
  const trigger = body.auto_trigger === null || body.auto_trigger === "" ? null : typeof body.auto_trigger === "string" && TAG_TRIGGER_LABEL[body.auto_trigger] ? body.auto_trigger : undefined;
  if (trigger === undefined) return "自動付与ルールが正しくありません。";
  return { name, description: str(body.description, 1000), color, category_id: category, is_manual_allowed: body.is_manual_allowed !== false, auto_trigger: trigger };
}
