# TASK-13: PsicÃ³logos: listagem e filtros

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-13 |
| Prioridade | P0 |
| EsforÃ§o | L |
| Fase | Descoberta |
| Status | Completed |
| DependÃªncias | TASK-02, TASK-12 |
| ADR alvo | ADR de descoberta de psicÃ³logos |

## ReferÃªncias obrigatÃ³rias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## ReferÃªncias visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/PsicÃ³logos.jpg` | `figma-design-frame-15-Psic-logos.html` |
| `_product/proto/Filtros de PsicÃ³logos - ServiÃ§os Expandidos.jpg` | `figma-design-frame-12-Filtros-de-Psic-logos---Servi-os-Expandidos.html` |

As referÃªncias visuais sÃ£o norte de produto e layout. Elas nÃ£o autorizam recriar arquitetura, aceitar cÃ³digo gerado sem revisÃ£o, usar mock ou ignorar os padrÃµes atuais do projeto.

## Contexto

A listagem Ã© uma tela central para pacientes. Ela deve consultar backend real, filtrar por dados persistidos e nÃ£o exibir profissionais fake.

## Objetivo

Implementar listagem real de psicÃ³logos aprovados com busca, filtros e paginaÃ§Ã£o.

## PrÃ©-requisitos e bloqueios

- Sem psicÃ³logos aprovados reais, a tela deve mostrar estado vazio, nÃ£o seed fake.

Se qualquer bloqueio obrigatÃ³rio estiver ativo, pare a implementaÃ§Ã£o, registre ADR/pendÃªncia e nÃ£o marque a task como concluÃ­da.

## Escopo frontend

Rotas esperadas:

- `/app/psychologists` (lista de descoberta, dentro do shell privado da TASK-12)
- Cada card aponta para o detalhe do perfil em `/app/psychologist/[id]` (TASK-15).

ImplementaÃ§Ã£o esperada:

- Criar tela `/app/psychologists` dentro do shell privado.
- Implementar busca, filtros expandidos, chips ativos, limpar filtros e paginaÃ§Ã£o conforme o "Contrato padrÃ£o de API" do `DATA-MODEL.md` (`page`/`limit`).
- Filtros por taxonomia: `specialty`, `service` e `approach` (ver `DATA-MODEL.md`), alÃ©m do filtro "verificados" (`psychologist_profile.cfp_verified_at` preenchido).
- Usar callers React Query e query keys dedicadas.
- Exibir vazio honesto quando nÃ£o houver profissionais publicados.
- NÃ£o hardcodar cards de psicÃ³logos.

## Escopo backend

ImplementaÃ§Ã£o esperada:

- Criar endpoint de listagem com paginaÃ§Ã£o (`page`/`limit`, default 20, mÃ¡x 50 â€” ver "Contrato padrÃ£o de API" do `DATA-MODEL.md`), busca e filtros.
- Retornar somente psicÃ³logos publicados (`psychologist_profile.published = true`) e de `user` ativo (PRD Â§7: sÃ³ ativos/verificados aparecem).
- Expor ordenaÃ§Ã£o/exibiÃ§Ã£o de `rating_avg`/`rating_count` (ver `DATA-MODEL.md`; `rating_avg` Ã© nota Ã—100).
- Filtro "verificados" = `cfp_verified_at` nÃ£o nulo.
- Usar catÃ¡logos `specialty`/`service`/`approach` e os joins `psychologist_specialty`/`psychologist_service`/`psychologist_approach` (ver `DATA-MODEL.md`).
- Adicionar Ã­ndices para filtros frequentes conforme jÃ¡ previstos no `DATA-MODEL.md`.
- NÃ£o retornar dados sensÃ­veis do profissional (`cpf`, `whatsapp`, campos de conta).

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `psychologist_profile` (`published`, `rating_avg`, `rating_count`, `cfp_verified_at`)
- `specialty` / `service` / `approach` (catÃ¡logos)
- `psychologist_specialty` / `psychologist_service` / `psychologist_approach` (joins)

Guarda de papel (ver `DATA-MODEL.md`, "Camadas de autenticaÃ§Ã£o e autorizaÃ§Ã£o" e ADR-0002):

- Estas sÃ£o rotas de leitura caller-neutras, montadas sob `/api/private/directory/*`, guardadas apenas por `_auth` (qualquer autenticado) â€” **nunca** por `requireRole`. Pacientes precisam navegar/descobrir psicÃ³logos, entÃ£o a descoberta nÃ£o pode ser psicÃ³logo-only.
- NÃ£o usar `/api/private/psychologists` (confundÃ­vel com a autogestÃ£o do psicÃ³logo em `/api/private/psychologist/*`).
- Expor apenas campos PUBLIC-safe do `psychologist_profile`; nunca `cpf`, `whatsapp` ou campos de conta.

Endpoints esperados (ver "ConvenÃ§Ã£o de rotas" do `DATA-MODEL.md`):

- GET `/api/private/directory/psychologists` (listagem paginada de descoberta, neutra, sÃ³ `_auth`)

## Contrato tÃ©cnico detalhado

Arquitetura frontend obrigatÃ³ria:

- Telas em `frontend/src/app/{rota}/page.tsx`, `logic.tsx` e `use-form.tsx` quando houver formulÃ¡rio.
- Chamadas HTTP em `frontend/src/api/req/{dominio}/index.ts` usando `callEndpoint` e `handleReq`.
- Hooks React Query em `frontend/src/api/callers/{dominio}/index.tsx`.
- Query keys em `frontend/src/api/cache/keys.ts`.
- Shells/templates em `frontend/src/templates`.
- Componentes existentes em `frontend/src/registry/new-york-v4/ui` e `frontend/src/components/ui` devem ser reutilizados antes de criar novos.
- Quando houver formulÃ¡rio ou campo, usar `frontend/src/hooks/form`, `frontend/src/components/controllers`, React Hook Form e Zod conforme `TASK-02`.

Arquitetura backend obrigatÃ³ria:

- Novas APIs em `backend/src/modules/api/{public|private}/{dominio}/{caso}`.
- Rotas registradas em `backend/src/main/server/imports/write.ts`.
- Validadores em `validator/index.ts` usando os helpers/pacote local de validaÃ§Ã£o.
- Services e repositories separados quando houver regra de domÃ­nio ou persistÃªncia.
- Respostas usando `send`, `error500`, `error` e traduÃ§Ãµes em `backend/locales/pt/translation.json`.
- Prisma com nomes e padrÃµes jÃ¡ definidos em `ARCHITECTURE.md`.

Packages permitidos nesta task:

- TanStack Query
- @radix-ui/react-select candidato
- @radix-ui/react-checkbox candidato
- Prisma

Regras anti-recriaÃ§Ã£o especÃ­ficas:

- Procurar componente, helper, model, endpoint e query key equivalente antes de criar estrutura nova.
- NÃ£o criar client HTTP paralelo, store paralela, autenticaÃ§Ã£o paralela, validator paralelo ou design system paralelo.
- NÃ£o usar `sample/` como referÃªncia direta de implementaÃ§Ã£o futura.
- NÃ£o instalar package novo sem consultar `PACKAGES.md` e registrar ADR.

## Estados obrigatÃ³rios

- Loading inicial.
- Erro de rede/API em PT-BR.
- Estado vazio quando nÃ£o houver dado real.
- Sucesso com feedback visual discreto.
- Responsividade mobile-first baseada nas imagens exportadas.

## Fora do escopo

- Criar dados fake, seed artificial ou mock para preencher tela.
- Concluir integraÃ§Ã£o externa ausente.
- Refatorar mÃ³dulos nÃ£o relacionados Ã  task.
- Trocar package manager ou stack base.

## CritÃ©rios de aceite

- [x] As referÃªncias visuais desta task foram consultadas via Builder Quick Copy ou imagens locais citadas acima.
- [x] Rotas de descoberta sob `/api/private/directory/*` usam sÃ³ `_auth` (neutras), nunca `requireRole`, conforme ADR-0002.
- [x] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [x] Backend implementado nos endpoints/modelos esperados quando aplicÃ¡vel.
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [x] Todos os estados obrigatÃ³rios existem e usam textos em PT-BR.
- [x] FormulÃ¡rios e campos usam a fundaÃ§Ã£o da `TASK-02` quando aplicÃ¡vel.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] Nenhum cÃ³digo gerado por Builder foi aceito sem revisÃ£o e adequaÃ§Ã£o Ã  arquitetura.
- [x] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Commit criado com mensagem convencional.

## ExecuÃ§Ã£o

- Builder/Quick Copy nÃ£o estÃ¡ exposto como ferramenta direta nesta sessÃ£o; a validaÃ§Ã£o visual
  usou as imagens locais obrigatÃ³rias `_product/proto/PsicÃ³logos.jpg` e
  `_product/proto/Filtros de PsicÃ³logos - ServiÃ§os Expandidos.jpg`.
- Backend criou `GET /api/private/directory/psychologists`, montado sob namespace neutro com apenas
  `_auth`, sem `requireRole`.
- Prisma criou os catÃ¡logos `specialty`, `service`, `approach` e os joins
  `psychologist_specialty`, `psychologist_service`, `psychologist_approach`, sem seed artificial.
- A listagem retorna somente `psychologist_profile.published = true`, usuÃ¡rio ativo e campos
  public-safe; `cpf`, `whatsapp`, e-mail e dados de conta nÃ£o sÃ£o expostos.
- Frontend implementou `/app/psychologists` mobile-first dentro do shell privado, com busca,
  filtros expandidos, chips ativos, limpar filtros, paginaÃ§Ã£o, loading, erro, sucesso e vazio
  honesto.
- Busca e filtros usam a fundaÃ§Ã£o da TASK-02 (`useFormList` e controllers), React Query, req/caller
  dedicados e query key `directory.psychologists`.
- ADR criado: `adrs/0019-descoberta-psicologos-taxonomias.md`.
- ValidaÃ§Ãµes executadas:
  - `pnpm --dir backend db:migrate --name add_directory_taxonomies`
  - `pnpm --dir backend db:generate`
  - `pnpm --dir backend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - smoke de API real com paciente temporÃ¡rio removido ao final;
  - browser local headless em viewport mobile `390x844` com cookie real, sessÃ£o hidratada,
    estado vazio/lista real e bottom nav.

## ExecuÃ§Ã£o complementar: desktop e filtros em modal (2026-06-06)

- Pedido do usuÃ¡rio: adaptar `/app/psychologists` para desktop e fazer os filtros abrirem em modal.
- Builder/Quick Copy foi revalidado via
px "@builder.io/dev-tools@latest" auth status`, mas o CLI retornou
  nÃ£o autenticado nesta sessÃ£o; a execuÃ§Ã£o manteve o fallback auditÃ¡vel das imagens locais obrigatÃ³rias da task.
- A tela permanece mobile-first com base nos protÃ³tipos `390px`, mas agora expande em desktop para `lg:max-w-6xl`,
  card de busca/filtros responsivo e grid de resultados em duas colunas.
- Os filtros avanÃ§ados deixaram de abrir inline e passaram a abrir em modal com `role="dialog"`, `aria-modal`,
  fechamento por `Escape`/backdrop e foco inicial no botÃ£o de fechar, sem instalar pacote novo.
