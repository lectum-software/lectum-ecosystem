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
