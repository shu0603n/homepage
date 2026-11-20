import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { SubmissionDetailPanel } from "@/components/admin/FormsPanels";
import { getForm, listSubmissions } from "@/lib/admin/forms";
import { getAdminSession } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

// 回答1件の詳細（すべての質問と答え・添付ファイル）
export default async function SubmissionPage({ params }: { params: Promise<{ id: string; sid: string }> }) {
  const session = await getAdminSession().catch(() => null);
  if (!session) redirect("/admin/login/");
  const p = await params;
  const id = Number(p.id);
  const sid = Number(p.sid);
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(sid) || sid <= 0) notFound();
  const form = await getForm(id);
  if (!form) notFound();
  const [s] = await listSubmissions(form, { id: sid });
  if (!s) notFound();
  return (
    <AdminShell session={session} active="forms" en="Answer" title="回答の詳細">
      <SubmissionDetailPanel form={form} s={s} />
    </AdminShell>
  );
}
