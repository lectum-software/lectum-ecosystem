# TASK-18A: Perfil gratuito sem documento CRP

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-18A |
| Prioridade | P0 |
| Esforço | M |
| Fase | Psicólogo privado |
| Status | Completed |
| Dependências | TASK-02, TASK-12, TASK-16, TASK-31 |
| ADR alvo | ADR-0027 |

## Contexto

Esta task cria um recorte explícito e limitado para permitir que psicólogos do plano gratuito configurem o perfil profissional depois de informar o WhatsApp, sem upload de documento CRP e sem validação CFP/CRP por API.

A TASK-18 completa permanece bloqueada por TASK-11 porque inclui Documentos / CRP e `professional_document`. Este recorte não altera `professional_document`, `crp_status`, `cfp_verified_at` ou `whatsapp_verified_at`.

## Escopo

- Backend exclusivo para psicólogos em `/api/private/psychologist/free-profile`.
- Frontend em `/app/professional/profile/setup`.
- Tela baseada no protótipo local `_product/proto/Editar Perfil - Psicólogo.jpg` e no ajuste visual enviado pelo usuário (`Html → Body.png`).
- Builder/Quick Copy não foi acionado neste ambiente; a referência auditável usada foi o protótipo local e a imagem enviada pelo usuário.
- CPF, gênero, raça/cor, religião, regional, registro, WhatsApp, apresentação, filtros, formações acadêmicas, atendimento e endereço profissional.
- Regional em dropdown conforme a lista oficial de CRPs publicada pelo CFP em `https://site.cfp.org.br/cfp/sistema-conselhos/conselhos-pelo-brasil/`.
- Foto profissional alterável por upload real em R2 público usando `backend/src/config/multer`; a URL pública streamada por `/public/files/psychologist/avatar/*` é persistida em `user.avatar`, normalizada no frontend para exibição local/prod e pode ser alterada/excluída pelo psicólogo por um menu único junto ao avatar.
- Vídeo de apresentação permanece indisponível no plano gratuito; a tela exibe CTA de upgrade e o backend mantém `video_url=null` neste recorte.
- Plano gratuito limita especialidades a 3 e serviços a 1.
- Publicação gratuita não valida CRP por API e não toca em documento CRP.
- A tela inclui ação para abrir o link `wa.me` gerado a partir do WhatsApp informado.

## Persistência

- Campos diretos em `psychologist_profile`:
  - `cpf`, `crp`, `gender`, `race_color`, `religion`, `headline`, `bio`, `languages`, `modality`, `target_audience`, `discount_first_session`, `social_value`, `accepts_insurance`, `academic_*`, `academic_formations`, `available_days`, `professional_address_*`, `published`.
- Foto profissional em `user.avatar`, apontando para arquivo R2 público de avatar.
- Catálogos reais via joins `psychologist_specialty`, `psychologist_service`, `psychologist_approach`.

## Fora do escopo

- Upload/lista/reenvio de documento CRP.
- `professional_document`.
- Alterar `crp_status`, `cfp_verified_at` ou `whatsapp_verified_at`.
- Selo de verificado.
- Upload binário de vídeo no plano gratuito.
- Perfil profissional pago completo.

## Critérios de aceite

- [x] Recorte documentado como task separada da TASK-18 completa.
- [x] Backend implementado sem tocar em documentos CRP.
- [x] Migration de dados do perfil gratuito criada e aplicada com `pnpm --dir backend db:migrate`.
- [x] Endpoint privado exige `requireRole("psicologo")` pelo mount em `/api/private/psychologist/*`.
- [x] Frontend implementado em `/app/professional/profile/setup` com dados reais do backend.
- [x] Tela ajustada a partir de `_product/proto/Editar Perfil - Psicólogo.jpg` e do print `Html → Body.png`.
- [x] Botão único junto à foto abre ações para alterar ou excluir a foto de perfil, com upload real e exibição da imagem salva no card.
- [x] Faixa azul direciona para upgrade do plano profissional.
- [x] CPF, regional, registro e WhatsApp ficam editáveis no plano gratuito sem consulta CFP/CRP por API.
- [x] Regional usa dropdown no formato `19ª Região - SE`, conforme lista CFP.
- [x] Tela inclui ação por ícone alinhado ao telefone para abrir o link `wa.me` gerado e testar o WhatsApp informado.
- [x] Apresentação, bloqueio de vídeo com upgrade, filtros, benefícios, formações acadêmicas, atendimento e endereço foram incluídos.
- [x] Bio curta limitada a 120 caracteres no frontend e no backend, com contador visível no campo.
- [x] Formulários/campos usam React Hook Form, Zod, `hooks/form` e controllers da TASK-02 para campos principais.
- [x] Catálogos reais de especialidades, serviços e abordagens são lidos do banco.
- [x] Limite de 3 especialidades e 1 serviço no plano gratuito é validado no backend.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] Packages usados conferem com `PACKAGES.md`; nenhum package novo foi instalado.
- [x] ADR atualizada em `adrs/0027-perfil-gratuito-sem-crp.md`.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Commit criado com mensagem convencional.
- [x] Ajustes pos-validacao de perfil em 2026-06-08 aplicados: avatar do menu usa a mesma foto da edicao, selo SVG enviado, remocao de sessao ativa/Verificar WhatsApp, switch de modo escuro com padrao claro, voltar para `/app/profile`, labels CRP atualizados, indicador obrigatorio e cidades IBGE filtraveis por UF.
- [x] Salvamento do perfil gratuito corrigido para enviar `req.body` ao service sem depender de `req.b` quando a rota nao usa o middleware `validator`.

- [x] Ajuste complementar de 2026-06-08 aplicado: selo de verificado agora depende de assinatura ativa nao gratuita, e nao de CFP, inclusive nas listas, favoritos e perfil publico.
- [x] Exibicao de CRP padronizada como `Psicologo &bull; CRP 00/000000` no menu de perfil, card e perfil publico.
- [x] Avatar do menu e da edicao usa a mesma moldura/tamanho de 112px com `Image` do Next.
- [x] Campos obrigatorios adicionais marcados e validados: genero, raca/cor, religiao, Regional do CRP, No Registro CRP, abordagens, estado e cidade.
- [x] Abordagens no plano gratuito limitadas a 1 selecao, com texto de upgrade, validacao frontend/backend e erro especifico.
- [x] Cidade simplificada: sem texto "Digite para filtrar...", sem faixa de cidade selecionada e sem item azul escuro persistente.
- [x] Alterar visibilidade publica invalida a listagem de psicologos; perfis publicados ficam elegiveis para /app/psychologists.
- [x] Cards e perfil publico exibem "Disponivel hoje" apenas quando o dia atual em America/Sao_Paulo esta em dias disponiveis, com bolinha verde pulsando suavemente.

- [x] Ajuste visual de 2026-06-08 aplicado: Especialidades e Abordagens usam campo compacto com tags removiveis, placeholder e lista suspensa como no print anexado pelo usuario, mantendo limites reais do plano gratuito.
- [x] Ajuste de midias de 2026-06-08 aplicado: foto de perfil abre modal de enquadramento antes do upload real, video de apresentacao usa um unico menu "Editar" para trocar/remover e expor a acao futura de capa, Especialidades remove texto de limite do titulo e Formacao Academica reduz o espaco vertical entre campos.
- [x] Ajuste de 2026-06-09 aplicado: Selos e Facilidades ganhou a opcao "Exibir tempo de experiencia" marcada por padrao, menu de conta ganhou "Ver meu perfil publico" antes de Editar perfil, e capa de video passou a ter upload real no backend/frontend.
- [x] Ajuste de 2026-06-18 aplicado: video de apresentacao passou a ser obrigatorio para publicacao/exibicao publica do perfil, enquanto Bio e Apresentacao de texto deixaram de ser obrigatorias; o idioma Portugues padrao continua suficiente quando enviado pelo formulario.

## Validação executada

- `pnpm --dir backend exec prisma migrate dev --name add_free_profile_details`
- `pnpm --dir backend exec prisma migrate dev --name add_free_profile_media_religion`
- `pnpm --dir backend db:migrate`
- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- `pnpm --dir frontend biome:check`
- `pnpm --dir frontend typecheck`
- `pnpm --dir backend check`
- Browser local/HTTP sem sessão na rota `/app/professional/profile/setup`: redireciona para login com 307, confirmando rota privada.
- Backend local em `/health`: respondeu `200` com status `ok`.
- 2026-06-08: `pnpm --dir frontend check`
- 2026-06-08: `pnpm --dir backend check`
- 2026-06-08: `pnpm --dir backend build`
- 2026-06-08: `pnpm --dir frontend build`
- 2026-06-08: `pnpm check`
- 2026-06-08: Chrome headless local em `/app/profile` e `/app/professional/profile/setup` redirecionou para login sem sessao; validacao visual autenticada ficou limitada por nao haver token real acessivel ao agente sem criar mock.

