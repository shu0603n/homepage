import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { FormBuilder } from "@/components/admin/FormsClient";
import { getTemplate } from "@/lib/admin/forms";
import { getAdminSession } from "@/lib/admin/session";
import { builderOptions, templateToInitial } from "../../builder-props";

export const dynamic = "force-dynamic";

// テンプレートを直す（直しても、これまでにこのテンプレートから作ったフォームは変わらない）
export default async function EditTemplatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const session = await getAdminSession().catch(() => null);
  if (!session) redirect("/admin/login/");
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [tpl, opts] = await Promise.all([getTemplate(id), builderOptions()]);
  if (!tpl) notFound();
  const saved = (await searchParams).saved;
  return (
    <AdminShell session={session} active="forms" en="Template" title="テンプレートの編集" lead="直した内容は、これから作るフォームに使われます（これまでに作ったフォームは変わりません）。">
      <div className="adm-stack">
        <div className="adm-crm-bar">
          <p className="adm-crm-back">
            <Link href="/admin/?tab=forms#templates">
              <i className="bi bi-chevron-left" aria-hidden="true" />
              フォームの一覧へ
            </Link>
          </p>
          <Link href={`/admin/forms/new/?template=${tpl.id}`} className="adm-chipbtn adm-chipbtn--primary">
            <i className="bi bi-plus-lg" aria-hidden="true" />
            このテンプレートでフォームを作る
          </Link>
        </div>
        {saved && (
          <p className="adm-alert is-ok adm-flash" role="status" key={saved}>
            <i className="bi bi-check-circle-fill" aria-hidden="true" />
            <span>テンプレートを保存しました。</span>
          </p>
        )}
        <FormBuilder
          key={tpl.updated_at.getTime()}
          initial={templateToInitial(tpl, opts.tags.map((t) => t.id))}
          template={{ id: tpl.id, name: tpl.name, description: tpl.description ?? "" }}
          {...opts}
        />
      </div>
    </AdminShell>
  );
}
