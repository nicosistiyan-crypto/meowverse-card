import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { loadConvs } from "@/lib/notify";
import ChatClient from "@/components/ChatClient";

export const dynamic = "force-dynamic";

export default async function Chat({ searchParams }: { searchParams: { to?: string } }) {
  const user = await getUser();
  if (!user) redirect("/login");
  const convs = await loadConvs(user.id);
  const raw = (searchParams.to ?? "").trim().toLowerCase();
  const to = /^[a-z0-9_]{3,20}$/.test(raw) && raw !== user.username ? raw : "";
  return <ChatClient initialConvs={convs} initialOpen={to} />;
}