- 2026-06-08 complementar: `pnpm --dir frontend check`
- 2026-06-08 complementar: `pnpm --dir backend check`
- 2026-06-08 complementar: `pnpm --dir backend build`
- 2026-06-08 complementar: `pnpm --dir frontend build`
- 2026-06-08 complementar: `pnpm check`
- 2026-06-08 complementar: HTTP local `/health` respondeu 200; rotas privadas `/app/profile`, `/app/professional/profile/setup` e `/app/psychologists` responderam 307 sem sessao, mantendo protecao. Validacao visual autenticada ficou limitada por nao haver token real acessivel ao agente sem criar mock.

- 2026-06-08 tags de catalogo: `pnpm --dir frontend check`
- 2026-06-08 tags de catalogo: `pnpm --dir frontend build`
- 2026-06-08 tags de catalogo: `pnpm check`
- 2026-06-08 tags de catalogo: HTTP local em `/app/professional/profile/setup` respondeu 307 sem sessao, mantendo protecao; validacao visual autenticada ficou limitada por nao haver token real acessivel ao agente sem criar mock.

- 2026-06-08 midias do setup: `pnpm --dir frontend check`
- 2026-06-08 midias do setup: `pnpm --dir frontend build`
- 2026-06-08 midias do setup: `pnpm check`
- 2026-06-08 midias do setup: HTTP local em `/app/professional/profile/setup` respondeu 307 sem sessao, e Chrome headless local renderizou a pagina de login apos o redirect; validacao visual autenticada ficou limitada por nao haver token real acessivel ao agente sem criar mock.
- 2026-06-09 capa de video e experiencia: `pnpm --dir backend db:migrate --name add_profile_video_cover_experience_tag`
- 2026-06-09 capa de video e experiencia: `pnpm --dir backend check`
- 2026-06-09 capa de video e experiencia: `pnpm --dir backend build`
- 2026-06-09 capa de video e experiencia: `pnpm --dir frontend check`
- 2026-06-09 capa de video e experiencia: `pnpm --dir frontend build`
- 2026-06-09 capa de video e experiencia: `pnpm check`
- 2026-06-09 capa de video e experiencia: HTTP local em `/app/professional/profile/setup` respondeu 307 sem sessao, mantendo a protecao da rota privada; validacao visual autenticada ficou limitada por nao haver token real acessivel ao agente sem criar mock.

## Implementação

- Backend:
  - `backend/prisma/schema.prisma`
  - `backend/prisma/migrations/20260607233802_add_free_profile_details/migration.sql`
  - `backend/prisma/migrations/20260608010043_add_free_profile_media_religion/migration.sql`
  - `backend/prisma/migrations/20260609034204_add_profile_video_cover_experience_tag/migration.sql`
  - `backend/src/config/multer/filesRoute.ts`
  - `backend/src/modules/api/private/psychologist/free-profile`
  - `backend/src/interfaces/objects/index.ts`
- Frontend:
  - `frontend/src/app/app/profile`
  - `frontend/src/app/app/professional/profile/setup`
  - `frontend/src/app/app/professional/profile/setup/brazil-cities.ts`
  - `frontend/src/app/app/psychologist/[id]`
  - `frontend/src/components/psychologists/psychologist-card.tsx`
  - `frontend/src/components/ui/theme-switch.tsx`
  - `frontend/src/components/ui/verified-badge.tsx`
  - `frontend/src/utils/media.ts`
  - `frontend/src/api/generator/types/free-profile.ts`
  - `frontend/next.config.ts`

## Ajuste pos-validacao em 2026-06-08

- Referencias visuais consultadas: `_product/proto/Perfil - Psicologo.jpg`, `_product/proto/Editar Perfil - Psicologo.jpg` e prints enviados pelo usuario no pedido. Builder/Quick Copy nao esta exposto como ferramenta neste ambiente; a limitacao permanece registrada e as imagens locais foram usadas como fonte auditavel.
- Lista de cidades gerada a partir da API oficial de Localidades do IBGE em 2026-06-08 e versionada no frontend para nao criar dependencia externa de runtime.
- ADR atualizada em `adrs/0027-perfil-gratuito-sem-crp.md`.

## Ajuste complementar em 2026-06-08

- O selo verificado deixou de ser derivado de `cfp_verified_at` no recorte de exibicao publica. A regra de UI/API agora considera somente assinatura profissional ativa com plano diferente de `gratuito`.
- O CRP exibido ao lado de "Psicologo" e normalizado por utilitario frontend para o padrao `CRP 00/000000`.
- A lista publica calcula `available_today` no backend a partir de `available_days` e do fuso `America/Sao_Paulo`, para evitar divergencia entre cliente e servidor.
- A edicao do perfil gratuito reforca campos obrigatorios no Zod e no backend quando publicado, incluindo dados demograficos, CRP, abordagens e endereco.
- A limitacao de abordagens foi adicionada ao contrato do plano gratuito como `approach_limit=1`.

## Ajuste visual de catalogos em 2026-06-08

- Referencia usada: print anexado pelo usuario (`Html -> Body.png`) e prototipo local `_product/proto/Editar Perfil - Psicologo.jpg`. Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente.
- `Especialidades` e `Abordagens` passaram a usar um campo visual unico com tags pequenas, botao de remover, placeholder interno e dropdown de opcoes reais do catalogo.
- `Servicos` permanece no padrao de chips atual porque o pedido citou apenas Especialidades e Abordagens.

## Ajuste de midias do setup em 2026-06-08

- Referencia usada: print anexado pelo usuario da rota `/app/professional/profile/setup`; Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente.
- O ajuste de foto de perfil passou a abrir uma modal dedicada com preview circular e arraste para enquadramento antes do upload real para o endpoint existente de avatar.
- O bloco "Video de Apresentacao" passou a ter apenas um botao "Editar" com menu de acoes: trocar video, remover video e adicionar imagem de capa do video.
- A imagem de capa do video ainda nao foi persistida porque o contrato/backend atual possui apenas `video_url`; a UI informa a pendencia sem criar mock ou dado falso.
- O titulo de Especialidades nao exibe mais a copia "(Ate 10 tags)" e a formacao academica ficou mais compacta entre titulo/especialidade, instituicao e ano de formacao.

## Ajuste de capa de video e experiencia em 2026-06-09

- `psychologist_profile.video_cover_url` foi adicionado ao contrato e ao banco para persistir a capa publica do video de apresentacao, com upload real em `psychologist/video-cover/*`.
- `psychologist_profile.show_experience_tag` foi adicionado com default `true` para controlar apenas a exibicao publica da tag de tempo de experiencia; a data de registro CRP continua interna.
- Ao trocar ou remover o video, a capa associada e limpa para evitar preview antigo em video novo.
- O perfil publico e os cards passam a respeitar `show_experience_tag` e usam `video_cover_url` como poster/preview quando informado.
- A opcao "Adicionar imagem de capa do video" deixou de ser pendencia visual e agora chama endpoint real, sem mock.

## Ajuste complementar em 2026-08-13 - default do selo para assinantes/cortesia

- Psicologos com entitlement profissional ativo, incluindo cortesia administrativa, passam a receber `show_experience_tag=true` por default quando o valor `false` veio do periodo gratuito anterior.
- O backend calcula a visibilidade publica do selo comparando `psychologist_profile.updatedAt` com o inicio da assinatura (`grant_started_at` ou `createdAt`), preservando opt-outs feitos depois que o profissional ja estava na camada paga/cortesia.
- Uma migration de dados segura ativa o selo apenas para registros existentes cujo `false` antecede uma assinatura profissional ativa; nao altera perfis gratuitos nem opt-outs posteriores ao entitlement.
- Novas concessoes administrativas e ativacoes Mercado Pago tambem aplicam o default no momento da transicao para o plano profissional.
- ADR atualizado: `adrs/0029-cortesia-profissional-ui-perfil.md`.
- Validacoes: `pnpm --dir backend db:migrate` executado; apos remover BOM do SQL, o Prisma bloqueou por drift historico em migrations antigas ja aplicadas e sugeriu reset, que nao foi executado. `pnpm --dir backend check`, `pnpm --dir backend build` e `pnpm check` executados com sucesso.

## Registro de ajuste complementar em 2026-06-12 — edição de imagem de capa

- Adicionada seção `Imagem de capa` em `/app/professional/profile/setup`, independente do vídeo de apresentação.
- A seção permite upload/troca/remoção de imagem JPG/JPEG, PNG ou WebP, com pré-visualização responsiva usando `next/image` e sem criar dado fake.
- Backend expôs `POST /api/private/psychologist/free-profile/cover-image` e `DELETE /api/private/psychologist/free-profile/cover-image`, reutilizando `multer` e armazenamento público existente em `psychologist/cover-image/*`.
- A capa é recurso de identidade visual do perfil e não depende do entitlement de vídeo do Plano Profissional.
- ADR criado: `adrs/0060-capa-independente-perfil-psicologo.md`.
- Validações: `pnpm --dir backend db:migrate --name add_psychologist_profile_cover_image` executado e recusado pelo Prisma por drift antigo sem reset; migration aplicada de forma não destrutiva com `pnpm --dir backend db:migrate-prod`; `pnpm --dir backend exec prisma migrate status`; `pnpm --dir backend db:generate`; `pnpm --dir backend check`; `pnpm --dir backend build`; `pnpm --dir frontend check`; `pnpm --dir frontend build`; `pnpm check`; rota privada `/app/professional/profile/setup` respondeu 307 sem sessão.

