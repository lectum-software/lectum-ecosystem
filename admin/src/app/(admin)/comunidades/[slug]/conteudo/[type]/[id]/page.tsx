import { AdminCommunityContentDetailClient } from "./client";

export default async function AdminCommunityContentDetailPage({
  params,
}: {
  params: Promise<{ id: string; slug: string; type: string }>;
}) {
  const { id, slug, type } = await params;

  return <AdminCommunityContentDetailClient contentId={id} contentType={type} slug={slug} />;
}
