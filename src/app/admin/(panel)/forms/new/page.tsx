import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { FormBuilder } from "@/components/admin/FormsClient";
import { getAdminSession } from "@/lib/admin/session";
import { builderOptions, toInitial } from "../builder-props";

export const dynamic = "force-dynamic";

// 新しいフォームを作る
export default async function NewFormPage() {
  const session = await getAdminSession().catch(() => null);
  if (!session) redirect("/admin/login/");
  const opts = await builderOptions();
  return (
    <AdminShell session={session} active="forms" en="New Form" title="新しいフォーム" lead="質問を並べて保存すると、ホームページに回答ページ（URL）ができます。「公開」にすると回答を受け付けます。">
      <p className="adm-crm-back">
        <a href="/admin/?tab=forms">
          <i className="bi bi-chevron-left" aria-hidden="true" />
          フォームの一覧へ
        </a>
      </p>
      <FormBuilder initial={toInitial(null, 0)} {...opts} />
    </AdminShell>
  );
}
