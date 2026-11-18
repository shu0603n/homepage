"use client";

import { postJson } from "@/components/auth/api";

export function AdminLogoutButton() {
  return (
    <button
      type="button"
      className="adm-logout"
      onClick={async () => {
        await postJson("/api/admin/logout/", {});
        window.location.assign("/admin/login/");
      }}
    >
      <i className="bi bi-box-arrow-right" aria-hidden="true" />
      ログアウト
    </button>
  );
}