## Ajuste complementar em 2026-06-12 - capa junto da foto de perfil

- A edicao de `/app/professional/profile/setup` passou a tratar a imagem de capa como midia principal de identidade visual, agrupada no topo junto da foto de perfil.
- A ordem visual ficou: foto de perfil, imagem de capa, informacoes basicas e demais secoes.
- A imagem de capa foi removida da secao `Apresentacao`; essa secao voltou a concentrar headline, bio e video de apresentacao.
- O texto explicativo da capa foi simplificado para: `Use uma foto horizontal do consultorio, ambiente de atendimento ou arte institucional.`
- O texto de formatos aceitos foi simplificado para: `JPG, PNG ou WebP`.
- O bloco manteve upload real, troca, remocao, preview com `next/image` e o mesmo padrao visual da plataforma, sem alterar backend, Prisma, contratos ou dados persistidos.
- Validacoes executadas: `pnpm --dir frontend biome:fix`; `pnpm --dir frontend check`; `pnpm --dir frontend build`; `pnpm check`; HTTP local `/app/professional/profile/setup` respondeu 307 sem sessao, preservando protecao da rota privada.

## Ajuste complementar em 2026-06-12 - secao unica de imagens do perfil

- A tela `/app/professional/profile/setup` reorganizou as midias principais em uma secao unica no topo chamada `Imagens do perfil`, antes de `Informacoes basicas`.
- A ordem visual passou a ser: imagem de capa, foto de perfil e informacoes basicas.
- A secao usa apenas um texto explicativo curto: `Adicione uma imagem de capa horizontal e uma foto de perfil.`
- Os textos de cada midia foram reduzidos para `Imagem de capa` / `JPG, PNG ou WebP` e `Foto de perfil` / `JPG, PNG ou WebP`.
- A capa vigente continua vindo de `profile.cover_image_url` e agora fica em preview horizontal compacto e evidente; ao selecionar nova capa, um `ObjectURL` local atualiza a pre-visualizacao imediatamente enquanto o upload real executa.
- A foto de perfil permanece com preview circular, troca, remocao e modal de enquadramento existentes, mas dentro do mesmo bloco compacto de midias.
- Nao houve alteracao de backend, Prisma, contratos, validacoes de arquivo, formatos aceitos ou endpoints de upload/remocao.

## Ajuste complementar em 2026-06-12 - retorno contextual na edicao profissional

- A seta `Voltar ao perfil` em `/app/professional/profile/setup` deixou de apontar sempre para `/app/profile`.
- O controle agora usa o historico do navegador para retornar a tela anterior, preservando casos em que o psicologo abriu a edicao a partir do perfil publico `/app/psychologist/:id`.
- Quando nao houver historico disponivel, o fallback seguro usa o perfil publico do psicologo autenticado; se o id ainda nao estiver carregado, retorna para `/app/profile`.
- Nao houve alteracao de dados, backend, Prisma, packages ou comportamento de salvamento.

Validacoes executadas:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local em `/app/professional/profile/setup` respondeu `307` sem sessao, preservando protecao da rota privada.

## Ajuste complementar em 2026-06-12 - preview premium de imagens do perfil

- A secao `Imagens do perfil` em `/app/professional/profile/setup` foi refinada visualmente para parecer uma pre-visualizacao real do perfil, e nao um bloco tecnico de upload.
- A capa agora aparece como banner horizontal compacto dentro de um unico card, com estado vazio em gradiente suave, texto `Adicionar capa` e formatos `JPG, PNG ou WebP`.
- O avatar circular passou a ficar parcialmente sobreposto a parte inferior da capa, com acao discreta de camera no proprio avatar.
- As acoes de capa foram reduzidas a botoes circulares de icone para trocar/remover, e a remocao da foto ficou como acao pequena abaixo do avatar.
- Foram preservados upload, remocao, preview local via `ObjectURL`, validacoes, endpoints, dados persistidos e modal de ajuste da foto.
- Nao houve alteracao de backend, Prisma, rotas, schema ou packages.

Validacoes executadas:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local em `/app/professional/profile/setup` respondeu `307` sem sessao, preservando protecao da rota privada.

## Correcao em 2026-06-12 - exibicao publica da imagem de capa apos upload

- Causa identificada: o upload persistia `cover_image_url` com o prefixo publico `psychologist/cover-image/*`, mas a rota publica `/public/files/*` ainda permitia apenas `psychologist/avatar/*`, `psychologist/video/*` e `psychologist/video-cover/*`. Por isso a URL salva retornava 404 e o frontend caia no placeholder.
- A rota publica de arquivos passou a permitir `psychologist/cover-image/*`, mantendo a validacao de namespace controlado e sem abrir acesso irrestrito ao bucket.
- O hook `usePsychologistFreeProfile` agora atualiza imediatamente o cache de `psychologist_free_profile` com `data.profile` retornado pelo upload/remocao da capa antes de invalidar as queries. Assim, ao limpar o preview local (`ObjectURL`), a tela ja possui a URL final persistida para renderizar.
- A tela limpa o estado de falha de imagem ao concluir upload/remocao, evitando placeholder preso apos uma URL anterior ter falhado.
- Logs temporarios de debug nao foram mantidos no codigo final; a causa foi confirmada por inspecao do fluxo storage -> URL -> rota publica -> cache frontend.
- Nao houve alteracao de schema, migration, endpoint de upload, storage, dados ou packages.

Validacoes executadas:

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local em `/app/professional/profile/setup` respondeu `307` sem sessao, preservando a protecao da rota privada.
- Verificacao estatica confirmou que `backend/src/config/multer/filesRoute.ts` permite o prefixo `psychologist/cover-image/`.

## Ajuste complementar em 2026-06-12 - menus discretos nas imagens do perfil

- A seção `Imagens do perfil` em `/app/professional/profile/setup` passou a expor apenas um ícone de edição sobre a capa e um ícone de edição sobre o avatar.
- As ações permanentes de capa e foto foram substituídas por menus contextuais com `Alterar` e `Excluir`, reutilizando o padrão já presente na tela para mídia de apresentação.
- Os textos visíveis `Foto de perfil` e `Remover foto` foram removidos do bloco para reduzir ruído visual; a imagem passa a ser o elemento protagonista.
- O upload real, remoção, preview local via `ObjectURL`, validações de formato/tamanho, endpoints e dados persistidos foram preservados sem alteração de backend, Prisma, packages ou rotas.
- Builder/Quick Copy não está exposto como ferramenta direta neste ambiente; a referência auditável permanece o protótipo local `_product/proto/Editar Perfil - Psicólogo.jpg` e os refinamentos solicitados pelo usuário.

Validações executadas:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Verificação estática confirmou que `Foto de perfil` e `Remover foto` não permanecem em `frontend/src/app/app/professional/profile/setup/logic.tsx`, e que os menus exibem `Alterar capa`, `Excluir capa`, `Alterar foto` e `Excluir foto`.
- HTTP local em `/app/professional/profile/setup` respondeu `307` sem sessão, preservando a proteção da rota privada.

## Ajuste complementar em 2026-06-12 - retorno fixo para o menu do perfil profissional

- Por decisão de produto, o controle `Voltar ao perfil` em `/app/professional/profile/setup` não usa mais histórico do navegador nem retorna para o perfil público contextual.
- O controle passou a ser um link direto para `/app/profile`, que é o menu privado do perfil do psicólogo com as opções de conta, edição, analytics, avaliações e assinatura.
- O link de ícone `Ver perfil público` permanece separado e continua apontando para `/app/psychologist/:id` quando o profissional quiser visualizar o perfil público.
- Não houve alteração de dados, backend, Prisma, packages, uploads ou comportamento de salvamento.

Validações executadas:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local em `/app/professional/profile/setup` respondeu `307` sem sessão, preservando proteção da rota privada.

## Ajuste complementar em 2026-06-17 - ícone de explorar comunidades no menu de perfil

- O menu privado compartilhado em `/app/profile` passou a exibir o item `Explorar comunidades` com o ícone `Compass`, o mesmo usado no botão `Explorar` da navegação de comunidades.
- A alteração cobre o perfil de psicólogos porque o menu é renderizado pelo mesmo componente de Perfil usado por pacientes e profissionais.
- Foram preservados tamanho, alinhamento, espaçamento, cores e estados visuais do item existente, sem mudanças de backend, Prisma, rotas, packages ou dados.
- ADR criado: `adrs/0115-iconografia-explorar-comunidades-perfil.md`.

