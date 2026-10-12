import type { ReactNode } from "react";

// Membungkus avatar dan menambahkan bulatan hijau di pojok kanan bawah jika pemainnya sedang online.
export default function OnlineAvatar({ online, children }: { online: boolean; children: ReactNode }) {
  return (
    <span className="onw">
      {children}
      {online && <i className="onl" role="img" aria-label="Online" title="Online" />}
    </span>
  );
}
