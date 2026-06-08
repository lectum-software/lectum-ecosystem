# TASK-13: Psicólogos: listagem e filtros

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-13 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Descoberta |
| Status | Completed |
| Dependências | TASK-02, TASK-12 |
| ADR alvo | ADR de descoberta de psicólogos |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Psicólogos.jpg` | `figma-design-frame-15-Psic-logos.html` |
| `_product/proto/Filtros de Psicólogos - Serviços Expandidos.jpg` | `figma-design-frame-12-Filtros-de-Psic-logos---Servi-os-Expandidos.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

A listagem é uma tela central para pacientes. Ela deve consultar backend real, filtrar por dados persistidos e não exibir profissionais fake.

## Objetivo

Implementar listagem real de psicólogos aprovados com busca, filtros e paginação.

## Pré-requisitos e bloqueios

- Sem psicólogos aprovados reais, a tela deve mostrar estado vazio, não seed fake.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/app/psychologists` (lista de descoberta, dentro do shell privado da TASK-12)
- Cada card aponta para o detalhe do perfil em `/app/psychologist/[id]` (TASK-15).

Implementação esperada:

- Criar tela `/app/psychologists` dentro do shell privado.
- Implementar busca, filtros expandidos, chips ativos, limpar filtros e paginação conforme o "Contrato padrão de API" do `DATA-MODEL.md` (`page`/`limit`).
- Filtros por taxonomia: `specialty`, `service` e `approach` (ver `DATA-MODEL.md`), além do filtro "verificados" (`psychologist_profile.cfp_verified_at` preenchido).
- Usar callers React Query e query keys dedicadas.
- Exibir vazio honesto quando não houver profissionais publicados.
- Não hardcodar cards de psicólogos.

## Escopo backend

Implementação esperada:

- Criar endpoint de listagem com paginação (`page`/`limit`, default 20, máx 50 — ver "Contrato padrão de API" do `DATA-MODEL.md`), busca e filtros.
- Retornar somente psicólogos publicados (`psychologist_profile.published = true`) e de `user` ativo (PRD §7: só ativos/verificados aparecem).
- Expor ordenação/exibição de `rating_avg`/`rating_count` (ver `DATA-MODEL.md`; `rating_avg` é nota ×100).
- Filtro "verificados" = `cfp_verified_at` não nulo.
- Usar catálogos `specialty`/`service`/`approach` e os joins `psychologist_specialty`/`psychologist_service`/`psychologist_approach` (ver `DATA-MODEL.md`).
- Adicionar índices para filtros frequentes conforme já previstos no `DATA-MODEL.md`.
- Não retornar dados sensíveis do profissional (`cpf`, `whatsapp`, campos de conta).

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `psychologist_profile` (`published`, `rating_avg`, `rating_count`, `cfp_verified_at`)
- `specialty` / `service` / `approach` (catálogos)
- `psychologist_specialty` / `psychologist_service` / `psychologist_approach` (joins)

Guarda de papel (ver `DATA-MODEL.md`, "Camadas de autenticação e autorização" e ADR-0002):

- Estas são rotas de leitura caller-neutras, montadas sob `/api/private/directory/*`, guardadas apenas por `_auth` (qualquer autenticado) — **nunca** por `requireRole`. Pacientes precisam navegar/descobrir psicólogos, então a descoberta não pode ser psicólogo-only.
- Não usar `/api/private/psychologists` (confundível com a autogestão do psicólogo em `/api/private/psychologist/*`).
- Expor apenas campos PUBLIC-safe do `psychologist_profile`; nunca `cpf`, `whatsapp` ou campos de conta.

Endpoints esperados (ver "Convenção de rotas" do `DATA-MODEL.md`):

- GET `/api/private/directory/psychologists` (listagem paginada de descoberta, neutra, só `_auth`)

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
- @radix-ui/react-select candidato
- @radix-ui/react-checkbox candidato
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
- [x] Rotas de descoberta sob `/api/private/directory/*` usam só `_auth` (neutras), nunca `requireRole`, conforme ADR-0002.
- [x] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [x] Backend implementado nos endpoints/modelos esperados quando aplicável.
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [x] Todos os estados obrigatórios existem e usam textos em PT-BR.
- [x] Formulários e campos usam a fundação da `TASK-02` quando aplicável.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] Nenhum código gerado por Builder foi aceito sem revisão e adequação à arquitetura.
- [x] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Commit criado com mensagem convencional.

## Execução

- Builder/Quick Copy não está exposto como ferramenta direta nesta sessão; a validação visual
  usou as imagens locais obrigatórias `_product/proto/Psicólogos.jpg` e
  `_product/proto/Filtros de Psicólogos - Serviços Expandidos.jpg`.
- Backend criou `GET /api/private/directory/psychologists`, montado sob namespace neutro com apenas
  `_auth`, sem `requireRole`.
- Prisma criou os catálogos `specialty`, `service`, `approach` e os joins
  `psychologist_specialty`, `psychologist_service`, `psychologist_approach`, sem seed artificial.
- A listagem retorna somente `psychologist_profile.published = true`, usuário ativo e campos
  public-safe; `cpf`, `whatsapp`, e-mail e dados de conta não são expostos.
- Frontend implementou `/app/psychologists` mobile-first dentro do shell privado, com busca,
  filtros expandidos, chips ativos, limpar filtros, paginação, loading, erro, sucesso e vazio
  honesto.
- Busca e filtros usam a fundação da TASK-02 (`useFormList` e controllers), React Query, req/caller
  dedicados e query key `directory.psychologists`.
- ADR criado: `adrs/0019-descoberta-psicologos-taxonomias.md`.
- Validações executadas:
  - `pnpm --dir backend db:migrate --name add_directory_taxonomies`
  - `pnpm --dir backend db:generate`
  - `pnpm --dir backend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - smoke de API real com paciente temporário removido ao final;
  - browser local headless em viewport mobile `390x844` com cookie real, sessão hidratada,
    estado vazio/lista real e bottom nav.

## Execução complementar: desktop e filtros em modal (2026-06-06)

- Pedido do usuário: adaptar `/app/psychologists` para desktop e fazer os filtros abrirem em modal.
- Builder/Quick Copy foi revalidado via `npx "@builder.io/dev-tools@latest" auth status`, mas o CLI retornou
  não autenticado nesta sessão; a execução manteve o fallback auditável das imagens locais obrigatórias da task.
- A tela permanece mobile-first com base nos protótipos `390px`, mas agora expande em desktop para `lg:max-w-6xl`,
  card de busca/filtros responsivo e grid de resultados em duas colunas.
- Os filtros avançados deixaram de abrir inline e passaram a abrir em modal com `role="dialog"`, `aria-modal`,
  fechamento por `Escape`/backdrop e foco inicial no botão de fechar, sem instalar pacote novo.
- A busca, filtros e switch continuam usando dados reais da URL/API e a fundação da TASK-02 (`useFormList` +
  controllers) para campos avançados.
- ADR atualizado: `adrs/0019-descoberta-psicologos-taxonomias.md`.
- Validações executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - browser local headless em viewport desktop `1440x1000`, com cookie real, sessão hidratada, `sectionWidth=1112`
    e modal de filtros aberta com largura `520px`; usuário temporário de validação removido ao final.

## Execução complementar: ajustes de card e favoritos no card (2026-06-06)

- Pedido do usuário: ajustar o card com inspiração de densidade/tipografia do Reddit, trocar o selo para
  `Disponível hoje`, trocar CTA para `Chamar no WhatsApp`, usar tags fixas abaixo da busca e mover
  `Somente verificados` para uma faixa abaixo das tags.
- Tags rápidas abaixo da busca: `Ansiedade`, `Depressão`, `Luto`, `Compulsões`, `Traumas`; elas aplicam busca real
  no endpoint existente, sem catálogo fake persistido.
- O coração do card deixou de ser apenas decorativo e passou a executar favorito real com endpoints de paciente
  (`POST`/`DELETE /api/private/patient/favorites/:id`) e campo contextual `favorited` na listagem.
- Como favorito pertence à TASK-14, a execução criou os modelos previstos no `DATA-MODEL.md`, mas **não** concluiu
  a TASK-14 completa; a lista dedicada de favoritos segue como fluxo separado, e seguir psicólogos foi depreciado na
  UI em 2026-06-08.
- ADR criado: `adrs/0020-favoritar-psicologo-na-listagem.md`.
- Validações executadas:
  - `pnpm --dir backend db:migrate --name add_psychologist_favorites`
  - `pnpm --dir backend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - smoke real de API com paciente temporário: favoritar, refletir `favorited=true` na listagem, desfavoritar e
    remover o usuário temporário;
  - browser local headless em viewport desktop `1440x1000`, validando tags, selo, CTA e clique no coração com
    `aria-pressed=true`.

## Execução complementar: card conforme referência de psicólogos (2026-06-08)

- Pedido do usuário: adaptar o card de psicólogo conforme a referência anexada `Psicólogos (1).jpg`, remover a opção
  de seguir psicólogos e manter favoritos/WhatsApp como ações principais.
- Builder/Quick Copy não está exposto como ferramenta direta nesta sessão; a validação visual usou a imagem anexada
  pelo usuário e o fallback local `_product/proto/Psicólogos.jpg`.
- O card público agora usa layout mobile-first de até `390px`, sem botão de seguir, com coração de favorito, selo
  `Disponível hoje` pulsando suavemente quando `available_today=true`, CTA verde `Chamar no WhatsApp` e link direto
  para `wa.me`.
- Tags abaixo da bio ficaram restritas a benefícios reais: tempo de formação apenas para assinantes, desconto de
  1ª sessão, valor social e aceita convênios. Especialidades, serviços, abordagens e modalidade não aparecem como
  tags de benefício no card.
- O selo verificado e o prefixo `Dr.`/`Dra.` aparecem somente para assinantes; perfis gratuitos publicados não exibem
  o selo nem o prefixo.
- Quando o assinante possui `video_url`, o card mostra uma miniatura de vídeo com botão de play no próprio card.
  Vídeos enviados por profissionais ainda não possuem trilha de legenda nesta etapa; a exceção de lint foi registrada
  localmente no componente.
- A rota `/app/following` passou a redirecionar para `/app/community`, a navegação não destaca mais `/app/following`
  como favoritos e o menu de perfil passou a usar `Comunidades seguidas`, alinhado à decisão de que usuários seguem
  comunidades, não outros usuários.
- O backend da descoberta e da lista de favoritos passou a expor campos publicáveis necessários ao card
  (`gender`, `video_url`, `available_today`, benefícios, `formation_years` e `whatsapp_url`). O campo bruto
  `whatsapp` continua fora do contrato; `whatsapp_url` é uma URL de CTA gerada para o pedido explícito de abrir
  `wa.me`.
- ADR atualizado: `adrs/0019-descoberta-psicologos-taxonomias.md`.
- Validações executadas:
  - `pnpm --dir backend biome:fix`
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir backend check`
  - `pnpm --dir frontend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - smoke real de API com paciente temporário removido ao final: `GET /api/private/directory/psychologists?page=1&limit=3`
    retornou `success=true`, `count=1`, `page=1` e campos novos do card (`whatsapp_url`, `video_url`,
    `available_today`, benefícios e `formation_years`);
  - smoke local HTTP: `GET /health` no backend retornou `200`; `/app/psychologists` e `/app/following` responderam
    pelo proxy privado local com `307` quando acessados sem sessão de browser reutilizável nesta execução.

## Execução complementar: WhatsApp SVG e ajuste fino do card (2026-06-08)

- Pedido do usuário: substituir o ícone do CTA de WhatsApp pelo SVG anexado `SVG.svg`, usar verde `#22C55E`,
  aproximar o espaçamento de `PSICÓLOGO` e a cor da estrela de avaliação da referência anterior, e corrigir o erro
  `Acesso permitido apenas para o perfil autorizado`.
- Builder/Quick Copy segue sem ferramenta direta nesta sessão; a referência ativa foi a imagem de card enviada
  anteriormente pelo usuário e o SVG anexado nesta solicitação.
- Foi criado um componente vetorial reutilizável `WhatsAppIcon` com o path do SVG anexado, sem usar `<img>`.
- Os CTAs de WhatsApp do card e do perfil público usam background `#22C55E` e o novo ícone em branco.
- O texto `PSICÓLOGO` no card teve tracking reduzido para ficar mais próximo da referência, e a estrela de avaliação
  passou para `#FACC15`.
- O erro de autorização foi tratado na UI: ações de favorito em cards/perfis ficam desabilitadas para usuários que não
  sejam pacientes, evitando chamadas aos endpoints de paciente por contas de psicólogo.
- Validações executadas:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`

## Validação mínima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.