## Ajuste complementar em 2026-06-18 - header secundário premium em Editar perfil profissional

- A tela `/app/professional/profile/setup` passou a usar o componente compartilhado `AppPageHeader`, alinhando `Editar perfil` ao mesmo header premium de `Meus Analytics`, `Minhas Avaliações`, `Minha assinatura`, `Email e senha`, `Meus posts e comentários`, `Salvos` e `Comunidades seguidas`.
- O header mantém botão de voltar à esquerda para `/app/profile`, título centralizado, fundo branco, borda suave, sombra discreta, altura e paddings consistentes.
- A ação `Ver perfil público` foi preservada fora do header, em uma linha própria, para manter o header sem ações auxiliares e visualmente idêntico às demais telas padronizadas.
- O ajuste não altera formulário, validações, upload/remoção de mídias, endpoints, dados persistidos, Prisma ou packages.
- ADR atualizado: `adrs/0119-header-secundario-premium-compartilhado.md`.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP em `/app/professional/profile/setup` com usuário psicólogo temporário real removido do banco ao final, nos viewports mobile 390x844 e desktop 1024x768, confirmando centralização do título e ausência de overflow horizontal.
## Ajuste complementar em 2026-06-18 - ação de visualizar perfil público no header

- A tela `/app/professional/profile/setup` deixou de exibir o botão textual `Ver perfil público` abaixo do header.
- O header `Editar perfil` agora usa o slot direito opcional do `AppPageHeader` com ícone `Eye`, no mesmo tamanho, cor, radius e interação do botão de voltar.
- O título permanece centralizado porque o header mantém grid `44px 1fr 44px`; o ícone da direita aponta para `/app/psychologist/:id` quando os dados reais do perfil carregam.
- O ajuste reduz ruído visual no conteúdo e preserva a navegação para o perfil público sem alterar formulário, endpoints, dados persistidos, Prisma ou packages.
- ADR atualizado: `adrs/0119-header-secundario-premium-compartilhado.md`.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP em `/app/professional/profile/setup` com usuário psicólogo temporário real removido do banco ao final, nos viewports mobile 390x844 e desktop 1024x768, confirmando ausência do botão textual, título centralizado, botões laterais equivalentes, ausência de overflow horizontal e clique do ícone abrindo `/app/psychologist/:id`.

## Ajuste complementar em 2026-06-18 - video obrigatorio para perfil publico

- A publicacao do perfil profissional em `/api/private/psychologist/free-profile` passou a exigir `psychologist_profile.video_url` preenchido, alem dos demais dados estruturais obrigatorios.
- `headline` (campo visual `Bio`) e `bio` (campo visual `Apresentacao de texto`) deixaram de ser obrigatorios para publicar/exibir o perfil, permanecendo opcionais e com validacao de tamanho quando preenchidos.
- As rotas de exibicao publica/relacional de psicologos agora consideram apenas perfis publicados com video: detalhe, contato, avaliacao por paciente, favoritos, seguindo e elegibilidade de Top Mentor.
- A tela `/app/professional/profile/setup` removeu o indicador obrigatorio de Bio/Apresentacao de texto, marcou `Video de Apresentacao` como obrigatorio e impede publicacao local sem video antes de chamar a API.
- O idioma `Portugues` continua sendo o valor padrao de `Idiomas` no formulario e e enviado como lista real ao salvar, sem mock.
- ADR criado: `adrs/0120-video-obrigatorio-perfil-publico-bio-opcional.md`.

Validacoes executadas:

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- API local real em `http://localhost:3001` com psicologos temporarios removidos ao final: publicacao sem video `400`, publicacao com video `200`, detalhe publico com video `200`, perfil forcado publicado sem video `404`, mantendo `headline=null`, `bio=null` e `languages[0]="Portugues"` no payload salvo.
- Browser local via Chrome/CDP em `/app/professional/profile/setup` com usuario psicologo temporario removido ao final, nos viewports mobile 390x844 e desktop 1024x768: sem overflow horizontal, Bio/Apresentacao de texto sem indicador obrigatorio e Video de Apresentacao marcado como obrigatorio com texto explicativo.

## Ajuste complementar em 2026-06-21 - chips marcados sem sombra

- Pedido do usuario: remover o sombreamento das opcoes marcadas em `Dias com horarios disponiveis`, `Servicos` e `Publico` na tela `/app/professional/profile/setup`.
- Os chips selecionados desses grupos mantem fundo azul, texto branco, borda primaria e estados de hover/foco, mas agora usam `shadow-none`, sem a sombra projetada azul anterior.
- A alteracao foi feita no componente compartilhado de chips da propria tela, que atende exatamente `Servicos`, `Publico` e `Dias com horarios disponiveis`, sem alterar backend, Prisma, contratos, dados persistidos ou packages.
- Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente; a referencia visual usada foi o print do usuario e o prototipo local `_product/proto/Editar Perfil - Psicologo.jpg`.
- ADR atualizado: `adrs/0027-perfil-gratuito-sem-crp.md`.

Validacoes executadas:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local autenticado com token real em `/app/professional/profile/setup` respondeu `200`.
- Verificacao estatica confirmou que o estado `checked` dos chips usa `shadow-none` e nao possui mais `shadow-[0_8px_18px_rgb(48_140_232_/_20%)]` nem `ring-1 ring-primary/20`.

## Ajuste complementar em 2026-06-21 - identidade profissional bloqueada em cortesia verificada

- Pedido do usuario: em `/app/professional/profile/setup`, bloquear edicao de `CPF`, `Regional do CRP` e `No. Registro CRP` para psicologos com cortesia profissional e CPF/CRP completos.
- A UI agora desabilita os tres campos quando o perfil possui `plan.is_courtesy=true`, plano nao gratuito e valores persistidos completos de CPF/CRP. Esta e a regra transitoria enquanto o painel administrativo com busca CFP ainda nao existe.
- A tela mostra um aviso curto explicando que CPF/CRP ficam bloqueados porque o perfil verificado recebeu cortesia profissional.
- O select de `Regional do CRP` injeta o valor persistido como opcao somente quando ele nao existe mais na lista padrao, evitando campo bloqueado visualmente vazio em dados legados.
- O submit do frontend preserva os valores persistidos de CPF/CRP quando a identidade esta bloqueada, mesmo que o estado local seja alterado por inspecao manual.
- O backend passou a recalcular a mesma regra antes de salvar e ignora `cpf`/`crp` recebidos no payload quando a identidade esta bloqueada, preservando a fonte administrativa/CFP no banco.
- Nao houve alteracao de schema Prisma, migrations, endpoints, packages, storage ou contratos publicos.
- Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente; a referencia visual usada permanece o prototipo local `_product/proto/Editar Perfil - Psicologo.jpg` e o pedido direto do usuario.
- ADR atualizado: `adrs/0029-cortesia-profissional-ui-perfil.md`.

Validacoes executadas:

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- Validacao de servico backend com psicologo temporario real removido ao final: tentativa de alterar `cpf`, `crp_region` e `crp_number` em perfil `admin_grant` com CPF/CRP completos e `crp_status="pendente"` retornou `200`, preservou os valores originais na resposta e manteve `psychologist_profile.cpf/crp` inalterados no banco.
- Chrome/CDP headless local em `/app/professional/profile/setup`, viewport 390x844, com `<CONTA_DE_TESTE_AUTORIZADA>`: `cpf`, `crp_region` e `crp_number` ficaram `disabled`, os valores persistidos foram exibidos, a mensagem de bloqueio apareceu e `scrollWidth=390`; token temporario removido ao final.
- Verificacao estatica confirmou a regra de bloqueio no frontend/backend e o `undefined` seletivo no repository para impedir overwrite de CPF/CRP bloqueados.

## Ajuste complementar em 2026-06-24 - confirmacao antes de excluir video de apresentacao

- Ao clicar em `Excluir video`, a tela `/app/professional/profile/setup` agora abre uma modal de confirmacao antes de executar a remocao.
- A mensagem informa explicitamente que excluir o video remove o perfil da pagina de psicologos ate que um novo video de apresentacao seja enviado.
- A exclusao so e executada apos confirmacao explicita em `Excluir video`; durante a mutation pendente, fechamento e confirmacao ficam bloqueados para evitar estado ambiguo.
- Nao houve alteracao de backend, Prisma, rotas, storage, dados persistidos, contratos ou packages.
- Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente; a referencia auditavel foi o prototipo local `_product/proto/Editar Perfil - Psicologo.jpg` e o pedido direto do usuario.

Validacoes executadas:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local em `/app/professional/profile/setup` respondeu `307` sem sessao, preservando a protecao da rota privada.

## Ajuste complementar em 2026-06-29 - dicas contextuais para psicólogos

