# TASK-74: Moderação textual simples e alertas Admin para conteúdo sensível de pacientes

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-74 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Segurança / Comunidades / Admin |
| Status | Completed |
| Dependências | TASK-24, TASK-26, TASK-45, TASK-46, TASK-51, TASK-63, TASK-64, TASK-70, TASK-71 |
| ADR alvo | ADR sobre moderação textual determinística, eventos de segurança e alertas administrativos de conteúdo sensível |

## Contexto

A Lectum permite que pacientes criem postagens textuais em comunidades de saúde mental. Pacientes não publicam mídia, mas ainda podem digitar textos com temas sensíveis, links externos, conteúdo sexual explícito, solicitações sexuais, conteúdo envolvendo menores, automutilação ou risco suicida.

O comportamento atual verificado no produto é:

- o formulário de criação de post de comunidade aceita `title` e `content` textuais;
- links digitados por pacientes são salvos e renderizados como texto puro, sem `linkify`, Markdown ou `dangerouslySetInnerHTML`;
- o conteúdo do post é renderizado em `<p>`/texto React, e não vira `<a href>` externo automaticamente;
- pacientes não veem controle de upload de mídia; anexos são restritos a psicólogos com permissão profissional;
- o Admin já possui fundação, dashboard de comunidades, tela de notificações/campanhas, resolução de denúncias e moderação administrativa auditada de conteúdo.

Decisões de produto desta task:

- Começar a moderação automática de forma simples, **sem IA e sem pacote novo**.
- Usar regras determinísticas por regex/listas de padrões como primeira camada.
- Não bloquear uma postagem apenas porque contém uma palavra sensível isolada.
- Relatos legítimos de saúde mental devem poder ser publicados como sensíveis quando não houver padrão de alto risco.
- Exemplo permitido como sensível: `Tenho vício em pornografia e quero parar`.
- Bloquear links externos em conteúdo textual criado por pacientes, mesmo que hoje eles não sejam clicáveis.
- Bloquear padrões de alta confiança como divulgação/solicitação sexual, conteúdo sexual envolvendo menores, instruções de automutilação/suicídio, spam/golpe e tentativa de levar o usuário para fora da Lectum.
- Segurar conteúdo de crise quando houver indício de risco imediato, intenção atual, plano ou pedido de instrução de autolesão/suicídio.
- Todo conteúdo classificado como `allow_sensitive`, `block` ou `safety_hold` deve gerar evento/notificação visível no Admin.
- Conteúdo `allow_sensitive` é publicado, mas aparece para acompanhamento administrativo.
- Conteúdo `block` e `safety_hold` não é publicado, mas aparece no Admin com snapshot seguro para revisão.

## Objetivo

Implementar uma camada inicial de moderação textual para conteúdos criados por pacientes em comunidades, com alertas administrativos reais para todos os conteúdos sensíveis permitidos, bloqueados ou segurados por segurança, permitindo que o Admin acompanhe a operação sem depender de IA, mocks ou revisão manual prévia obrigatória para todos os posts.

## Pré-requisitos e bloqueios

- TASK-24 concluída: criação real de postagens de comunidade.
- TASK-26 concluída: detalhe de post e comentários/respostas reais.
- TASK-45 e TASK-46 concluídas: backend Admin e app `admin/` reais.
- TASK-51 concluída: dashboard administrativo de comunidades.
- TASK-63 e TASK-64 concluídas: fundação e tela administrativa de notificações, para reaproveitar padrões de alertas/listas quando compatível.
- TASK-70 concluída: resolução administrativa de denúncias recebidas.
- TASK-71 concluída: abas administrativas de comunidade, conteúdo, ranking e moderação auditada de posts/comentários.
- Ler `ARCHITECTURE.md`, `DATA-MODEL.md`, `PACKAGES.md` e `PROTO-INVENTORY.md`.
- Antes de criar modelo/tabela nova, validar `DATA-MODEL.md` e o schema Prisma atual.
- Antes de instalar qualquer pacote, validar `PACKAGES.md`. A expectativa desta task é **não instalar pacote novo**.
- Usar como referência visual o padrão já implementado do Admin, especialmente dashboard de comunidades, detalhe de comunidade/conteúdo, denúncias e notificações administrativas. Não há protótipo específico para a central de moderação nesta data.
- Se Builder/Quick Copy estiver disponível, usar como complemento visual; se não estiver acessível, registrar a limitação e usar os padrões locais já implementados.
- Se a decisão sobre a copy de crise/canais de ajuda estiver ausente, não inventar promessa clínica; usar copy conservadora e registrar ADR/pendência para revisão jurídica/profissional.
- Se alterar `backend/prisma/schema.prisma` ou migrations, executar obrigatoriamente `pnpm --dir backend db:migrate`.
- Não usar IA, OpenAI Moderation, serviços externos, mocks, dados fake, seeds artificiais ou endpoints simulados nesta task.

