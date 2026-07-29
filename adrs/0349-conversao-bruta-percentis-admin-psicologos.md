# ADR-0349 - Conversao bruta por percentis no Admin de psicologos

## Status

Aceita

## Contexto

A classificacao anterior de Conversao usava taxa de cliques WhatsApp por exposicao. O produto decidiu que, na V1, a exposicao pode ficar subjetiva em comunidades e que a leitura executiva deve ser mais direta: comparar psicologos pelo volume bruto de cliques WhatsApp no periodo selecionado.

Tambem foi definida a categoria **Sem Conversao** para psicologos fora do periodo de adaptacao que tiveram zero clique WhatsApp.

## Decisao

- A categoria de Conversao passa a ser calculada somente por `contact_request.channel=whatsapp` e `user.createdAt`.
- Psicologos com menos de 30 dias desde `user.createdAt` ate o fim do periodo selecionado entram em **Dados Insuficientes**.
- Entre os psicologos fora da adaptacao, o benchmark da plataforma usa somente quem teve ao menos 1 clique WhatsApp no periodo para calcular P25, mediana/P50 e P75.
- A faixa **Conversao Padrao** e P25-P75 do periodo selecionado.
- Psicologos fora da adaptacao sao classificados assim:
  - `whatsapp_clicks = 0`: **Sem Conversao**;
  - `whatsapp_clicks < P25`: **Baixa Conversao**;
  - `P25 <= whatsapp_clicks <= P75`: **Conversao Padrao**;
  - `whatsapp_clicks > P75`: **Alta Conversao**.
- Se nao houver base nao-zero para percentis, psicologos fora da adaptacao e com clique entram em **Conversao Padrao** ate haver distribuicao suficiente.
- A UI do bloco **Conversao** deve exibir a faixa padrao do periodo e tooltips explicando as cinco categorias.
- Atualizacao 2026-07-29: no dashboard Admin de psicologos, o card branco da faixa **Conversao padrao do periodo** fica alinhado pelo topo ao titulo **Conversao** em telas maiores e usa a microcopy executiva **Cliques no WhatsApp**, sem expor P25/P75 na interface principal.
- Atualizacao 2026-07-29: as tooltips das categorias de Conversao abrem para cima, com camada alta e sem `title` nativo do navegador, para nao ficarem encobertas pelo bloco **Conversao x Engajamento**.
- Atualizacao 2026-07-29: o CardShell do bloco **Conversao e engajamento dos psicologos** tambem cria uma camada propria (`relative z-20`) e libera `overflow-visible`, garantindo que a tooltip inline fique acima do card seguinte sem trocar a arquitetura do componente.

## Consequencias

- A regra fica simples, transparente e menos dependente de modelagem subjetiva de exposicao.
- O resultado passa a ser comparativo ao comportamento real da plataforma no periodo, em vez de depender de cortes fixos absolutos de taxa.
- A comparacao pode variar quando a plataforma crescer; isso e desejado para uma metrica operacional relativa.
- A decisao nao cria ranking publico nem efeito punitivo para profissionais.
- A decisao nao altera schema Prisma, migrations, packages ou backfills.
- A interface continua mostrando a faixa padrao, mas reduz linguagem tecnica na leitura principal; detalhes metodologicos permanecem registrados nesta ADR e na task.
- O ajuste de tooltip preserva a implementacao inline existente e evita adicionar dependencia nova apenas para esse comportamento.
- A camada explicita no card pai evita que o `backdrop-blur`/stacking context dos cards administrativos oculte tooltips sem introduzir portal, popover global ou dependencia externa.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Smoke backend de `buildPsychologistsDashboard({ period: "all" })` confirmou categorias, benchmark e totais reais.
- HTTP local de `/psicologos`, `/psicologos/lista?profile_conversion=no_conversion` e `/psicologos/lista?profile_conversion=standard_conversion` retornou 200.
