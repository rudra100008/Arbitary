import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SelectPageClient from "./SelectPageClient";

interface StashedPage {
  id: string;
  name: string;
  igUserId: string | null;
  igUsername: string | null;
}

export default async function FacebookSelectPage() {
  const cookieStore = await cookies();
  const stashRaw = cookieStore.get("fb_pages_stash")?.value;

  if (!stashRaw) {
    redirect("/admin/dashboard/settings?error=stash_expired");
  }

  let pages: StashedPage[];
  try {
    pages = JSON.parse(stashRaw);
  } catch {
    redirect("/admin/dashboard/settings?error=stash_corrupted");
  }

  return <SelectPageClient pages={pages} />;
}
