import { redirect } from "next/navigation";
import { resolveAuthReturnTo } from "@/utils/auth-redirect";

type PageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
    redirectTo?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;

  redirect(resolveAuthReturnTo(params.redirectTo, params.callbackUrl) ?? "/psicologos");
}
