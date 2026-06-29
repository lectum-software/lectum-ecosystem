import type { ReactNode } from "react";
import { NON_INDEXABLE_METADATA } from "@/lib/seo";

export const metadata = NON_INDEXABLE_METADATA;

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
