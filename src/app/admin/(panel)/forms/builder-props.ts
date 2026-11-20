import { CANDIDATE_STATUSES, listTags } from "@/lib/admin/crm";
import type { FormDetail, TemplateRow } from "@/lib/admin/forms";
import type { BuilderInitial } from "@/components/admin/FormsClient";
import { SITE } from "@/lib/site";

// フォームの作成・編集の画面に渡すもの（タグ・ステータスの選択肢と、編集するフォームの今の中身）
export async function builderOptions() {
  const tags = await listTags().catch(() => []);
  return {
    tags: tags.filter((t) => t.is_active).map((t) => ({ id: t.id, name: t.name, color: t.color })),
    statuses: CANDIDATE_STATUSES.map((s) => ({ key: s.key, label: s.label })),
    publicBase: `${SITE.siteUrl}/jobs/forms/`,
  };
}

export function toInitial(f: FormDetail | null, answers: number): BuilderInitial {
  return {
    id: f?.id ?? null,
    title: f?.title ?? "",
    slug: f?.slug ?? "",
    description: f?.description ?? "",
    purpose: f?.purpose ?? "",
    auth_mode: f?.auth_mode ?? "line",
    is_published: f?.is_published ?? false,
    done_message: f?.done_message ?? "",
    on_submit_status: f?.on_submit_status ?? "",
    on_submit_tag_ids: f?.on_submit_tag_ids ?? [],
    notify: f?.notify ?? true,
    first_next: f?.logic?.first_next ?? "",
    fields: (f?.fields ?? []).filter((x) => !x.deleted).map((x) => ({ id: x.id, uid: x.uid, type: x.type, label: x.label, help: x.help, required: x.required, options: x.options, profile_key: x.profile_key, logic: x.logic })),
    answers,
  };
}

// テンプレートの中身を、フォームの作成・編集の画面の形にする（質問の ID は無し。今は無いタグは外す）
export const templateSheetSummary = (t: TemplateRow) =>
  t.data.sheet ? { title: t.data.sheet.spreadsheet_title, sheet_name: t.data.sheet.sheet_name, columns: t.data.sheet.columns.length } : null;

export function templateToInitial(t: TemplateRow, tagIds: number[]): BuilderInitial {
  const d = t.data;
  return {
    id: null,
    title: d.title ?? "",
    slug: "",
    description: d.description ?? "",
    purpose: d.purpose ?? "",
    auth_mode: d.auth_mode === "open" ? "open" : "line",
    is_published: false,
    done_message: d.done_message ?? "",
    on_submit_status: d.on_submit_status ?? "",
    on_submit_tag_ids: (d.on_submit_tag_ids ?? []).filter((id) => tagIds.includes(id)),
    notify: d.notify !== false,
    first_next: d.logic?.first_next ?? "",
    fields: (d.fields ?? []).map((f) => ({ id: null, uid: f.uid, type: f.type, label: f.label, help: f.help, required: f.required, options: f.options ?? [], profile_key: f.profile_key, logic: f.logic })),
    answers: 0,
  };
}
