# ADR-0316: Filtros por plano nos blocos do dashboard Admin de psicologos

## Status

Accepted

## Contexto

O dashboard Admin de psicologos ja consolidava origem de trafego, comparativo de oferta e demanda, modo de cadastro, devices/sistemas e uso da plataforma. O produto pediu que esses blocos permitissem alternar a leitura entre **Todos**, **Gratuitos** e **Assinantes**.

A regra do projeto proibe mocks e backfill. As fontes reais disponiveis sao `professional_subscription`, `subscription_plan`, `page_view_event`, `visitor_session`, `important_action_event`, `user` e `psychologist_profile`.

## Decisao

- O endpoint existente `GET /api/admin/private/psychologists/dashboard` passa a devolver `plan_segments` com agregados prontos para `all`, `free` e `subscribers`, sem criar endpoint paralelo.
- **Gratuitos** usa psicologos cujo segmento ativo no fim do periodo e `professional_subscription.plan.slug="gratuito"` com status ativo.
- **Assinantes** usa somente assinatura profissional paga real Mercado Pago ativa no fim do periodo. Cortesias administrativas continuam fora desse filtro e aparecem em **Todos**, porque a opcao solicitada nao incluiu cortesia.
- **Origem do trafego** e filtrada pelo psicologo alvo do perfil publico (`page_view_event.target_id`).
- **Modo de cadastro**, **Devices e sistemas** e **Uso da plataforma** sao filtrados por `user_id` dos psicologos do segmento selecionado.
- No **Comparativo de oferta e demanda**, a demanda permanece a mesma busca real agregada do diretorio publico, enquanto a coluna **Psicologos** usa apenas a oferta do segmento selecionado; assim **Buscas/psicologo** e **Leitura** mudam como consequencia da nova oferta.
- A UI usa selects locais por bloco, mobile-first, sem package novo e sem alterar schema Prisma.

## Consequencias

- Cada bloco pode ser analisado independentemente por plano sem refazer a pagina inteira.
- A resposta do dashboard cresce, mas evita multiplas requisicoes simultaneas para os mesmos dados e mantem um contrato unico.
- A leitura de oferta/demanda fica explicita: o filtro de plano mede disponibilidade de profissionais por segmento, nao reclassifica a demanda historica dos pacientes.
- Nao houve migration, seed, backfill, dado fake, endpoint simulado ou dependencia nova.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke direto do service com `.env` local via `tsx -r dotenv/config`, confirmando `plan_segments` para `all`, `free` e `subscribers` e compatibilidade dos agregados de topo com `plan_segments.all`.
- Smoke HTTP/browser local em `http://localhost:3002/psicologos` retornando 200. A validacao visual autenticada ficou limitada pela ausencia de uma sessao Admin interativa persistida neste ambiente; a rota carregou localmente contra backend real.
- A primeira tentativa de `pnpm --dir admin build` foi bloqueada por lock de build/dev server Next concorrente; apos encerrar o processo stale, o build passou.

## Atualizacao 2026-07-25 - Cabecalho compacto dos filtros

Apos feedback visual no dashboard `/psicologos`, a UI deixou de exibir o rotulo **Plano** acima dos selects locais dos blocos filtraveis. O nome do controle permanece disponivel para tecnologias assistivas via `sr-only`, preservando acessibilidade sem aumentar a altura visual do cabecalho.

Nos blocos de conversao, modo de cadastro, devices/sistemas e uso da plataforma, a linha de periodo foi movida para dentro do grupo de titulo. Assim o periodo fica imediatamente abaixo do titulo do bloco e nao e deslocado pela altura do dropdown. A decisao e puramente visual e nao altera `plan_segments`, backend, schema, dados, tracking ou packages.

Validacao: `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e browser local/headless autenticado em `/psicologos` com 5 selects sem **Plano** visivel e periodo imediatamente abaixo dos titulos.
