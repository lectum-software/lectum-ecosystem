import { AdminCommunityDetailClient } from "./client";

export default async function AdminCommunityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <AdminCommunityDetailClient slug={slug} />;
}
