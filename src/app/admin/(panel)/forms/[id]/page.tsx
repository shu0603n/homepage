import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { FormBuilder } from "@/components/admin/FormsClient";
import { FormHead } from "@/components/admin/FormsPanels";
import { getForm, listForms } from "@/lib/admin/forms";
import { getAdminSession } from "@/lib/admin/session";
import { builderOptions, toInitial } from "../builder-props";

export const dynamic = "force-dynamic";

// フォームの編集
export default async function EditFormPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const session = await getAdminSession().catch(() => null);
  if (!session) redirect("/admin/login/");
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [form, list, opts] = await Promise.all([getForm(id), listForms(), builderOptions()]);
  if (!form) notFound();
  const count = list.find((f) => f.id === id)?.count ?? 0;
  const saved = (await searchParams).saved;
  return (
    <AdminShell session={session} active="forms" en="Edit Form" title="フォームの編集">
      <div className="adm-stack">
        <FormHead form={form} count={count} current="edit" />
        {saved && (
          <p className="adm-alert is-ok adm-flash" role="status" key={saved}>
            <i className="bi bi-check-circle-fill" aria-hidden="true" />
            <span>
              保存しました。{form.is_published ? "回答ページに反映されています。" : "いまは非公開です。「公開する」にして保存すると、回答を受け付けます。"}
            </span>
          </p>
        )}
        <FormBuilder key={form.updated_at.getTime()} initial={toInitial(form, count)} {...opts} />
      </div>
    </AdminShell>
  );
}