## Escopo frontend

### App do paciente — criação de post e respostas

Atualizar os fluxos em que pacientes criam texto público em comunidades:

- criação de post de comunidade;
- criação de resposta/comentário em post, se o fluxo existente permitir pacientes comentarem.

Comportamentos esperados:

- Se o conteúdo for `allow`, publicar normalmente.
- Se o conteúdo for `allow_sensitive`, publicar normalmente e exibir feedback comum de publicação; o evento é criado no Admin sem alarmar o paciente indevidamente.
- Se o conteúdo for `block`, não publicar e mostrar mensagem clara, sem expor lista completa de palavras bloqueadas:
  - exemplo de tom: `Não foi possível publicar este conteúdo. Remova links, convites externos ou trechos que violem as diretrizes da comunidade.`
- Se o conteúdo for `safety_hold`, não publicar e mostrar mensagem acolhedora, sem julgamento e sem detalhar método:
  - informar que o conteúdo não foi publicado por segurança;
  - orientar busca de ajuda imediata com pessoas/serviços de confiança conforme copy aprovada;
  - não prometer que a Lectum presta atendimento de emergência.
- O formulário deve preservar o rascunho após erro de moderação para o usuário editar.
- A UI deve manter mobile-first e padrão de erro sem layout shift.
- Não transformar URLs digitadas em links clicáveis.
- Não adicionar suporte a mídia para pacientes.

### Admin — alertas/notificações de moderação

Criar ou estender uma experiência administrativa para acompanhamento dos eventos de moderação.

Requisitos mínimos de UI:

- Exibir contagem de eventos de moderação pendentes/não revisados no painel Admin.
- Exibir destaque para eventos `safety_hold` como urgentes.
- Criar uma lista/central de moderação ou reaproveitar área equivalente existente, com filtros:
  - status: pendente/não revisado, em revisão, resolvido;
  - decisão: `allow_sensitive`, `block`, `safety_hold`;
  - categoria: links externos, saúde sexual, conteúdo sexual explícito, menor/risco sexual, autolesão/suicídio, abuso/violência, spam/golpe, outro;
  - severidade: baixa, média, alta, urgente;
  - comunidade;
  - período.
- Cada item deve mostrar:
  - decisão;
  - categoria;
  - severidade;
  - data/hora;
  - comunidade;
  - tipo de alvo (`post` ou `reply`);
  - autor com regra de privacidade adequada: se post público anônimo de paciente, mostrar o rótulo público e permitir acesso administrativo ao usuário somente onde já houver padrão auditado;
  - trecho seguro do texto;
  - origem da regra que disparou, sem revelar lista completa de bypass;
  - link para o post quando publicado (`allow_sensitive`);
  - indicação `bloqueado antes da publicação` quando não houver post/reply persistido.
- Permitir ações administrativas:
  - marcar como revisado;
  - resolver com nota administrativa;
  - para `allow_sensitive` publicado, remover o conteúdo usando o fluxo real de moderação auditada já existente da TASK-71, sem duplicar regra de remoção;
  - para `block`/`safety_hold`, apenas revisar/resolver o evento, já que não há conteúdo publicado a remover.
- Registrar atividade administrativa ao revisar/resolver/remover via evento de moderação.
- O painel deve ser mobile-first e funcionar em desktop sem perder densidade operacional.

### Admin — dashboard de comunidades

Integrar os eventos de moderação ao dashboard de comunidades quando compatível com o padrão existente de alertas prioritários:

