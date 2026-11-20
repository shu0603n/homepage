import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { FormBuilder } from "@/components/admin/FormsClient";
import { FormHead } from "@/components/admin/FormsPanels";
import { getForm, listForms } from "@/lib/admin/forms";
import { getAdminSession } from "@/lib/admin/session";
import { getSheetLink } from "@/lib/admin/sheets";
import { builderOptions, toInitial } from "../builder-props";

export const dynamic = "force-dynamic";

// フォームの編集
export default async function EditFormPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; sheet?: string }> }) {
  const session = await getAdminSession().catch(() => null);
  if (!session) redirect("/admin/login/");
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [form, list, opts, link] = await Promise.all([getForm(id), listForms(), builderOptions(), getSheetLink(id).catch(() => null)]);
  if (!form) notFound();
  const count = list.find((f) => f.id === id)?.count ?? 0;
  const sp = await searchParams;
  const saved = sp.saved;
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
        {sp.sheet === "ok" && (
          <p className="adm-alert is-ok adm-flash" role="status">
            <i className="bi bi-file-earmark-spreadsheet" aria-hidden="true" />
            <span>テンプレートのスプレッドシート連携を引き継ぎました。「スプレッドシート連携」のタブで確かめられます。</span>
          </p>
        )}
        {sp.sheet === "failed" && (
          <p className="adm-alert is-warn adm-flash" role="status">
            <i className="bi bi-exclamation-triangle" aria-hidden="true" />
            <span>フォームは作りましたが、スプレッドシート連携は引き継げませんでした（Google と連携しているか、シートを編集できるかを確かめ、「スプレッドシート連携」のタブで設定してください）。</span>
          </p>
        )}
        <FormBuilder
          key={form.updated_at.getTime()}
          initial={toInitial(form, count)}
          sheet={link ? { title: link.spreadsheet_title, sheet_name: link.sheet_name, columns: link.columns.length } : null}
          {...opts}
        />
      </div>
    </AdminShell>
  );
}
