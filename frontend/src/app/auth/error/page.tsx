import { AlertTriangle } from "lucide-react";
import Link from "next/link";

import { CenterTemplate } from "@/templates/center";

type PageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = params.error || "Nao foi possivel concluir o login.";

  return (
    <CenterTemplate>
      <div className="w-full rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-red-100 text-red-700">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-xl font-semibold">Erro no login</h1>
        <p className="mt-2 text-sm text-zinc-500">{error}</p>
        <Link
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
          href="/auth/login"
        >
          Voltar para o login
        </Link>
      </div>
    </CenterTemplate>
  );
}