- total de eventos pendentes;
- total urgente (`safety_hold`);
- últimos eventos sensíveis/bloqueados;
- link para a central/lista de moderação.

Não substituir denúncias existentes; eventos automáticos de moderação e denúncias de usuários devem ser diferenciados.

## Escopo backend

### Motor determinístico de moderação

Criar um helper/service interno sem dependência externa, por exemplo em `backend/src/utils` ou módulo equivalente existente, para classificar texto de pacientes.

Entrada mínima:

- `authorRole`;
- `targetType`: `post` ou `reply`;
- `title` opcional;
- `content`;
- `communityId`/`communitySlug` quando disponível.

Saída esperada:

```ts
type ModerationDecision = "allow" | "allow_sensitive" | "block" | "safety_hold";

type ModerationResult = {
  decision: ModerationDecision;
  categories: string[];
  severity: "low" | "medium" | "high" | "urgent";
  matchedRules: string[];
  reasonCode: string;
};
```

Regras obrigatórias:

- Aplicar somente para conteúdo textual de pacientes nesta task.
- Psicólogos continuam fora da moderação automática desta task, salvo se a execução justificar ampliar em ADR.
- Normalizar texto antes da análise:
  - lowercase;
  - remoção de acentos;
  - colapso de espaços;
  - preservação suficiente para auditoria do texto original;
  - não alterar o texto que será salvo/publicado.
- Detectar URLs com regex robusta:
  - `http://`, `https://`, `www.`, domínios comuns como `.com`, `.com.br`, `.net`, `.org`, encurtadores e padrões com espaços usados para burlar quando possível sem exagerar falsos positivos.
- URL em conteúdo de paciente deve retornar `block`.
- Palavras sensíveis isoladas **não** devem retornar `block` sozinhas.
- Termos como `pornografia`, `sexo`, `masturbação`, `suicídio`, `automutilação`, `abuso` podem gerar `allow_sensitive` quando aparecem em contexto de relato, sofrimento, dúvida, compulsão, vergonha, trauma, pedido de ajuda ou desejo de parar.
- Padrões de divulgação, convite, venda, solicitação sexual, aliciamento ou tentativa de levar para canal externo devem retornar `block`.
- Qualquer padrão sexual associado a menor/criança/adolescente deve retornar `block` ou `safety_hold` com severidade alta/urgente conforme a regra definida no ADR.
- Instruções, pedidos de método, plano atual ou intenção imediata de autolesão/suicídio devem retornar `safety_hold`.
- Relatos genéricos sem plano/imediatismo, por exemplo sofrimento passado ou pensamentos sem instrução, devem retornar `allow_sensitive` e notificar Admin.
- O classificador deve ter testes unitários ou validação automatizada mínima cobrindo falso positivo importante:
  - `Tenho vício em pornografia e quero parar` => `allow_sensitive`;
  - texto com URL externa => `block`;
  - solicitação sexual direta => `block`;
  - termo sensível isolado em relato terapêutico => `allow_sensitive`;
  - intenção imediata de autolesão/suicídio => `safety_hold`.

### Persistência de eventos de moderação

Criar persistência real para eventos de moderação automática.

Modelo sugerido, ajustável ao padrão Prisma existente:

```prisma
model content_moderation_event {
  id              String   @id @default(cuid())
  deleted         Boolean  @default(false)
  deletedAt       DateTime? @map("deleted_at")
  updatedAt       DateTime @default(now()) @updatedAt @map("updated_at")
  createdAt       DateTime @default(now()) @map("created_at")
  target_type     String   @map("target_type") // community_post | post_reply | submitted_post | submitted_reply
  target_id       String?  @map("target_id")
  community_id    String?  @map("community_id")
  author_id       String   @map("author_id")
  decision        String
  categories      Json
  severity        String
  status          String   @default("pending") // pending | reviewing | resolved
  reason_code     String   @map("reason_code")
  matched_rules   Json?    @map("matched_rules")
  title_snapshot  String?  @map("title_snapshot")
  content_excerpt String   @map("content_excerpt")
  content_snapshot String? @map("content_snapshot")
  reviewed_by_admin_id String? @map("reviewed_by_admin_id")
  reviewed_at     DateTime? @map("reviewed_at")
  resolved_at     DateTime? @map("resolved_at")
  admin_note      String?  @map("admin_note")

  @@index([status, severity, createdAt])
  @@index([decision, createdAt])
  @@index([target_type, target_id])
  @@index([community_id, createdAt])
  @@index([author_id, createdAt])
  @@map("content_moderation_events")
}
```

