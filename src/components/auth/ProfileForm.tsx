"use client";

import { useState, type FormEvent } from "react";
import { deleteJson, putJson } from "@/components/auth/api";
import { readProfileFields, Row, StaffProfileFields } from "@/components/auth/StaffProfileFields";
import type { StaffProfile } from "@/lib/auth/staff";

// マイページの登録情報の編集。メールアドレス（ログイン ID）は変更できない
export function ProfileForm({ profile }: { profile: StaffProfile }) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const result = await putJson("/api/profile/", readProfileFields(new FormData(e.currentTarget)));
    setBusy(false);
    setMessage(result.ok ? { ok: true, text: "登録情報を更新しました。" } : { ok: false, text: result.message });
    document.getElementById("profile-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function onUnsubscribe() {
    if (!window.confirm("登録を解除しますか？\n登録情報は削除されませんが、お仕事情報などの配信が停止されます。")) return;
    setBusy(true);
    setMessage(null);
    const result = await deleteJson("/api/profile/");
    setBusy(false);
    setMessage(result.ok ? { ok: true, text: "登録を解除しました。今後の配信は停止されます。" } : { ok: false, text: result.message });
    document.getElementById("profile-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <form id="profile-form" className="form form--wide" onSubmit={onSubmit}>
      {message && (
        <p className={`form__status ${message.ok ? "is-ok" : "is-ng"}`} role={message.ok ? "status" : "alert"}>
          {message.text}
        </p>
      )}
      <StaffProfileFields
        defaults={profile}
        afterKana={
          <Row label="メールアドレス">
            <p className="form__static">{profile.mail ?? "（未登録）"}</p>
            <p className="form__help">
              変更は、<a href="#email-change">下の「メールアドレスの変更」</a>から確認コードで行えます。
            </p>
          </Row>
        }
      />
      <div className="form__actions">
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "更新中…" : "更新する"}
        </button>
      </div>
      <div className="form__unsubscribe">
        <button type="button" className="form__unsubscribe-btn" disabled={busy} onClick={onUnsubscribe}>
          登録解除
        </button>
      </div>
    </form>
  );
}

