"use client";
import { usePathname } from "next/navigation";

// LOGOUT is only shown in the profile section: your own profile page (/u/<you>) and Edit Profil (/profile).
// Same form as before (a normal POST to /api/auth/logout); every other menu simply does not render it.
export default function LogoutButton({ me }: { me: string }) {
  const path = (usePathname() ?? "").toLowerCase();
  if (path !== "/profile" && path !== `/u/${me.toLowerCase()}`) return null;
  return <form action="/api/auth/logout" method="post"><button>LOGOUT</button></form>;
}