- Pedido do usuário: criar dicas diferentes para o psicólogo, sem dica de perfil completo, priorizando vídeo de apresentação e respostas a pacientes na comunidade.
- A dica do vídeo passou a aparecer no alvo real do card de vídeo em `/app/professional/profile/setup`, com texto reforçando que o vídeo é o principal destaque nos resultados de busca e pode ser decisivo para converter pacientes.
- A dica de respostas passou a aparecer em posts de pacientes na comunidade, reforçando que responder pacientes é o principal conversor do psicólogo na Lectum.
- A dica de criação de conteúdo original ficou secundária e só é elegível depois da dica de resposta ter sido vista.
- Todas as dicas são exibidas apenas para usuários autenticados com `role="psicologo"`, usam uma dica por contexto e persistem o visto quando a dica aparece ou quando o alvo é clicado antes dela.
- Builder/Quick Copy não está exposto como ferramenta direta neste ambiente; as referências auditáveis foram `_product/proto/Editar Perfil - Psicologo.jpg`, `_product/proto/Dentro do Post.jpg`, `_product/proto/Feed Comunidade.jpg` e `_product/proto/Dentro da Comunidade.jpg`.
- ADR atualizado: `adrs/0109-dicas-onboarding-persistidas-por-usuario.md`.

Critérios de aceite complementares:

- [x] Dica de perfil completo não foi criada para psicólogos.
- [x] Dica do vídeo de apresentação foi implementada no card real de vídeo e é persistida por usuário.
- [x] Dica de resposta a pacientes foi implementada em posts de pacientes e é persistida por usuário.
- [x] Dica de conteúdo original para psicólogos só aparece depois da dica de resposta.
- [x] Dicas são restritas a psicólogos autenticados e reutilizam `/api/private/account/tips`.
- [x] Clique no alvo real marca a dica como vista e executa a ação do produto, sem CTA separado.
- [x] Nenhum mock, endpoint simulado ou package novo foi usado.

Validações executadas:

- `pnpm --dir backend db:migrate` executado; o Prisma recusou `migrate dev` por drift preexistente em migrations já aplicadas e também apontou a tentativa inicial desta migration como modificada após rollback. Nenhum reset destrutivo foi executado.
- `pnpm --dir backend db:migrate-prod`
- `pnpm --dir backend exec prisma migrate status`
- Consulta real em `information_schema.columns` confirmou as três novas colunas booleanas em `users` com `default false` e `NOT NULL`.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
- `next start` local em `127.0.0.1:3103`: `/app/professional/profile/setup` respondeu `307` sem sessão; `/app/community/ansiedade-em-equilibrio` e `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video` responderam `200`.
- Chrome headless local em `/auth/login`, viewport mobile `390x844`, gerou screenshot da tela de login. As dicas autenticadas não foram exercitadas visualmente porque não havia sessão real de psicólogo disponível sem criar mock.

## Ajuste complementar em 2026-06-30 - descrição de visibilidade do perfil

- Pedido do usuário: adicionar uma descrição em `Perfil visível para pacientes` explicando que o psicólogo pode desabilitar a visibilidade em caso de férias ou agenda lotada.
- A tela `/app/professional/profile/setup` passou a exibir a orientação diretamente dentro do label do checkbox, mantendo o controle acionável e a hierarquia mobile-first do card.
- Não houve alteração de backend, Prisma, rotas, contratos, persistência, packages ou regra de publicação; apenas copy/UX explicativa sobre o boolean real `published`.
- Builder/Quick Copy não está exposto como ferramenta direta neste ambiente; a referência auditável foi o print do usuário e o protótipo local `_product/proto/Editar Perfil - Psicólogo.jpg`.

Critério complementar:

- [x] `Perfil visível para pacientes` informa que, em férias ou agenda lotada, o psicólogo pode desabilitar a visibilidade do perfil.

Validações executadas:

- `pnpm --dir frontend exec biome check --write src/app/app/professional/profile/setup/logic.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- HTTP local em `/app/professional/profile/setup` respondeu `307` sem sessão de CLI, preservando a proteção da rota privada.
- Verificação estática confirmou a nova copy no bundle de desenvolvimento gerado para a rota.

## Ajuste complementar em 2026-07-04 - CRP confirmado pelo CFP no setup

- Pedido do usuario: a tela `/app/professional/profile/setup` nao deve trocar o numero retornado pela consulta publica CFP/InfoSimples para o campo de regional nem deixar o numero de registro vazio.
- O backend do `free-profile` passa a derivar `crp_region` e `crp_number` a partir do `professional_registry_check.raw` confirmado quando houver validacao CFP real, preservando `nome_regional` e `registro` retornados pelo provedor autorizado.
- O parser de CRP usa o ultimo `/` como separador para preservar nomes de regionais com barra, como `PA/AP`.
- A faixa azul `CPF e CRP validados` foi removida da secao `Informacoes basicas`, mantendo os campos CPF/CRP travados quando `identity_fields_locked=true`.
- Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente; a referencia auditavel foi o print enviado pelo usuario da rota mobile em base ~390px.
- ADR criado: `adrs/0206-crp-cfp-preserva-regional-registro.md`.

Criterio complementar:

- [x] Regional do CRP e No Registro CRP exibem os valores reais da busca CFP/InfoSimples em perfis com CFP confirmado, e a faixa azul de validacao nao aparece mais.

Validacoes executadas:

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Consulta real ao endpoint `GET /api/private/psychologist/free-profile` com token temporario real removido ao final confirmou `crp_region="<REGIÃO>"`, `crp_number="<REGISTRO>"` e `identity_fields_locked=true`.
- Chrome/CDP headless na rota `/app/professional/profile/setup`, viewport mobile 390x844 via URL ngrok, confirmou select `crp_region` desabilitado com valor `<REGIÃO>`, input `crp_number` desabilitado com `<REGISTRO>` e ausencia da faixa `CPF e CRP validados`. Token temporario de validacao removido ao final.

## Ajuste complementar em 2026-07-07 - Data de Nascimento obrigatoria

- Pedido do usuario: adicionar um campo obrigatorio de `Data de Nascimento` na edicao do perfil em `/app/professional/profile/setup`.
- O campo foi adicionado em `Informacoes basicas`, logo apos CPF, usando o controller `calendar` da fundacao TASK-02, com largura total, slot de erro reservado e validacao Zod mobile-first.
- `DATA-MODEL.md` e `psychologist_profile` receberam `birthdate DateTime?`; o banco permanece nullable para nao criar backfill fake em perfis legados, mas o contrato de atualizacao exige uma data valida em todo novo salvamento.
- O backend valida e persiste a data no endpoint real `/api/private/psychologist/free-profile`, rejeitando data ausente, invalida, futura ou anterior a 1900 com mensagem em PT-BR.
- `profile.birthdate` e exposto apenas no endpoint privado do psicologo; nenhuma rota publica de descoberta/perfil passou a publicar a data de nascimento.
- Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente; as referencias usadas foram `_product/proto/Editar Perfil - Psicologo.jpg` e o print enviado pelo usuario.
- ADR criado: `adrs/0217-data-nascimento-perfil-psicologo.md`.

Criterios complementares:

- [x] Campo `Data de Nascimento` obrigatorio aparece em `Informacoes basicas` na edicao do perfil profissional.
- [x] Campo usa React Hook Form, Zod, `useFormList` e controller `calendar` da TASK-02.
- [x] Backend persiste `psychologist_profile.birthdate` sem backfill artificial para perfis legados.
- [x] API rejeita salvamento sem data de nascimento valida.
- [x] A data de nascimento permanece privada e nao foi adicionada a respostas publicas de descoberta/perfil.
- [x] Migration aditiva foi aplicada com `pnpm --dir backend db:migrate`.
- [x] Nenhum mock, dado fake permanente, endpoint simulado ou package novo foi usado.

Validacoes executadas:

- `pnpm --dir backend db:migrate` falhou inicialmente por BOM no SQL da migration; o SQL foi regravado sem BOM.
- `pnpm --dir backend db:migrate` executado novamente com sucesso, reportando schema em sincronia.
- `pnpm --dir backend exec prisma migrate status` confirmou banco em dia.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- API local real: `GET /api/private/psychologist/free-profile` com usuario psicologo temporario retornou `profile.birthdate=null`.
- API local real: `PUT /api/private/psychologist/free-profile` sem `birthdate` retornou `400` com `code="invalid_birthdate"`.
- Chrome/CDP headless em `http://localhost:3000/app/professional/profile/setup`, viewport mobile 390x844, com usuario psicologo temporario real: confirmou `Data de Nascimento`, input `type="date"`, indicador obrigatorio e `scrollWidth=390`.
- Usuario psicologo temporario de validacao removido do banco ao final.

## Ajuste complementar em 2026-07-11 - cortesia ativa bloqueia CPF/CRP no perfil

