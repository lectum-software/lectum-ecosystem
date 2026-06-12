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