Regras de persistência:

- `allow` não gera evento.
- `allow_sensitive` gera evento com `target_id` do post/reply publicado.
- `block` de post raiz persiste `community_post.status="bloqueado"` para detalhe protegido no Admin e gera evento com `target_type="community_post"`/`target_id`; `block` de resposta/comentario e eventos legados seguem snapshot-only com `submitted_reply`/`submitted_post` quando nao houver conteudo interno persistido.
- `safety_hold` segue a mesma politica de persistencia de `block`: post raiz vira `community_post.status="bloqueado"` interno/Admin, resposta/comentario segue snapshot-only; sempre usa severidade urgente.
- Para eventos sem conteúdo publicado, persistir snapshot suficiente para revisão administrativa.
- Evitar expor `content_snapshot` em listas; listas devem usar `content_excerpt`. Detalhe administrativo pode mostrar snapshot completo somente em rota protegida Admin.
- Não gravar conteúdo sensível em logs de aplicação, mensagens de erro, analytics ou notificações push.
- Definir retenção/remoção futura em ADR se não houver política existente; não implementar rotina destrutiva sem decisão explícita.

### Integração com criação de conteúdo

Integrar a moderação nos services reais:

- `POST /api/private/community/:slug/posts`;
- endpoint real de criação de resposta/comentário, se paciente puder comentar.

Fluxo esperado para post:

1. Validar auth e payload existente.
2. Se `auth.role !== "paciente"`, seguir fluxo atual.
3. Se paciente, classificar `title + content`.
4. Se `allow`, criar post normalmente.
5. Se `allow_sensitive`, criar post e evento de moderação em transação ou sequência segura.
6. Se `block`, criar post raiz interno com `status="bloqueado"`, criar evento apontando para esse post e retornar erro de dominio 422 ao paciente; nao criar conteudo publico nem notificar a comunidade.
7. Se `safety_hold`, criar post raiz interno com `status="bloqueado"`, criar evento urgente apontando para esse post e retornar erro de dominio 422 com mensagem de seguranca; nao criar conteudo publico nem notificar a comunidade.
8. Garantir que notificação de novo post para comunidade só dispare quando o post foi realmente publicado.

Fluxo equivalente para resposta/comentário:

- `allow_sensitive` publica resposta e gera evento.
- `block`/`safety_hold` não publica resposta e gera evento.

### Endpoints Admin

Criar endpoints Admin privados reais, protegidos por autenticação Admin:

- `GET /api/admin/private/moderation/summary`
  - contadores por status, decisão, severidade e categoria;
  - total urgente pendente;
  - últimos eventos pendentes.
- `GET /api/admin/private/moderation/events`
  - paginação;
  - filtros por status, decisão, severidade, categoria, comunidade, período e tipo de alvo.
- `GET /api/admin/private/moderation/events/:id`
  - detalhe seguro do evento;
  - inclui snapshot completo quando aplicável e permitido.
- `POST /api/admin/private/moderation/events/:id/review`
  - marca como em revisão ou revisado conforme padrão escolhido;
  - registra `reviewed_by_admin_id`, `reviewed_at` e `admin_activity_log`.
- `POST /api/admin/private/moderation/events/:id/resolve`
  - exige nota ou motivo administrativo;
  - registra `resolved_at`, status `resolved` e `admin_activity_log`.

Se a arquitetura existente preferir integrar ao módulo Admin de comunidades em vez de criar `/moderation`, registrar a decisão no ADR e preservar os contratos equivalentes.

## Fora do escopo