- A busca, filtros e switch continuam usando dados reais da URL/API e a fundaÃ§Ã£o da TASK-02 (`useFormList` +
  controllers) para campos avanÃ§ados.
- ADR atualizado: `adrs/0019-descoberta-psicologos-taxonomias.md`.
- ValidaÃ§Ãµes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - browser local headless em viewport desktop `1440x1000`, com cookie real, sessÃ£o hidratada, `sectionWidth=1112`
    e modal de filtros aberta com largura `520px`; usuÃ¡rio temporÃ¡rio de validaÃ§Ã£o removido ao final.

## ExecuÃ§Ã£o complementar: ajustes de card e favoritos no card (2026-06-06)

- Pedido do usuÃ¡rio: ajustar o card com inspiraÃ§Ã£o de densidade/tipografia do Reddit, trocar o selo para
  `DisponÃ­vel hoje`, trocar CTA para `Chamar no WhatsApp`, usar tags fixas abaixo da busca e mover
  `Somente verificados` para uma faixa abaixo das tags.
- Tags rÃ¡pidas abaixo da busca: `Ansiedade`, `DepressÃ£o`, `Luto`, `CompulsÃµes`, `Traumas`; elas aplicam busca real
  no endpoint existente, sem catÃ¡logo fake persistido.
- O coraÃ§Ã£o do card deixou de ser apenas decorativo e passou a executar favorito real com endpoints de paciente
  (`POST`/`DELETE /api/private/patient/favorites/:id`) e campo contextual `favorited` na listagem.
- Como favorito pertence Ã  TASK-14, a execuÃ§Ã£o criou os modelos previstos no `DATA-MODEL.md`, mas **nÃ£o** concluiu
  a TASK-14 completa; a lista dedicada de favoritos segue como fluxo separado, e seguir psicÃ³logos foi depreciado na
  UI em 2026-06-08.
- ADR criado: `adrs/0020-favoritar-psicologo-na-listagem.md`.
- ValidaÃ§Ãµes executadas:
  - `pnpm --dir backend db:migrate --name add_psychologist_favorites`
  - `pnpm --dir backend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - smoke real de API com paciente temporÃ¡rio: favoritar, refletir `favorited=true` na listagem, desfavoritar e
    remover o usuÃ¡rio temporÃ¡rio;
  - browser local headless em viewport desktop `1440x1000`, validando tags, selo, CTA e clique no coraÃ§Ã£o com
    `aria-pressed=true`.

## ExecuÃ§Ã£o complementar: card conforme referÃªncia de psicÃ³logos (2026-06-08)

- Pedido do usuÃ¡rio: adaptar o card de psicÃ³logo conforme a referÃªncia anexada `PsicÃ³logos (1).jpg`, remover a opÃ§Ã£o
  de seguir psicÃ³logos e manter favoritos/WhatsApp como aÃ§Ãµes principais.
- Builder/Quick Copy nÃ£o estÃ¡ exposto como ferramenta direta nesta sessÃ£o; a validaÃ§Ã£o visual usou a imagem anexada
  pelo usuÃ¡rio e o fallback local `_product/proto/PsicÃ³logos.jpg`.
- O card pÃºblico agora usa layout mobile-first de atÃ© `390px`, sem botÃ£o de seguir, com coraÃ§Ã£o de favorito, selo
  `DisponÃ­vel hoje` pulsando suavemente quando `available_today=true`, CTA verde `Chamar no WhatsApp` e link direto
  para `wa.me`.
- Tags abaixo da bio ficaram restritas a benefÃ­cios reais: tempo de formaÃ§Ã£o apenas para assinantes, desconto de
  1Âª sessÃ£o, valor social e aceita convÃªnios. Especialidades, serviÃ§os, abordagens e modalidade nÃ£o aparecem como
  tags de benefÃ­cio no card.
- O selo verificado e o prefixo `Dr.`/`Dra.` aparecem somente para assinantes; perfis gratuitos publicados nÃ£o exibem
  o selo nem o prefixo.
- Quando o assinante possui `video_url`, o card mostra uma miniatura de vÃ­deo com botÃ£o de play no prÃ³prio card.
  VÃ­deos enviados por profissionais ainda nÃ£o possuem trilha de legenda nesta etapa; a exceÃ§Ã£o de lint foi registrada
  localmente no componente.
- A rota `/app/following` passou a redirecionar para `/app/community`, a navegaÃ§Ã£o nÃ£o destaca mais `/app/following`
  como favoritos e o menu de perfil passou a usar `Comunidades seguidas`, alinhado Ã  decisÃ£o de que usuÃ¡rios seguem
  comunidades, nÃ£o outros usuÃ¡rios.
- O backend da descoberta e da lista de favoritos passou a expor campos publicÃ¡veis necessÃ¡rios ao card
  (`gender`, `video_url`, `available_today`, benefÃ­cios, `formation_years` e `whatsapp_url`). O campo bruto
  `whatsapp` continua fora do contrato; `whatsapp_url` Ã© uma URL de CTA gerada para o pedido explÃ­cito de abrir
  `wa.me`.
- ADR atualizado: `adrs/0019-descoberta-psicologos-taxonomias.md`.
- ValidaÃ§Ãµes executadas:
  - `pnpm --dir backend biome:fix`
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir backend check`
  - `pnpm --dir frontend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - smoke real de API com paciente temporÃ¡rio removido ao final: `GET /api/private/directory/psychologists?page=1&limit=3`
    retornou `success=true`, `count=1`, `page=1` e campos novos do card (`whatsapp_url`, `video_url`,
    `available_today`, benefÃ­cios e `formation_years`);
  - smoke local HTTP: `GET /health` no backend retornou `200`; `/app/psychologists` e `/app/following` responderam
    pelo proxy privado local com `307` quando acessados sem sessÃ£o de browser reutilizÃ¡vel nesta execuÃ§Ã£o.

## ExecuÃ§Ã£o complementar: WhatsApp SVG e ajuste fino do card (2026-06-08)

- Pedido do usuÃ¡rio: substituir o Ã­cone do CTA de WhatsApp pelo SVG anexado `SVG.svg`, usar verde `#22C55E`,
  aproximar o espaÃ§amento de `PSICÃ“LOGO` e a cor da estrela de avaliaÃ§Ã£o da referÃªncia anterior, e corrigir o erro
  `Acesso permitido apenas para o perfil autorizado`.
- Builder/Quick Copy segue sem ferramenta direta nesta sessÃ£o; a referÃªncia ativa foi a imagem de card enviada
  anteriormente pelo usuÃ¡rio e o SVG anexado nesta solicitaÃ§Ã£o.
- Foi criado um componente vetorial reutilizÃ¡vel `WhatsAppIcon` com o path do SVG anexado, sem usar `<img>`.
- Os CTAs de WhatsApp do card e do perfil pÃºblico usam background `#22C55E` e o novo Ã­cone em branco.
- O texto `PSICÃ“LOGO` no card teve tracking reduzido para ficar mais prÃ³ximo da referÃªncia, e a estrela de avaliaÃ§Ã£o
  passou para `#FACC15`.
- O erro de autorizaÃ§Ã£o foi tratado na UI: aÃ§Ãµes de favorito em cards/perfis ficam desabilitadas para usuÃ¡rios que nÃ£o
  sejam pacientes, evitando chamadas aos endpoints de paciente por contas de psicÃ³logo.
- ValidaÃ§Ãµes executadas:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`

## ExecuÃ§Ã£o complementar: selos do card com largura por conteÃºdo e animaÃ§Ã£o (2026-06-10)

- Pedido do usuÃ¡rio: ajustar os selos de benefÃ­cios do card para largura ajustada ao texto, garantir que o espaÃ§amento vertical entre o Ãºltimo selo e o `overlay` seja igual ao espaÃ§amento entre `overlay` e botÃ£o de compartilhar, e adicionar animaÃ§Ã£o suave de flutuaÃ§Ã£o nos selos.
- O card foi ajustado para:
  - `width: fit-content` com `max-width` responsivo e `truncate` para evitar overflow;
  - posicionamento vertical calculado por mediÃ§Ã£o do DOM para manter distÃ¢ncia equivalente entre selo e overlay / overlay e botÃ£o de compartilhamento;
  - animaÃ§Ã£o de flutuaÃ§Ã£o contÃ­nua com atraso escalonado por selo e respeito ao `prefers-reduced-motion`.
- ValidaÃ§Ãµes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - `adrs/0047-selos-card-fitted-animation-e-espacamento-dinamico.md` criado e atualizado com esta decisÃ£o.

## ValidaÃ§Ã£o mÃ­nima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluÃ­da em um commit prÃ³prio. Se houver bloqueio externo, registre claramente o bloqueio e nÃ£o avance para a prÃ³xima task.

## Execucao complementar: layout imersivo alinhado ao PDF e navbar compartilhada (2026-06-11)

- Pedido do usuario: aplicar o layout visual do PDF anexado `Nova tela psicologos.pdf` na rota `/app/psychologists`, preservando a arquitetura e a navbar padrao do projeto.
- Antes de alterar o codigo, foram mapeados os reaproveitamentos: `PrivateTemplate`/navbar compartilhada, `PageShell`, `useDirectoryPsychologists`, `usePatient`, filtros via `usePsychologistsFilterForm`, `LoadingState`, `InlineAlert`, `EmptyState`, `VerifiedBadgeIcon`, `WhatsAppIcon` e
ext/image`.
- A navbar customizada local da tela foi removida; a rota passou a reutilizar exclusivamente a navegacao do `PrivateTemplate`, mantendo item ativo, altura, espacamento, icones e comportamento globais.
- O `PrivateTemplate` recebeu a prop opcional `contentClassName` para permitir tela imersiva sem padding do `PageShell` nesta rota, sem alterar o default das demais telas.
- O layout foi ajustado para foto em tela cheia, busca flutuante, botao de filtros, overlay inferior mais forte, coluna lateral de acoes e informacoes do psicologo sobre a imagem, sem criar mocks nem dados fake.
- Referencia visual: PDF anexado pelo usuario (`C:\Users\tulio\Downloads\Nova tela psicÃ³logos.pdf`), renderizado localmente apenas para inspecao visual; Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao.
- ADR atualizado: `adrs/0055-refatoracao-listagem-psicologos-imersiva.md`.
- Validacoes executadas: ver registro do commit desta execucao.

## Execucao complementar: ajuste de escala dos elementos do layout imersivo (2026-06-11)

- Pedido do usuario: ajustar o tamanho dos elementos da tela de Psicologos tomando o PDF `Nova tela psicologos.pdf` como referencia visual.
- A navbar compartilhada do `PrivateTemplate` foi preservada sem criar componente novo.
- Os elementos da camada imersiva foram recalibrados: botoes laterais, botao de filtro, espacamentos da coluna de acoes e tipografia do bloco inferior ficaram mais compactos para se aproximar da escala visual do PDF e evitar quebra desnecessaria do subtitulo/avaliacao.
- Nao houve alteracao de API, dados, mocks ou migrations.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e browser local em 375x667 na rota `/app/psychologists` (com limitacao de dados reais por sessao/API local do agente).