- Pedido do usuario: apos a concessao de uma cortesia, `CPF`, `Regional do CRP` e `No Registro CRP` devem se tornar ineditaveis na edicao do psicologo.
- O backend do `free-profile` passou a considerar a assinatura ativa `source="admin_grant"` como fonte operacional suficiente para retornar `profile.identity_fields_locked=true`, mesmo sem preencher artificialmente `cfp_verified_at`.
- A UI de `/app/professional/profile/setup` ja respeitava essa flag e, portanto, passa a renderizar os tres campos como desabilitados para cortesia ativa sem criar regra paralela no frontend.
- O `PUT /api/private/psychologist/free-profile` continua recalculando a flag e ignorando `cpf`/`crp` no repository quando a identidade esta bloqueada, impedindo sobrescrita por payload manipulado.
- Nao houve alteracao de schema Prisma, migrations, endpoints, packages, storage ou contratos publicos.
- Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente; a referencia visual usada permanece o prototipo local `_product/proto/Editar Perfil - Psicologo.jpg` e o print enviado pelo usuario.
- ADR atualizado: `adrs/0186-bloqueio-cpf-crp-validacao-profissional.md`.

Criterio complementar:

- [x] Em cortesia administrativa ativa, CPF, Regional do CRP e No Registro CRP ficam ineditaveis na edicao do psicologo e nao podem ser sobrescritos pelo payload do proprio perfil.

Validacoes executadas:

- API local real: `GET /api/private/psychologist/free-profile` com psicologo real em cortesia ativa retornou `status=200`, `plan.source="admin_grant"`, `profile.cfp_verified_at=null` e `profile.identity_fields_locked=true`.
- Chrome/CDP headless em `http://localhost:3000/app/professional/profile/setup`, viewport mobile 390x844, com psicologo real em cortesia ativa: confirmou `cpf`, `crp_region` e `crp_number` desabilitados, valores `<CPF_DE_TESTE>`, `<REGIÃO>`, `<REGISTRO>`, ausencia de erro de acesso e `scrollWidth=390`.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`


## Ajuste complementar em 2026-08-10 - placeholder dos campos de tags

- Pedido do usuario: os textos `Adicione uma especialidade...` e `Adicione uma abordagem...` devem ter o mesmo tamanho da fonte textual das tags selecionadas e aparecer sempre na linha abaixo das tags, evitando quebra textual no mobile.
- A alteracao ficou restrita ao componente de catalogo da tela `/app/profissional/perfil/configurar` (`/app/professional/profile/setup` legado), sem alterar backend, Prisma, contratos, dados persistidos, packages ou limites reais de plano.
- O campo mobile-first agora reserva uma linha propria para o placeholder dos dois catalogos, usando o mesmo tamanho de texto das tags (`text-[0.68rem]`) e `whitespace-nowrap`.
- Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente; as referencias auditaveis foram o print enviado pelo usuario em 2026-08-10 e o prototipo local `_product/proto/Editar Perfil - Psicologo.jpg`.
- ADR atualizado: `adrs/0027-perfil-gratuito-sem-crp.md`.

Criterios complementares:

- [x] `Adicione uma especialidade...` usa o mesmo tamanho de fonte das tags de especialidade.
- [x] `Adicione uma abordagem...` usa o mesmo tamanho de fonte das tags de abordagem.
- [x] Os placeholders aparecem em linha propria abaixo das tags selecionadas e nao quebram o texto no mobile.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, migration ou package novo foi usado.

Validacoes executadas:

- `pnpm --dir frontend exec biome check --write src/app/app/professional/profile/setup/components/catalog-fields.tsx src/app/app/professional/profile/setup/views/professional-profile-setup.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build` (reexecutado com sucesso apos limpar apenas o artefato local gerado `frontend/.next`; a primeira tentativa falhou por lock/trace inconsistente de build anterior)
- `pnpm check:version`
- `pnpm check` (falhou em `check:cycles` por ciclos preexistentes/concorrentes em arquivos de comunidade fora deste ajuste: `app/app/community/[slug]/post/new/logic.tsx` -> views -> `app/app/community/[slug]/logic.tsx` -> views -> post/new)
- Dev server local em `http://127.0.0.1:3114`: `/version` respondeu `200` com `{"application":"frontend","version":"0.1.17"}`; rota legada `/app/professional/profile/setup` respondeu `308` para `/app/profissional/perfil/configurar`; rota canonica privada `/app/profissional/perfil/configurar` respondeu `307` para login sem sessao, preservando protecao. Validacao visual autenticada ficou limitada por nao haver sessao real de psicologo disponivel sem criar mock.


## Ajuste complementar em 2026-08-10 - fonte do placeholder igual a tag

- Pedido do usuario: apos o ajuste de linha, os textos `Adicione uma especialidade...` e `Adicione uma abordagem...` ainda pareciam maiores que as tags selecionadas.
- O componente `CatalogTagField` passou a usar uma classe tipografica compartilhada para tags e placeholder, com `text-[10px]` e `leading-[1.15]`, garantindo o mesmo tamanho visual no mobile.
- A regra de linha propria foi preservada com `w-full basis-full whitespace-nowrap`.
- Nao houve alteracao de backend, Prisma, endpoints, contratos, dados persistidos, packages ou envs.
- Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente; a referencia auditavel foi o retorno visual do usuario em 2026-08-10 e o prototipo local `_product/proto/Editar Perfil - Psicologo.jpg`.
- ADR atualizado: `adrs/0027-perfil-gratuito-sem-crp.md`.

Criterios complementares:

- [x] Tags selecionadas e placeholder usam a mesma classe de tamanho textual.
- [x] O placeholder permanece na linha abaixo das tags e sem quebra textual.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, migration ou package novo foi usado.

Validacoes executadas:

- `pnpm --dir frontend exec biome check --write src/app/app/professional/profile/setup/components/catalog-fields.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `pnpm check:version`
- Dev server local em `http://127.0.0.1:3148`: `/version` respondeu `200` com `{"application":"frontend","version":"0.1.109"}` e `/app/profissional/perfil/configurar` respondeu `307` para login sem sessao, preservando a protecao da rota privada. Validacao visual autenticada ficou limitada por nao haver sessao real de psicologo disponivel sem criar mock.
- Verificacao estatica confirmou que tags e placeholder usam `catalogTagTextClassName = "text-[10px] leading-[1.15]"`.
- Dev server local em `http://127.0.0.1:3116`: `/version` respondeu `200` com `{"application":"frontend","version":"0.1.22"}` e `/app/profissional/perfil/configurar` respondeu `307` para login sem sessao, preservando protecao da rota privada.


## Ajuste complementar em 2026-08-10 - Servicos e Publico em lista suspensa

- Pedido do usuario: na edicao de perfil do psicologo, `Servicos` e `Publico` devem deixar de ser chips sempre expostos e passar a usar lista suspensa como `Especialidades` e `Abordagens`.
- A ordem do bloco `Filtros` passou a ser: `Especialidades`, `Abordagens`, `Servicos`, `Publico`, `Idiomas`.
- `CatalogTagField` foi ampliado para suportar `service_ids` e `target_audience`, mantendo tags removiveis, dropdown mobile-first, limites reais de plano e validacao do formulario real.
- `Publico` usa o catalogo real `profile.data.catalogs.target_audiences` com valor persistido por `slug`; `Servicos` continua usando IDs reais de `profile.data.catalogs.services`.
- Nao houve alteracao de backend, Prisma, migrations, endpoints, contratos publicos, dados persistidos, envs ou packages novos.
- Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente; as referencias auditaveis foram o print enviado pelo usuario em 2026-08-10 e `_product/proto/Editar Perfil - Psicologo.jpg`.
- ADR atualizado: `adrs/0027-perfil-gratuito-sem-crp.md`.

Criterios complementares:

- [x] `Servicos` usa lista suspensa com tags removiveis, como `Especialidades` e `Abordagens`.
- [x] `Publico` usa lista suspensa com tags removiveis, como `Especialidades` e `Abordagens`.
- [x] A ordem dos campos em `Filtros` ficou `Especialidades`, `Abordagens`, `Servicos`, `Publico`, `Idiomas`.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, migration ou package novo foi usado.

Validacoes executadas:

- `pnpm --dir frontend exec biome check --write src/app/app/professional/profile/setup/components/catalog-fields.tsx src/app/app/professional/profile/setup/hooks/use-professional-profile-setup-controller.tsx src/app/app/professional/profile/setup/views/professional-profile-setup.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm version:bump`
- `pnpm check:version`
- Verificacao estatica confirmou a ordem `specialty_ids`, `approach_ids`, `service_ids`, `target_audience`, `language` no bloco `Filtros`.
- Dev server local em `http://127.0.0.1:3124`: `/version` respondeu `200` com `{"application":"frontend","version":"0.1.24"}` e `/app/profissional/perfil/configurar` respondeu `307` para login sem sessao, preservando a protecao da rota privada. Validacao visual autenticada ficou limitada por nao haver sessao real de psicologo disponivel sem criar mock.
- `pnpm check` foi executado e falhou em `check:encoding` por BOM UTF-8 em arquivos de moderacao/admin fora deste ajuste: `admin/src/app/(admin)/moderacao/sugestoes-comunidades/modules/community-suggestions-support.ts`, `backend/src/modules/api/admin/private/moderation/repositories/queries/AdminModerationCommunitySuggestionsRepository.ts`, `backend/src/modules/api/admin/private/moderation/use-cases/services/community-suggestions.ts` e `admin/src/components/admin-shell/nav.ts`.


