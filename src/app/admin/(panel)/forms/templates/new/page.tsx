import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { FormBuilder } from "@/components/admin/FormsClient";
import { getAdminSession } from "@/lib/admin/session";
import { builderOptions, toInitial } from "../../builder-props";

export const dynamic = "force-dynamic";

// 新しいテンプレートを白紙から作る
export default async function NewTemplatePage() {
  const session = await getAdminSession().catch(() => null);
  if (!session) redirect("/admin/login/");
  const opts = await builderOptions();
  return (
    <AdminShell session={session} active="forms" en="New Template" title="新しいテンプレート" lead="よく使う質問の並びと設定を、テンプレートとして取っておけます。新しいフォームを作るときに選んで、そこからさらに直せます。">
      <p className="adm-crm-back">
        <Link href="/admin/?tab=forms#templates">
          <i className="bi bi-chevron-left" aria-hidden="true" />
          フォームの一覧へ
        </Link>
      </p>
      <FormBuilder initial={toInitial(null, 0)} template={{ id: null, name: "", description: "" }} {...opts} />
    </AdminShell>
  );
}
