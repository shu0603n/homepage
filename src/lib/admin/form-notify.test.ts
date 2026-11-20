import { describe, expect, it, vi } from "vitest";

const sent: { to: string; subject: string; text: string }[] = [];
vi.mock("@/lib/mail", () => ({ isMailConfigured: () => true, sendMail: async (m: { to: string; subject: string; text: string }) => void sent.push(m) }));
vi.mock("@/lib/admin/forms", () => ({
  listSubmissions: async () => [
    {
      id: 7,
      submitted_at: new Date("2026-11-21T05:03:00Z"),
      who: "山田 花子",
      line_name: "はなこ",
      line_user_id: "Uabc",
      staff_id: null,
      answers: new Map<number, { text: string | null; json: unknown }>([
        [1, { text: "山田 花子", json: null }],
        [2, { text: "2026-12-01", json: null }],
        [3, { text: null, json: ["月", "その他：土"] }],
      ]),
      files: [{ id: 1, field_id: 5, file_name: "履歴書.pdf", size: 10 }],
    },
  ],
}));

const { notifySubmission } = await import("@/lib/admin/form-notify");
const form = {
  id: 3,
  title: "就業状況アンケート",
  notify: true,
  fields: [
    { id: 1, type: "SHORT_TEXT", label: "お名前", deleted: false },
    { id: 9, type: "SECTION", label: "ページ2", deleted: false },
    { id: 2, type: "DATE", label: "希望開始日", deleted: false },
    { id: 3, type: "MULTI_CHOICE", label: "曜日", deleted: false },
    { id: 4, type: "SHORT_TEXT", label: "答えなかった質問", deleted: false },
    { id: 5, type: "FILE", label: "履歴書", deleted: false },
  ],
} as never;

describe("フォーム回答の通知メール", () => {
  it("宛先・件名・本文（答えた質問だけ、日付は / 区切り、管理画面へのリンク）", async () => {
    await notifySubmission(form, 7);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("recruit_hr@emorislink.co.jp");
    expect(sent[0].subject).toBe("【フォーム回答】就業状況アンケート（山田 花子）");
    expect(sent[0].text).toContain("回答日時：2026/11/21 14:03");
    expect(sent[0].text).toContain("■ 希望開始日\n2026/12/01");
    expect(sent[0].text).toContain("■ 曜日\n月、その他：土");
    expect(sent[0].text).toContain("■ 履歴書\n（添付ファイル）履歴書.pdf");
    expect(sent[0].text).not.toContain("答えなかった質問");
    expect(sent[0].text).not.toContain("ページ2");
    expect(sent[0].text).toContain("/admin/forms/3/answers/7/");
  });
  it("通知がオフなら送らない", async () => {
    sent.length = 0;
    await notifySubmission({ ...(form as object), notify: false } as never, 7);
    expect(sent).toHaveLength(0);
  });
});
