import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { FormBuilder } from "@/components/admin/FormsClient";
import { TemplatePicker } from "@/components/admin/FormsPanels";
import { getTemplate, listTemplates } from "@/lib/admin/forms";
import { getAdminSession } from "@/lib/admin/session";
import { builderOptions, templateSheetSummary, templateToInitial, toInitial } from "../builder-props";

export const dynamic = "force-dynamic";

// 新しいフォームを作る。テンプレートがあれば、まず「白紙から」か「テンプレートから」を選ぶ（?template=ID／?blank=1）
export default async function NewFormPage({ searchParams }: { searchParams: Promise<{ template?: string; blank?: string }> }) {
  const session = await getAdminSession().catch(() => null);
  if (!session) redirect("/admin/login/");
  const sp = await searchParams;
  const opts = await builderOptions();
  const tplId = Number(sp.template);
  const tpl = Number.isInteger(tplId) && tplId > 0 ? await getTemplate(tplId) : null;
  if (sp.template && !tpl) notFound();
  const templates = tpl || sp.blank ? [] : await listTemplates().catch(() => []);
  const choosing = !tpl && !sp.blank && templates.length > 0;
  return (
    <AdminShell
      session={session}
      active="forms"
      en="New Form"
      title="新しいフォーム"
      lead={choosing ? "白紙から作るか、テンプレートをもとに作るかを選んでください。" : "質問を並べて保存すると、ホームページに回答ページ（URL）ができます。「公開」にすると回答を受け付けます。"}
    >
      <p className="adm-crm-back">
        <Link href={choosing || (!tpl && !sp.blank) ? "/admin/?tab=forms" : "/admin/forms/new/"}>
          <i className="bi bi-chevron-left" aria-hidden="true" />
          {choosing || (!tpl && !sp.blank) ? "フォームの一覧へ" : "作り方の選択へ"}
        </Link>
      </p>
      {choosing ? (
        <TemplatePicker templates={templates} />
      ) : (
        <FormBuilder
          key={tpl ? `t${tpl.id}` : "blank"}
          initial={tpl ? templateToInitial(tpl, opts.tags.map((t) => t.id)) : toInitial(null, 0)}
          fromTemplate={tpl?.name}
          templateId={tpl?.id}
          templateSheet={tpl ? templateSheetSummary(tpl) : null}
          {...opts}
        />
      )}
    </AdminShell>
  );
}