- Moderação por IA, OpenAI Moderation API, LLMs ou serviços externos.
- Moderação de imagem, vídeo ou áudio.
- Liberação de mídia para pacientes.
- Transformar links digitados em hyperlinks.
- Revisão humana obrigatória antes de todo post.
- Bloquear automaticamente relatos legítimos de vício em pornografia, sexualidade, trauma, abuso, ansiedade, depressão ou sofrimento sem padrão de alto risco.
- Diagnóstico clínico, atendimento emergencial, triagem médica ou promessa de intervenção humana em tempo real.
- Denúncia automática a autoridades, conselho tutelar ou terceiros sem decisão jurídica/produto específica.
- Suspensão/banimento automático de conta por evento de moderação.
- Moderação retroativa de todo conteúdo histórico.
- Políticas finais de retenção/descarte de conteúdo sensível além de registrar a decisão pendente em ADR.

## Contrato técnico detalhado

Referências obrigatórias:

- `ARCHITECTURE.md`: padrões de módulos backend, app Admin e UI mobile-first.
- `DATA-MODEL.md`: atualizar se novo modelo/contrato for criado.
- `PACKAGES.md`: confirmar ausência de pacote novo.
- `PROTO-INVENTORY.md`: registrar ausência de protótipo específico e referências visuais usadas.

Backend esperado:

- Modelo Prisma para eventos de moderação ou alternativa justificada em ADR.
- Migration aplicada com `pnpm --dir backend db:migrate`.
- Helper/service determinístico testável para moderação textual.
- Integração nos services reais de criação de post e resposta/comentário.
- Endpoints Admin privados para summary/list/detail/review/resolve.
- Validators reais para filtros e actions Admin.
- Traduções em `backend/locales/pt/translation.json` para erros e mensagens de moderação.
- Auditoria via `admin_activity_log` para revisão/resolução/remoção vinculada a evento.
- Nenhum conteúdo sensível em logs técnicos, analytics ou mensagens de erro públicas.

Frontend esperado:

- App `frontend/`:
  - tratamento dos erros de moderação no formulário de criação de post;
  - tratamento equivalente no composer de resposta/comentário, se aplicável;
  - preservação de rascunho;
  - mensagens acessíveis e mobile-first.
- App `admin/`:
  - query keys, `api/req`, `api/callers` e tipos para moderação;
  - summary/card/badge de eventos pendentes;
  - lista/central de eventos com filtros;
  - detalhe ou drawer/modal seguro;
  - actions para revisar/resolver;
  - integração com fluxo de remoção auditada existente para conteúdo publicado sensível.
- Formulários/filtros/actions devem usar a fundação da TASK-02 quando aplicável: React Hook Form, Zod e controllers existentes do app correspondente.
- UI mobile-first (~390px), com progressão para desktop.
- Nenhum `<img>` cru; usar `Image` de `next/image` se houver imagem/ícone externo ao sistema de ícones.
- Tema claro/escuro/sistema por tokens, sem hardcoded novo desnecessário.

Packages usados:

- Somente pacotes já instalados.
- Não instalar pacote de NLP, regex, IA, sanitizer ou linkify.

Regras anti-recriação:

- Reutilizar padrões existentes de:
  - Admin shell/menu;
  - cards e tabelas/listas Admin;
  - dashboard de comunidades;
  - moderação auditada de conteúdo da TASK-71;
  - activity logs de Admin;
  - forms/controllers existentes.
- Não criar novo design system.
- Não duplicar endpoint de remoção de post/reply já existente.
- Não alterar a renderização de conteúdo para HTML/Markdown.

## Critérios de aceite

