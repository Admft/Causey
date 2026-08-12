import { redirect } from "next/navigation";

export default async function NewTournamentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ draft?: string; host?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const next = new URLSearchParams();
  if (query.draft) next.set("draft", query.draft);
  if (query.host) next.set("host", query.host);
  redirect(
    `/orgs/${slug}/competitions/new${next.size ? `?${next.toString()}` : ""}`
  );
}
