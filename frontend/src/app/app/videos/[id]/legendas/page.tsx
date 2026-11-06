import { CaptionEditor } from "@/components/video-captions/editor";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CaptionEditor assetId={id} />;
}