## Execucao complementar: visual matching do layout imersivo (2026-06-11)

- Pedido do usuario: nao fazer pixel matching; fazer visual matching contra o PDF `Nova tela psicologos.pdf`.
- O PDF foi renderizado localmente apenas para leitura visual de hierarquia e proporcao; nao foi usado como fonte de medidas pixel-perfect.
- A navbar compartilhada do `PrivateTemplate` foi preservada sem mudanca de componente, altura, itens ou comportamento.
- A tela de Psicologos passou a usar proporcoes visuais mais proximas da referencia: botao de filtro menor que os botoes laterais, coluna lateral ancorada mais abaixo no campo visual, busca compacta, rating em pill translucida e overlay inferior com tipografia menos pesada.
- Nenhum mock, seed ou dado fake foi criado; a tela continua dependente dos dados reais da API ja existente.
- Nao houve alteracao de Prisma, migrations ou backend.
- Validacoes executadas nesta etapa:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - `Invoke-WebRequest http://127.0.0.1:3000/app/psychologists` retornou HTTP 200

## Execucao complementar: video imersivo e escala social (2026-06-11)

- Pedido do usuario: usar o video do psicologo como fundo da tela de Psicologos, em loop, iniciando mudo com icone de mute, com tap na tela para pausar/retomar, e reduzir a escala dos controles para um padrao mais proximo de redes sociais como TikTok.
- A implementacao usa `video_url` real do contrato de descoberta como camada de fundo quando disponivel, com `autoPlay`, `loop`, `muted`, `playsInline`, poster por `video_cover_url`/avatar e fallback honesto para imagem/iniciais quando nao ha video.
- O tap na area de midia pausa/retoma o video; o controle de som e separado para nao confundir pause com unmute.
- O nome deixou de receber prefixo `Dr.`/`Dra.` nesta tela; o selo verificado permanece como indicador visual independente.
- O texto de experiencia foi compactado para `N anos exp.` e a avaliacao foi mantida na mesma linha, em pill translucida.
- O selo `Disponivel hoje` passou a pulsar; o texto inferior usa a bio real (`bio`) com fallback apenas para headline publica quando a bio estiver ausente, sem lorem ipsum ou mock.
- Botoes laterais, icones, labels, busca e tipografia do overlay foram reduzidos para peso visual mais parecido com redes sociais, preservando a navbar compartilhada.
- Nao houve alteracao de backend, Prisma, migrations, seeds ou dados fake.
- Validacoes executadas nesta etapa:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - `Invoke-WebRequest http://127.0.0.1:3000/app/psychologists` retornou HTTP 200

## Execucao complementar: alinhamento da coluna de acoes (2026-06-11)

- Pedido do usuario: alinhar o eixo vertical dos quatro botoes laterais (`Favoritar`, `WhatsApp`, `Compartilhar` e `Perfil`), pois `Compartilhar` estava visualmente desalinhado.
- Os grupos da coluna lateral passaram a centralizar explicitamente seus itens com `justify-items-center`, evitando que labels mais largos desloquem o centro visual do botao.
- Navbar, tamanhos, comportamento do video, dados e API nao foram alterados.
- Validacoes executadas nesta etapa: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e HTTP 200 em `/app/psychologists`.

## Execucao complementar: fallback de capa do video e readequacao do bloco de overlay (2026-06-11)

- Pedido do usuario:
  - Caso o video trave antes de iniciar, exibir a imagem de capa (quando houver), evitando fallback para avatar;
  - manter a bio completa abaixo da linha de titulo do profissional, sem truncamento;
  - reduzir a area de escurecimento da imagem de fundo ao recorte inferior onde fica o nome/bio;
  - aproximar a base da bio do topo da navbar e deslocar a coluna lateral de acoes para baixo.
- Ajustes implementados:
  - `logic.tsx` agora trata falha de carregamento do `video` via estado local `isVideoPlaybackFailed`;
  - ao ocorrer erro/rejeiÃ§Ã£o de play antes da reproduÃ§Ã£o, a tela passa a exibir `video_cover_url` (ou avatar como fallback) em vez do avatar quando o video nao carrega;
  - o texto da bio passou a renderizar sem `line-clamp`, garantindo exibicao integral;
  - o gradiente do overlay foi encurtado para escurecer apenas ate a faixa inferior da imagem;
  - o bloco de overlay inferior recebeu `bioBottomOffset` para aproximar a base do texto da base da navbar;
  - a posiÃ§Ã£o vertical da coluna lateral (`actionTop`) foi rebaixada para alinhar o label `Perfil` com a linha de base do texto de bio.
- Nenhum novo pacote foi instalado.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`

## Execucao complementar: zonas de interacao e bio inline (2026-06-11)

- Pedido do usuario: ajustar zonas de interacao da tela de Psicologos para que apenas a area livre da midia pause/reproduza o video, enquanto selo, nome, subtitulo, bio, botoes laterais e navbar nao disparem o player.
- O nome do psicologo passou a ser clicavel em toda a area do texto e navega para a mesma rota de perfil usada no botao lateral.
- A bio permanece limitada a 2 linhas no estado recolhido, com ellipsis apenas nela; quando truncada, o toque/clique alterna expansao inline, sem modal ou bottom sheet.
- O bloco inferior permanece ancorado acima da navbar; a expansao cresce para cima e usa limite de altura/rolagem interna para evitar sobreposicao da navbar ou da coluna lateral.
- Botoes laterais mantem suas acoes especificas e interrompem a propagacao do clique antes de executar favorito, compartilhar, WhatsApp ou perfil.
- Nao houve alteracao de backend, Prisma, migrations, packages, mocks ou dados do psicologo.
- Referencia visual/proto reconsultada: tela Psicologos no `PROTO-INVENTORY.md` e imagem local correspondente em `_product/proto`; Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas nesta etapa: ver registro do commit desta execucao.

## Execucao complementar: animacao lateral de selos comerciais (2026-06-11)

- Pedido do usuario: criar no video do psicologo uma animacao lateral similar a curtidas do TikTok, usando os selos `desconto 1a sessao`, `valor social` e `aceita convenios`.
- A tela passou a montar os selos apenas a partir dos campos reais ja expostos pela API (`discount_first_session`, `social_value`, `accepts_insurance`), sem mocks ou dados inventados.
- Foi adicionada uma camada visual lateral esquerda com pills flutuantes em loop sobre a midia, sem alterar navbar, botoes laterais, dados do psicologo ou fluxo de reproducao do video.
- A animacao respeita `prefers-reduced-motion`, ficando estatica quando o usuario prefere menos movimento.
- O MP4 local informado foi tratado como referencia de intencao visual; este ambiente nao expos `ffmpeg`/decoder para extracao confiavel de frames.
- ADR criado: `adrs/0057-animacao-selos-video-psicologos.md`.
- Validacoes executadas nesta etapa: ver registro do commit desta execucao.


## Execucao complementar: refinamento visual dos selos comerciais (2026-06-11)

- Pedido do usuario: substituir a ideia anterior por um layout igual a referencia local `image (6).png`: pills pequenas empilhadas sobre o video, com icone de premio/prize em cada selo.
- Os selos continuam usando somente os campos reais `discount_first_session`, `social_value` e `accepts_insurance`.
- A animacao foi refinada para entrada em cascata e flutuacao suave, com visual transl?cido e discreto, sem efeito de curtidas/TikTok.
- Nao houve alteracao de backend, Prisma, migrations, packages, mocks ou dados do psicologo.
- ADR atualizado: `adrs/0057-animacao-selos-video-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir backend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - smoke real do endpoint local `GET /api/private/directory/psychologists?limit=1&modality=online`
    retornando HTTP 200;
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.


## Execucao complementar: alinhamento lateral dos elementos imersivos (2026-06-11)

- Pedido do usuario: alinhar as margens dos elementos da tela, mantendo barra de pesquisa, selos e texto/bio na mesma guia esquerda, e botao de filtros com a coluna lateral de acoes na mesma guia direita.
- A largura da coluna lateral foi ajustada ao tamanho real dos botoes de acao para que o eixo visual fique alinhado ao filtro, sem alterar navbar, dados ou acoes.
- Os selos flutuantes passaram a usar a mesma margem esquerda do campo de busca e do bloco de informacoes do psicologo.
- Nao houve alteracao de backend, Prisma, migrations, packages, mocks ou dados do psicologo.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas nesta etapa: ver registro do commit desta execucao.


## Execucao complementar: nome semibold e visibilidade do tempo de experiencia (2026-06-11)

- Pedido do usuario: deixar o nome do psicologo em semibold no card e remover o tempo de experiencia ao lado de Psicologo/Psicologa quando o profissional desmarcar a opcao de exibir experiencia.
- A tela imersiva `/app/psychologists` e o componente de card `frontend/src/components/psychologists/psychologist-card.tsx` passaram a respeitar `show_experience_tag === false`.
- Quando a preferencia esta ausente ou verdadeira, o comportamento anterior de mostrar tempo de experiencia e preservado.
- Nao houve alteracao de backend, Prisma, migrations, packages, mocks ou dados do psicologo.
- ADR criado: `adrs/0058-visibilidade-experiencia-card-psicologo.md`.
- Validacoes executadas nesta etapa: ver registro do commit desta execucao.

## Execucao complementar: reducao da margem esquerda (2026-06-11)

- Pedido do usuario: diminuir a margem esquerda na tela de Psicologos.
- O `horizontalPadding` da tela imersiva foi reduzido, movendo barra de busca, selos flutuantes e bloco textual inferior para mais perto da borda esquerda de forma consistente.
- A guia direita do filtro/acoes, navbar, dados, backend, Prisma, migrations e packages nao foram alterados.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas nesta etapa: ver registro do commit desta execucao.

## Execucao complementar: bloqueio de play/pause na faixa entre bio e navbar (2026-06-11)

- Pedido do usuario: impedir que o espaco entre a base do texto da bio e a navbar ative play/pause do video.
- Foi adicionada uma faixa transparente acima da navbar que intercepta clique/toque e nao executa acao, mantendo o video controlavel apenas na area livre da midia.
- O ajuste nao altera navbar, botoes laterais, dados do psicologo, backend, Prisma, migrations ou packages.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas nesta etapa: ver registro do commit desta execucao.

## Execucao complementar: filtros avancados de busca (2026-06-11)

- Pedido do usuario: revisar a copia dos filtros, trocar o placeholder de busca para `Busque pelo nome ou CRP`,
  adicionar lupa no campo, permitir busca digitavel em especialidade, ordenar servicos e adicionar filtros por
  publico, localizacao, genero, raca/cor, religiao, idiomas e selos de experiencia/acessibilidade.
- O endpoint real `GET /api/private/directory/psychologists` passou a aceitar e aplicar os novos query params:
  `target_audience`, `state`, `city`, `gender`, `race_color`, `religion`, `language`,
  `more_experienced`, `discount_first_session`, `accepts_insurance` e `social_value`.
