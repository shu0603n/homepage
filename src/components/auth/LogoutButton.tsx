"use client";

import { useState } from "react";
import { postJson } from "@/components/auth/api";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await postJson("/api/auth/logout/", {});
    window.location.assign("/");
  }

  return (
    <button className="btn btn--ghost" type="button" onClick={logout} disabled={busy}>
      {busy ? "ログアウト中…" : "ログアウト"}
    </button>
  );
}
