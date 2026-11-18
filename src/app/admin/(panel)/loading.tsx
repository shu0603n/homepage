import { AdminShellSkeleton } from "@/components/admin/AdminSkeleton";

// 管理ページの中で画面を移るとき、押した直後に出す仮の画面（準備ができ次第、本物に置き換わる）
export default function Loading() {
  return <AdminShellSkeleton />;
}