- Os filtros usam campos persistidos de `psychologist_profile`; `more_experienced=true` usa a data real de
  inscricao CRP anterior a 10 anos e respeita `show_experience_tag=true`.
- O frontend manteve a fundacao da TASK-02 e estendeu os controllers existentes para input com icone leading,
  select pesquisavel e opcoes dependentes (cidade por estado), sem instalar pacote novo.
- A especialidade pesquisavel segue as mesmas categorias da configuracao do psicologo; servicos seguem a ordem
  solicitada pelo produto.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual continua sendo
  `_product/proto/Psicologos.jpg` e `_product/proto/Filtros de Psicologos - Servicos Expandidos.jpg`.
- ADR criado: `adrs/0059-filtros-avancados-busca-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir backend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - smoke real do endpoint local com todos os novos filtros retornando HTTP 200;
  - Chrome headless local em `http://127.0.0.1:3005/app/psychologists`, viewport `390x844`,
    confirmando renderizacao da tela com a busca `Busque pelo nome ou CRP`.

## Execucao complementar: pausa do video ao abrir filtros (2026-06-11)

- Pedido do usuario: quando abrir a modal de filtros, pausar o video do psicologo que estiver rodando ao fundo.
- `handleFiltersOpen` agora pausa o `video` referenciado pela tela imersiva e marca `isVideoPaused=true` antes de
  abrir a modal.
- O fechamento da modal nao retoma o video automaticamente; o usuario continua controlando play/pause pela area
  livre da midia.
- O ajuste nao altera filtros, dados, backend, Prisma, migrations ou packages.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas nesta etapa: ver registro do commit desta execucao.

## Execucao complementar: sugestoes na busca principal e filtros sem busca textual (2026-06-11)

- Pedido do usuario: remover o campo de busca por nome/CRP de dentro da modal de filtros e sugerir nomes de
  profissionais cadastrados, verificados e gratuitos quando o usuario digitar na busca principal da tela.
- A modal de filtros agora exibe apenas criterios avancados; a busca textual fica somente na barra principal da
  tela `/app/psychologists`.
- A barra principal passou a ser controlada e, a partir de 2 caracteres, consulta o endpoint real
  `GET /api/private/directory/psychologists` com `limit=8` para sugerir psicologos publicados/cadastrados.
- As sugestoes filtram o retorno pelo nome do profissional e exibem selo `Verificado` para perfis com entitlement
  profissional ativo ou `Gratuito` para perfis publicados sem esse entitlement.
- Selecionar uma sugestao aplica o nome na busca preservando os demais filtros ativos.
- Nao houve alteracao de backend, Prisma, migrations, packages, mocks ou dados do psicologo.
- ADR atualizado: `adrs/0059-filtros-avancados-busca-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - smoke real do endpoint local `GET /api/private/directory/psychologists?limit=8&search=Ana`
    retornando HTTP 200 e sugestao `Ana Rubia Cunha Papi`;
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: Estado e Cidade lado a lado nos filtros (2026-06-11)

- Pedido do usuario: dentro do filtro de psicologos, colocar `Estado` e `Cidade` lado a lado.
- A modal de filtros manteve a fundacao da TASK-02 e passou a renderizar o formulario em grid de duas colunas.
- Apenas os campos `Estado` e `Cidade` ocupam uma coluna cada; os demais filtros seguem em largura total para preservar legibilidade, hierarquia e o comportamento mobile-first.
- A dependencia de cidade por estado foi preservada, sem alterar backend, dados, Prisma, migrations, packages ou filtros existentes.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg` e `_product/proto/Filtros de Psicologos - Servicos Expandidos.jpg`.
- ADR atualizado: `adrs/0059-filtros-avancados-busca-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: Modalidades de atendimento nos filtros (2026-06-11)

- Pedido do usuario: no filtro de psicologos, apos `Servicos`, adicionar `Modalidades de atendimento`.
- A modal de filtros manteve a fundacao da TASK-02 e passou a renderizar o novo select logo depois de `Servicos`, antes de `Abordagens`.
- As opcoes reutilizam a mesma taxonomia da configuracao do psicologo: `Online`, `Presencial` e `Presencial e Online`.
- O endpoint real `GET /api/private/directory/psychologists` passou a aceitar `modality` e filtrar por `psychologist_profile.modality`, sem mocks, seeds, migrations ou packages novos.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg` e `_product/proto/Filtros de Psicologos - Servicos Expandidos.jpg`.
- ADR atualizado: `adrs/0059-filtros-avancados-busca-psicologos.md`.
- Validacoes executadas nesta etapa: ver registro do commit desta execucao.

## Execucao complementar: alternancia por scroll no feed imersivo (2026-06-12)

- Pedido do usuario: ao scrollar a tela de Psicologos, alternar entre o perfil real `Ana Rubia` e o perfil de teste criado, em vez de manter sempre o primeiro item da listagem.
- A tela `/app/psychologists` deixou de fixar a exibicao em `psychologists[0]` e passou a manter um indice ativo local sobre os resultados reais da API.
- Wheel/scroll vertical e swipe vertical agora avancam/voltam entre os psicologos carregados; no limite da pagina, a paginacao real `page`/`limit` e usada quando houver pagina seguinte/anterior.
- O ajuste preserva as zonas de interacao existentes: tap na midia livre controla play/pause, busca/modal/bio expandida bloqueiam navegacao por scroll e um swipe de navegacao nao dispara play/pause residual.
- Nao houve alteracao de backend, Prisma, migrations, packages, mocks ou dados do psicologo.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg` e o contrato da TASK-13.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: padronizacao do botao WhatsApp nos videos (2026-06-12)

- Pedido do usuario: manter o botao de WhatsApp identico em todos os videos, usando como referencia o primeiro botao criado.
- A tela `/app/psychologists` passou a renderizar o mesmo circulo verde `#22C55E` com `WhatsAppIcon` branco tanto para profissionais com `whatsapp_url` quanto para profissionais sem WhatsApp publico disponivel.
- Quando nao ha `whatsapp_url`, o botao fica visualmente igual, mas sem abrir link externo; ele usa `aria-disabled` e bloqueia propagacao do clique/toque para nao pausar/reproduzir o video por acidente.
- Nao houve alteracao de backend, Prisma, migrations, packages, mocks ou dados do psicologo.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: icones laterais sem fundo branco (2026-06-12)

- Pedido do usuario: remover o fundo branco dos icones de favoritar e compartilhar e trocar a cor cinza por branco.
- Os botoes laterais `Favoritar` e `Compartilhar` em `/app/psychologists` agora usam fundo transparente sobre o video; o icone neutro fica branco e o estado favoritado preserva vermelho como feedback de selecao.
- O comportamento das acoes, navbar, WhatsApp, perfil, dados, backend, Prisma, migrations e packages nao foi alterado.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: feed vertical com scroll-snap entre videos (2026-06-12)

- Pedido do usuario: transformar a transicao entre psicologos em uma rolagem vertical fluida no estilo TikTok/Reels, fazendo a tela inteira do psicologo atual subir enquanto a proxima entra por baixo.
- A tela `/app/psychologists` passou a renderizar os profissionais reais da pagina retornada pela API como uma lista vertical paginada por `scroll-snap`, com cada slide ocupando `100dvh`.
- Busca, botao de filtros, selos, video/fallback, overlay, nome, selo verificado, profissao/experiencia/nota, bio e botoes laterais agora vivem dentro do slide de cada psicologo, evitando UI presa globalmente enquanto apenas o video muda.
- O indice ativo e calculado pela posicao de rolagem do container; ao mudar o psicologo ativo, a UI volta ao estado visivel padrao, a bio recolhe, o feedback de compartilhamento fecha, o estado do player e reiniciado e a coluna lateral e recalculada.
- Videos fora do slide ativo sao pausados; somente o slide ativo responde a play/pause e mute/unmute. A navbar global do `PrivateTemplate` foi preservada como componente compartilhado do shell.
- Nao houve alteracao de backend, Prisma, migrations, packages, mocks ou dados do psicologo.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: dinamica imersiva por gestos no video (2026-06-12)

- Pedido do usuario: implementar a experiencia imersiva por gestos na tela de Psicologos, com toque simples para ocultar/exibir UI, duplo toque para favoritar/desfavoritar e pressionar-e-segurar para pausar temporariamente.
- A area livre da midia agora diferencia toque simples, duplo toque e long press por timeouts curtos, limpando o toque simples quando ha duplo toque ou pressionar-e-segurar.
- `isUiHidden` oculta busca, filtro, selos, bloco textual, botoes laterais, feedbacks persistentes, gradientes, sombreamento inferior e navbar global, deixando apenas a midia visivel no slide.
- O duplo toque chama a mesma funcao de favorito do botao lateral e exibe feedback visual rapido sem pausar video nem alterar a visibilidade da UI.
- O long press pausa o video ativo enquanto o usuario pressiona e retoma ao soltar, sem favoritar e sem alternar UI.
- A navbar continua sendo a global do `PrivateTemplate`; foi adicionada uma prop opcional para oculta-la no modo imersivo sem criar navegacao paralela.
- Ao trocar de psicologo ativo, os timeouts e estados de gesto sao resetados e a UI volta visivel no novo video.
- Nao houve alteracao de backend, Prisma, migrations, packages, mocks ou dados do psicologo.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: coluna lateral apenas com icones (2026-06-12)

- Pedido do usuario: remover os labels `Favoritar`, `Compartilhar`, `WhatsApp` e `Perfil` da coluna lateral e ajustar a escala dos icones de favoritar/compartilhar para equilibrar os quatro itens.
- A coluna lateral agora exibe apenas coracao, compartilhar, WhatsApp e avatar do perfil, sem reservar espaco visual para texto.
- Os containers dos botoes foram mantidos; apenas o tamanho interno de coracao e compartilhar foi aumentado para aproximar o peso visual de WhatsApp e Perfil.
- As acoes, `aria-labels`, modo imersivo, scroll-snap, navbar, responsividade e dados do psicologo foram preservados.
- Nao houve alteracao de backend, Prisma, migrations, packages, mocks ou dados do psicologo.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: compactacao do espacamento lateral (2026-06-12)

- Pedido do usuario: apos remover os labels, reduzir o espacamento vertical entre os botoes laterais em aproximadamente 10% a 15%.
- O `actionGap` da coluna lateral foi reduzido de `14px` para `12px` em telas compactas e de `18px` para `16px` nas demais, mantendo os containers, acoes, responsividade, modo imersivo e posicao geral.
- Nao houve alteracao de backend, Prisma, migrations, packages, mocks ou dados do psicologo.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: onboarding de swipe na tela de Psicologos (2026-06-12)

- Pedido do usuario: ensinar o usuario que pode deslizar verticalmente para navegar entre profissionais.
- Usuarios sem `lectum:psychologists:has-seen-swipe-hint` no `localStorage` recebem a dica `Deslize para descobrir novos psicologos` acima da navbar, centralizada, com seta para cima e animacao suave de flutuacao.
- A dica desaparece apos 3 segundos; se o usuario permanecer 5 segundos sem interacao no primeiro video, reaparece por 2 segundos.
- O slide ativo recebe uma unica animacao sutil de nudge vertical de aproximadamente 8px e retorna ao ponto original.
- Ao primeiro swipe vertical bem-sucedido, a chave local e marcada como vista, a dica e ocultada e nao aparece automaticamente nas proximas visitas.
- A dica nao intercepta cliques/toques e nao altera midia, acoes, navbar, dados, backend, Prisma, migrations ou packages.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: hierarquia tipografica do bloco inferior (2026-06-12)

