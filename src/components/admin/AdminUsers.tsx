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
    <div className="admin-stack">
      {message && (
        <p className={`admin-alert ${message.ok ? "is-ok" : "is-ng"}`} role="status">
          {message.text}
        </p>
      )}
      <table className="admin-table admin-users">
        <thead>
          <tr>
            <th>お名前</th>
            <th>メールアドレス</th>
            <th>状態</th>
            <th>最後のログイン</th>
            <th aria-label="操作" />
          </tr>
        </thead>
        <tbody>
          {admins.map((a) => (
            <tr key={a.id}>
              <td>
                {a.name ?? "—"}
                {a.id === selfId && <span className="admin-you">あなた</span>}
              </td>
              <td>{a.email}</td>
              <td>{a.active ? "利用中" : <span className="admin-pending">パスワード設定待ち</span>}</td>
              <td>{a.lastLogin ?? "—"}</td>
              <td className="admin-users__actions">
                <button
                  type="button"
                  className="admin-smallbtn"
                  disabled={busy}
                  onClick={() => run(() => postJson(`/api/admin/users/${a.id}/`, {}), `${a.email} に、ご案内メールを送りました。`)}
                >
                  ご案内メールを送る
                </button>
                {a.id !== selfId && (
                  <button
                    type="button"
                    className="admin-smallbtn is-danger"
                    disabled={busy}
                    onClick={() => {
                      if (confirm(`${a.name ?? a.email} さんを管理者から外しますか？（管理ページに入れなくなります）`)) {
                        run(() => deleteJson(`/api/admin/users/${a.id}/`), `${a.name ?? a.email} さんを管理者から外しました。`);
                      }
                    }}
                  >
                    削除
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form className="admin-form admin-adduser" onSubmit={onAdd}>
        <h2 className="admin-h2">管理者を追加する</h2>
        <div className="admin-adduser__row">
          <label className="admin-field">
            <span>お名前</span>
            <input name="name" type="text" maxLength={100} placeholder="例：山田 花子" required />
          </label>
          <label className="admin-field">
            <span>メールアドレス</span>
            <input name="email" type="email" placeholder="例：h_yamada@emorislink.co.jp" required />
          </label>
          <button className="admin-btn" type="submit" disabled={busy}>
            追加してご案内メールを送る
          </button>
        </div>
      </form>
    </div>
  );
}
