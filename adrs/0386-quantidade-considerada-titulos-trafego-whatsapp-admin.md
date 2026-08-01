# ADR-0386 - Quantidade considerada e carrossel dos donuts no Admin de psicologos

## Status

Accepted

## Contexto

A tabela **Origem do trafego para psicologos** passou a exibir medias de engajamento por categoria em Comunidades, Perfil e Video de apresentacao. Sem a base numerica, os administradores viam os valores medios, mas nao sabiam quantos conteudos, perfis ou videos sustentavam aquela media.

No mesmo ciclo, o bloco **Visibilidade, engajamento, favoritos e conversao dos psicologos** precisava deixar de repetir o texto fixo **psicologos considerados** nos cards de donut. A leitura operacional desejada e destacar o padrao da plataforma do item medido, e manter os cinco donuts navegaveis sem compressao nem espacamento excessivo.

## Decisao

1. Adicionar `considered_count` ao contrato `traffic_sources.sources[]`, em vez de tentar inferir a base no frontend.
2. Popular o campo no backend com o mesmo denominador das medias: conteudos para posts/respostas de comunidades, perfis para engajamento dentro do perfil e videos publicados para Explorar/Busca e filtros.
3. Renderizar a informacao como texto simples ao lado do titulo da categoria, sem fundo/borda de tag, com copy contextual (**conteudos considerados**, **perfis considerados** ou **videos considerados**).
4. Manter `null` para fontes sem medias de plataforma, como Favoritos e Ranking Top Mentores.
5. Nao criar tabela, migration, package novo, backfill ou endpoint paralelo.
6. Nos cards de donut, substituir o texto externo **psicologos considerados** por **Padrao da plataforma** e pelo valor padrao calculado para o item mensurado.
7. Reusar o modelo visual de setas laterais do carrossel **Atividade e engajamento** no perfil do psicologo, mantendo rolagem horizontal local e mobile-first.
8. Dimensionar os cards do carrossel por breakpoint com `calc(...)` para preencher melhor a linha visivel: 1 card no mobile, 2 em `sm`, 3 em `xl` e 4 em `2xl`, com gap menor.
9. Em 2026-08-01, refinar o contador do padrao nos donuts: remover o preenchimento de fundo do bloco, reduzir o peso textual do rotulo e encurtar a copy para **Padrao**.

## Consequencias

- A leitura das medias fica auditavel no proprio UI, sem misturar quantidade considerada com cliques de WhatsApp.
- O filtro por plano continua consistente, pois a base considerada e calculada junto ao recorte do segmento.
- O contrato de API ganha um campo opcional/nullable para uma metrica derivada, sem alterar persistencia.
- Fontes que ainda nao possuem medias permanecem sem texto de quantidade, evitando sinalizar denominador inexistente.
- Os donuts continuam usando os mesmos dados reais e benchmarks, mas agora comunicam o padrao do item medido de forma mais util que a contagem repetida de psicologos.
- As setas laterais reduzem a distancia entre acao e conteudo rolavel, mantendo consistencia com o padrao ja validado no perfil do psicologo.
- O contador de padrao fica visualmente mais leve e integrado ao card, sem alterar dados, benchmarks ou contratos.

## Task relacionada

- `_product/tasks/TASK-122-quantidade-considerada-titulos-trafego-whatsapp-admin.md`

## Validacoes

- `pnpm --dir backend exec biome check --write src/utils/admin-psychologist-analytics.ts src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts`
- `pnpm --dir admin exec biome check --write "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir backend exec tsc --noEmit --pretty false`
- `pnpm --dir admin exec tsc --noEmit --pretty false`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Smoke de API Admin real em `/api/admin/private/psychologists/dashboard?period=30d` validando `considered_count` nas fontes com medias.
- Browser local Chrome/CDP headless desktop 1440x900 e mobile 390x900 validando texto simples ao lado dos titulos.
- Browser local Chrome/CDP headless desktop 1366x900 e mobile 390x844 validando carrossel de donuts, setas laterais, bloco **Padrao da plataforma**, espacamento ajustado e ausencia de overflow horizontal.
- Ajuste complementar 2026-08-01:
  - `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`;
  - `pnpm --dir admin check`;
  - `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`;
  - `pnpm check`;
  - Browser local Chrome/CDP em `http://localhost:3002/psicologos?period=all`, desktop 1366px e mobile 390px, validando rotulo **Padrao**, ausencia de **Padrao da plataforma**, fundo transparente e peso `600`.

## Pendencias

- Nenhuma pendencia externa.