- Pedido do usuario: refinar a hierarquia tipografica do bloco inferior da tela de Psicologos para destacar nome, linha profissional, bio e selo `Disponivel hoje` em ordem clara.
- O nome do psicologo passou a usar 16-17px, peso 700, line-height de 20px e continua sem `ellipsis`; o selo verificado foi reduzido para 12-14px e segue agrupado com a ultima palavra do nome.
- Profissao/experiencia e avaliacao foram reduzidas para escala secundaria, com fonte 11-12px, peso 500, cor branca mais suave e pill de nota compacta.
- A bio passou a usar 12px/16px, aparece completa ate 4 linhas e, quando ultrapassa esse limite, usa `Ver mais` / `Ver menos` com expansao inline, sem modal, bottom sheet ou ellipsis.
- O selo `Disponivel hoje` foi compactado para 10-11px com padding reduzido, e o gradiente inferior ficou mais sutil para preservar a midia como elemento principal.
- O bloco inferior permanece ancorado acima da navbar, cresce para cima quando a bio expande e preserva a area reservada da coluna lateral; navbar, video, busca, filtros, botoes laterais, gestos, favoritos e navegacao para perfil nao foram alterados.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg` e o contrato da TASK-13.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: busca e filtro fixos no feed vertical (2026-06-12)

- Pedido do usuario: ao scrollar/swipar entre videos na tela de Psicologos, manter a barra de busca e o botao de filtros fixos no topo, sem acompanhar o deslocamento dos slides.
- A busca e o botao de filtros sairam do `map` de psicologos e passaram a ser renderizados uma unica vez no container principal da tela, acima da camada de videos.
- Os slides agora mantem apenas conteudos especificos do psicologo: video/midia, selos, nome, selo verificado, profissao/experiencia/nota, bio, coluna lateral e gradientes/overlays.
- A camada global de busca/filtro fica ancorada no topo com z-index acima da midia, permitindo que os videos passem por tras sem piscar ou recriar controles a cada item.
- No modo imersivo, `isUiHidden=true` tambem oculta busca e filtro; ao mudar de psicologo, o reset existente de `isUiHidden=false` faz a camada global reaparecer.
- A modal de filtros segue cobrindo a tela e pausando o video ativo; busca, filtros, sugestoes, gestos, favoritos, navbar, backend, Prisma, migrations e packages nao foram alterados.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg` e o contrato da TASK-13.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: barra de progresso interativa do video (2026-06-12)

- Pedido do usuario: implementar uma barra de progresso discreta no estilo TikTok/Reels para os videos da tela de Psicologos.
- Cada slide com video agora renderiza sua propria barra de progresso na base da midia; ela acompanha o slide durante o scroll vertical, enquanto busca e filtro seguem fixos no topo.
- A barra acompanha `currentTime` e `duration` do video ativo em tempo real, usando eventos nativos do video e sincronizacao por `requestAnimationFrame`.
- Toque/click na barra executa seek imediato; arraste permite avancar e retroceder, atualizando visual e video durante a interacao.
- A barra expande de forma sutil durante o arraste e mostra thumb apenas enquanto o usuario interage; nao exibe tempo e nao usa visual de player estilo YouTube.
- A interacao da barra tem prioridade sobre gestos da tela: usa `stopPropagation`, `preventDefault`, `touch-action: none` e cancela timeouts pendentes de toque/long press para nao ocultar UI, favoritar, pausar ou disparar scroll.
- No modo imersivo, a barra permanece visivel e funcional como unico elemento de interface; tocar fora dela continua restaurando a UI, e long press/duplo toque fora dela seguem funcionando.
- O bloco inferior foi elevado para reservar espaco da barra acima da navbar, evitando cobrir textos, bio ou botoes laterais em larguras compactas.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, busca, filtros globais, favoritos, navegacao de perfil ou navbar.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg` e o contrato da TASK-13.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: prioridade de gestos e primeiro toque com som (2026-06-12)

- Pedido do usuario: corrigir pressionar-e-segurar, manter autoplay inicial mudo e fazer o primeiro toque em area livre desmutar o video e ocultar a UI ao mesmo tempo.
- O long press agora usa timer de 520ms iniciado no `pointerDown`; ao ativar, pausa o video ativo, cancela toque simples pendente e marca o gesto para nao disparar favorito, mute/unmute ou alternancia da UI.
- Ao soltar apos long press, o video volta a reproduzir e o estado visual da UI e do som permanece igual ao anterior ao gesto.
- O primeiro toque simples em video mudo executa `unmute`, mantem/reinicia a reproducao e oculta a UI; depois disso, o icone de mute deixa de aparecer, salvo se existir acao explicita futura de mutar.
- A prioridade fica long press > double tap > single tap: duplo toque cancela o single tap e continua usando a logica real de favorito/desfavorito, sem pausar, ocultar UI ou alterar som.
- A barra de progresso segue bloqueando os gestos do video com `stopPropagation`, `preventDefault` e cancelamento dos timers pendentes durante seek.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, busca, filtros, navbar, favoritos ou navegacao de perfil.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg` e o contrato da TASK-13.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: favoritos silenciosos no feed imersivo (2026-06-12)

- Pedido do usuario: remover completamente a notificacao verde exibida ao favoritar ou desfavoritar psicologos.
- As requisicoes reais `POST /api/private/user/favorites/:id` e `DELETE /api/private/user/favorites/:id` deixaram de solicitar `showSuccess` no `handleReq`, entao mensagens como `Psicologo adicionado aos favoritos` e `Psicologo removido dos favoritos` nao geram toast/snackbar/banner.
- A persistencia no banco, invalidacao/sincronizacao das queries de favoritos, estado otimista e sincronizacao com a tela de Favoritos foram preservadas no caller React Query existente.
- O feedback da tela de Psicologos fica restrito ao estado visual do coracao e ao feedback animado ja existente no duplo toque, sem texto temporario sobre o video.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, navbar, busca, filtros ou navegacao de perfil.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg` e o contrato da TASK-13.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: hierarquia visual premium do bloco inferior (2026-06-12)

- Pedido do usuario: refinar a hierarquia visual do bloco inferior da tela de Psicologos sem alterar chips superiores, busca, filtro, navbar ou posicao da coluna lateral.
- O nome do psicologo foi aumentado para a faixa 17-18px, com peso 700 e line-height proporcional, mantendo quebra natural sem `ellipsis` e continuando como principal elemento textual.
- O selo verificado permanece preso a ultima parte do nome com respiro horizontal maior, evitando ficar sozinho em uma linha propria.
- O selo `Disponivel hoje` manteve o tamanho atual, mas ganhou mais espaco abaixo para funcionar como indicador secundario, e nao como titulo.
- Profissao/experiencia seguem em 11-12px, peso 500, com opacidade menor; a avaliacao ganhou respiro horizontal para parecer dado complementar.
- A bio manteve tamanho de 12px, ganhou line-height de 17px e voltou a aparecer recolhida em ate 2 linhas com expansao inline ao clique.
- O espacamento vertical entre selo, nome, linha profissional e bio foi ampliado para criar blocos mais distintos e uma leitura mais premium em telas compactas.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, chips superiores, busca, filtros, navbar, botoes laterais, gestos, favoritos ou navegacao de perfil.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg` e o contrato da TASK-13.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: microcopy da busca principal (2026-06-12)

- Pedido do usuario: trocar o placeholder da barra de busca na pagina de Psicologos de `Busque pelo nome ou CRP` para `Busque psicólogos`.
- A alteracao foi aplicada somente na barra de busca global/fixa de `/app/psychologists`, preservando o comportamento de busca por nome/CRP, sugestoes, filtros, navbar, slides, gestos e dados reais da API.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, layout estrutural ou regras de busca.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg` e o contrato da TASK-13.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: foco prioritario da busca com pausa do video (2026-06-12)

- Pedido do usuario: ao focar na busca da tela de Psicologos, colocar a barra em primeiro plano, escurecer/desfocar o restante da tela e pausar imediatamente o video ativo sem reiniciar nem alterar progresso.
- A busca global ganhou modo focado com overlay `rgba(0,0,0,0.35)`, leve blur do fundo, barra mais solida e filtro acima do overlay; video, selos, textos, botoes laterais e barra de progresso ficam em segundo plano.
- Ao entrar no modo de busca, o video ativo e pausado no frame atual e a flag local registra se ele estava reproduzindo para retomar apenas quando apropriado.
- Ao tocar no overlay, perder foco, pressionar `Escape`, submeter busca ou selecionar sugestao, a busca sai do modo focado, o teclado fecha e o video retoma do mesmo `currentTime` quando estava tocando antes da busca.
- Enquanto a busca esta focada, scroll vertical do feed, troca de slide, single tap, double tap, long press, favoritar e interacao com a barra de progresso ficam bloqueados pela combinacao de overlay, `overflow-hidden`, guards de gesto e cancelamento de timers pendentes.
- O `PrivateTemplate` recebeu a prop opcional `navigationDimmed`, usada apenas nesta tela para manter a navbar visivel, mas visualmente secundaria e sem interacao durante o foco da busca.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, contrato da API, sugestoes, filtros ou navegacao de perfil.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg` e o contrato da TASK-13.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: barra de progresso como controle real do video (2026-06-12)

- Pedido do usuario: ajustar a barra de progresso de `/app/psychologists` para funcionar como controle real do video, com click, arraste, pausa temporaria durante a interacao e posicionamento integrado a navbar/modo imersivo.
- A barra agora ocupa 100% da largura, sem margens laterais, usando `bg-primary` como azul Lectum e trilha com baixa opacidade; em repouso fica fina e expande somente durante scrubbing.
- Com UI visivel, a barra fica colada ao topo da navbar global; com UI oculta, permanece visivel no rodape da viewport como unico controle junto do video.
- No `pointerDown`, a barra salva se o video estava reproduzindo, pausa o `HTMLVideoElement`, cancela timers de toque/long press e aplica seek imediato na posicao tocada.
- Durante `pointerMove`, o seek e continuo: `video.currentTime`, `currentTime`/`duration` e a largura visual do progresso sao atualizados em tempo real para que o frame acompanhe o arraste.
- No `pointerUp`/`pointerCancel`, a barra libera a captura do ponteiro, encerra o scrubbing e retoma a reproducao somente se o video estava tocando antes da interacao; se estava pausado, permanece pausado.
- A interacao da barra continua com prioridade maxima sobre gestos do feed por `stopPropagation`, `preventDefault`, `touch-action: none`, captura de ponteiro e cancelamento de timers, evitando single tap, double tap, long press, favorito ou scroll vertical.
- Ao trocar de psicologo, o reset de estado limpa scrubbing, preview de seek e a flag de retomada, mantendo o novo video com barra sincronizada desde o inicio.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, busca, filtros, navbar, favoritos ou navegacao de perfil.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg` e o contrato da TASK-13.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: tolerancia de movimento no long press (2026-06-12)

- Pedido do usuario: ajustar o pressionar-e-segurar da tela de Psicologos para pausar como apps modernos de video curto, tolerando pequenos movimentos involuntarios do dedo/mouse.
- O long press passou a usar uma tolerancia explicita de 20px antes de considerar que o ponteiro saiu da area de pressao natural.
- Movimentos leves dentro da tolerancia nao cancelam o timer de long press e, se o video ja estiver pausado por long press, continuam mantendo a pausa ativa.
- O cancelamento agora exige intencao clara de navegacao: deslocamento vertical dominante acima do limiar ou drag significativo, permitindo scroll/swipe para trocar de psicologo sem transformar qualquer microdeslocamento em cancelamento.
- Foi separado o movimento que apenas deve suprimir um clique acidental do movimento que cancela o long press, preservando pausa com pequenas oscilacoes e evitando toggle de UI quando o usuario arrastou antes de soltar.
- Quando um scroll intencional e detectado depois de a pausa por long press estar ativa, o estado de long press e encerrado, o video retoma e a captura do ponteiro e liberada para o feed.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, busca, filtros, barra de progresso, favoritos, navbar ou navegacao de perfil.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg` e o contrato da TASK-13.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: bio completa sem truncamento (2026-06-12)

