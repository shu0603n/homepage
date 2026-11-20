import { CANDIDATE_STATUSES, listTags } from "@/lib/admin/crm";
import type { FormDetail } from "@/lib/admin/forms";
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
    fields: (f?.fields ?? []).filter((x) => !x.deleted).map((x) => ({ id: x.id, type: x.type, label: x.label, help: x.help, required: x.required, options: x.options, profile_key: x.profile_key })),
    answers,
  };
}
