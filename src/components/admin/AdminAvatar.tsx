// 管理者のアイコン。登録された画像があれば画像を、無ければ名前の頭文字を丸の中に出す
export function avatarUrl(id: number, version: number | null): string | null {
  return version ? `/api/admin/users/${id}/avatar/?v=${Math.round(version)}` : null;
}

export function AdminAvatar({ name, email, url, className }: { name: string | null; email: string; url: string | null; className: string }) {
  if (url) {
    return (
      <span className={`${className} has-image`} aria-hidden="true">
        <img src={url} alt="" width={256} height={256} loading="lazy" decoding="async" />
      </span>
    );
  }
  return (
    <span className={className} aria-hidden="true">
      {(name ?? email).slice(0, 1).toUpperCase()}
    </span>
  );
}
