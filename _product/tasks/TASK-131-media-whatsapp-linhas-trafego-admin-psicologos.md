# TASK-131 - Media de WhatsApp por linha no trafego Admin de psicologos

## Status

Completed

## Contexto

Na tabela **Origem do trafego para psicologos** em `/psicologos`, a coluna **WhatsApp** ja mostra o total de cliques de cada linha e a participacao percentual no total do bloco. O usuario pediu para adicionar, abaixo desse numero, uma leitura media por base da propria linha, facilitando comparar volume bruto com produtividade por conteudo, video ou psicologo.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicologos/Psicologos - Dashboard.png` como referencia local auditavel;
- screenshot enviado pelo usuario em 2026-08-01 mostrando a tabela em `http://localhost:3002/psicologos`.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, a ferramenta Builder/Quick Copy nao estava callable no ambiente; a implementacao usa imagem local e screenshot do usuario, registrando esta limitacao.

## Objetivo

Mostrar uma segunda linha compacta abaixo do total de **WhatsApp** com a media de cliques por base operacional:

- `por conteudo` nas origens de Comunidades baseadas em posts/respostas;
- `por video` no grupo e nas sublinhas de Video de apresentacao;
- `por psicologo` nas origens associadas ao profissional/perfil, como Perfil, Favoritos e Ranking Top Mentores.

## Dependencias

- TASK-53: dashboard Admin de psicologos.
- TASK-76: periodo global do Admin.
- TASK-114 a TASK-121: tabela de trafego WhatsApp, grupos expansivos e contagens consideradas reais.
- TASK-130: base sequencial atual do dashboard Admin.

Todas as dependencias acima estao concluidas.

## Escopo executado

- Alterar somente a composicao visual/calculo frontend do Admin em `admin/src/app/(admin)/psicologos/client.tsx`.
- Reusar `traffic_sources.sources[].considered_count` como denominador real quando existir.
- Derivar denominadores de grupos sem mudar contrato:
  - Comunidades soma os `considered_count` numericos dos filhos;
  - Video de apresentacao usa o maior `considered_count` entre Explorar e Busca/filtros para nao duplicar a mesma base de videos.
- Usar `trafficSegmentSummary.psychologists_count` como fallback para linhas cuja media e por psicologo e nao possuem `considered_count` especifico.
- Renderizar a media abaixo do total em desktop e mobile, preservando o total e o percentual existentes.

## Fora do escopo

- Alterar backend, Prisma schema ou migrations.
- Criar backfill historico, seed, mock ou endpoint simulado.
- Alterar os calculos de plataforma/engajamento ja existentes.
- Instalar package novo.
- Alterar a tela Admin global `/trafego` ou o detalhe individual do psicologo.

## Regras de calculo

- Media = `whatsapp_clicks / denominador`, arredondada para uma casa decimal com `toOneDecimal`.
- Se a linha nao tiver denominador positivo, a media secundaria nao e exibida.
- O total e o percentual da coluna WhatsApp permanecem inalterados.
- Comunidades usa `por conteudo` para o grupo e para posts/respostas; Ranking Top Mentores usa `por psicologo`.
- Video de apresentacao usa `por video` para grupo, Explorar e Busca/filtros.
- Perfil, Favoritos e demais linhas profissionais usam `por psicologo`.

## Criterios de aceite

- [x] A coluna **WhatsApp** continua exibindo total e percentual por linha.
- [x] Abaixo do total aparece uma media secundaria quando a linha possui denominador positivo.
- [x] Comunidades e suas linhas de posts/respostas exibem media `por conteudo`.
- [x] Video de apresentacao, Explorar e Busca/filtros exibem media `por video` sem duplicar o denominador do grupo.
- [x] Perfil, Favoritos e Ranking Top Mentores exibem media `por psicologo` quando houver base de psicologos.
- [x] A UI mobile-first permanece legivel em ~390px.
- [x] Nenhum `<img>` cru foi adicionado.
- [x] Nao foram usados mocks, seeds, dados fake permanentes, backfill ou endpoint simulado.
- [x] Builder/Quick Copy nao estava callable; imagem local e screenshot do usuario foram usados como referencia.
- [x] Nao houve alteracao de banco/schema/migrations; `db:migrate` nao se aplica.
- [x] Checks/builds relevantes foram executados.
- [x] Browser local validou desktop e mobile ~390px.
- [x] ADR criado em `adrs/0395-media-whatsapp-trafego-admin-psicologos.md`.
- [x] Commit proprio criado e push executado.

## Validacao executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local via Chrome/CDP em `http://localhost:3002/psicologos`, desktop e mobile 390px, validando as medias secundarias `por conteudo`, `por video` e `por psicologo` na tabela de trafego.

## Observacoes

- Nao houve alteracao em `backend/prisma/schema.prisma` nem em `backend/prisma/migrations`; `pnpm --dir backend db:migrate` nao se aplica.
- A media secundaria e uma leitura visual derivada do contrato existente; nao altera os totais nem a ordenacao das linhas.