- [x] Pacientes não conseguem publicar posts com URLs externas; o conteúdo não é publicado e um evento Admin `block` é criado.
- [x] Pacientes não conseguem publicar respostas/comentários com URLs externas quando esse fluxo existir; o conteúdo não é publicado e um evento Admin `block` é criado.
- [x] Relato `Tenho vício em pornografia e quero parar` não é bloqueado; é classificado como `allow_sensitive`, publicado e gera alerta Admin.
- [x] Palavras sensíveis isoladas não bloqueiam automaticamente conteúdo terapêutico/relato de sofrimento.
- [x] Padrões de solicitação/divulgação sexual são bloqueados e geram alerta Admin.
- [x] Padrões sexuais envolvendo menor/criança/adolescente são bloqueados/segurados com severidade alta ou urgente e geram alerta Admin.
- [x] Conteúdo com indício de risco imediato, plano ou instrução de autolesão/suicídio não é publicado, retorna mensagem de segurança e gera alerta Admin `safety_hold` urgente.
- [x] Conteúdo `allow` continua publicando sem evento de moderação.
- [x] Conteúdo `allow_sensitive` publica e aparece no Admin como pendente/não revisado.
- [x] Conteúdo `block` e `safety_hold` de post raiz cria `community_post.status="bloqueado"` interno/Admin e evento de moderação apontando para o post; respostas/comentários bloqueados não criam `post_reply` e ficam como snapshot protegido.
- [x] O Admin exibe contagem/alerta de eventos de moderação pendentes, com destaque para urgentes.
- [x] O Admin possui lista/central de eventos com filtros por status, decisão, categoria, severidade, comunidade e período.
- [x] O Admin consegue marcar evento como revisado/resolvido com auditoria.
- [x] Eventos `allow_sensitive` publicados possuem link para o post/reply e permitem remoção usando o fluxo auditado existente.
- [x] Listas Admin exibem apenas trecho seguro; snapshot completo fica restrito ao detalhe protegido.
- [x] Nenhum conteúdo sensível novo é enviado para logs técnicos, analytics, push ou mensagens públicas.
- [x] O frontend preserva rascunho quando a moderação bloqueia/segura a publicação.
- [x] A UI é mobile-first, funciona em tema claro/escuro e não usa `<img>` cru.
- [x] Nenhum pacote novo foi instalado.
- [x] Nenhuma IA ou serviço externo foi usado.
- [x] `DATA-MODEL.md` foi atualizado se houver novo modelo/contrato.
- [x] Prisma migration foi criada e `pnpm --dir backend db:migrate` foi executado sem reset destrutivo quando houver alteração de schema/migrations.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado ou atualizado em `adrs/` documentando a política inicial de moderação simples, limitações e decisão de notificar Admin.
- [x] Commit próprio e `git push` executados.

## Validação mínima

