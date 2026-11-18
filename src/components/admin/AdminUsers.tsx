'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { AdminAvatar } from '@/components/admin/AdminAvatar';
import { deleteJson, postJson } from '@/components/auth/api';
import type { AdminRole } from '@/lib/admin/store';

const ROLE_NAMES: Record<AdminRole, string> = { super: '特級', staff: '一般' };

type Admin = {
  id: number;
  email: string;
  name: string | null;
  role: AdminRole;
  avatar: string | null;
  active: boolean;
  lastLogin: string | null;
};

// selfRole：見ている人の権限。特級の人にだけ「特級にする／一般にする」を出す
export function AdminUsers({ admins, selfId, selfRole }: { admins: Admin[]; selfId: number; selfRole: AdminRole }) {
  const isSuper = selfRole === 'super';
  const router = useRouter();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  // アイコンを押したときに大きく見せる画像（null のときは閉じている）。Esc キーでも閉じる
  const [zoom, setZoom] = useState<{ url: string; name: string; email: string; role: AdminRole } | null>(null);
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoom(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [zoom]);

  async function run(action: () => Promise<{ ok: boolean; message?: string }>, done: string) {
    setBusy(true);
    setMessage(null);
    const r = await action();
    setBusy(false);
    setMessage(r.ok ? { text: done, ok: true } : { text: r.message ?? '失敗しました。', ok: false });
    if (r.ok) router.refresh();
    return r.ok;
  }

  async function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = String(fd.get('email') ?? '');
    const ok = await run(
      () => postJson('/api/admin/users/', { name: fd.get('name'), email }),
      `${email} に、パスワード設定のご案内メールを送りました。`
    );
    if (ok) form.reset();
  }

  return (
    <div className="adm-stack">
      {/* アイコンの拡大表示。ブランドの4色の輪が回り、まわりで星がきらめくカード */}
      {zoom && (
        <div className="adm-zoom" role="dialog" aria-modal="true" aria-label={`${zoom.name} さんのアイコン`} onClick={() => setZoom(null)}>
          <figure className={`adm-zoom__box adm-zoom__box--${zoom.role}`} onClick={(e) => e.stopPropagation()}>
            <div className="adm-zoom__stage" aria-hidden="true">
              <span className="adm-zoom__stripe" />
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} className={`adm-zoom__spark adm-zoom__spark--${i}`}>
                  ✦
                </span>
              ))}
            </div>
            <p className="adm-zoom__brand">EMORISLINK ADMIN</p>
            <div className="adm-zoom__avatar">
              <span className="adm-zoom__ring" aria-hidden="true" />
              <img src={zoom.url} alt={`${zoom.name} さんのアイコン`} width={256} height={256} />
            </div>
            <figcaption>
              <span className="adm-zoom__name">{zoom.name}</span>
              <em className={`adm-role adm-role--${zoom.role}`}>{ROLE_NAMES[zoom.role]}</em>
              <span className="adm-zoom__mail">{zoom.email}</span>
            </figcaption>
            <span className="adm-zoom__shine" aria-hidden="true" />
            <button type="button" className="adm-zoom__close" aria-label="閉じる" onClick={() => setZoom(null)} autoFocus>
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </figure>
        </div>
      )}
      {message && (
        <p className={`adm-alert ${message.ok ? 'is-ok' : 'is-ng'}`} role="status">
          <i className={`bi ${message.ok ? 'bi-check-circle' : 'bi-exclamation-circle'}`} aria-hidden="true" />
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
              {a.avatar ? (
                <button
                  type="button"
                  className="adm-member__zoom"
                  aria-label={`${a.name ?? a.email} さんのアイコンを大きく表示`}
                  onClick={() => setZoom({ url: a.avatar!, name: a.name ?? a.email, email: a.email, role: a.role })}
                >
                  <AdminAvatar name={a.name} email={a.email} url={a.avatar} className="adm-member__avatar" />
                  <i className="bi bi-zoom-in" aria-hidden="true" />
                </button>
              ) : (
                <AdminAvatar
                  name={a.name}
                  email={a.email}
                  url={a.avatar}
                  className={`adm-member__avatar${a.active ? '' : ' is-pending'}`}
                />
              )}
              <span className="adm-member__info">
                <strong>
                  {a.name ?? '（お名前未登録）'}
                  <em className={`adm-role adm-role--${a.role}`}>{ROLE_NAMES[a.role]}</em>
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
                <small>最後のログイン：{a.lastLogin ?? '—'}</small>
              </span>
              <span className="adm-member__actions">
                {/* アイコンの登録・解除（特級の管理者だけ）。画像を選ぶとすぐ保存する */}
                {isSuper && (
                  <label className={`adm-chipbtn${busy ? ' is-disabled' : ''}`}>
                    <i className="bi bi-image" aria-hidden="true" />
                    {a.avatar ? 'アイコンを変更' : 'アイコンを登録'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="visually-hidden"
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) return setMessage({ text: '画像は5MBまでにしてください。', ok: false });
                        run(() => uploadAvatar(a.id, file), `${a.name ?? a.email} さんのアイコンを登録しました。`);
                      }}
                    />
                  </label>
                )}
                {isSuper && a.avatar && (
                  <button
                    type="button"
                    className="adm-chipbtn"
                    disabled={busy}
                    onClick={() =>
                      run(() => deleteJson(`/api/admin/users/${a.id}/avatar/`), `${a.name ?? a.email} さんのアイコンを外しました。`)
                    }
                  >
                    <i className="bi bi-x-circle" aria-hidden="true" />
                    アイコンを外す
                  </button>
                )}
                {isSuper && a.id !== selfId && (
                  <button
                    type="button"
                    className="adm-chipbtn"
                    disabled={busy}
                    onClick={() => {
                      const next: AdminRole = a.role === 'super' ? 'staff' : 'super';
                      if (confirm(`${a.name ?? a.email} さんを「${ROLE_NAMES[next]}」にしますか？`)) {
                        run(() => sendPatch(a.id, next), `${a.name ?? a.email} さんを「${ROLE_NAMES[next]}」にしました。`);
                      }
                    }}
                  >
                    <i className={`bi ${a.role === 'super' ? 'bi-arrow-down-circle' : 'bi-star'}`} aria-hidden="true" />
                    {a.role === 'super' ? '一般にする' : '特級にする'}
                  </button>
                )}
                <button
                  type="button"
                  className="adm-chipbtn"
                  disabled={busy}
                  onClick={() => run(() => postJson(`/api/admin/users/${a.id}/`, {}), `${a.email} に、ご案内メールを送りました。`)}
                >
                  <i className="bi bi-envelope" aria-hidden="true" />
                  ご案内メール
                </button>
                {a.id !== selfId && (isSuper || a.role !== 'super') && (
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

      {/* 管理者の追加は特級の管理者だけ */}
      {isSuper ? (
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
      ) : (
        <p className="adm-note">
          <i className="bi bi-info-circle" aria-hidden="true" />
          管理者の追加と権限の変更は、特級の管理者だけができます。
        </p>
      )}
    </div>
  );
}

// 権限の変更（PATCH）
async function sendPatch(id: number, role: AdminRole): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/admin/users/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    return res.ok && data?.ok ? { ok: true } : { ok: false, message: data?.message ?? '権限の変更に失敗しました。' };
  } catch {
    return { ok: false, message: '通信に失敗しました。' };
  }
}

// アイコンの登録（画像ファイルをそのまま送る。サーバー側で正方形に切り取り、256×256 にして保存する）
async function uploadAvatar(id: number, file: File): Promise<{ ok: boolean; message?: string }> {
  try {
    const body = new FormData();
    body.append('file', file);
    const res = await fetch(`/api/admin/users/${id}/avatar/`, { method: 'POST', body });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    return res.ok && data?.ok ? { ok: true } : { ok: false, message: data?.message ?? 'アイコンを登録できませんでした。' };
  } catch {
    return { ok: false, message: '通信に失敗しました。' };
  }
}
