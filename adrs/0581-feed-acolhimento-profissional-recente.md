# ADR-0581: Feed com acolhimento profissional recente em vídeo

## Status

Accepted

## Task relacionada

TASK-23, refinamento de 2026-10-09; ordenação compartilhada com TASK-25.

## Contexto

O feed principal deve mostrar acolhimento profissional real e atual. Oportunidades nas
comunidades já atende à descoberta de perguntas ainda não respondidas por psicólogos.
Contagens históricas e recência exclusiva da publicação não representam atividade recente.

## Decisão

- Feed geral (inclusive busca, comunidade selecionada e seguindo): exigir resposta direta
  em vídeo de psicólogo verificado conforme entitlement vigente, com autor ativo, resposta
  não excluída e mídia válida. Vídeo próprio do post ou resposta a comentário não habilita.
- Stream exige asset ready, não excluído, do autor e contexto corretos. Legado R2 usa a
  referência pública validada existente; não consultar provider por post durante a leitura.
  Disponibilidade legada é lógica, sem prometer verificação remota de cada arquivo.
- Filtrar antes de ordenar/paginar/contar, inclusive estado vazio honesto; nunca preencher
  com posts inelegíveis. A prévia usa somente vídeos elegíveis.
- Mesma base de destaque nas duas telas: D(t) = 2^(-max(0, idadeEmDias)/14).
  P = 30 × soma D(data de cada resposta profissional direta) +
  10 × soma, por psicólogo distinto, do maior D de suas respostas.
  Respostas em texto e vídeo pontuam igualmente; edições não renovam createdAt.
- Complemento E = min(10, log2(1 + 3×upvotes + comentários + 2×shares)) × D(data do post).
  Score = max(0, P + E - (0,6×downvotes + penalidades) × D(data do post)).
  Complementos limitados não dominam participação profissional recente. Não há bônus
  adicional por Top Mentor: participação distinta importa mais que posição histórica.
- Feed mantém diversidade e compensação de tamanho de comunidades já existentes, mas
  retira o bônus adicional de publicação recente. Datas/IDs desempatarão deterministicamente.
- Destaque nas comunidades não exige vídeo e mantém posts não respondidos. Novos,
  Mais comentados, Mais úteis e Oportunidades preservam suas regras.
- Backend é autoridade: frontend não recalcula destaque nem embaralha o feed. A dica de
  resposta para psicólogos não move posts no feed nem no destaque da comunidade.

## Consequências

Meia-vida de 14 dias é parâmetro inicial explícito, não resultado de experimento. Dez
respostas com sete dias superam cinquenta com 365 dias. Uma resposta nova em post antigo
pontua por si, sem renovar as antigas. Feed poderá ser menor; não há exclusão de dados.
Leitura preserva a estratégia existente de ranking global em memória; escala futura pode
exigir agregados persistidos em task própria. Sem chamadas individuais a providers.

## Produção e rollout

Sem migration, env nova, package, backfill, seed ou job. Backend e frontend independentes,
contratos preservados; publicar backend antes do frontend preferencialmente. Frontend
antigo pode reordenar destaque até atualizar; frontend novo aceita ordem do backend antigo.
Publicação somente homolog, avisada previamente e respeitando o gate operacional registrado
em LOCAL-TO-PRODUCTION.md/ADR-0572: autodeploys intermediários desativados; não reativá-los.
Verificar /health, /ready, /ping e /version quando houver deploy autorizado,
feed público real e paginação. Não promover main nesta task. Rollback por reversão revisada
em homolog, sem tocar dados/buckets. Layout mobile-first existente preservado (~390px).
Builder/Quick Copy não está exposto neste cliente; referências locais do inventário são
Feed Comunidade.jpg e Dentro da Comunidade.jpg; nenhum redesenho é necessário.

## Validação

- 10 testes focais backend aprovados: meia-vida, histórico, texto, profissionais distintos,
  limites de engajamento, filtros preservados, vídeo legado/Stream, autor/contexto e paginação.
- 7 testes focais frontend aprovados, incluindo regressão da ordem e dica profissional.
- Leitura real somente SELECT: 10 posts persistidos, zero elegíveis; feed vazio, busca,
  seguindo anônimo e cinco ordenações por comunidade validados, sem seeds/mocks/escritas.
- Backend: Biome/TypeScript/testes e build aprovados na base sincronizada; Prisma validate
  aprovado. Frontend: check e build aprovados; versão 0.1.615.
- HTTP local do frontend buildado em 127.0.0.1:3334: /version 200, 0.1.615, no-store e
  noindex; /comunidades e /app/community/feed 200 com HTML. Não equivale a inspeção visual.
- pnpm version:bump executado uma vez, de 0.1.614 para 0.1.615 nos cinco manifests;
  pnpm check:version aprovado. Check geral final aprovado (exit 0): backend 886/886;
  video 87 aprovados e 11 skips por ferramentas locais indisponíveis. Sem código de video
  alterado. Builds backend/frontend e guards de encoding/ADRs/tasks também aprovados.
- A primeira execução ampla herdou NODE_ENV=dev da configuração local e afetou testes
  preexistentes que verificam ausência de ambiente; houve também timeout do teste de
  autenticação opcional durante builds simultâneos. Reexecução sem NODE_ENV herdado,
  somente com DATABASE_URL/JWT_SECRET_KEY locais carregados sem impressão de valores;
  suíte backend aprovada, sem alterar testes de segurança. Probe de autenticação isolado
  também aprovado. Nenhuma falha foi contornada removendo asserts ou usando mocks.

## Pendências

- Validação positiva integrada com vídeos reais: base de desenvolvimento não possui resposta
  profissional elegível nem asset Stream. Não criar conteúdo artificial para concluir.
- Browser local: Computer Use retorna inventário sem browsers; validação visual permanece
  pendente. Imagens locais do inventário inspecionadas; layout não foi redesenhado.
- Sincronização autorizada pelo usuário: fast-forward de 97 commits até 80bb86de; backups
  em .tmp/feed-sync-backup e dois stashes preservados. Ajustes de espaçamento preexistentes
  já constavam no upstream; mantidos junto dos refinamentos novos. Swagger e frontend/AGENTS.md
  locais restaurados separadamente e excluídos do commit da task. ADR renumerado para 0581.
