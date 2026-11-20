import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PublicForm } from "@/components/jobs/PublicForm";
import { PageShell } from "@/components/site/PageShell";
import { getFormBySlug, publicFields } from "@/lib/admin/forms";
import { getAdminSession } from "@/lib/admin/session";
import { buildMetadata, type PageMeta } from "@/lib/metadata";

// 管理画面の「フォーム管理」で作ったフォームの回答ページ（仕組みは lib/admin/forms.ts）。
// LINE ログイン（LIFF）を使うため、LIFF のエンドポイント（/jobs/）の下に置いている。
// 非公開のフォームは、管理画面にログイン中の管理者だけがプレビューとして見られる（送信はできない）
export const dynamic = "force-dynamic";

const load = cache(async (slug: string) => {
  const form = await getFormBySlug(slug).catch(() => null);
  if (!form) return null;
  if (form.is_published) return { form, preview: false };
  const admin = await getAdminSession().catch(() => null);
  return admin ? { form, preview: true } : null;
});

const metaOf = (title: string, description: string | null): PageMeta => ({
  title,
  description: description?.slice(0, 120) || `${title}（株式会社エモリスリンク）`,
  section: "contact",
  hero: { en: "Form", ja: title, img: "hero-register.jpg" },
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const hit = await load(slug);
  const meta = hit ? metaOf(hit.form.title, hit.form.description) : metaOf("フォーム", null);
  return { ...buildMetadata(`jobs/forms/${slug}/`, meta), robots: { index: false, follow: false } };
}

export default async function FormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hit = await load(slug);
  if (!hit) notFound();
  const { form, preview } = hit;
  return (
    <PageShell route={`jobs/forms/${form.slug}/`} meta={metaOf(form.title, form.description)} special>
      <section className="section">
        <div className="container">
          {form.description && <div className="lead-block pf-lead">{form.description}</div>}
          <PublicForm slug={form.slug} fields={publicFields(form)} logic={form.logic} lineRequired={form.auth_mode === "line"} preview={preview} />
        </div>
      </section>
    </PageShell>
  );
}
