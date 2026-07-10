import { PlaceholderPage } from "@/components/admin-shell/placeholder-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <PlaceholderPage
      description={`Rota reservada para o detalhe somente leitura do paciente ${id}. A implementação com dados reais será feita na TASK-61.`}
      task="TASK-61"
      title="Detalhe administrativo do paciente"
    />
  );
}
