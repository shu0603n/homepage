"use client";

import type { ReactNode } from "react";

// 選んだらすぐ、そのフォーム（絞り込み）を送るプルダウン
export function AutoSubmitSelect({ name, defaultValue, children }: { name: string; defaultValue: string; children: ReactNode }) {
  return (
    <select name={name} defaultValue={defaultValue} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
      {children}
    </select>
  );
}