- `pnpm --dir backend db:migrate` quando houver alteração em `backend/prisma/schema.prisma` ou migrations.
- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir frontend check`.
- `pnpm --dir frontend build` quando alterar criação de post/resposta ou rota visual.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- Teste/validação automatizada do helper de moderação com casos de falso positivo e bloqueio.
- Browser local no frontend:
  - post comum publica;
  - relato sensível publica;
  - URL externa bloqueia e preserva rascunho;
  - crise imediata não publica e mostra mensagem de segurança.
- Browser local no Admin:
  - summary/badge mostra evento pendente;
  - lista filtra eventos;
  - detalhe exibe snapshot protegido;
  - revisar/resolver atualiza status e auditoria;
  - evento `allow_sensitive` leva ao post publicado.

## Notas de execução

- Esta task não tenta resolver moderação perfeita. A regra operacional é priorizar bloqueios de alta confiança e evitar impedir relatos legítimos de sofrimento.
- A classificação por regex/listas deve ser documentada como primeira camada, com limitações claras no ADR.
- Falsos positivos e falsos negativos devem ser tratados como risco conhecido; a telemetria Admin criada nesta task servirá para calibrar regras futuras.
- Não criar lista pública de termos bloqueados na UI, para evitar incentivo a bypass.
- A copy de crise deve ser acolhedora e conservadora; se faltar aprovação jurídica/profissional, registrar pendência em ADR sem inventar promessa operacional.
- Se `prisma migrate dev` falhar por dados ou estado preexistente no banco de desenvolvimento, registrar o erro e perguntar ao usuário se pode resetar o banco antes de rodar qualquer comando destrutivo como `pnpm --dir backend exec prisma migrate reset`.


## Execu??o 2026-07-15

- Implementado classificador textual determin?stico sem IA e sem pacote novo em `backend/src/utils/content-moderation.ts`, com valida??o automatizada cobrindo relatos sens?veis permitidos, URL externa, solicita??o sexual, termos terap?uticos e risco imediato de autoles?o/suic?dio.
- Criado modelo real `content_moderation_event` e migration `20260715020539_add_content_moderation_events` para eventos `allow_sensitive`, `block` e `safety_hold`.
- Integrados `POST /api/private/community/:slug/posts` e cria??o real de respostas para pacientes; `block`/`safety_hold` n?o publicam conte?do e preservam snapshot para Admin.
- Criados endpoints Admin privados `/api/admin/private/moderation/*`, central `/moderacao`, badge no menu e integra??o ao dashboard de comunidades.
- O app do paciente trata os erros `content_moderation_blocked` e `content_moderation_safety_hold` mantendo o rascunho no formul?rio/composer.
- Builder/Quick Copy n?o estava dispon?vel como ferramenta execut?vel; a UI foi baseada nos padr?es locais do Admin e nas imagens exportadas `_product/proto/admin/Comunidades/Comunidades - Dashboard.png` e `_product/proto/admin/Notifica??es.png`.
- ADR criado: `adrs/0270-moderacao-textual-deterministica-alertas-admin.md`.
- Complemento 2026-07-26: posts raiz bloqueados/segurados pela moderacao textual agora sao persistidos internamente como `community_post.status="bloqueado"`, sem publicacao/feed/notificacao, e o evento Admin aponta para a pagina protegida `/comunidades/[slug]/conteudo/post/[id]`. Respostas/comentarios bloqueados permanecem snapshot-only por nao haver status proprio em `post_reply`.
- Comandos executados: `pnpm --dir backend db:migrate` (primeira tentativa expirou aguardando nome), `pnpm --dir backend db:migrate -- --name add_content_moderation_events`, `pnpm --dir backend exec tsx src/operations/moderation/check-content-moderation.ts`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`.

- Smoke local HTTP executado contra dev servers existentes: `http://localhost:3002/moderacao`, `http://localhost:3002/comunidades` e `http://localhost:3000/app/community/post/new` retornaram 200. Sem ferramenta de browser autenticado/interativo neste ambiente para publicar posts reais pela UI; valida??o comportamental foi coberta por helper automatizado, builds e rotas reais.

## Ajuste complementar 2026-07-26 - Detalhe Admin para post bloqueado

- Pedido do usuario: reaproveitar a pagina Admin existente de detalhes do post para exibir o conteudo de posts bloqueados automaticamente.
- Posts raiz de pacientes classificados como `block` ou `safety_hold` continuam fora das listas/detalhes privados do paciente e fora do publico, mas passam a ser persistidos como `community_post.status="bloqueado"` apenas para auditoria interna.
- O evento `content_moderation_event` desses posts passa a usar `target_type="community_post"` e `target_id` do post interno, permitindo que a central de moderacao abra `/comunidades/[slug]/conteudo/post/[id]`.
- O backend mantem `public_url=null` para decisoes `block`/`safety_hold`; o detalhe Admin mostra badge de bloqueio, alerta operacional e nao oferece acao de remocao publica para conteudo ja bloqueado.
- Respostas/comentarios bloqueados continuam snapshot-only porque `post_reply` nao possui status de bloqueio; ampliar esse comportamento exigiria nova decisao/migration.
- Nao houve schema Prisma/migration, package novo, IA, mock, seed ou endpoint paralelo. Builder/Quick Copy nao esteve disponivel como ferramenta callable; foram usados a captura enviada pelo usuario e os padroes Admin existentes.

### Criterios de aceite complementares

- [x] Post raiz bloqueado/segurado e persistido internamente como `community_post.status="bloqueado"`.
- [x] Post bloqueado nao entra em feed/detalhe publico ou privado do paciente, nao recebe URL publica e nao dispara notificacao de nova postagem.
- [x] Evento de moderacao do post bloqueado aponta para o `community_post` interno com `target_id`.
- [x] A central Admin de conteudo sensivel abre a pagina de detalhe administrativo do post bloqueado.
- [x] A pagina de detalhe Admin exibe o corpo do post bloqueado, status de bloqueio e indisponibilidade publica.
- [x] Respostas/comentarios bloqueados permanecem snapshot-only, sem migration em `post_reply`.

### Validação executada para este ajuste

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check` (primeira tentativa expirou por timeout da ferramenta; a repetição concluiu com sucesso)
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `http://localhost:3002/moderacao/conteudo-sensivel` retornou 200.
- Smoke HTTP local: `http://localhost:3002/comunidades/tmp-layout-denuncias-cmrgztri70/conteudo/post/tmp_den_layout_cmrgztri70_thread_01` retornou 200.