- Pedido do usuario: a decisao mais recente de produto substitui a implementacao anterior de truncagem/expansao da bio na tela de Psicologos.
- A bio deixou de usar `Ver mais`, `Ver menos`, limite por linhas, `max-height`, `overflow: hidden`, ellipsis ou qualquer interacao de expansao.
- O texto da bio agora e renderizado integralmente em um paragrafo simples, preservando quebras de linha com `white-space: pre-line` e mantendo a tipografia definida para legibilidade.
- O bloco inferior permanece ancorado acima da navbar; quando a bio tem mais linhas, o conteudo cresce para cima, preservando a base acima da navbar e sem empurrar a navegacao.
- A bio continua ocupando apenas a coluna textual, reservando a coluna lateral para os botoes de acao e mantendo a propagacao de eventos bloqueada para nao acionar gestos do video ao tocar no texto.
- Removidos estados e calculos de truncamento/expansao da bio, incluindo medicao de linhas e controle de `isBioExpanded`/`isBioTruncated`.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, busca, filtros, barra de progresso, favoritos, navbar ou navegacao de perfil.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg` e o contrato da TASK-13.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: indicador Disponivel hoje discreto (2026-06-12)

- Pedido do usuario: refinar o indicador `Disponivel hoje` para deixar de parecer badge/botao e virar uma informacao complementar no bloco inferior da tela de Psicologos.
- O indicador perdeu fundo branco, formato pill, padding de badge, animacao de pulse/ping e qualquer destaque de container.
- O novo visual usa apenas uma bolinha verde pequena a esquerda e texto em verde claro, sem borda, sombra ou superficie propria.
- A hierarquia do bloco inferior foi preservada para que o nome do psicologo continue sendo o primeiro elemento textual percebido, com o indicador funcionando como metadado discreto.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, busca, filtros, bio, barra de progresso, favoritos, navbar ou navegacao de perfil.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg` e o contrato da TASK-13.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: microcopy da busca para Buscar psicologos (2026-06-12)

- Pedido do usuario: alterar o placeholder da barra de busca da pagina de Psicologos de `Busque psicologos` para `Buscar psicologos`.
- A mudanca foi aplicada somente no texto do placeholder da busca global/fixa de `/app/psychologists`.
- A busca continua usando a mesma logica, parametro textual, sugestoes, foco prioritario, filtros, rota e dados reais da API.
- Nao houve alteracao de backend, Prisma, migrations, packages, layout estrutural, gestos, barra de progresso, favoritos, navbar ou navegacao de perfil.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg` e o contrato da TASK-13.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: reset de video ao trocar psicologo ativo (2026-06-12)

- Pedido do usuario: ao sair de um psicologo e voltar para ele no feed vertical, o video deve sempre reiniciar do comeco, em vez de continuar do ponto anterior.
- A troca do psicologo ativo agora compara uma chave composta por psicologo e fonte de video; quando ela muda, todos os videos do feed sao normalizados.
- Videos inativos sao pausados e resetados para `currentTime = 0`, impedindo reproducao fora da tela e removendo memoria de progresso ao voltar.
- O novo video ativo tambem e pausado, resetado para `currentTime = 0`, tem a barra visual zerada e entao volta a reproduzir quando o estado global permite playback.
- A barra de progresso e o preview de scrubbing sao resetados na troca, e os estados transitorios ja existentes continuam sendo limpos: UI imersiva volta visivel, long press/timeouts/scrubbing sao encerrados, pause e feedbacks voltam ao estado inicial do slide.
- A regra vale tanto para avancar quanto para voltar no feed; o video reaparece sempre no inicio.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, busca, filtros, bio, favoritos, navbar ou navegacao de perfil.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg` e o contrato da TASK-13.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: UI invisivel inativa no modo imersivo (2026-06-12)

- Pedido do usuario: corrigir bug em que, com `isUiHidden=true`, areas invisiveis da UI ainda recebiam clique, principalmente a regiao do nome que redirecionava para o perfil.
- A tela agora aplica uma classe inert propria (`psychologists-ui-inert`) nos wrappers globais e do slide quando a UI esta oculta, forçando `pointer-events: none` tambem nos descendentes que antes tinham `pointer-events-auto`.
- Busca e filtro recebem `aria-hidden`, `disabled`/`tabIndex=-1` quando escondidos, impedindo clique, foco e acionamento invisivel.
- O bloco inferior do slide recebe `aria-hidden`; o nome, favoritos, compartilhar, WhatsApp e link/avatar de perfil ficam desabilitados ou removidos da ordem de foco quando `slideIsUiHidden=true`.
- Selos/chips superiores, indicador de disponibilidade, profissao, avaliacao e bio ficam sem eventos por heranca da camada inert e nao bloqueiam o toque do video.
- A navbar continua usando `navigationHidden`, que remove eventos no `PrivateTemplate`; apenas video e barra de progresso permanecem interativos no modo imersivo.
- Com a UI oculta, tocar onde ficaria o nome passa a atingir a area livre do video e apenas restaura a UI, sem navegar para o perfil.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, busca, filtros, bio, favoritos, barra de progresso, navbar ou navegacao quando a UI esta visivel.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg` e o contrato da TASK-13.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
- HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: refinamento da barra de progresso do video (2026-06-12)

- Pedido do usuario: corrigir posicao, cor e comportamento de seek/arraste da barra de progresso do video em `/app/psychologists`.
- Com UI visivel, a barra agora usa a altura real da navbar mobile (`64px + safe-area`) para ficar integrada imediatamente acima da navegacao, sem o espaco vazio causado pelo offset anterior de 72px.
- Com UI oculta, a barra permanece funcional no rodape do video com respiro minimo de `8px + safe-area`, evitando ficar colada demais ao limite inferior da viewport.
- O visual deixou de usar azul Lectum e passou para uma barra discreta em tons de branco/cinza (`rgba(255,255,255,0.22)` na trilha e `rgba(255,255,255,0.75)` no progresso), mantendo o video como foco principal.
- O scrubbing foi reforcado com um ref sincrono (`isVideoProgressSeekingRef`) para que o primeiro movimento apos `pointerDown`/`touchStart` ja aplique seek, sem depender do ciclo assíncrono de estado do React.
- O seek da barra nao chama reset de video: `onActiveVideoChange` continua sendo o unico fluxo que envia videos para `currentTime = 0`; a barra apenas calcula a razao horizontal e aplica `video.currentTime = progress * duration`.
- Durante o arraste, `video.currentTime`, `currentTime`/`duration` e a largura visual da barra sao atualizados continuamente, sem transicao de largura enquanto o usuario esta arrastando, para o frame acompanhar o dedo/mouse.
- A interacao da barra bloqueia scroll vertical do feed durante o scrubbing, cancela timers de toque/long press e captura eventos de pointer, com fallback touch para navegadores sem Pointer Events.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, busca, filtros, favoritos, navbar ou navegacao de perfil.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg` e o contrato da TASK-13.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: reposicionamento do bloco inferior apos barra de progresso (2026-06-12)

- Pedido do usuario: apos integrar a barra de progresso a navbar, corrigir o bloco inferior que havia subido demais e deixado uma area vazia excessiva entre bio e barra.
- A barra de progresso permaneceu na mesma posicao integrada a navbar; apenas o offset do bloco textual/coluna lateral foi reduzido.
- O espaco reservado entre a base da bio e a area da navbar/progresso passou de 34-36px para 8px, fazendo nome, profissao, avaliacao, bio e botoes laterais descerem juntos.
- A distancia visual entre bio e barra volta a ficar pequena, na faixa esperada de 8-16px, sem reposicionar a barra nem alterar gestos, busca, filtros ou dados reais.
- A coluna lateral continua alinhada dinamicamente ao bloco textual pelo calculo existente de baseline da bio, mas agora parte da mesma base inferior mais proxima do rodape.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, favoritos, busca, filtros, navbar ou navegacao de perfil.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg` e o contrato da TASK-13.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: disponibilidade em verde pulsante (2026-06-12)

- Pedido do usuario: deixar o texto `Disponível hoje` no mesmo verde da bolinha e tornar a bolinha pulsante.
- O texto do indicador passou de verde claro (`#86EFAC`) para o mesmo verde da bolinha (`#22C55E`).
- A bolinha recebeu animacao sutil de pulso com escala/halo discreto, sem recuperar fundo, pill, borda ou sombra de badge.
- A animacao respeita `prefers-reduced-motion`, ficando estatica para usuarios que preferem menos movimento.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, barra de progresso, favoritos, busca, filtros, navbar ou navegacao de perfil.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg` e o contrato da TASK-13.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: seek simplificado e controles imersivos (2026-06-12)

- Pedido do usuario: corrigir definitivamente a barra de progresso para nao reiniciar o video e adicionar controles inferiores no modo sem UI.
- A barra de progresso deixou de aplicar `video.currentTime` durante `pointerDown`/`pointerMove`; esses eventos agora iniciam o scrub e atualizam apenas a largura visual da barra.
- O seek real ficou restrito ao `pointerUp`/`touchEnd`: a posicao final e convertida em percentual da duracao e aplicada diretamente em `video.currentTime`.
- Os handlers da barra nao pausam, nao retomam, nao chamam reset, nao trocam o video ativo, nao trocam `src` e nao remountam o player; a troca de psicologo segue sendo o unico fluxo que reseta video para 0.
- No modo imersivo (`isUiHidden=true`), a barra permanece visivel acima dos novos controles inferiores, respeitando safe area.
- Foram adicionados controles inferiores inspirados em video curto: botao `X` para sair do modo imersivo, pill escura com Play/Pause, Volume/Mute e indicador informativo `1x`.
- Play/Pause e Volume/Mute usam `stopPropagation`/`preventDefault`, nao restauram a UI e nao disparam favorito, long press, toque simples, duplo toque ou troca de video.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, layout principal, busca, filtros, posicao dos textos, navbar ou botoes laterais quando a UI esta visivel.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual adicional foi a imagem anexada pelo usuario e a referencia base permanece `_product/proto/Psicologos.jpg`.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: fluidez da barra de progresso (2026-06-12)

- Pedido do usuario: refinar a fluidez visual da barra de progresso para ficar natural e continua, sem saltos.
- A barra deixou de depender de `width` atualizado por render React e passou a usar `transform: scaleX(progress)` no fill interno.
- A sincronizacao visual durante reproducao usa `requestAnimationFrame` e atualiza diretamente o elemento via ref, evitando `setState` React a cada frame.
- O estado React de `currentTime`/`duration` continua existindo para acessibilidade e teclas, mas foi reduzido para sincronizacoes espaçadas/forcadas, evitando re-render excessivo.
- Durante o scrub, o movimento atualiza a barra imediatamente via ref; ao soltar, o seek continua sendo aplicado uma unica vez em `video.currentTime`.
- O RAF e cancelado no cleanup do efeito, para quando o video esta pausado ou durante scrub e retoma quando o video volta a tocar.
- A transicao curta fica restrita ao estado normal; durante drag a transicao e removida para resposta instantanea.
- Nao houve alteracao de backend, Prisma, migrations, packages, layout principal, busca, filtros, textos, navbar, botoes laterais, modo imersivo ou regras de seek ja definidas.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg` e a imagem anexada pelo usuario.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: persistencia dos controles imersivos (2026-06-12)

