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
- Builder/Quick Copy foi revalidado via
px "@builder.io/dev-tools@latest" auth status`, mas o CLI retornou
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

## Execução complementar: selos do card com largura por conteúdo e animação (2026-06-10)

- Pedido do usuário: ajustar os selos de benefícios do card para largura ajustada ao texto, garantir que o espaçamento vertical entre o último selo e o `overlay` seja igual ao espaçamento entre `overlay` e botão de compartilhar, e adicionar animação suave de flutuação nos selos.
- O card foi ajustado para:
  - `width: fit-content` com `max-width` responsivo e `truncate` para evitar overflow;
  - posicionamento vertical calculado por medição do DOM para manter distância equivalente entre selo e overlay / overlay e botão de compartilhamento;
  - animação de flutuação contínua com atraso escalonado por selo e respeito ao `prefers-reduced-motion`.
- Validações executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - `adrs/0047-selos-card-fitted-animation-e-espacamento-dinamico.md` criado e atualizado com esta decisão.

## Validação mínima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.

## Execucao complementar: layout imersivo alinhado ao PDF e navbar compartilhada (2026-06-11)

- Pedido do usuario: aplicar o layout visual do PDF anexado `Nova tela psicologos.pdf` na rota `/app/psychologists`, preservando a arquitetura e a navbar padrao do projeto.
- Antes de alterar o codigo, foram mapeados os reaproveitamentos: `PrivateTemplate`/navbar compartilhada, `PageShell`, `useDirectoryPsychologists`, `usePatient`, filtros via `usePsychologistsFilterForm`, `LoadingState`, `InlineAlert`, `EmptyState`, `VerifiedBadgeIcon`, `WhatsAppIcon` e
ext/image`.
- A navbar customizada local da tela foi removida; a rota passou a reutilizar exclusivamente a navegacao do `PrivateTemplate`, mantendo item ativo, altura, espacamento, icones e comportamento globais.
- O `PrivateTemplate` recebeu a prop opcional `contentClassName` para permitir tela imersiva sem padding do `PageShell` nesta rota, sem alterar o default das demais telas.
- O layout foi ajustado para foto em tela cheia, busca flutuante, botao de filtros, overlay inferior mais forte, coluna lateral de acoes e informacoes do psicologo sobre a imagem, sem criar mocks nem dados fake.
- Referencia visual: PDF anexado pelo usuario (`C:\Users\tulio\Downloads\Nova tela psicólogos.pdf`), renderizado localmente apenas para inspecao visual; Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao.
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
  - ao ocorrer erro/rejeição de play antes da reprodução, a tela passa a exibir `video_cover_url` (ou avatar como fallback) em vez do avatar quando o video nao carrega;
  - o texto da bio passou a renderizar sem `line-clamp`, garantindo exibicao integral;
  - o gradiente do overlay foi encurtado para escurecer apenas ate a faixa inferior da imagem;
  - o bloco de overlay inferior recebeu `bioBottomOffset` para aproximar a base do texto da base da navbar;
  - a posição vertical da coluna lateral (`actionTop`) foi rebaixada para alinhar o label `Perfil` com a linha de base do texto de bio.
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
- Validacoes executadas nesta etapa: ver registro do commit desta execucao.


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
