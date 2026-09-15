import { LoadingState } from "@/components/ui/loading-state";

export default function Loading() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6">
      <LoadingState label="Carregando página" />
    </main>
  );
}