- Pedido do usuario: manter as alteracoes feitas nos controles do modo sem UI ao retornar para a UI normal, sem resetar play/pause, mute/unmute, volume, velocidade ou posicao atual.
- O botao `X` do modo imersivo agora apenas restaura `isUiHidden=false`; ele nao altera `currentTime`, `muted`, `volume`, `playbackRate` ou estado de pausa do player ativo.
- Play/Pause e Volume/Mute continuam controlando diretamente o `HTMLVideoElement` e atualizam estados globais do feed, entao suas escolhas permanecem quando a UI volta a aparecer.
- O indicador de velocidade deixou de ser apenas texto fixo e passou a alternar entre `1x`, `1.5x` e `2x`; a velocidade aplicada persiste ao sair do modo imersivo.
- `volume` e `playbackRate` sao sincronizados pelos eventos nativos do video e reaplicados ao player ativo sem depender de remount ou troca de `src`.
- A troca de psicologo continua sendo o unico fluxo que reseta exibicao: `currentTime=0`, barra visual zerada, `isUiHidden=false`, pause limpo e `playbackRate=1x`; a preferencia de mute/volume permanece global para os proximos videos.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, layout principal, busca, filtros, posicao dos textos, navbar ou botoes laterais quando a UI esta visivel.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg` e a imagem anexada pelo usuario.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: layout desktop TikTok Web (2026-06-12)

- Pedido do usuario: manter o layout mobile atual e criar, apenas para desktop `>=1024px`, uma experiencia inspirada no TikTok Web.
- O `PrivateTemplate` recebeu a opcao `desktopNavigation="sidebar"` para renderizar, somente nesta rota, um menu lateral esquerdo fixo de `240px` com os mesmos destinos da bottom navbar: Psicologos, Favoritos, Comunidade, Notificacoes e Perfil.
- A bottom navbar permanece inalterada no mobile e passa a ficar escondida no desktop quando a rota solicita sidebar.
- A area principal de `/app/psychologists` ganhou offset desktop para o menu lateral e centraliza o video vertical no restante da tela.
- Busca, filtro, chips, disponibilidade, nome, selo verificado, profissao, avaliacao, bio, gradiente, barra de progresso e controles imersivos continuam dentro do video.
- No desktop, a coluna de Favoritar, Compartilhar, WhatsApp e Perfil sai de dentro do video e e renderizada a direita, com botoes circulares de fundo branco, sombra leve e icones com contraste adequado.
- No mobile, a coluna lateral original permanece dentro do video, preservando posicionamento, gestos, barra de progresso, modo imersivo e navbar inferior.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, filtros, favoritos ou contratos de API.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual adicional foi a imagem do TikTok Web enviada pelo usuario, e a referencia base permanece `_product/proto/Psicologos.jpg`.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: separacao explicita das acoes mobile e desktop (2026-06-12)

- Pedido do usuario: corrigir regressao em que a implementacao desktop removeu as acoes do video tambem no mobile.
- A regra responsiva passou a ser explicita pelo estado de viewport: abaixo de `1024px`, a coluna interna de Favoritar, Compartilhar, WhatsApp e Perfil e renderizada dentro do video; em `>=1024px`, ela nao e renderizada e a coluna externa desktop assume.
- A coluna mobile deixou de depender apenas de classe CSS `lg:hidden`, reduzindo risco de regressao em device mode e garantindo que Samsung Galaxy S8+, iPhone SE e iPhone 12 Pro mantenham a experiencia original sobreposta ao video.
- A coluna desktop externa agora tambem depende do mesmo estado de viewport, evitando qualquer duplicacao de acoes em telas mobile.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, filtros, contratos de API, gestos ou comportamento das acoes.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: barra colada a navbar mobile e seek em tempo real (2026-06-12)

- Pedido do usuario: esclarecer/corrigir por que a barra de progresso ainda nao ficava visualmente junta da navbar mobile e por que o arraste nao movia o video para o ponto desejado em tempo real.
- A causa registrada foi a combinacao de duas decisoes anteriores: a barra estava em uma camada propria do slide com offset fixo, sem sobrepor o topo da navbar, e o scrub havia sido simplificado para atualizar apenas a barra visual durante `pointerMove`, aplicando `video.currentTime` somente no release.
- A barra em UI visivel agora sobrepoe 1px o topo da navbar mobile (`64px + safe-area - 1px`), eliminando a linha de separacao visual sem mover a navbar.
- O scrubbing voltou a controlar o `HTMLVideoElement` durante `pointerDown`/`pointerMove`/`touchMove`: a cada movimento, a posicao horizontal e convertida em percentual e aplicada diretamente em `video.currentTime`.
- Ao iniciar scrub, o video ativo e pausado temporariamente e o estado anterior de reproducao e salvo; ao soltar/cancelar, a reproducao e retomada apenas se estava tocando antes.
- A barra continua sem chamar reset de video, sem trocar `src` e sem trocar o psicologo ativo; reset para `0` permanece exclusivo da troca de slide.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, filtros, contratos de API ou layout mobile alem da posicao visual da barra e do comportamento de scrub.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: pesquisa e filtro como grupo desktop independente (2026-06-12)

- Pedido do usuario: no desktop, remover Pesquisa e Filtro de cima do video e transforma-los em acoes independentes na lateral direita, separadas de Favoritar, Compartilhar, WhatsApp e Perfil, sem alterar o mobile.
- A renderizacao dos controles globais passou a ser explicitamente separada por breakpoint: em `<1024px`, a busca e o filtro continuam sobre o video exatamente como antes; em `>=1024px`, eles deixam de ser renderizados dentro do video.
- No desktop, a lateral direita agora possui dois grupos independentes: um grupo superior com icones de Pesquisa e Filtro proximo ao topo do video, e um grupo inferior separado com as acoes do psicologo exibido.
- O icone de Pesquisa desktop abre um input temporario na lateral direita, foca automaticamente, reutiliza a busca/sugestoes reais existentes e fecha ao clicar fora, perder foco ou pressionar ESC.
- O icone de Filtro desktop reutiliza a mesma abertura de filtros ja existente, sem recriar estado, formulario ou contrato de API.
- Com a area superior do video liberada no desktop, os selos superiores sobem para uma posicao mais proxima do topo, mantendo alinhamento a esquerda e respiro visual; o mobile preserva o offset anterior abaixo da busca.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, favoritos, barra de progresso, modo imersivo, navbar mobile, menu lateral desktop ou contratos de API.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg`, a imagem TikTok Web enviada pelo usuario e o contrato da TASK-13.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: comportamento desktop de busca e modo sem UI (2026-06-12)

- Pedido do usuario: corrigir apenas o desktop da tela de Psicologos, mantendo o mobile exatamente como estava.
- Os icones desktop de Pesquisar e Filtrar foram alinhados no mesmo eixo horizontal da coluna externa de Favoritar, Compartilhar, WhatsApp e Perfil, mantendo Pesquisa/Filtro no grupo superior e as acoes do psicologo no grupo inferior.
- A busca desktop deixou de acionar o modo de foco mobile: abrir a lupa agora apenas mostra um campo lateral simples, foca o input e permite digitacao imediata, sem pausar o video, escurecer/desfocar o fundo, aplicar overlay, esconder UI, esconder a sidebar ou esconder as acoes externas.
- O fechamento da busca desktop passou a ser feito por ESC, blur ou clique fora via listener de pointer, sem overlay visual e sem transformar o clique fora em modo imersivo.
- O modo sem UI no desktop agora limpa apenas o conteudo sobreposto ao video; a sidebar esquerda e a coluna externa direita continuam visiveis e interativas.
- No mobile, busca/filtro continuam sobre o video, o modo sem UI continua escondendo a interface inteira e as acoes permanecem sobrepostas ao video.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, filtros, contratos de API, barra de progresso ou comportamento mobile.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: avaliacao secundaria e respiro inferior desktop da bio (2026-06-12)

- Pedido do usuario: refinar apenas a hierarquia visual da avaliacao e o espacamento inferior da bio, sem alterar layout geral, video, nome, busca, filtros, chips, acoes laterais, navbar ou modo imersivo.
- A avaliacao `estrela + nota` foi reduzida visualmente: icone e texto menores, line-height mais compacto, padding menor, gap menor, sombra removida e amarelo suavizado para deixar de competir com nome, profissao e experiencia.
- A avaliacao permanece legivel e na mesma linha de metadados, mas passa a funcionar como informacao complementar.
- No desktop `>=1024px`, o offset inferior do bloco textual passou de 8px para 24px, criando respiro visual entre a bio e a borda inferior do video.
- No mobile, o offset inferior permanece em 8px; a unica alteracao perceptivel no mobile e o refinamento visual da avaliacao.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, filtros, contratos de API, video, nome, busca, chips, acoes laterais, navbar ou modo imersivo.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: acao Perfil sempre abre perfil publico do psicologo exibido (2026-06-12)

- Pedido do usuario: corrigir a acao `Perfil` da coluna lateral do feed de Psicologos para abrir o perfil publico do psicologo exibido no video atual, e nunca o perfil do usuario logado, `/app/profile`, setup ou edicao de perfil.
- A navegacao da acao foi centralizada em `navigateToPublicPsychologistProfile`, que recebe explicitamente o `psychologist.id` do card/slide atual e executa `router.push('/app/psychologist/{id}')`.
- No mobile, o avatar/botao `Perfil` da coluna sobreposta deixou de depender de `Link` declarativo e passou a usar a mesma acao imperativa do nome, garantindo que o alvo venha do psicologo renderizado no slide.
- No desktop, o botao externo `Perfil` tambem usa o `id` do `featuredPsychologist`, preservando a separacao entre a acao do profissional exibido e a navegacao global `Meu Perfil` da sidebar/bottom navbar.
- A acao continua bloqueando propagacao para nao pausar video, nao favoritar por gesto e nao acionar modo imersivo.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, filtros, favoritos, WhatsApp, compartilhamento ou layout visual.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual permanece `_product/proto/Psicologos.jpg` e o contrato da TASK-13.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - Verificacao estatica confirmou ausencia de href para `/app/profile`/setup na acao lateral `Perfil` do feed.

