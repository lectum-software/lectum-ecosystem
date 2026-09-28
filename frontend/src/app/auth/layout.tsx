import type { ReactNode } from "react";
import { AuthEntryGuard } from "@/components/auth/auth-entry-guard";
import { NON_INDEXABLE_METADATA } from "@/lib/seo";

export const metadata = NON_INDEXABLE_METADATA;

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <AuthEntryGuard>{children}</AuthEntryGuard>;
}
