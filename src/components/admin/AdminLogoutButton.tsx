"use client";

import { postJson } from "@/components/auth/api";

export function AdminLogoutButton() {
  return (
    <button
      type="button"
      className="admin-linkbtn"
      onClick={async () => {
        await postJson("/api/admin/logout/", {});
        window.location.assign("/admin/login/");
      }}
    >
      ログアウト
    </button>
  );
}
