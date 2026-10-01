# ADR-0549 - Setas secundarias no padrao de Salvos

Data: 2026-10-01. Status: Aceito. TASK-205.

## Contexto

O usuario definiu a seta de Salvos como referencia visual para Favoritos e
Meus posts e respostas. A mudanca nao autoriza redesenhar os cabecalhos.

## Decisao

Reutilizar os tokens e dimensoes do Link de AppPageHeader nos dois controles:
bg-primary-soft, text-primary, hover:bg-primary-soft/80, circulo h-10/w-10 e
ArrowLeft h-5/w-5. Manter Link, href /app/perfil, labels e foco visivel.
Favoritos preserva a posicao absoluta. Meus posts ajusta apenas os slots
simetricos para acomodar o controle de 40px, sem alterar seu titulo dinamico.

Nao substituir os cabecalhos por AppPageHeader nem criar abstracao nova para
esta alteracao visual restrita. Teste de contrato compara os tres controles
com o padrao existente. Salvos e demais consumidores permanecem inalterados.

## Consequencias

Contraste segue os tokens de tema do produto. Sem API, dados, navegacao nova,
dependencias, env ou migration. Validar mobile/desktop e retorno ao Perfil.
Rollback de codigo sem impacto persistente. Deploy somente em homologacao.
