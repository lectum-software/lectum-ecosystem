import Image from "next/image";

export const LoadingSplash = ({
  message = "Carregando painel administrativo...",
}: {
  message?: string;
}) => {
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="flex flex-col items-center gap-4 rounded-card border border-border bg-surface p-8 text-center shadow-admin-soft">
        <Image alt="Lectum" height={48} priority src="/logo-icon.svg" width={48} />
        <p className="text-sm font-bold text-muted">{message}</p>
      </div>
    </main>
  );
};
