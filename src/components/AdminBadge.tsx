// Lencana ADMIN kecil di samping username akun admin.
const ADMIN_NAMES = ["sistiyan"];
export const isAdminName = (name?: string | null) => !!name && ADMIN_NAMES.includes(name.toLowerCase());

export default function AdminBadge({ name }: { name?: string | null }) {
  if (!isAdminName(name)) return null;
  return <span className="adminbadge" title="Admin" aria-label="Admin">★ ADMIN</span>;
}
