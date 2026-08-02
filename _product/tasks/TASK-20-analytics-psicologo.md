# TASK-20: Analytics do psicólogo

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-20 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Psicólogo privado |
| Status | Completed |
| Dependências | TASK-16, TASK-17, TASK-18A, TASK-19, TASK-31 |
| ADR alvo | ADR-0033 |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Meus Analytics - Psicólogo.jpg` | `figma-design-frame-18-Meus-Analytics---Psic-logo.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Analytics não pode ser decorativo. Cada número precisa vir de evento ou tabela persistida. Analytics é recurso **exclusivo do Plano Profissional** (PRD §13): gatear o acesso por `professional_subscription` ativa.

## Objetivo

Exibir analytics reais de perfil, contatos, posts e avaliações do psicólogo.

## Pré-requisitos e bloqueios

- Métricas sem evento persistido devem ficar ausentes/zeradas com explicação, não simuladas.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/app/professional/analytics`

Implementação esperada:

- Criar tela de métricas com cards e períodos.
- Usar dados reais e mostrar vazio quando não houver eventos.
- Não inventar crescimento percentual.
- Adicionar filtros de período.
- Reutilizar componentes de cards e charts simples sem pacote novo se possível.

## Escopo backend

Implementação esperada:

- Criar endpoint agregado de analytics do psicólogo, gateado por Plano Profissional (`professional_subscription` ativa).
- Cada card lê **exatamente** o modelo/consulta mapeado abaixo (ver `DATA-MODEL.md`). Não derivar número de fonte fora desta tabela.
- Se visualização de perfil ainda não for rastreada (`profile_view_event` não criado), **omitir a métrica honestamente** (ausente/zerada com explicação) — nunca simular.
- Garantir escopo do usuário autenticado (`psychologist_id` = usuário logado).

### Mapeamento métrica → fonte (card → modelo/consulta)

| Card / métrica | Modelo (ver `DATA-MODEL.md`) | Consulta |
|---|---|---|
| Cliques em WhatsApp | `contact_request` | `count` por `psychologist_id` + janela `createdAt` (filtro de período) |
| Avaliações recebidas / média | `professional_review` (+ `psychologist_profile.rating_avg`/`rating_count`) | `count` por `psychologist_id, status="publicada"`; média já materializada em `psychologist_profile` |
| Posts publicados / engajamento | `community_post` | `count` por `author_id` (= usuário logado); somar `upvotes_count`/`replies_count` denormalizados |
| Visualizações de perfil | `profile_view_event` (opcional) | `count` por `psychologist_id` + período; **se o modelo não existir, omitir o card** (sem fabricar) |

- Variações percentuais (crescimento) só aparecem se houver dois períodos reais comparáveis nas fontes acima; caso contrário, **não exibir %**.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `contact_request`
- `professional_review`
- `community_post`
- `profile_view_event` (opcional)
- `professional_subscription` (gate de Plano Profissional)

Endpoints esperados (autogestão do psicólogo, sob `/api/private/psychologist/*`):

- GET `/api/private/psychologist/analytics`

**Guarda de papel:** este endpoint é exclusivo de psicólogo. Vive sob `/api/private/psychologist/*` e é protegido por `requireRole("psicologo")` (criado na TASK-12), aplicado no mount em `write.ts`, **fail-closed** (papel divergente → `403`, sem `next()`). O escopo de ownership é feito por `req.auth.id`. Ver `DATA-MODEL.md` "Camadas de autenticação e autorização" e `adrs/0002-arquitetura-auth-roles.md`.

## Contrato técnico detalhado

Arquitetura frontend obrigatória:

- Telas em `frontend/src/app/{rota}/page.tsx`, `logic.tsx` e `use-form.tsx` quando houver formulário.
- Chamadas HTTP em `frontend/src/api/req/{dominio}/index.ts` usando `callEndpoint` e `handleReq`.
- Hooks React Query em `frontend/src/api/callers/{dominio}/index.tsx`.
- Query keys em `frontend/src/api/cache/keys.ts`.
- Shells/templates em `frontend/src/templates`.
- Componentes existentes em `frontend/src/registry/new-york-v4/ui` e `frontend/src/components/ui` devem ser reutilizados antes de criar novos.
- Quando houver formulário ou campo, usar `frontend/src/hooks/form`, `frontend/src/components/controllers`, React Hook Form e Zod conforme `TASK-02`.

Arquitetura backend obrigatória:

- Novas APIs em `backend/src/modules/api/{public|private}/{dominio}/{caso}`.
- Rotas registradas em `backend/src/main/server/imports/write.ts`.
- Validadores em `validator/index.ts` usando os helpers/pacote local de validação.
- Services e repositories separados quando houver regra de domínio ou persistência.
- Respostas usando `send`, `error500`, `error` e traduções em `backend/locales/pt/translation.json`.
- Prisma com nomes e padrões já definidos em `ARCHITECTURE.md`.

Packages permitidos nesta task:

- TanStack Query
- date-fns
- Prisma

Regras anti-recriação específicas:

- Procurar componente, helper, model, endpoint e query key equivalente antes de criar estrutura nova.
- Não criar client HTTP paralelo, store paralela, autenticação paralela, validator paralelo ou design system paralelo.
- Não usar `sample/` como referência direta de implementação futura.
- Não instalar package novo sem consultar `PACKAGES.md` e registrar ADR.

## Estados obrigatórios

- Loading inicial.
- Erro de rede/API em PT-BR.
- Estado vazio quando não houver dado real.
- Sucesso com feedback visual discreto.
- Responsividade mobile-first baseada nas imagens exportadas.

## Fora do escopo

- Criar dados fake, seed artificial ou mock para preencher tela.
- Concluir integração externa ausente.
- Refatorar módulos não relacionados à task.
- Trocar package manager ou stack base.

## Critérios de aceite

- [x] As referências visuais desta task foram consultadas via Builder Quick Copy ou imagens locais citadas acima.
- [x] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [x] Backend implementado nos endpoints/modelos esperados quando aplicável.
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [x] Rotas sob `/api/private/psychologist/*` exigem `requireRole("psicologo")` (fail-closed), conforme ADR-0002.
- [x] Todos os estados obrigatórios existem e usam textos em PT-BR.
- [x] Formulários e campos usam a fundação da `TASK-02` quando aplicável.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] Nenhum código gerado por Builder foi aceito sem revisão e adequação à arquitetura.
- [x] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.

## Execução 2026-06-09

- Builder/Quick Copy não estava disponível como ferramenta neste ambiente; a referência visual `_product/proto/Meus Analytics - Psicólogo.jpg` foi consultada localmente.
- Implementado `GET /api/private/psychologist/analytics` com mount `requireRole("psicologo")` fail-closed e gate por assinatura/cortesia profissional ativa em `professional_subscription`.
- As métricas exibidas vêm somente de fontes persistidas: `contact_request`, `professional_review`, `psychologist_profile` e `community_post`.
- `profile_view_event` não existe no schema atual; visualizações de perfil foram omitidas/explicadas na UI para evitar simulação.
- Não houve alteração em `backend/prisma/schema.prisma` ou migrations; `db:migrate` não se aplica a esta execução.
- A rota `/app/professional/analytics` foi criada com filtros de período, loading, erro, vazio, sucesso discreto, CTA de assinatura quando o plano profissional não existe e aviso de métricas indisponíveis sem fonte persistida.
- Não houve formulário nesta task; a fundação TASK-02 não foi necessária.
- Validações executadas:
  - `pnpm --dir backend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - Browser local via Chrome headless em `http://localhost:3000/app/professional/analytics`; sem sessão autenticada, a rota carregou e redirecionou corretamente para login.

## Ajuste visual complementar em 2026-06-09

- Tela `/app/professional/analytics` realinhada à referência `Meus Analytics - Psicólogo.jpg`: header mobile, tabs de período, grid 2x3, card de link, bloco de busca por especialidades e dica Pro.
- Métricas sem fonte persistida (`resultados de busca`, `abertura de perfil`, `video views`, `favoritado` e percentuais de especialidade) permanecem sem número real e são exibidas com `—`/mensagem discreta, sem simulação.
- Conversões WhatsApp e avaliações seguem usando os dados persistidos retornados pelo endpoint da TASK-20.
- Validações do ajuste: `pnpm --dir frontend check`, `pnpm check`, `pnpm --dir frontend exec next build --turbo`, `pnpm --dir frontend build` e browser local em `/app/professional/analytics` (sem sessão autenticada, validando resposta da rota e gate de login).
- ADR complementar: ADR-0034.

## Ajuste de demonstração premium em 2026-06-18

- Decisão de produto: psicólogos no Plano Gratuito não devem mais encontrar bloqueio/erro ao abrir `/app/professional/analytics`; a tela passa a demonstrar valor mantendo a estrutura visual disponível.
- `GET /api/private/psychologist/analytics` agora retorna `200` para psicólogos autenticados sem Plano Profissional/cortesia, preservando dados reais agregados e adicionando `access.has_professional_entitlement=false` e `access.mode="preview"`.
- Frontend ajustado para exibir banner premium `Desbloqueie seus Analytics`, CTA `Fazer upgrade` para `/app/professional/billing/subscription`, abas de período, cards e demais seções já existentes, com valores/dados sensíveis desfocados e labels legíveis.
- Erros técnicos reais continuam usando estado de erro em PT-BR; a mensagem antiga de bloqueio por plano deixou de ser exibida no fluxo normal do Plano Gratuito.
- O layout recebeu ajuste mobile-first (`grid-cols-[minmax(0,1fr)]` nos wrappers principais) para evitar trilhas implícitas maiores que a viewport e cortes laterais em 390px.
- Builder/Quick Copy não esteve acessível como ferramenta direta neste ambiente; validação visual usou `_product/proto/Meus Analytics - Psicólogo.jpg`, tela de assinatura e browser local/headless.
- Nenhum schema Prisma, migration, package novo, mock, seed ou métrica simulada foi criado. Métricas sem evento persistido continuam ausentes/zeradas com tratamento honesto.
- ADR complementar: ADR-0118.
- Validações executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, API real com psicólogo temporário gratuito e browser local/headless 390x844 em `/app/professional/analytics`.

## Refinamento visual premium em 2026-06-18

- As telas `/app/professional/analytics` e `/app/professional/reviews` foram refinadas para compartilhar a linguagem visual da tela `/app/professional/billing/subscription`.
- Analytics recebeu header em card, tabs em pílulas, banner premium azul-claro, métricas em cards de uma coluna no mobile e duas colunas em desktop, valores desfocados com tratamento intencional de prévia premium e card de link de avaliações no mesmo padrão visual.
- Minhas Avaliações recebeu header consistente e estado premium central com ícone, selo, benefícios em cards e CTA `Fazer upgrade` para `/app/professional/billing/subscription`.
- Responsividade revisada em 390x844 e 1024x768: sem overflow horizontal real (`scrollWidth` igual à largura da viewport), tabs cabendo no mobile, métricas em uma coluna no mobile e duas colunas no desktop.
- Nenhum mock, dado fake, schema, migration ou package novo foi criado.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, API real com psicólogo temporário gratuito e browser local/headless em `/app/professional/analytics` e `/app/professional/reviews`.

## Extensão de analytics do vídeo de apresentação em 2026-06-18

- Adicionado tracking real do vídeo de apresentação público por sessão (`profile_video_watch_session`), consolidando heartbeats por `session_key` sem criar visualizações duplicadas.
- O player público do perfil profissional envia métricas reais de reprodução: visualização, tempo único assistido, maior posição, conclusão, replays e marcos 25/50/75/100%.
- O endpoint `GET /api/private/psychologist/analytics` passou a agregar `presentation_video` com data de atualização, métricas principais e retenção por marcos; valores continuam desfocados no modo prévia para Plano Gratuito.
- A tela `/app/professional/analytics` recebeu seção exclusiva do vídeo antes do card `Link da minha página de avaliações`, com cards de métricas e bloco de retenção alinhando reprodução do vídeo e gráfico por marcos.
- A referência visual adicional usada foi a imagem fornecida pelo usuário `c:/Users/tulio/Downloads/WhatsApp Image 2026-06-18 at 15.04.58.jpeg`, inspirada em analytics de retenção de vídeo; não houve uso de mock ou dados simulados.

- Migration aplicada com `pnpm --dir backend exec prisma migrate dev --name add_profile_video_watch_sessions` após tentativa inicial de `pnpm --dir backend db:migrate` ficar presa aguardando lock/prompt e ser encerrada sem criar migration.
- Validações executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, `Invoke-WebRequest` em `/app/professional/analytics` e POST de validação 404 em `/api/private/directory/psychologists/non-existent/video-watch`.

## Refinamento de retenção sincronizada em 2026-06-18

- A retenção do vídeo passou a persistir buckets internos de 5% em `profile_video_watch_session.retention_buckets`, calculados pelo backend a partir da maior posição alcançada e duração real do player.
- O endpoint `GET /api/private/psychologist/analytics` agora agrega uma curva de 5% em 5%, mantém os cards de 25/50/75/100% como resumo e identifica o maior trecho estimado de abandono com tempo inicial/final.
- O gráfico de retenção na tela `/app/professional/analytics` ficou sincronizado com o player: ao reproduzir o vídeo, a linha do playhead avança; ao clicar na curva, nos marcos ou no destaque de maior abandono, o player busca o trecho correspondente.
- A estratégia evita eventos por segundo e mantém no máximo 20 buckets por sessão, preservando performance e armazenamento previsível sem mockar dados.
- Migration aplicada com `pnpm --dir backend db:migrate -- --name add_profile_video_retention_buckets`.

## Execucao complementar: isolamento de versoes do video no analytics (2026-06-18)

- Para apoiar testes de diferentes videos de apresentacao, as sessoes de analytics passaram a usar `session_key` por perfil e versao do video, derivada da URL atual do video.
- A agregacao da secao `presentation_video` em `GET /api/private/psychologist/analytics` agora considera apenas sessoes cujo `video_url` corresponde ao video atual do perfil.
- Sessoes de videos anteriores permanecem preservadas para historico interno e janela de aprendizado do ranking, mas nao contaminam as metricas exibidas do video atual.
- Nao houve schema, migration, package novo, mock, seed ou evento simulado.
- ADR criado: `adrs/0125-ranking-psicologos-video-learning.md`.

## Execucao complementar: origem do trafego em Analytics (2026-06-18)

- Pedido do usuario: remover a secao `Busca por especialidades` e inserir `Origem do trafego` imediatamente antes de `Link da minha pagina de avaliacoes`.
- A ordem da tela `/app/professional/analytics` ficou: indicadores principais, video de apresentacao, origem do trafego e link da pagina de avaliacoes.
- O backend passou a expor `traffic_sources` no contrato de `GET /api/private/psychologist/analytics`, com as origens Explorar, Busca e filtros, Comunidades, Link direto e Favoritos.
- Como ainda nao existe fonte persistida de visualizacao de perfil com origem nem origem em `contact_request`, os valores por origem permanecem zerados de forma honesta, sem numeros ficticios ou distribuicao simulada.
- A UI foi preparada para dados reais futuros: desktop com layout tabular premium ordenado por visualizacoes e mobile em lista com barras de progresso e acordeao por origem.
- Nenhum schema Prisma, migration, package novo, seed, dado fake ou endpoint simulado foi criado.
- ADR complementar: `adrs/0126-analytics-origem-trafego-zerada.md`.

## Refinamento contextual da dica de video em Analytics (2026-06-18)

- Pedido do usuario: remover a dica isolada do final da pagina e integrar a recomendacao ao contexto da secao `Video de apresentacao`.
- A dica passou a aparecer dentro do card principal de video, logo apos o bloco de retencao, com icone de lampada, fundo azul suave e altura compacta.
- Texto atualizado: `Videos de apresentacao com alto engajamento geram mais conversoes para o WhatsApp. Faca testes e descubra o que funciona melhor para voce.`
- A ordem da tela permanece: indicadores principais, video de apresentacao, origem do trafego e link da pagina de avaliacoes.
- Nenhum schema Prisma, migration, package novo, mock, seed ou evento simulado foi criado.

## Refinamento do player de video em Analytics (2026-06-18)

- Pedido do usuario: remover o menu nativo de tres pontinhos do video exibido na secao `Video de apresentacao` em `/app/professional/analytics`.
- `VerticalVideoPlayer` recebeu a variante opt-in `controlsVariant="minimal"`, com controles proprios apenas para play/pause e barra de progresso.
- A tela de Analytics passou a usar essa variante somente na previa analitica do video, mantendo os players publicos/posts com comportamento nativo existente.
- A variante minimal desativa controles nativos, aplica `controlsList` com restricoes, bloqueia Picture-in-Picture/remote playback e impede o menu de contexto do navegador para evitar velocidade, PiP, tela cheia e opcoes avancadas.
- Nenhum schema Prisma, migration, package novo, mock, seed ou evento simulado foi criado.
- ADR complementar: `adrs/0128-analytics-video-player-controles-essenciais.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e rota local `/app/professional/analytics` via `Invoke-WebRequest` sem sessao autenticada retornando `307` para o fluxo privado.

## Ajuste de copy em Origem do trafego (2026-06-18)

- Pedido do usuario: ajustar as descricoes das origens `Busca e filtros` e `Favoritos` na secao `Origem do trafego`.
- Textos atualizados no contrato real do backend e no fallback visual do frontend, sem alterar metricas, schema, migration, package ou regra de agregacao.
- ADR novo nao foi necessario por se tratar apenas de copy de produto sem decisao arquitetural.
- Validacoes executadas: `pnpm --dir backend check`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e rota local `/app/professional/analytics` via `Invoke-WebRequest` sem sessao autenticada retornando `307` para o fluxo privado.

## Refinamento do filtro de periodo personalizado em Analytics (2026-06-19)

- Pedido do usuario: ao clicar em `Periodo`, os campos `Inicio` e `Fim` nao devem mais criar uma secao fixa abaixo das tabs.
- O filtro personalizado agora abre como popover/balao contextual ancorado ao controle de periodo, com fundo branco, borda suave, sombra discreta, cantos arredondados e CTA `Aplicar periodo`.
- O popover fecha ao clicar fora, mantem o botao `Periodo` ativo enquanto esta aberto e nao empurra os cards de metricas para baixo.
- Mobile-first: no mobile o popover ocupa quase toda a largura util; no desktop mantem largura compacta.
- Nenhum schema, migration, package novo, mock, seed ou endpoint simulado foi criado.
- Builder/Quick Copy nao estava disponivel como ferramenta direta; a referencia visual consultada foi `_product/proto/Meus Analytics - Psicologo.jpg`.
- ADR criado: `adrs/0131-analytics-periodo-personalizado-popover.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e rota local `/app/professional/analytics` via `Invoke-WebRequest` sem sessao autenticada retornando `307` para o fluxo privado.

## Refinamento do player analitico sem progresso sobreposto (2026-06-19)

- Pedido do usuario: remover a barra de progresso azul sobreposta ao video na secao `Video de apresentacao` de `/app/professional/analytics`.
- A variante minimal do `VerticalVideoPlayer` agora exibe somente o botao play/pause sobre a imagem do video.
- O grafico de retencao permanece como referencia visual de progresso/analise abaixo do video; nao ha mais controle de seek sobreposto ao video.
- Players nativos usados em posts, perfil publico e demais telas permanecem inalterados; a mudanca segue restrita ao `controlsVariant="minimal"` dos Analytics.
- Nenhum schema Prisma, migration, package novo, mock, seed ou endpoint simulado foi criado.
- Builder/Quick Copy nao estava disponivel como ferramenta direta; a validacao visual usou a captura enviada pelo usuario e a referencia local `_product/proto/Meus Analytics - Psicologo.jpg`.
- ADR criado: `adrs/0132-analytics-video-player-sem-progresso-overlay.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e rota local `/app/professional/analytics` via `Invoke-WebRequest` sem sessao autenticada retornando `307` para o fluxo privado.

## Ajuste complementar em 2026-06-22 - remocao do link de avaliacoes dos Analytics

- Pedido de produto: a secao `Link da minha pagina de avaliacoes` pertence ao contexto de reputacao/depoimentos e foi movida para `/app/professional/reviews`.
- `/app/professional/analytics` nao renderiza mais o card de link/copia de avaliacoes; a tela permanece focada em indicadores, video de apresentacao e origem do trafego.
- Nenhum contrato de analytics, endpoint, schema, migration, package, mock, seed ou dado simulado foi alterado.
- ADR relacionado atualizado: `adrs/0025-bloqueio-task19-dependencia-task18.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build` e Chrome/CDP autenticado confirmando ausencia da secao em `/app/professional/analytics`.


## Ajuste complementar em 2026-06-29 - copy e curva do video nos Analytics

- Pedido do usuario: ajustar a secao de video em `/app/professional/analytics` para reduzir redundancia visual e simplificar a leitura mobile.
- Copy do card de video atualizada para `Acompanhe como os visitantes assistem seu video de apresentacao.`
- A faixa azul `Atualizado em` foi removida da UI; o contrato `presentation_video.updated_at` permanece disponivel no backend para auditoria/futuros usos, sem alterar schema ou API.
- O grafico de retencao deixou de desenhar a leitura em patamares/degraus e passou a usar uma curva SVG continua estimada, partindo de 100% e encerrando visualmente em 0%, preservando os buckets reais para metricas e identificacao do trecho de maior abandono.
- O destaque de maior abandono passou a exibir somente o intervalo: `Entre X e Y% do video (mm:ss - mm:ss).`, sem `Ver trecho` e sem percentual de queda em p.p. na UI.
- Nenhum schema Prisma, migration, package novo, mock, seed ou endpoint simulado foi criado.
- Builder/Quick Copy nao estava exposto como ferramenta MCP direta; a validacao visual usou as capturas enviadas pelo usuario e a referencia local `_product/proto/Meus Analytics - Psicologo.jpg`.
- ADR atualizado: `adrs/0124-retencao-video-buckets-sincronizados.md`.
- Validacoes executadas: `pnpm --dir frontend exec biome check src/app/app/professional/analytics/logic.tsx`, `pnpm --dir frontend check`, `pnpm --dir frontend build` e `Invoke-WebRequest` em `/app/professional/analytics` (307 para login sem sessao).


## Ajuste complementar em 2026-06-29 - leitura orientada dos Analytics de video

- Pedido do usuario: simplificar a leitura para psicologos leigos em marketing, evitando termos como `CTA` e mantendo textos compreensiveis nos blocos comerciais.
- Os contadores principais de negocio foram reorganizados para remover o vazio ao lado de `Favoritado`: `Conversoes WhatsApp` passou para um card largo de duas colunas ao final do bloco, com texto explicativo de contato.
- Nos contadores do video, a UI passou a destacar apenas `Visualizacoes` e `Taxa de replays`; `Tempo medio assistido`, `Taxa de conclusao` e `Taxa de abandono` continuam disponiveis no contrato, mas deixaram de ser contadores frios na tela.
- O `Tempo medio assistido` foi agrupado ao percentual de retencao na frase do card: `Em media, os visitantes assistiram X% do video, cerca de mm:ss.`
- A dica isolada `Insight` foi removida; a orientacao agora fica dentro do card de retencao, com diagnostico simples (ex.: `Primeiros sinais bons`, `Bom desempenho`, `Ponto de atencao`) e sugestao em linguagem natural.
- Nenhum schema Prisma, migration, package novo, mock, seed ou endpoint simulado foi criado.
- Builder/Quick Copy nao estava exposto como ferramenta MCP direta; a validacao visual usou as capturas enviadas pelo usuario e a referencia local `_product/proto/Meus Analytics - Psicologo.jpg`.
- ADR criado: `adrs/0175-analytics-video-retencao-orientada.md`.
- Validacoes executadas: `pnpm --dir frontend exec biome check src/app/app/professional/analytics/logic.tsx`, `pnpm --dir frontend check`, `pnpm --dir frontend build` e `Invoke-WebRequest` em `/app/professional/analytics` (307 para login sem sessao).


## Ajuste complementar em 2026-06-29 - retencao focada em permanencia

- Pedido do usuario: a area de retencao do video deve orientar permanencia no video, nao conversao para WhatsApp.
- As recomendacoes do diagnostico de retencao foram ajustadas para remover mencoes a WhatsApp, conversao ou convite; os textos agora sugerem melhorar abertura, objetividade, ritmo, pausas, exemplos e duracao.
- As metricas e secoes comerciais permanecem responsaveis por WhatsApp/conversao; a secao `Retencao do video` fica focada em quanto tempo os visitantes assistem e onde abandonam.
- Nenhum schema Prisma, migration, package novo, mock, seed ou endpoint simulado foi criado.
- Builder/Quick Copy nao estava exposto como ferramenta MCP direta; a referencia local `_product/proto/Meus Analytics - Psicologo.jpg` foi consultada.
- ADR atualizado: `adrs/0175-analytics-video-retencao-orientada.md`.
- Validacoes executadas: `pnpm --dir frontend exec biome check src/app/app/professional/analytics/logic.tsx`, `pnpm --dir frontend check`, `pnpm --dir frontend build` e `Invoke-WebRequest` em `/app/professional/analytics` (307 para login sem sessao).


## Ajuste complementar em 2026-06-29 - layout do card de Conversoes WhatsApp

- Pedido do usuario: melhorar a disposicao do contador largo `Conversoes WhatsApp`, deixando os textos abaixo do icone e o numero mais bem posicionado.
- O card largo passou a usar uma linha superior com icone a esquerda e valor destacado a direita; label e descricao ficam abaixo, alinhados ao fluxo vertical do card mobile.
- A mudanca preserva os dados reais existentes, o grid de duas colunas e o destaque comercial de WhatsApp, sem alterar contrato, schema, migration, package, mock, seed ou endpoint.
- Builder/Quick Copy nao estava exposto como ferramenta MCP direta; a referencia local `_product/proto/Meus Analytics - Psicologo.jpg` e a captura enviada pelo usuario foram usadas como apoio visual.
- ADR atualizado: `adrs/0175-analytics-video-retencao-orientada.md`.
- Validacoes executadas: `pnpm --dir frontend exec biome check src/app/app/professional/analytics/logic.tsx`, `pnpm --dir frontend build`, `pnpm --dir frontend check` e `Invoke-WebRequest` em `/app/professional/analytics` (307 para login sem sessao).

## Ajuste complementar em 2026-07-01 - autoacoes fora dos Analytics

- Pedido direto de produto: quando o proprio psicologo visualizar o proprio perfil, assistir ao proprio video ou clicar no proprio WhatsApp, esses eventos nao devem aparecer em notificacoes nem compor Analytics.
- `profile_view_event` e `profile_video_watch_session` ja bloqueavam persistencia de autoacao autenticada; o agregado de Analytics agora tambem exclui registros legados em que `viewer_id = psychologist_id`.
- `contact_request` deixou de ser persistido quando `user_id = psychologist_id`; o endpoint ainda retorna `whatsapp_url` real para teste operacional do link, mas com `contact_request_id=null` e `tracked=false`.
- O card `Conversoes WhatsApp` agora conta apenas `contact_request` anonimo ou de usuario diferente do psicologo alvo, evitando inflar conversoes com teste do proprio profissional.
- Nao houve alteracao de schema Prisma, migration, UI, package novo, mock, seed ou endpoint simulado.
- ADR criado: `adrs/0194-autoacoes-profissional-fora-de-analytics-notificacoes.md`.

### Critérios de aceite do complemento

- [x] Cliques do proprio psicologo no proprio WhatsApp nao persistem `contact_request` e nao entram em `Conversoes WhatsApp`.
- [x] Visualizacoes do proprio perfil e sessoes do proprio video autenticadas nao entram nas metricas agregadas de Analytics.
- [x] Visitantes anonimos e outros usuarios continuam contabilizados como fonte real.
- [x] Nenhum schema, migration, mock, seed artificial ou package novo foi criado.
- [x] ADR e documentacao de dados foram atualizados.
- [x] Validacoes de backend, frontend e check raiz foram executadas.

### Validação do complemento

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm check`

## Ajuste complementar em 2026-07-07 - poucas visualizacoes sem recomendacao prematura de teste

- Pedido direto de produto: quando houver poucas visualizacoes do video de apresentacao, a leitura dos Analytics nao deve pedir ao psicologo para testar uma apresentacao diferente.
- A regra de amostra pequena permanece baseada em `MIN_RETENTION_SAMPLE_FOR_CONFIDENCE = 30`; abaixo desse limite, a copy agora orienta manter o video atual por enquanto e acompanhar novas visitas.
- Recomendacoes de teste, encurtamento ou ajuste de trecho continuam restritas aos estados com amostra minima de confianca.
- Nenhum endpoint, schema Prisma, migration, tracking, package novo, mock, seed ou dado simulado foi criado.
- Builder/Quick Copy nao esteve exposto como ferramenta MCP direta neste ambiente; a referencia visual ativa foi conferida via `_product/tasks/PROTO-INVENTORY.md`, `_product/proto/Meus Analytics - Psicologo.jpg` e captura enviada pelo usuario.
- ADR atualizado: `adrs/0175-analytics-video-retencao-orientada.md`.

### Criterios de aceite do complemento

- [x] O estado `Dados iniciais` com poucas visualizacoes nao sugere testar outra apresentacao.
- [x] O estado `Primeiros sinais bons` com poucas visualizacoes tambem evita recomendacao prematura de teste.
- [x] A decisao de amostra minima permanece explicita e sem alterar dados reais ou agregacao.
- [x] Nenhum mock, seed, endpoint simulado, package novo ou alteracao de schema foi criado.
- [x] ADR e documentacao da task foram atualizados.
- [x] Validacoes de frontend/build e rota privada local foram executadas.

### Validacao do complemento

- `pnpm --dir frontend exec biome check src/app/app/professional/analytics/logic.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser/HTTP local com `next start --hostname 127.0.0.1 --port 3137` e `Invoke-WebRequest` em `/app/professional/analytics` retornando `307` para login sem sessao; a rota privada segue protegida e a copy foi validada no fonte/build.

## Ajuste complementar em 2026-08-02 - origem de trafego focada em WhatsApp

- Pedido do usuario: substituir a origem `Link direto` por `Perfil` e remover a coluna `Perfil` da secao `Origem do trafego`, mantendo somente a coluna `WhatsApp`.
- Pedido complementar do usuario: remover as categorias `Explorar` e `Busca e filtros` e adicionar a nova categoria `Video de apresentacao`.
- A UI desktop da tabela de origem de trafego agora exibe apenas `Fonte` e `WhatsApp`; a UI mobile removeu a linha expandida de visualizacoes de perfil e manteve apenas cliques no WhatsApp.
- A ordenacao e o destaque `Principal origem` passaram a considerar `whatsapp_clicks`, alinhados com a unica metrica exibida por origem.
- O backend do Analytics do psicologo e os tipos frontend/backend foram atualizados para expor quatro origens vigentes: `presentation_video`, `communities`, `direct_link` e `favorites`.
- As definicoes compartilhadas do Admin foram atualizadas apenas para rotular `direct_link` como `Perfil`, preservando o identificador tecnico para compatibilidade.
- O contrato ainda preserva `profile_views` e `conversion_rate` para evolucao futura, mas eles nao sao exibidos nessa secao do Analytics do psicologo.
- Builder/Quick Copy nao estava exposto como ferramenta direta neste ambiente; a referencia visual ativa foi consultada via `_product/tasks/PROTO-INVENTORY.md`, `_product/proto/Meus Analytics - Psicologo.jpg` e capturas enviadas pelo usuario.
- Nenhum schema Prisma, migration, package novo, mock, seed ou endpoint simulado foi criado.
- ADR atualizado: `adrs/0126-analytics-origem-trafego-zerada.md`.

### Criterios de aceite do complemento

- [x] A origem `direct_link` aparece como `Perfil` na secao de origem de trafego.
- [x] As origens `Explorar` e `Busca e filtros` nao aparecem mais no Analytics do psicologo.
- [x] A origem `Video de apresentacao` aparece no Analytics do psicologo.
- [x] A tabela desktop nao exibe mais a coluna `Perfil`.
- [x] O acordeao mobile nao exibe mais `visualizacoes de perfil` por origem.
- [x] A secao mantem somente a metrica de cliques no WhatsApp por origem.
- [x] Nenhum mock, seed, endpoint simulado, package novo ou alteracao de schema foi criado.
- [x] ADR e documentacao da task foram atualizados.

### Validacao do complemento

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser/HTTP local com `next start --hostname 127.0.0.1 --port 3137` e request em `/app/professional/analytics` retornando `307` para `/auth/login?callbackUrl=%2Fapp%2Fprofessional%2Fanalytics` sem sessao autenticada.


## Ajuste complementar em 2026-08-02 - metricas do video antes da retencao

- Pedido do usuario: transformar os blocos de acoes do video em lista para ocupar menos espaco vertical, adicionar o numero de `Resultados de busca`, renomear `Consumo e acoes do video` para `Acoes do video`, reduzir o peso visual da lista, deixar `Cliques no WhatsApp` por ultimo, retirar `Acoes do video`/`Diagnostico` do bloco azul de retencao, posicionar as metricas do video antes da retencao em duas colunas com blocos lado a lado e, por fim, remover titulo/descricao, sombra, borda cinza e as metricas de acao comercial dessa grade.
- A UI mobile-first do painel do video agora exibe as metricas antes do bloco azul de `Retencao do video`, em duas colunas com quatro blocos leves: `Visualizacoes`, `Tempo total assistido`, `Assistiram completo` e `Taxa de replays`.
- Os blocos de metricas nao usam sombra nem borda cinza; a grade tambem nao mostra titulo `Metricas do video` nem descricao auxiliar.
- O `Diagnostico` permanece fora do card azul de `Retencao do video`, mantendo a area azul focada apenas na permanencia/curva do video.
- `Resultados de busca` usa contagem real de `profile_view_event.source="search_result"` no periodo selecionado, sem estimativa, backfill, mock ou mistura com visitas reais ao perfil.
- O backend expos `metrics.search_results`, `presentation_video.metrics.search_results_from_video`, `presentation_video.metrics.total_watch_seconds` e `presentation_video.metrics.completed_views` no contrato privado do Analytics do psicologo; os tipos frontend/backend foram sincronizados manualmente.
- Builder/Quick Copy nao estava exposto como ferramenta direta neste ambiente; a referencia visual ativa foi consultada via `_product/tasks/PROTO-INVENTORY.md`, `_product/proto/Meus Analytics - Psicologo.jpg` e capturas enviadas pelo usuario.
- Nenhum schema Prisma, migration, package novo, mock, seed ou endpoint simulado foi criado.
- ADR atualizado: `adrs/0175-analytics-video-retencao-orientada.md`.

### Criterios de aceite do complemento

- [x] A grade `Metricas do video` aparece antes do bloco azul de retencao.
- [x] As metricas do video aparecem em duas colunas com blocos lado a lado, sem sombra e sem borda cinza.
- [x] A grade inclui apenas `Visualizacoes`, `Tempo total assistido`, `Assistiram completo` e `Taxa de replays`.
- [x] A grade nao exibe titulo `Metricas do video` nem descricao auxiliar.
- [x] As metricas `Acesso ao perfil`, `Favoritado`, `Compartilhamento` e `Cliques no WhatsApp` nao aparecem mais nessa grade.
- [x] As metricas/acoes do video e `Diagnostico` nao ficam dentro do bloco azul de retencao do video.
- [x] O contrato backend/frontend inclui `search_results`, `search_results_from_video`, `total_watch_seconds` e `completed_views`.
- [x] Nenhum mock, seed, endpoint simulado, package novo ou alteracao de schema foi criado.
- [x] ADR e documentacao da task foram atualizados.

### Validacao do complemento

- `pnpm --dir frontend exec biome check src/app/app/professional/analytics/logic.tsx`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser/HTTP local com `next start --hostname 127.0.0.1 --port 3137` e request em `/app/professional/analytics` retornando `307` para `/auth/login?callbackUrl=%2Fapp%2Fprofessional%2Fanalytics` sem sessao autenticada.

## Ajuste complementar em 2026-08-02 - bloco de Comunidade nos Analytics

- Pedido do usuario: abaixo do bloco de `Video de apresentacao`, adicionar um bloco de `Comunidade` e, no refinamento seguinte, remover detalhes por comunidade para exibir analise agregada por conteudo.
- O backend de `GET /api/private/psychologist/analytics` passou a expor `communities.content`, usando somente dados persistidos: `community_member`, `community_post`, `post_reply` e `important_action_event`.
- As comunidades consideradas sao ativas e entram quando o psicologo segue a comunidade ou tem participacao real nela por posts/respostas publicados, mas a UI nao lista detalhes por comunidade.
- Os donuts agregam posts e respostas do periodo em `com video` e `sem video`, usando `media_type="video"` como criterio real de video em `community_post`/`post_reply`.
- A tabela de cliques WhatsApp exibe quatro grupos: `Posts com video`, `Posts sem video`, `Respostas com video` e `Respostas sem video`.
- Cliques WhatsApp por grupo sao atribuidos apenas quando ha `important_action_event.action_type="whatsapp_click"` com `target_type`/`target_id` apontando para post ou resposta comunitaria de autoria do psicologo; `contact_request` continua sendo total geral e nao e distribuido sem alvo comunitario rastreavel.
- O diagnostico usa score derivado dos totais reais do periodo: posts, respostas, cliques WhatsApp e quantidade de comunidades ativas, com niveis `Sem atividade recente`, `Atividade inicial`, `Atividade consistente` e `Alta atividade`.
- A UI mobile-first renderiza o bloco imediatamente apos `Video de apresentacao`, com diagnostico, dois donuts e tabela de cliques por tipo de conteudo.
- Builder/Quick Copy nao estava exposto como ferramenta direta neste ambiente; a referencia visual ativa foi consultada via `_product/tasks/PROTO-INVENTORY.md`, `_product/proto/Meus Analytics - Psicologo.jpg` e captura enviada pelo usuario.
- Nenhum schema Prisma, migration, package novo, mock, seed, dado artificial, backfill ou endpoint simulado foi criado.
- ADR criado: `adrs/0404-comunidades-analytics-psicologo.md`.

### Criterios de aceite do complemento

- [x] O bloco `Comunidade` aparece abaixo do bloco de `Video de apresentacao`.
- [x] Os detalhes por comunidade nao aparecem mais no bloco.
- [x] O bloco exibe donut de posts com totais `com video` e `sem video`.
- [x] O bloco exibe donut de respostas com totais `com video` e `sem video`.
- [x] A tabela exibe `Posts com video`, `Posts sem video`, `Respostas com video` e `Respostas sem video`.
- [x] A tabela mostra a quantidade de cliques WhatsApp de cada grupo.
- [x] O diagnostico informa o nivel de atividade com base em metricas reais do periodo.
- [x] Cliques WhatsApp por grupo nao usam distribuicao simulada de `contact_request`.
- [x] Nenhum mock, seed, endpoint simulado, package novo ou alteracao de schema foi criado.
- [x] ADR e documentacao de dados foram atualizados.

### Validacao do complemento

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser/HTTP local com `next start --hostname 127.0.0.1 --port 3137` e request em `/app/professional/analytics` retornando `307` para `/auth/login?callbackUrl=%2Fapp%2Fprofessional%2Fanalytics` sem sessao autenticada; a validacao visual do fonte/build confirmou a ordem do bloco e o fluxo privado permanece protegido.

## Ajuste complementar em 2026-08-02 - detalhamento do dropdown de Video de apresentacao

- Pedido do usuario: dentro do dropdown de `Video de apresentacao`, adicionar as categorias `Explorar` e `Resultados de busca`, com a quantidade de cliques de WhatsApp em cada uma; em `Resultados de busca`, listar tambem os principais termos pesquisados que geraram cliques.
- O backend de `GET /api/private/psychologist/analytics` passou a preencher `traffic_sources.sources[].breakdown` para a origem `presentation_video`, usando apenas eventos reais `important_action_event.action_type="psychologist_video_whatsapp_click"` no periodo selecionado.
- `Explorar` contabiliza cliques do video sem parametros de busca/filtro no path; `Resultados de busca` contabiliza cliques do video com parametros permitidos do diretorio (`search`, `q`, filtros de especialidade/servico/localidade etc.).
- Os principais termos derivam somente de `search` ou `q` preservados no path permitido; quando o clique veio de filtros sem texto livre, a UI informa honestamente que nao ha termo textual registrado.
- Novos eventos de acao importante passam a preservar somente os parametros permitidos de busca/filtro em `important_action_event.path`, mantendo queries sensiveis fora do armazenamento e sem alterar schema Prisma.
- Eventos historicos gravados antes dessa preservacao de query nao recebem backfill; permanecem classificados pela informacao real disponivel.
- A UI mobile-first do acordeao de Origem do trafego mostra as subcategorias dentro do dropdown de `Video de apresentacao`; no desktop, a linha tambem pode ser expandida para inspecionar o detalhamento.
- Builder/Quick Copy nao estava exposto como ferramenta direta neste ambiente; a referencia visual ativa foi consultada via `_product/tasks/PROTO-INVENTORY.md`, `_product/proto/Meus Analytics - Psicologo.jpg` e captura enviada pelo usuario.
- Nenhum schema Prisma, migration, package novo, mock, seed, dado artificial, backfill ou endpoint simulado foi criado.
- ADR atualizado: `adrs/0126-analytics-origem-trafego-zerada.md`.

### Criterios de aceite do complemento

- [x] O dropdown de `Video de apresentacao` exibe `Explorar` com cliques reais de WhatsApp do video.
- [x] O dropdown de `Video de apresentacao` exibe `Resultados de busca` com cliques reais de WhatsApp do video.
- [x] `Resultados de busca` lista os principais termos pesquisados que geraram cliques quando `search`/`q` existe no path permitido.
- [x] Cliques vindos de filtros sem termo textual mostram estado honesto sem inventar termo.
- [x] O total da origem `Video de apresentacao` usa a soma real dos cliques de WhatsApp do detalhamento.
- [x] Novos eventos preservam somente parametros permitidos de busca/filtro no path de acao importante.
- [x] Nenhum mock, seed, endpoint simulado, package novo, backfill ou alteracao de schema foi criado.
- [x] ADR e documentacao de dados foram atualizados.

### Validacao do complemento

- `pnpm --dir backend exec biome check --write "src/utils/analytics-traffic-path.ts" "src/utils/admin-psychologist-analytics.ts" "src/modules/api/public/analytics/action/use-cases/services.ts" "src/modules/api/private/psychologist/analytics/DTOs/IAnalyticsDTO.ts" "src/modules/api/private/psychologist/analytics/repositories/AnalyticsRepository.ts"`
- `pnpm --dir frontend exec biome check --write "src/app/app/professional/analytics/logic.tsx" "src/api/generator/types/psychologist-analytics.ts"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser/HTTP local em `http://localhost:3000/app/professional/analytics`: `Invoke-WebRequest` retornou `307` sem sessao autenticada e Chrome headless carregou a tela de login redirecionada; a validacao visual do fonte/build confirmou o detalhamento mobile-first e o fluxo privado permanece protegido.

## Ajuste complementar em 2026-08-02 - compactacao do dropdown de Video de apresentacao

- Pedido do usuario: remover do corpo do dropdown o texto `Acessos originados a partir do video de apresentacao do seu perfil` e a faixa branca de total `0 cliques no WhatsApp`.
- O header mobile do dropdown de `Video de apresentacao` passou a exibir, na mesma linha do titulo, somente o numero total de cliques WhatsApp da origem.
- As descricoes das categorias foram ajustadas para `Cliques no WhatsApp feitos a partir da navegacao de descoberta.` e `Cliques no WhatsApp feitos a partir de pesquisa no filtro de busca`.
- Os cards de `Explorar` e `Resultados de busca` deixaram de repetir o termo `WhatsApp` abaixo do numero.
- O contrato e a atribuicao real permanecem iguais; nao houve schema Prisma, migration, package novo, mock, seed ou endpoint simulado.
- ADR atualizado: `adrs/0126-analytics-origem-trafego-zerada.md`.

### Criterios de aceite do complemento

- [x] O corpo do dropdown de `Video de apresentacao` nao exibe o texto descritivo da origem.
- [x] O corpo do dropdown de `Video de apresentacao` nao exibe a faixa branca de total `0 cliques no WhatsApp`.
- [x] O header do dropdown exibe o total de cliques WhatsApp da origem como numero isolado ao lado do titulo.
- [x] As descricoes de `Explorar` e `Resultados de busca` usam os novos textos solicitados.
- [x] `Explorar` e `Resultados de busca` nao exibem `WhatsApp` abaixo do numero.
- [x] Nenhum mock, seed, endpoint simulado, package novo ou alteracao de schema foi criado.

### Validacao do complemento

- `pnpm --dir backend exec biome check --write "src/modules/api/private/psychologist/analytics/repositories/AnalyticsRepository.ts"`
- `pnpm --dir frontend exec biome check --write "src/app/app/professional/analytics/logic.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
- Browser/HTTP local em `http://localhost:3000/app/professional/analytics`: `Invoke-WebRequest` retornou `307` sem sessao autenticada; a validacao visual do fonte/build confirmou a compactacao mobile-first do dropdown e o fluxo privado permanece protegido.

## Ajuste complementar em 2026-08-02 - Origem do trafego como bloco principal

- Pedido do usuario: mover `Origem do trafego` para a primeira posicao apos o seletor de periodo e detalhar os dropdowns de `Comunidades`, `Perfil` e `Favoritos`.
- A UI mobile-first agora renderiza `Origem do trafego` imediatamente apos o seletor de periodo quando a consulta carregou sem erro.
- A origem `Perfil` passou a representar o perfil publico do psicologo; no contrato privado, o identificador deixa de ser `direct_link` e passa a ser `profile`.
- Todos os headers de origem exibem o numero geral de cliques WhatsApp atribuiveis por evento first-party daquela origem.
- O dropdown de `Comunidades` usa os totais reais ja agregados em `communities.content.whatsapp_clicks_by_content`: `Post com video`, `Post sem video`, `Resposta com video` e `Resposta sem video`.
- O dropdown de `Perfil` exibe `Acessos ao perfil` a partir de `profile_view_event.source=profile_page`.
- O dropdown de `Favoritos` separa `Pelo perfil` e `Pelo video de apresentacao`; o video usa `important_action_event.action_type=psychologist_video_favorite` e o perfil usa favoritos persistidos no periodo sem origem de video registrada.
- O card `Favoritado` deixou de ser zerado/untracked e passou a usar `psychologist_favorite` real do periodo.
- Nenhum schema Prisma, migration, package novo, mock, seed, dado artificial ou endpoint simulado foi criado.
- ADR atualizado: `adrs/0126-analytics-origem-trafego-zerada.md`.

### Criterios de aceite do complemento

- [x] `Origem do trafego` aparece como primeiro bloco apos o seletor de periodo na pagina carregada.
- [x] `Perfil` nao e descrito como link direto e usa a origem tecnica `profile` no contrato privado.
- [x] `Comunidades`, `Perfil`, `Favoritos` e `Video de apresentacao` exibem o total de cliques WhatsApp no header do dropdown.
- [x] O dropdown de `Comunidades` mostra cliques WhatsApp por `Post com video`, `Post sem video`, `Resposta com video` e `Resposta sem video`.
- [x] O dropdown de `Perfil` mostra a quantidade de acessos ao perfil.
- [x] O dropdown de `Favoritos` mostra favoritos pelo perfil e pelo video de apresentacao com dados persistidos/rastreados.
- [x] Nenhum mock, seed, endpoint simulado, package novo ou alteracao de schema foi criado.

### Validacao do complemento

- `pnpm --dir backend exec biome check --write "src/modules/api/private/psychologist/analytics/DTOs/IAnalyticsDTO.ts" "src/modules/api/private/psychologist/analytics/repositories/AnalyticsRepository.ts"`
- `pnpm --dir frontend exec biome check --write "src/api/generator/types/psychologist-analytics.ts" "src/app/app/professional/analytics/logic.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
- Browser/HTTP local em `http://localhost:3000/app/professional/analytics`: `Invoke-WebRequest` retornou `307` sem sessao autenticada; a validacao de fonte/build confirmou o bloco de Origem do trafego como primeira secao apos o seletor e os dropdowns por origem.

## Ajuste complementar em 2026-08-02 - refinamentos de origem, video e comunidade

- Pedido do usuario: manter `Origem do trafego` antes de `Video de apresentacao`, adicionar diagnostico abaixo de `Favoritos`, ampliar as metricas do video, renomear `Metricas principais do video` para `Metricas principais` e mover o diagnostico de `Comunidade` para o final do bloco.
- A UI mobile-first preserva `Origem do trafego` como bloco anterior ao video e adiciona um diagnostico derivado dos `whatsapp_clicks` reais de `traffic_sources.sources[]`, sem distribuir `contact_request` sem origem rastreavel.
- O bloco `Video de apresentacao` agora exibe `Compartilhamento`, `Acesso ao perfil`, `Favoritado`, `Cliques WhatsApp` e uma leitura separada de WhatsApp por `Explorar` e `Resultados de busca`, reutilizando os campos reais do contrato privado e o breakdown ja existente da origem `presentation_video`.
- O titulo do bloco de video foi alterado para `Metricas principais`.
- O diagnostico de `Comunidade` foi movido para o final do bloco, apos donuts e tabela de cliques por conteudo, sem alterar regra de calculo.
- Builder/Quick Copy nao estava exposto como ferramenta MCP direta neste ambiente; a referencia visual ativa foi consultada via `_product/tasks/PROTO-INVENTORY.md`, `_product/proto/Meus Analytics - Psicologo.jpg` e capturas enviadas pelo usuario.
- Nenhum schema Prisma, migration, package novo, mock, seed, dado artificial ou endpoint simulado foi criado.
- ADRs atualizados: `adrs/0126-analytics-origem-trafego-zerada.md`, `adrs/0175-analytics-video-retencao-orientada.md` e `adrs/0404-comunidades-analytics-psicologo.md`.

### Criterios de aceite do complemento

- [x] `Origem do trafego` permanece antes de `Video de apresentacao` na pagina carregada.
- [x] `Origem do trafego` exibe um bloco `Diagnostico` abaixo da lista de origens.
- [x] O bloco `Video de apresentacao` exibe as metricas `Compartilhamento`, `Acesso ao perfil`, `Favoritado` e `Cliques WhatsApp`.
- [x] Os cliques WhatsApp do video aparecem separados por `Explorar` e `Resultados de busca`.
- [x] O texto `Metricas principais do video` foi alterado para `Metricas principais`.
- [x] No bloco `Comunidade`, o diagnostico fica no final do bloco.
- [x] Nenhum mock, seed, endpoint simulado, package novo ou alteracao de schema foi criado.
- [x] ADR e documentacao da task foram atualizados.

### Validacao do complemento

- `pnpm --dir frontend exec biome check --write "src/app/app/professional/analytics/logic.tsx"`
- `pnpm --dir frontend exec biome check "src/app/app/professional/analytics/logic.tsx"`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
- Browser/HTTP local com `pnpm --dir frontend exec next start --hostname 127.0.0.1 --port 3137`: request em `/app/professional/analytics` retornou `307` para `/auth/login?callbackUrl=%2Fapp%2Fprofessional%2Fanalytics` sem sessao autenticada, e Chrome headless 390x844 carregou a tela de login redirecionada. A validacao visual do fonte/build confirmou a hierarquia mobile-first solicitada.


## Ajuste complementar em 2026-08-02 - Origem do trafego abaixo de Conversoes WhatsApp

- Pedido do usuario: reposicionar o bloco `Origem do trafego` para ficar abaixo do card largo `Conversoes WhatsApp` e antes de `Video de apresentacao`.
- A UI mobile-first agora renderiza primeiro os cards principais, incluindo `Conversoes WhatsApp`, e em seguida mostra `Origem do trafego` com seus dropdowns e diagnostico.
- O bloco `Video de apresentacao` continua abaixo de `Origem do trafego`, preservando as metricas e a separacao de cliques WhatsApp por `Explorar` e `Resultados de busca`.
- Builder/Quick Copy nao estava exposto como ferramenta MCP direta neste ambiente; a referencia visual ativa foi consultada via `_product/tasks/PROTO-INVENTORY.md`, `_product/proto/Meus Analytics - Psicologo.jpg` e capturas enviadas pelo usuario.
- Nenhum schema Prisma, migration, package novo, mock, seed, dado artificial ou endpoint simulado foi criado.
- ADR atualizado: `adrs/0126-analytics-origem-trafego-zerada.md`.

### Criterios de aceite do complemento

- [x] `Origem do trafego` aparece abaixo do card `Conversoes WhatsApp` na pagina carregada.
- [x] `Origem do trafego` permanece antes de `Video de apresentacao`.
- [x] O diagnostico de `Origem do trafego` continua no final do proprio bloco.
- [x] Nenhum mock, seed, endpoint simulado, package novo ou alteracao de schema foi criado.
- [x] ADR e documentacao da task foram atualizados.

### Validacao do complemento

- `pnpm --dir frontend exec biome check --write "src/app/app/professional/analytics/logic.tsx"`
- `pnpm --dir frontend exec biome check "src/app/app/professional/analytics/logic.tsx"`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
- Verificacao estatica da hierarquia no fonte: `Cards de analytics` aparece antes de `TrafficSourceSection`, que aparece antes de `PresentationVideoAnalyticsSection`.
- Browser/HTTP local com `pnpm --dir frontend exec next start --hostname 127.0.0.1 --port 3237`: request em `/app/professional/analytics` retornou `307` para `/auth/login?callbackUrl=%2Fapp%2Fprofessional%2Fanalytics` sem sessao autenticada, confirmando que a rota buildada inicia localmente e permanece protegida; a ordem visual foi validada no fonte e no build por causa do redirecionamento sem sessao.

## Ajuste complementar em 2026-08-02 - Origem do trafego sem dropdown e sem diagnostico

- Pedido do usuario: em `Origem do trafego`, colocar a descricao de cada bloco abaixo do titulo; em seguida, remover o dropdown dos blocos (`Comunidades`, `Video de apresentacao`, `Perfil` e `Favoritos`) e remover o bloco de `Diagnostico`.
- A UI mobile-first agora exibe cada origem como card estatico com icone, titulo, descricao curta, total de cliques WhatsApp e selo de principal origem quando aplicavel.
- A descricao de `Video de apresentacao` deixou de ficar vazia no contrato privado/fallback para manter todos os cards com contexto equivalente.
- Os detalhes de `traffic_sources.sources[].breakdown[]` continuam preservados no contrato para usos existentes, mas nao sao mais renderizados como dropdown dentro de `Origem do trafego`.
- O diagnostico especifico de `Origem do trafego` foi removido; demais diagnosticos de secoes especificas permanecem inalterados.
- Builder/Quick Copy nao estava exposto como ferramenta MCP direta neste ambiente; a referencia visual ativa foi consultada via `_product/tasks/PROTO-INVENTORY.md`, `_product/proto/Meus Analytics - Psicologo.jpg` e capturas enviadas pelo usuario.
- Nenhum schema Prisma, migration, package novo, mock, seed, dado artificial ou endpoint simulado foi criado.
- ADR atualizado: `adrs/0126-analytics-origem-trafego-zerada.md`.

### Criterios de aceite do complemento

- [x] Cada card de origem exibe descricao abaixo do titulo.
- [x] A origem `Comunidades` exibe descricao sobre cliques WhatsApp a partir de posts e respostas nas comunidades.
- [x] Os cards de `Origem do trafego` nao exibem seta, `aria-expanded`, clique de abertura ou corpo de dropdown.
- [x] O bloco `Diagnostico` de `Origem do trafego` nao e renderizado.
- [x] O contrato privado/fallback possui descricao para `Video de apresentacao`.
- [x] Nenhum mock, seed, endpoint simulado, package novo ou alteracao de schema foi criado.
- [x] ADR e documentacao da task foram atualizados.

### Validacao do complemento

- `pnpm --dir frontend exec biome check --write "src/app/app/professional/analytics/logic.tsx"`
- `pnpm --dir backend exec biome check --write "src/modules/api/private/psychologist/analytics/repositories/AnalyticsRepository.ts"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Verificacao estatica via Node confirmou as quatro descricoes em `frontend/src/app/app/professional/analytics/logic.tsx` e `backend/src/modules/api/private/psychologist/analytics/repositories/AnalyticsRepository.ts`.
- Browser/HTTP local em `http://localhost:3000/app/professional/analytics`: `Invoke-WebRequest` retornou `307` sem sessao autenticada, confirmando que a rota local permanece protegida.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Verificacao estatica do `TrafficSourceSection`: sem `aria-expanded`, sem `onClick`, sem `ChevronDown` e sem texto `Diagnostico`.
- Browser/HTTP local em `http://localhost:3000/app/professional/analytics`: `Invoke-WebRequest` retornou `307` sem sessao autenticada, confirmando que a rota local permanece protegida; a validacao visual do fonte/build confirmou os cards estaticos mobile-first.

## Ajuste complementar em 2026-08-02 - Copy dos cards de origem do trafego

- Pedido do usuario: ajustar as descricoes dos cards `Comunidades`, `Video de apresentacao`, `Perfil` e `Favoritos` em `Origem do trafego`.
- `Comunidades` passou a exibir `Cliques no WhatsApp a partir dos seus posts e respostas nas comunidades.`
- `Video de apresentacao` passou a exibir `Cliques no WhatsApp a partir do seu video no explorar e resultados de busca.`
- `Perfil` passou a exibir `Cliques no WhatsApp a partir do seu perfil publico.`
- `Favoritos` passou a exibir `Cliques no WhatsApp a partir da pagina de favoritos.`
- O backend e o fallback frontend foram mantidos sincronizados para evitar copy divergente entre contrato real e estado fallback.
- Nenhum schema Prisma, migration, package novo, mock, seed, dado artificial ou endpoint simulado foi criado.
- ADR atualizado: `adrs/0126-analytics-origem-trafego-zerada.md`.

### Criterios de aceite do complemento

- [x] `Comunidades` usa a copy em primeira pessoa dos posts/respostas.
- [x] `Video de apresentacao` usa a copy solicitada para explorar/resultados de busca.
- [x] `Perfil` usa a copy com `seu perfil publico`.
- [x] `Favoritos` usa a copy com `pagina de favoritos`.
- [x] Backend e fallback frontend possuem as mesmas descricoes.
- [x] Nenhum mock, seed, endpoint simulado, package novo ou alteracao de schema foi criado.
- [x] ADR e documentacao da task foram atualizados.

### Validacao do complemento

- `pnpm --dir frontend exec biome check --write "src/app/app/professional/analytics/logic.tsx"`
- `pnpm --dir backend exec biome check --write "src/modules/api/private/psychologist/analytics/repositories/AnalyticsRepository.ts"`

## Ajuste complementar em 2026-08-02 - Compactacao das metricas do video

- Pedido do usuario: reduzir o espaco ocupado pelos blocos de metricas do `Video de apresentacao`, remover o bloco `Cliques no WhatsApp por origem` e alinhar o texto de cada metrica com o respectivo icone.
- Builder/Quick Copy nao estava exposto como ferramenta direta neste ambiente; foram usadas `_product/tasks/PROTO-INVENTORY.md`, `_product/proto/Meus Analytics - Psicologo.jpg` e as capturas enviadas pelo usuario como referencia auditavel.
- A UI mobile-first dos cards de video agora usa cards mais baixos, com label leve acima do numero e valor destacado abaixo.
- O detalhamento `Explorar`/`Resultados de busca` deixou de ser renderizado dentro do bloco de video; o total de `Cliques WhatsApp` permanece como card de metrica real.
- O alinhamento vertical entre icone e label foi ajustado para evitar desalinhamento perceptivel em `Visualizacoes`, `Tempo total assistido` e demais metricas.
- Nenhum contrato de API, schema Prisma, migration, package novo, mock, seed ou dado artificial foi criado.
- ADR atualizado: `adrs/0175-analytics-video-retencao-orientada.md`.

### Criterios de aceite do complemento

- [x] O bloco `Cliques no WhatsApp` por origem nao e renderizado dentro de `Video de apresentacao`.
- [x] Os cards de metricas do video exibem o label acima do numero.
- [x] O label da metrica usa peso visual menor que o numero.
- [x] O label fica alinhado verticalmente com o icone do proprio card.
- [x] Nenhum mock, seed, endpoint simulado, package novo ou alteracao de schema foi criado.
- [x] ADR e documentacao da task foram atualizados.

### Validacao do complemento

- `pnpm --dir frontend exec biome check --write "src/app/app/professional/analytics/logic.tsx"`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
- Browser/HTTP local em `http://localhost:3000/app/professional/analytics`: `Invoke-WebRequest` retornou `307` para `/auth/login?callbackUrl=%2Fapp%2Fprofessional%2Fanalytics` sem sessao autenticada; a validacao visual foi acompanhada no Chrome local do usuario durante o hot reload da tela autenticada.

## Ajuste complementar em 2026-08-02 - Termos pesquisados abaixo da retencao do video

- Pedido do usuario: abaixo do bloco azul de retencao do video, substituir o bloco `Diagnostico` por `Termos pesquisados`; depois, corrigir a fonte para mostrar os principais termos que exibiram o video do psicologo nos resultados de busca, e nao termos que geraram cliques WhatsApp.
- A UI mobile-first do bloco `Video de apresentacao` agora renderiza `Termos pesquisados` logo apos o card azul de retencao e lista ate 5 termos vindos de `presentation_video.search_terms`.
- O tracking real de impressoes de busca passou a persistir `profile_view_event.search_context_path`, sanitizado com a allowlist de parametros de busca/filtro, para que novas impressoes `source="search_result"` carreguem o contexto necessario sem query sensivel arbitraria.
- O backend de `GET /api/private/psychologist/analytics` agrega esses caminhos reais para preencher `presentation_video.search_terms` com `term`, `impressions` e `percentage`, sem usar cliques WhatsApp, sem redistribuir `contact_request` e sem backfill historico.
- O tooltip usa o texto `Principais termos de busca que exibiram seu video nos resultados de busca.` e fica acessivel no icone de informacao por `title`, foco e hover, com fundo neutro sem destaque azul.
- O chip de total `0 cliques` foi removido do cabecalho; quando existem impressoes sem termo textual salvo, a UI mostra estado honesto sem inventar termo.
- Migration aplicada: `20260802181732_add_profile_search_context_path`.
- Nenhum package novo, mock, seed, dado artificial, endpoint simulado ou backfill foi criado.
- ADRs atualizados: `adrs/0126-analytics-origem-trafego-zerada.md` e `adrs/0175-analytics-video-retencao-orientada.md`; `DATA-MODEL.md` documentado.

### Criterios de aceite do complemento

- [x] O bloco abaixo da retencao do video exibe `Termos pesquisados` no lugar de `Diagnostico`.
- [x] A lista exibe ate 5 termos pesquisados que exibiram o video em resultados de busca, nao termos de clique WhatsApp.
- [x] O contrato privado expoe `presentation_video.search_terms` com dados reais de `profile_view_event.search_context_path`.
- [x] Novas impressoes de busca persistem somente contexto sanitizado pela allowlist de parametros permitidos.
- [x] O chip de total `0 cliques` nao e renderizado no bloco.
- [x] A tooltip usa fundo neutro, sem fundo azul, e informa `Principais termos de busca que exibiram seu video nos resultados de busca.`.
- [x] Estados sem termo textual ou sem impressao usam mensagens honestas, sem inventar dados.
- [x] Nenhum mock, seed, endpoint simulado, package novo ou backfill foi criado.
- [x] ADR, DATA-MODEL e documentacao da task foram atualizados.

### Validacao do complemento

- `pnpm --dir backend db:migrate -- --name add_profile_search_context_path`
- `pnpm --dir backend exec biome check --write "src/modules/api/private/directory/psychologists/DTOs/IProfileDTO.ts" "src/modules/api/private/directory/psychologists/validator/index.ts" "src/modules/api/private/directory/psychologists/repositories/ProfileViewRepository.ts" "src/modules/api/private/psychologist/analytics/DTOs/IAnalyticsDTO.ts" "src/modules/api/private/psychologist/analytics/repositories/AnalyticsRepository.ts"`
- `pnpm --dir frontend exec biome check --write "src/api/callers/directory/index.tsx" "src/api/generator/types/directory.ts" "src/api/generator/types/psychologist-analytics.ts" "src/app/app/psychologists/logic.tsx" "src/app/app/professional/analytics/logic.tsx"`
- `pnpm --dir backend exec prisma format`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check` (primeira execucao expirou por timeout da ferramenta; reexecucao concluida sem erros)
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
- Browser/HTTP local em `http://localhost:3000/app/professional/analytics`: `Invoke-WebRequest` retornou `307`, confirmando que a rota local responde e permanece protegida sem sessao autenticada; a hierarquia visual foi validada no fonte/build e pela captura mobile enviada pelo usuario.
