"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { deleteJson, postJson } from "@/components/auth/api";

type Admin = { id: number; email: string; name: string | null; active: boolean; lastLogin: string | null };

export function AdminUsers({ admins, selfId }: { admins: Admin[]; selfId: number }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<{ ok: boolean; message?: string }>, done: string) {
    setBusy(true);
    setMessage(null);
    const r = await action();
    setBusy(false);
    setMessage(r.ok ? { text: done, ok: true } : { text: r.message ?? "失敗しました。", ok: false });
    if (r.ok) router.refresh();
    return r.ok;
  }

  async function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = String(fd.get("email") ?? "");
    const ok = await run(() => postJson("/api/admin/users/", { name: fd.get("name"), email }), `${email} に、パスワード設定のご案内メールを送りました。`);
    if (ok) form.reset();
  }

  return (
    <div className="adm-stack">
      {message && (
        <p className={`adm-alert ${message.ok ? "is-ok" : "is-ng"}`} role="status">
          <i className={`bi ${message.ok ? "bi-check-circle" : "bi-exclamation-circle"}`} aria-hidden="true" />
          <span>{message.text}</span>
        </p>
      )}

      <section className="adm-card adm-card--wide">
        <p className="adm-card__en">Members</p>
        <h2 className="adm-card__title">
          管理ページを使える人<small>{admins.length}名</small>
        </h2>
        <ul className="adm-members">
          {admins.map((a) => (
            <li key={a.id} className="adm-member">
              <span className={`adm-member__avatar${a.active ? "" : " is-pending"}`} aria-hidden="true">
                {(a.name ?? a.email).slice(0, 1).toUpperCase()}
              </span>
              <span className="adm-member__info">
                <strong>
                  {a.name ?? "（お名前未登録）"}
                  {a.id === selfId && <em className="adm-you">あなた</em>}
                </strong>
                <small>{a.email}</small>
              </span>
              <span className="adm-member__status">
                {a.active ? (
                  <span className="adm-status is-ok">
                    <i className="bi bi-check-circle-fill" aria-hidden="true" />
                    利用中
                  </span>
                ) : (
                  <span className="adm-status is-wait">
                    <i className="bi bi-hourglass-split" aria-hidden="true" />
                    パスワード設定待ち
                  </span>
                )}
                <small>最後のログイン：{a.lastLogin ?? "—"}</small>
              </span>
              <span className="adm-member__actions">
                <button
                  type="button"
                  className="adm-chipbtn"
                  disabled={busy}
                  onClick={() => run(() => postJson(`/api/admin/users/${a.id}/`, {}), `${a.email} に、ご案内メールを送りました。`)}
                >
                  <i className="bi bi-envelope" aria-hidden="true" />
                  ご案内メール
                </button>
                {a.id !== selfId && (
                  <button
                    type="button"
                    className="adm-chipbtn is-danger"
                    disabled={busy}
                    onClick={() => {
                      if (confirm(`${a.name ?? a.email} さんを管理者から外しますか？（管理ページに入れなくなります）`)) {
                        run(() => deleteJson(`/api/admin/users/${a.id}/`), `${a.name ?? a.email} さんを管理者から外しました。`);
                      }
                    }}
                  >
                    <i className="bi bi-trash3" aria-hidden="true" />
                    削除
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="adm-card adm-card--wide">
        <p className="adm-card__en">Invite</p>
        <h2 className="adm-card__title">管理者を追加する</h2>
        <p className="adm-card__help">追加した人に「パスワード設定のご案内」メールが届きます。</p>
        <form className="adm-form adm-invite" onSubmit={onAdd}>
          <label className="adm-field">
            <span>お名前</span>
            <input name="name" type="text" maxLength={100} placeholder="例：山田 花子" required />
          </label>
          <label className="adm-field">
            <span>メールアドレス</span>
            <input name="email" type="email" placeholder="例：h_yamada@emorislink.co.jp" required />
          </label>
          <button className="adm-btn" type="submit" disabled={busy}>
            <i className="bi bi-send" aria-hidden="true" />
            追加してご案内メールを送る
          </button>
        </form>
      </section>
    </div>
  );
}
