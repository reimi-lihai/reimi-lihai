/**
 * Permission keys. Master has everything; normal admins get a subset chosen by
 * the master. Anything under MASTER_ONLY can never be granted to a normal admin
 * (payment settings, admin management, audit log).
 */
export const PERMISSIONS = {
  "reservations:read": "予約の閲覧",
  "reservations:write": "予約の作成・変更",
  chat: "チャット対応",
  keys: "ゲストキー発行・失効",
  tasks: "タスク管理",
  properties: "物件・CMS更新",
  pricing: "料金ルール編集",
  crm: "顧客・タグ管理",
  "payments:refund": "返金の実行",
} as const;

export const MASTER_ONLY = {
  "admins:manage": "管理者の追加・権限変更",
  "audit:read": "監査ログの閲覧",
  "settings:payments": "決済・サイト全体設定",
  "sales:read": "売上データ・エクスポート",
} as const;

export type Permission = keyof typeof PERMISSIONS | keyof typeof MASTER_ONLY;

export const ALL_PERMISSIONS = [...Object.keys(PERMISSIONS), ...Object.keys(MASTER_ONLY)] as Permission[];
export const GRANTABLE = Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[];

export function can(user: { role: string; permissions: string[] } | null | undefined, perm: Permission): boolean {
  if (!user) return false;
  if (user.role === "master") return true;
  if (perm in MASTER_ONLY) return false;
  return user.permissions.includes(perm);
}