## Execucao complementar: desktop estilo YouTube Shorts (2026-06-14)

- Pedido do usuario: ajustar apenas o desktop/tablet largo de `/app/psychologists` para se aproximar do YouTube Shorts, preservando a experiencia mobile atual.
- O scroll do `body`/pagina foi bloqueado em desktop enquanto a rota esta ativa; a unica area rolavel passa a ser o container interno `.psychologists-video-feed` com `scroll-snap` vertical.
- O card desktop agora usa proporcao 9:16 por variaveis CSS responsivas, tem margem superior visivel e deixa uma pre-visualizacao parcial do proximo card na parte inferior.
- Foram adicionadas setas circulares externas para psicologo anterior/proximo, com estado desabilitado no primeiro/ultimo item.
- Eventos de roda/touchpad/touch na area principal a direita da sidebar sao encaminhados para o feed interno, permitindo avancar/voltar mesmo em areas vazias; a sidebar esquerda continua fora desse encaminhamento.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, contratos de API ou UI interna do card.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual de produto permanece `_product/proto/Psicólogos.jpg` e a nova referencia visual foi a captura do YouTube Shorts anexada pelo usuario.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: controle moderno da sidebar desktop (2026-06-14)

- Pedido do usuario: substituir apenas no desktop o controle antigo de expandir/recolher menu por uma solucao mais moderna, discreta e alinhada a Notion, Linear, Slack, Arc Browser e YouTube, mantendo o mobile exatamente como esta.
- O `PrivateTemplate` passou a usar um botao circular pequeno com icone `Sidebar`, borda discreta, glass leve, sombra sutil, hover suave e transicao de 300ms.
- O estado recolhido ganha destaque `primary-soft` e indicador interno deslocado para comunicar que o menu pode ser expandido; o estado expandido permanece mais neutro e minimalista.
- O topo da sidebar agora integra logo e controle dentro de um bloco visual unico com contorno/glass; em 88px recolhidos, logo e controle ficam empilhados para nao parecerem soltos.
- A bottom navigation mobile e qualquer comportamento abaixo de `lg` nao foram alterados.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, contratos de API ou rotas.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a decisao foi guiada pelas referencias modernas fornecidas pelo usuario e pelo design system existente da Lectum.
- ADR criado: `adrs/0079-controle-sidebar-desktop-moderno.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: limpeza visual desktop do feed Shorts (2026-06-14)

- Pedido do usuario: ajustar somente o desktop de `/app/psychologists`, removendo faixa/sombra residual da sidebar, sombras externas do feed, recentralizando os cards, ampliando levemente o card 9:16 e movendo as setas up/down para a lateral direita da viewport.
- A causa raiz da faixa residual era o `contentClassName` da rota forcar `lg:pl-[240px]` mesmo com a sidebar recolhida em 88px; esse override foi removido para respeitar o padding dinamico do `PrivateTemplate`.
- O `PrivateTemplate` recebeu a opcao `desktopSidebarSurface="flat"` e a rota de Psicologos passa a usa-la para remover a sombra projetada da sidebar desktop sem afetar outras rotas por padrao.
- A sombra externa desktop do card foi removida, mantendo o fundo da area de feed limpo e continuo; a UI interna do card nao foi alterada.
- As variaveis desktop do feed foram ajustadas para aumentar levemente o card principal, reduzir o intervalo ate a previa do proximo card e preservar a proporcao 9:16.
- As setas de psicologo anterior/proximo passaram a ficar fixas na lateral direita da viewport, separadas do card, mantendo estilo circular e discreto.
- O mobile, o scroll-snap, o bloqueio de scroll no `body`, dados, contratos de API, backend, Prisma, migrations e packages nao foram alterados.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a decisao foi guiada pela captura do YouTube Shorts anexada pelo usuario, pelo prototipo local `_product/proto/Psicólogos.jpg` e pelo design system existente da Lectum.
- ADR criado: `adrs/0080-ajuste-desktop-feed-shorts-psicologos.md`.
- Validacoes executadas:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: controle minimalista da sidebar desktop (2026-06-14)

- Pedido do usuario: corrigir a versao anterior do controle de expandir/recolher porque o botao estava grande, competia com a marca, quebrava a composicao do cabecalho e parecia um elemento isolado.
- O cabecalho desktop da sidebar deixou de usar bloco com borda/glass/sombra envolvendo logo e controle; logo/avatar e nome `Lectum` voltam a ser o elemento dominante.
- O controle passou a ser um botao absoluto pequeno no canto superior direito do cabecalho, sem texto, sem superficie destacada persistente, com icone `Sidebar` de 15px, opacidade reduzida e hover/focus sutil.
- O estado recolhido usa a mesma abordagem discreta e apenas rotaciona o icone, evitando empilhamento, quebra de linha ou competicao visual com a marca.
- A bottom navigation mobile e qualquer comportamento abaixo de `lg` nao foram alterados.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, contratos de API ou rotas.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a decisao foi guiada pelas referencias modernas fornecidas pelo usuario e pelo design system existente da Lectum.
- ADR atualizado: `adrs/0079-controle-sidebar-desktop-moderno.md`.
- Validacoes executadas:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: overlays confinados no feed desktop (2026-06-14)

- Pedido do usuario: investigar e corrigir a sombra/gradiente residual que parecia permanecer fixa durante a rolagem vertical entre psicologos em `/app/psychologists`, especialmente na previa do proximo card e no ultimo item.
- A causa visual principal era a combinacao de um gradiente global absoluto do topo `Explorar / Minha Busca` no desktop com overlays/textos/progresso ainda visiveis em slides inativos durante a transicao do scroll-snap.
- O gradiente global do topo foi removido somente no breakpoint desktop (`lg:bg-none`), preservando o comportamento visual mobile.
- No desktop, slides inativos passam a ocultar chrome interno: overlay de legibilidade, badges, textos, botoes internos e trilha de progresso, mantendo essas camadas apenas no card ativo.
- A previa do proximo psicologo continua aparecendo, mas limpa, sem herdar sombra/gradiente do card anterior; o ultimo card tambem nao recebe camada residual superior.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, contratos de API, scroll-snap ou UI interna do card ativo.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a decisao foi guiada pela captura anexada pelo usuario, pelo prototipo local `_product/proto/Psicólogos.jpg` e pelo design system existente da Lectum.
- ADR criado: `adrs/0083-overlays-feed-psicologos-desktop.md`.
- Validacoes executadas:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: header interno preso ao card no feed desktop (2026-06-14)

- Pedido do usuario: corrigir apenas no desktop o vazamento do menu interno `Explorar / Minha Busca` em `/app/psychologists`, especialmente no ultimo video durante scroll/snap.
- A causa raiz era que o menu estava renderizado como camada global absoluta sobre o feed, alinhada ao topo desktop do card por offset, mas fora do container visual de cada card; durante a rolagem ele podia aparecer na area entre slides.
- O header global foi preservado para mobile e ocultado em `lg`, mantendo a experiencia mobile atual.
- No desktop, o mesmo menu passou a ser renderizado dentro do container visual de cada card/slide, em `top: 0`, respeitando o `overflow-hidden` e o `border-radius` do card.
- Apenas o slide ativo deixa o header visivel e interativo; slides inativos mantem a camada invisivel e sem pointer events para evitar vazamento visual ou foco indevido.
- A proporcao 9:16 dos cards, o scroll-snap, os dados, filtros, favoritos, WhatsApp, perfil, video, overlays do card ativo e contratos de API foram preservados.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual usada foi `_product/proto/Psicólogos.jpg`, a captura enviada pelo usuario e o pedido detalhado.
- ADR criado: `adrs/0087-header-interno-card-psicologos-desktop.md`.
- Validacoes executadas:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/psychologists`.

## Execucao complementar: respiro superior reduzido no card desktop (2026-06-14)

- Pedido do usuario: reduzir somente no desktop o espacamento vertical superior entre a area util da tela e o card de video em `/app/psychologists`, preservando mobile, proporcao 9:16, preview inferior e UI interna do card.
- A variavel CSS desktop `--psychologists-desktop-card-top` foi reduzida de `24px` para `10px`, fazendo o card subir sem alterar largura, altura, botoes laterais, scroll-snap ou controles internos.
- A altura do card permaneceu calculada por `--psychologists-desktop-card-height` e a largura segue derivada da proporcao 9:16 ja existente, evitando deformacao ou corte adicional do video.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, contratos de API, mobile ou comportamento das acoes laterais.
- ADR atualizado: `adrs/0080-ajuste-desktop-feed-shorts-psicologos.md`.

Validacoes do ajuste:

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local em `/app/psychologists` respondeu `200`.


## Execucao complementar: modal de filtros refinada por PDF (2026-06-14)

- Pedido do usuario: ajustar a modal de filtros de busca em `/app/psychologists` no desktop e no mobile usando como referencia visual o arquivo local `C:\Users\tulio\Downloads\Filtros de Psicologos.pdf`.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a execucao seguiu a referencia PDF fornecida pelo usuario, o prototipo local ativo e o design system existente da Lectum.
- A modal de filtros agora e renderizada via portal em `document.body`, com `z-index` acima do menu lateral, botoes flutuantes e navegacao, cobrindo toda a interface tanto no desktop quanto no mobile.
- O header da modal foi reorganizado com botao de fechar a esquerda do titulo `Filtros de busca` e acao textual azul `Limpar filtros` no topo direito; a acao de limpar foi removida do rodape.
- O campo `Buscar por nome ou CRP` foi adicionado antes de `Especialidade` e aplica o mesmo parametro de busca real ja existente, sem criar logica paralela.
- Os selects da modal passaram a usar o mesmo padrao visual de dropdown com seta interna; `Estado` inicia como `Todos` e `Cidade` como `Selecione Estado` enquanto nao ha estado selecionado.
- O botao `Aplicar filtros` ficou fixo/sticky no rodape da area rolavel da modal, com visual arredondado e destaque consistente com a referencia.
- Os filtros booleanos de selos/facilidades foram substituidos por cards customizados sobre os mesmos campos do React Hook Form; foi adicionada a opcao `Somente verificados` com a descricao exigida pelo usuario.
- A barra de rolagem visual da modal foi ocultada, mantendo rolagem interna funcional.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, endpoints ou contratos de API alem de usar o filtro `verified` ja previsto no contrato gerado.
- ADR atualizado: `adrs/0019-descoberta-psicologos-taxonomias.md`.
- Validacoes executadas:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - `git diff --check`
  - HTTP local em `/app/psychologists` respondeu `200`.
