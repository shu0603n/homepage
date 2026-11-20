import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { FormAnswersPanel } from "@/components/admin/FormsPanels";
import { getForm, listSubmissions } from "@/lib/admin/forms";
import { getAdminSession } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

// フォームの回答（一覧・グラフ）
export default async function FormAnswersPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string; page?: string }> }) {
  const session = await getAdminSession().catch(() => null);
  if (!session) redirect("/admin/login/");
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const form = await getForm(id);
  if (!form) notFound();
  const subs = await listSubmissions(form);
  const sp = await searchParams;
  return (
    <AdminShell session={session} active="forms" en="Answers" title="フォームの回答">
      <FormAnswersPanel form={form} subs={subs} view={sp.view === "chart" ? "chart" : "list"} page={sp.page} />
    </AdminShell>
  );
}
