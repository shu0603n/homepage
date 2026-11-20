import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { FormHead } from "@/components/admin/FormsPanels";
import { SheetPanel } from "@/components/admin/SheetClient";
import { getForm, listForms } from "@/lib/admin/forms";
import { getAdminSession } from "@/lib/admin/session";
import { getGoogleAccount, getSheetLink, oauthConfigured, pendingCount, sheetFieldsOf } from "@/lib/admin/sheets";

export const dynamic = "force-dynamic";

const dateTime = (d: Date) => new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);

// フォームの「スプレッドシート連携」（回答を Google スプレッドシートに書き込む。仕組みは lib/admin/sheets.ts）
export default async function FormSheetPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ google?: string }> }) {
  const session = await getAdminSession().catch(() => null);
  if (!session) redirect("/admin/login/");
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [form, list, link, account, pending] = await Promise.all([getForm(id), listForms(), getSheetLink(id), getGoogleAccount(), pendingCount(id)]);
  if (!form) notFound();
  const count = list.find((f) => f.id === id)?.count ?? 0;
  return (
    <AdminShell session={session} active="forms" en="Spreadsheet" title="スプレッドシート連携" lead="フォームの回答を、Google スプレッドシートの決めた列に、回答があるたびに書き込みます。">
      <div className="adm-stack">
        <FormHead form={form} count={count} current="sheet" />
        <SheetPanel
          formId={form.id}
          formTitle={form.title}
          fields={sheetFieldsOf(form)}
          link={
            link && {
              spreadsheet_id: link.spreadsheet_id,
              spreadsheet_title: link.spreadsheet_title,
              sheet_name: link.sheet_name,
              header_row: link.header_row,
              columns: link.columns,
              enabled: link.enabled,
              last_synced: link.last_synced_at ? dateTime(link.last_synced_at) : null,
              last_error: link.last_error,
            }
          }
          account={account && { email: account.email, connected: dateTime(account.connected_at), by: account.connected_by_name }}
          configured={oauthConfigured()}
          canConnect={session.role === "super"}
          pending={link ? pending : 0}
          flash={(await searchParams).google}
        />
      </div>
    </AdminShell>
  );
}
