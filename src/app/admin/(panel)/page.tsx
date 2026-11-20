import { redirect } from "next/navigation";
import { Suspense } from "react";
import { avatarUrl } from "@/components/admin/AdminAvatar";
import { AdminShell, type AdminNavKey } from "@/components/admin/AdminShell";
import { AdminPanelSkeleton } from "@/components/admin/AdminSkeleton";
import { Ga4Panel, GtmPanel, InquiriesPanel, ScPanel } from "@/components/admin/panels";
import { JobStatsPanel } from "@/components/admin/JobStatsPanel";
import { ChatsPanel, FriendsPanel, TagsPanel } from "@/components/admin/CrmPanels";
import { FormsListPanel } from "@/components/admin/FormsPanels";
import { listForms, listTemplates } from "@/lib/admin/forms";
import { listCandidates, listCategories, listChats, listTags } from "@/lib/admin/crm";
import { isMessagingConfigured } from "@/lib/line-messaging";
import { getAdminSession } from "@/lib/admin/session";
import { countUnhandledInquiries, listAdmins, listInquiries } from "@/lib/admin/store";

export const dynamic = "force-dynamic";

// 管理ページのトップ。?tab= で表示する内容を切り替える（左のメニューから選ぶ）。何も指定がなければ、いちばん使うお問い合わせを出す
const TABS: Record<Exclude<AdminNavKey, "users" | "password">, { en: string; title: string; lead: string }> = {
  access: { en: "Analytics", title: "アクセス分析", lead: "ホームページに何人が来て、どのページを見ているか（Google アナリティクス）" },
  search: { en: "Search", title: "検索での見え方", lead: "Google の検索結果にどれだけ出て、どんな言葉で見つけてもらえているか（Search Console）" },
  jobs: { en: "Job Insights", title: "案件の反応", lead: "ホームページの案件一覧での表示・クリック・閲覧の回数と、「気になる」・ホームページからの応募の数" },
  tags: { en: "Tags", title: "計測タグ", lead: "サイトで動いている計測用のタグ（Google タグ マネージャー）" },
  inquiries: { en: "Inquiries", title: "お問い合わせ", lead: "ホームページのお問い合わせフォームから届いた内容" },
  friends: { en: "Friends", title: "友だち・求職者管理", lead: "LINE 公式アカウントの友だち（求職者）の一覧。ステータス・担当者・タグを管理します" },
  chats: { en: "Chats", title: "個別チャット", lead: "LINE 公式アカウントでの、一人ひとりとのメッセージのやり取り" },
  linetags: { en: "Tags", title: "タグ管理", lead: "友だち・求職者に付けるタグと、その分類（カテゴリ）" },
  forms: { en: "Forms", title: "フォーム管理", lead: "アンケートや申し込みのフォームを作り、ホームページに回答ページを作って、誰がどう答えたかを確かめます" },
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; filter?: string; days?: string; q?: string; status?: string; assignee?: string; friendStatus?: string; page?: string }> }) {
  const session = await getAdminSession().catch(() => null);
  if (!session) redirect("/admin/login/");
  const params = await searchParams;
  // 計測タグは特級の管理者だけ（一般の管理者が URL で開いても、お問い合わせを出す）
  const asked = params.tab && params.tab in TABS ? (params.tab as keyof typeof TABS) : "inquiries";
  const tab = asked === "tags" && session.role !== "super" ? "inquiries" : asked;
  const head = TABS[tab];

  // データベースへの問い合わせは同時に送る（順番に待つより速い）。
  // お問い合わせの一覧と担当者のプルダウン用の管理者は、お問い合わせのタブを開いたときだけ読む
  const [unhandled, inquiries, admins] = await Promise.all([
    countUnhandledInquiries().catch(() => 0),
    tab === "inquiries"
      ? listInquiries().catch((error) => {
          console.error("inquiry list failed:", error);
          return null;
        })
      : null,
    tab === "inquiries" ? listAdmins().catch(() => []) : [],
  ]);

  // Google のデータ（アクセス分析・検索・計測タグ）は時間がかかることがあるため、画面の枠を先に出し、届いたら差し込む
  return (
    <AdminShell session={session} active={tab} en={head.en} title={head.title} lead={head.lead} unhandled={unhandled}>
      {tab === "access" && (
        <Suspense fallback={<AdminPanelSkeleton kpis={5} />}>
          <Ga4Panel />
        </Suspense>
      )}
      {tab === "search" && (
        <Suspense fallback={<AdminPanelSkeleton kpis={4} />}>
          <ScPanel />
        </Suspense>
      )}
      {tab === "jobs" && (
        <Suspense fallback={<AdminPanelSkeleton kpis={5} cards={1} />}>
          <JobStatsPanel days={params.days} assignee={params.assignee} />
        </Suspense>
      )}
      {tab === "tags" && (
        <Suspense fallback={<AdminPanelSkeleton kpis={4} cards={1} />}>
          <GtmPanel />
        </Suspense>
      )}
      {tab === "friends" && <FriendsTab params={params} selfId={session.id} />}
      {tab === "chats" && <ChatsTab params={params} selfId={session.id} />}
      {tab === "linetags" && <LineTagsTab />}
      {tab === "forms" && <FormsTab />}
      {tab === "inquiries" && (
        <InquiriesPanel inquiries={inquiries} filter={params.filter} admins={admins.map((a) => ({ id: a.id, label: a.name ?? a.email, email: a.email, avatar: avatarUrl(a.id, a.avatar_version) }))} selfId={session.id} />
      )}
    </AdminShell>
  );
}

// 管理者の一覧（担当者のプルダウン用）
async function adminOptions() {
  return (await listAdmins().catch(() => [])).map((a) => ({ id: a.id, label: a.name ?? a.email }));
}

const assigneeOf = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) : null);

// 友だち・求職者管理（一覧）
async function FriendsTab({ params, selfId }: { params: { q?: string; status?: string; assignee?: string; friendStatus?: string; page?: string }; selfId: number }) {
  const [rows, admins, tags] = await Promise.all([
    listCandidates({ q: params.q, status: params.status || undefined, assignee: assigneeOf(params.assignee), friendStatus: params.friendStatus || undefined }).catch((error) => {
      console.error("candidate list failed:", error);
      return null;
    }),
    adminOptions(),
    listTags().catch(() => []),
  ]);
  const tagOpts = tags.filter((t) => t.is_active).map((t) => ({ id: t.id, name: t.name, color: t.color, manual: t.is_manual_allowed }));
  return <FriendsPanel rows={rows} admins={admins} tags={tagOpts} params={params} selfId={selfId} configured={isMessagingConfigured()} />;
}

// 個別チャット（一覧）
async function ChatsTab({ params, selfId }: { params: { q?: string; status?: string; assignee?: string }; selfId: number }) {
  const [rows, admins] = await Promise.all([
    listChats({ q: params.q, status: params.status || undefined, assignee: assigneeOf(params.assignee) }).catch((error) => {
      console.error("chat list failed:", error);
      return null;
    }),
    adminOptions(),
  ]);
  return <ChatsPanel rows={rows} admins={admins} params={params} selfId={selfId} />;
}

// タグ管理
async function LineTagsTab() {
  const [tags, categories] = await Promise.all([listTags(), listCategories()]);
  return <TagsPanel tags={tags} categories={categories} />;
}

// フォーム管理（一覧）
async function FormsTab() {
  const [forms, templates] = await Promise.all([
    listForms().catch((error) => {
      console.error("form list failed:", error);
      return null;
    }),
    listTemplates().catch(() => []),
  ]);
  return <FormsListPanel forms={forms} templates={templates} />;
}