## Ajuste complementar em 2026-08-10 - Data de Nascimento digitavel

- Pedido do usuario: na edicao de perfil do psicologo, `Data de Nascimento` deve ser digitavel no formato visual `00/00/0000`, em vez de selecionavel no calendario nativo do celular.
- O ajuste ficou restrito ao frontend da rota `/app/profissional/perfil/configurar` (`/app/professional/profile/setup` legado), sem alterar backend, Prisma, migrations, endpoints, contratos publicos, dados persistidos, envs ou packages.
- O controller `calendar` da fundacao TASK-02 ganhou a opcao `dateDisplayFormat="pt-BR"` para renderizar `type="text"`, `inputMode="numeric"`, `maxLength=10`, placeholder `00/00/0000` e mascara progressiva `DD/MM/AAAA`.
- O campo de perfil do psicologo usa essa opcao, mantendo valor visual `DD/MM/AAAA` no formulario e convertendo para `YYYY-MM-DD` apenas ao montar o payload real do `PUT /api/private/psychologist/free-profile`.
- O comportamento nativo `type="date"` permanece como padrao do controller para outros usos existentes.
- Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente; a referencia auditavel permanece `_product/proto/Editar Perfil - Psicologo.jpg` e o retorno do usuario em 2026-08-10.
- ADR atualizado: `adrs/0217-data-nascimento-perfil-psicologo.md`.

Criterios complementares:

- [x] Campo `Data de Nascimento` deixa de usar `input type="date"` quando configurado para o perfil do psicologo.
- [x] Campo aceita digitacao mobile-first no formato visual `00/00/0000`, com teclado numerico e mascara progressiva.
- [x] Payload do perfil continua enviando `birthdate` como `YYYY-MM-DD` para o backend real.
- [x] Outros usos do controller `calendar` preservam o calendario nativo por padrao.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, migration ou package novo foi usado.

Validacoes executadas:

- `pnpm --dir frontend exec biome check --write src/hooks/form/types.ts src/components/controllers/utils.ts src/components/controllers/calendar/index.tsx src/app/app/professional/profile/setup/use-form.tsx src/app/app/professional/profile/setup/modules/profile-setup-support.ts`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm version:bump`
- `pnpm check:version`
- Verificacao estatica confirmou `dateDisplayFormat: "pt-BR"` no campo `birthdate`, sem `type="date"` para este uso.
- Dev server local em `http://127.0.0.1:3136`: `/version` respondeu `200` com `{"application":"frontend","version":"0.1.27"}`; rota canonica privada `/app/profissional/perfil/configurar` respondeu `307` para login sem sessao; rota legada `/app/professional/profile/setup` respondeu `308` para a canonica. Validacao visual autenticada ficou limitada por nao haver sessao real de psicologo disponivel sem criar mock.

## Ajuste complementar em 2026-08-13 - sombra das chips de dias da semana

- Pedido do usuario: remover a sombra atras das chips de dias da semana em `/app/profissional/perfil/configurar`.
- O ajuste ficou restrito ao `ChipPicker` usado por `Dias com horarios disponiveis`, removendo a sombra projetada do estado base e preservando borda, fundo, foco acessivel e estado selecionado.
- A implementacao reutiliza o componente existente da tela de perfil profissional, sem criar controle paralelo.
- Nao houve alteracao de backend, Prisma, APIs, contratos, dados persistidos, envs ou packages.
- Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente; a referencia auditavel foi o print enviado pelo usuario e o prototipo local `_product/proto/Editar Perfil - Psicologo.jpg`.

Criterios complementares:

- [x] As chips de dias da semana aparecem sem sombra projetada no estado padrao.
- [x] O estado selecionado continua distinguivel por cor primaria e sem sombra.
- [x] Nenhum mock, endpoint simulado, migration, env ou package novo foi usado.

Validacoes executadas:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `pnpm check:version`

## Ajuste complementar em 2026-08-17 - fonte das chips de catalogo

- Pedido do usuario: as chips selecionadas dos catalogos (`Adultos`, `Terapia Online`, `Psicanalise`, etc.) devem ter o mesmo tamanho visual do texto do select `Portugues`.
- O ajuste ficou restrito ao `CatalogTagField` da rota `/app/profissional/perfil/configurar`, separando a classe de fonte das chips selecionadas da classe do placeholder interno.
- As chips selecionadas agora usam `text-sm`, o mesmo tamanho configurado nos selects da fundacao de formulario (`SelectController`); os placeholders internos continuam com a classe compacta anterior para preservar a linha propria mobile-first.
- Nao houve alteracao de backend, Prisma, APIs, contratos, dados persistidos, envs, providers ou packages.
- Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente; a referencia auditavel permanece o prototipo local `_product/proto/Editar Perfil - Psicologo.jpg`, enquanto o ajuste foi definido pela configuracao real de componentes do sistema.

Criterios complementares:

- [x] Chips selecionadas de `CatalogTagField` usam `text-sm`, alinhadas ao tamanho do select `Idiomas`.
- [x] O placeholder interno dos campos de catalogo preserva a linha propria e nao muda para `text-sm`.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, migration, env ou package novo foi usado.

Validacoes executadas:

- `pnpm --dir frontend exec biome check --write src/app/app/professional/profile/setup/components/catalog-fields.tsx`
- `pnpm --dir frontend check` (primeira tentativa excedeu o timeout da ferramenta; reexecucao com timeout maior concluiu sem erros)
- `pnpm --dir frontend build`
- `pnpm check`
- Verificacao estatica confirmou `catalogTagChipTextClassName = "text-sm leading-[1.15]"` para chips selecionadas e `catalogTagPlaceholderTextClassName = "text-[10px] leading-[1.15]"` para placeholders.
- Smoke local autenticado ficou limitado por nao haver sessao real de psicologo disponivel sem criar mock; tentativas de subir `next start` em portas locais 3139/3140 expiraram sem deixar porta ativa para consulta.

## Ajuste complementar em 2026-08-17 - visibilidade do perfil e limite de placeholders

- Pedido do usuario: trocar a opcao de visibilidade do perfil por um switch que informe se o perfil esta visivel para pacientes, alertar no topo quando o perfil estiver oculto e remover o placeholder de adicao quando um catalogo ja atingiu o limite de selecoes.
- A tela `/app/profissional/perfil/configurar` agora separa dois estados de alerta: perfil oculto por `published=false` e perfil nao ativo por informacoes obrigatorias pendentes. O alerta de perfil oculto usa destaque vermelho no topo e orienta a ativar a visibilidade e salvar.
- A opcao de visibilidade deixou de ser checkbox e passou a ser um switch acessivel (`role="switch"`) com status textual `Visivel para pacientes` / `Nao visivel para pacientes`.
- O menu privado `/app/perfil` mantem o alerta visual em `Editar perfil` quando o perfil nao esta ativo e diferencia o texto acessivel quando o motivo for perfil oculto para pacientes.
- `CatalogTagField` deixa de renderizar o placeholder `Adicione...` quando `selected.length >= limit`, preservando chips selecionadas, dropdown, remocao de itens e limites reais do plano.
- Nao houve alteracao de backend, Prisma, migrations, contratos publicos, dados persistidos, envs, providers ou packages.
- Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente; as referencias auditaveis foram os prints enviados pelo usuario em 2026-08-17 e o prototipo local `_product/proto/Editar Perfil - Psicologo.jpg`.
- ADR atualizado: `adrs/0027-perfil-gratuito-sem-crp.md`.

Criterios complementares:

- [x] Controle de `Perfil visivel para pacientes` renderiza como switch, nao como checkbox.
- [x] Switch informa visualmente se o perfil esta visivel ou nao para pacientes.
- [x] Perfil oculto exibe alerta vermelho no topo da edicao do perfil profissional.
- [x] `Editar perfil` no menu privado do psicologo mantem o indicador de alerta quando o perfil esta oculto ou incompleto.
- [x] Campos de catalogo com limite atingido nao exibem mais o texto `Adicione...`.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, migration, env ou package novo foi usado.

Validacoes executadas:

- `pnpm --dir frontend exec biome check --write src/app/app/profile/logic.tsx src/app/app/professional/profile/setup/components/catalog-fields.tsx src/app/app/professional/profile/setup/components/profile-setup-shell.tsx src/app/app/professional/profile/setup/hooks/use-professional-profile-setup-controller.tsx src/app/app/professional/profile/setup/views/professional-profile-setup.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build` (primeira tentativa excedeu o timeout da ferramenta; reexecucao com timeout maior concluiu sem erros)
- `pnpm check`
- `pnpm check:version`
- Smoke local sem sessao em `http://127.0.0.1:3144`: `/version` respondeu `200` com `{"application":"frontend","version":"0.1.145"}` e `/app/profissional/perfil/configurar` respondeu `307` para login, preservando a protecao da rota privada. Validacao visual autenticada ficou limitada por nao haver sessao real de psicologo disponivel sem criar mock.

## Ajuste complementar em 2026-08-17 - copy do alerta de perfil oculto

- Pedido do usuario: simplificar o texto do alerta de perfil oculto na edicao profissional.
- O alerta vermelho de `/app/profissional/perfil/configurar` passa a exibir exatamente: `Seu perfil está oculto. Ative a visibilidade para voltar a aparecer para pacientes.`
- A mudanca e apenas de copy no frontend, sem alterar regra de dominio, backend, banco, contratos, envs, providers ou packages.

Criterio complementar:

- [x] Alerta de perfil oculto usa a nova copy solicitada pelo usuario.

Validacoes executadas:

- `pnpm --dir frontend exec biome check --write src/app/app/professional/profile/setup/components/profile-setup-shell.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `pnpm check:version`
- Smoke local sem sessao em `http://127.0.0.1:3145`: `/version` respondeu `200` com `{"application":"frontend","version":"0.1.146"}` e `/app/profissional/perfil/configurar` respondeu `307` para login, preservando a protecao da rota privada.

## Ajuste complementar em 2026-08-17 - copy do perfil oculto no perfil publico proprio

- Pedido do usuario: quando o proprio psicologo visualizar o perfil inativo por ter desativado a visibilidade, informar que ele deve ativar novamente para o perfil voltar a ficar visivel para pacientes.
- O estado proprio de perfil inativo em `/app/psicologo/[id]` e `/app/psychologist/[id]` preserva a lista de pendencias quando houver campos obrigatorios pendentes; quando nao ha pendencias, a copy agora atribui o estado a desativacao manual de visibilidade.
- A mensagem do `InactivePublicProfileState` passa a exibir: `Seu perfil não está visível porque você desativou a visibilidade. Ative novamente para o perfil voltar a ficar visível para pacientes.`
- A mudanca e apenas de copy no frontend, sem alterar regra de dominio, backend, banco, contratos, envs, providers ou packages.
- ADR nao atualizado por ser ajuste textual sem decisao arquitetural, integracao ou trade-off novo.

Criterio complementar:

- [x] Perfil proprio inativo sem pendencias obrigatorias informa que a visibilidade foi desativada pelo psicologo e orienta ativar novamente para voltar a ficar visivel para pacientes.

Validacoes executadas:

- `pnpm --dir frontend exec biome check --write src/app/app/psychologist/[id]/components/shared.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `pnpm version:bump`
- `pnpm check:version`
- `pnpm --dir frontend build` reexecutado apos o bump para gerar artefato local com `0.1.147`.
- Smoke local sem sessao em `http://127.0.0.1:3147`: `/version` respondeu `200` com `{"application":"frontend","version":"0.1.147"}` e `/app/psicologo/local-profile-smoke` respondeu `200`; validacao autenticada do estado proprio ficou limitada por nao haver sessao real de psicologo disponivel sem criar mock.


## Ajuste complementar em 2026-08-21 - obrigatorios na edicao do perfil profissional

- Pedido do usuario: na edicao de perfil do psicologo, quando faltar campo obrigatorio, a tela deve rolar para o primeiro campo pendente; mensagens genericas `Invalid input` devem aparecer em portugues e como obrigatoriedade.
- A causa era a normalizacao da fundacao de formulario para `null` em selects e calendario vazios, enquanto partes do schema Zod aceitavam apenas `string`, acionando a mensagem padrao do Zod.
- O schema do perfil profissional agora define mensagens de tipo/obrigatoriedade em portugues para campos obrigatorios e para listas do formulario, mantendo mensagens especificas de formato apenas quando ha valor invalido, como CPF ou data de nascimento malformados.
- O submit usa o callback invalido do React Hook Form para localizar o primeiro erro na ordem mobile-first da tela e rolar suavemente ate o campo com `data-profile-field`.
- O bloco de video obrigatorio tambem ganhou alvo de rolagem quando o perfil esta marcado como visivel e ainda nao possui video de apresentacao.
- Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente; as referencias auditaveis foram o print enviado pelo usuario em 2026-08-21 e o prototipo local `_product/proto/Editar Perfil - Psicologo.jpg`.
- Alteracao frontend-only; sem mudanca de backend, banco, contratos, dados persistidos, envs, providers ou packages.
- ADR atualizado: `adrs/0027-perfil-gratuito-sem-crp.md`.

Criterios complementares:

- [x] Submit invalido rola para o primeiro campo com erro na ordem real da tela mobile.
- [x] `Data de Nascimento`, `Genero` e demais selects/listas obrigatorios nao exibem mais `Invalid input` quando vazios.
- [x] Campos obrigatorios vazios exibem mensagem em portugues indicando obrigatoriedade.
- [x] Mensagens de formato especificas continuam preservadas para CPF, WhatsApp e data preenchidos de forma invalida.
- [x] O video de apresentacao continua obrigatorio para perfil visivel e agora tambem recebe foco/rolagem quando for a primeira pendencia apos validacao dos campos.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, migration, env ou package novo foi usado.

Validacoes executadas:

- `pnpm --dir frontend exec biome check --write src/app/app/professional/profile/setup/use-form.tsx src/app/app/professional/profile/setup/modules/profile-setup-support.ts src/app/app/professional/profile/setup/modules/profile-setup-field-renderers.tsx src/app/app/professional/profile/setup/hooks/use-professional-profile-setup-controller.tsx src/app/app/professional/profile/setup/views/professional-profile-setup.tsx src/app/app/professional/profile/setup/components/catalog-fields.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm version:bump`
- `pnpm check:version`
- `pnpm --dir frontend build` reexecutado apos o bump para gerar artefato local com `0.1.164`.
- `pnpm check`
- Smoke local sem sessao em `http://127.0.0.1:3164`: `/version` respondeu `200` com `{"application":"frontend","version":"0.1.164"}` e `/app/profissional/perfil/configurar` respondeu `307` para login, preservando a protecao da rota privada. Validacao visual autenticada ficou limitada por nao haver sessao real de psicologo disponivel sem criar mock.

## Ajuste complementar em 2026-08-21 - especialidades e servicos obrigatorios

- Pedido do usuario: na edicao do perfil do psicologo, `Especialidades` e `Servicos` tambem devem ser tratados como obrigatorios.
- O schema Zod de `/app/profissional/perfil/configurar` agora exige ao menos uma especialidade e ao menos um servico, exibindo mensagens de obrigatoriedade em portugues para os dois campos.
- A rolagem para o primeiro campo pendente reutiliza a ordem mobile-first existente: `Especialidades`, `Abordagens`, `Servicos`, `Publico`, sem criar componente paralelo.
- Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente; as referencias auditaveis foram o print enviado pelo usuario em 2026-08-21 e o prototipo local `_product/proto/Editar Perfil - Psicologo.jpg`.
- Alteracao frontend-only; sem mudanca de backend, banco, contratos, dados persistidos, envs, providers ou packages.
- ADR atualizado: `adrs/0027-perfil-gratuito-sem-crp.md`.

Criterios complementares:

- [x] `Especialidades` vazio exibe erro inline de obrigatoriedade em portugues.
- [x] `Servicos` vazio exibe erro inline de obrigatoriedade em portugues.
- [x] Submit invalido continua rolando para o primeiro campo pendente na ordem real da tela mobile.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, migration, env ou package novo foi usado.

Validacoes executadas:

- `pnpm --dir frontend exec biome check --write src/app/app/professional/profile/setup/use-form.tsx`
- Verificacao estatica confirmou `.min(1, ...)` em `specialty_ids` e `service_ids`, alem da ordem de rolagem `specialty_ids`, `approach_ids`, `service_ids`.
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm version:bump` (`0.1.165` -> `0.1.166`)
- `pnpm check:version`
- `pnpm --dir frontend build` reexecutado apos o bump para gerar artefato local com `0.1.166`.
- `pnpm check` (primeira tentativa falhou por timeout no teste backend `boot-safety.test.mjs`, fora do escopo alterado; o teste isolado passou e a reexecucao completa concluiu sem erros)
- `pnpm --dir backend exec node --import tsx --test scripts/boot-safety.test.mjs`
- Smoke local sem sessao em `http://127.0.0.1:3166`: `/version` respondeu `200` com `{"application":"frontend","version":"0.1.166"}` e `/app/profissional/perfil/configurar` respondeu `307` para login, preservando a protecao da rota privada. Validacao visual autenticada ficou limitada por nao haver sessao real de psicologo disponivel sem criar mock.
