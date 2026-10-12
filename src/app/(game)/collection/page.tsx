import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getCollection } from "@/lib/cards";
import CollectionClient from "@/components/CollectionClient";

export default async function Collection() {
  const user = await getUser();
  if (!user) redirect("/login");
  const { cards, ownedCount } = await getCollection(user.id, true);
  return <CollectionClient cards={cards} ownedCount={ownedCount} />;
}
