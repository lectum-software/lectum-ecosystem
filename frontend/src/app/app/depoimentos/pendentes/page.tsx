import type { Metadata } from "next";
import { PendingTestimonialsLogic } from "./logic";

export const metadata: Metadata = {
  title: "Depoimentos pendentes | Lectum",
  robots: { index: false, follow: false },
};

export default function PendingTestimonialsPage() {
  return <PendingTestimonialsLogic />;
}
