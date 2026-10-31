import type { Metadata } from "next";
import { PendingTestimonialsLogic } from "./logic";

export const metadata: Metadata = {
  title: "Depoimentos pendentes | Lectum",
  robots: { index: false, follow: false },
};

export default async function PendingTestimonialsPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  const { batch } = await searchParams;
  return <PendingTestimonialsLogic batch={typeof batch === "string" ? batch : undefined} />;
}
