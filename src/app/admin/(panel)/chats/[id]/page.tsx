import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { ChatThreadPanel } from "@/components/admin/CrmPanels";
import { getCandidate, isLineUserId, listNotes } from "@/lib/admin/crm";
import { listMessages, markRead } from "@/lib/admin/line";
import { getAdminSession } from "@/lib/admin/session";
import { listAdmins } from "@/lib/admin/store";
import { isMessagingConfigured } from "@/lib/line-messaging";

export const dynamic = "force-dynamic";

// 個別チャット（1人とのやり取り）。開いたら新着を消す（誰かが開けば全員分。Linext と同じ）
export default async function ChatThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession().catch(() => null);
  if (!session) redirect("/admin/login/");
  const { id } = await params;
  if (!isLineUserId(id)) notFound();
  const [c, messages, notes, admins] = await Promise.all([getCandidate(id), listMessages(id), listNotes(id), listAdmins().catch(() => [])]);
  if (!c) notFound();
  await markRead(id).catch(() => {});
  return (
    <AdminShell session={session} active="chats" en="Chat" title="個別チャット">
      <ChatThreadPanel c={c} messages={messages} notes={notes} admins={admins.map((a) => ({ id: a.id, label: a.name ?? a.email }))} configured={isMessagingConfigured()} />
    </AdminShell>
  );
}
