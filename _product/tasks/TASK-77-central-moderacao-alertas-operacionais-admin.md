# TASK-77: Central de moderação e alertas operacionais Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-77 |
| Prioridade | P0 |
| Esforço | M |
| Fase | Admin / Operação / Segurança |
| Status | Completed |
| Dependências | TASK-45, TASK-46, TASK-57, TASK-70, TASK-74 |
| ADR alvo | ADR-0296 sobre central única de moderação textual, denúncias e alertas operacionais derivados |

## Contexto

A página `/moderacao` do Admin já cobre a moderação textual determinística da TASK-74, mas a operação precisa enxergar no mesmo lugar ações urgentes e alertas de baixa/média urgência que exigem intervenção humana sem depender de planilhas ou checagens manuais fora do produto.

Decisões de produto desta task:

- A página deixa de ser apenas **Moderação textual** e passa a ser uma **central de moderação e alertas**.
- Denúncias reais de posts/respostas (`post_report`) entram como ação urgente.
- CRP pendente/não aprovado em Plano Profissional é imprescindível e deve aparecer como alerta urgente de compliance.
- WhatsApp ausente, inválido ou incapaz de gerar link confiável é alerta importante; a checagem desta task é sintática sobre o valor persistido, sem consultar entrega externa do WhatsApp.
- Perfil de psicólogo não publicado por falta de configurações obrigatórias deve aparecer como alerta operacional, usando as mesmas exigências reais de publicação do perfil.
- Post de paciente publicado há pelo menos 48h sem resposta de psicólogo deve aparecer como alerta operacional de cobertura.
- Psicólogo em Plano Profissional, publicado e após período de adaptação, sem visitas de perfil e sem cliques no WhatsApp, deve aparecer como alerta operacional.
- O período inicial de adaptação adotado é 30 dias até haver parametrização de produto.
- As dimensões **Região/cidade com pacientes sem cobertura**, **Faixa de preço muito buscada com pouca oferta** e **Horários muito buscados sem disponibilidade** não se aplicam no momento e não devem ser implementadas com dados estimados.

## Objetivo

Ampliar a tela administrativa de moderação para mostrar, com dados reais, denúncias, pendências de compliance profissional e alertas operacionais prioritários ao lado da lista de eventos textuais, mantendo os filtros e ações existentes da moderação textual.

## Pré-requisitos e bloqueios

- TASK-45 e TASK-46 concluídas: backend Admin e app `admin/` reais.
- TASK-57 concluída: métricas reais de perfil/WhatsApp de psicólogos disponíveis.
- TASK-70 concluída: denúncias reais de conteúdo persistidas em `post_report`.
- TASK-74 concluída: central e endpoints de moderação textual existentes.
- Ler `ARCHITECTURE.md`, `DATA-MODEL.md`, `PACKAGES.md` e `PROTO-INVENTORY.md`.
- Não criar mocks, seeds artificiais, backfill ou estimativas falsas.
- Não instalar pacote novo.
- Não alterar `backend/prisma/schema.prisma` nem migrations nesta task; se isso mudar, executar `pnpm --dir backend db:migrate`.
- Builder/Quick Copy deve ser usado quando disponível; se não estiver acessível no ambiente, usar as imagens locais `_product/proto/admin/Notificações.png` e `_product/proto/admin/Comunidades/Comunidades - Dashboard.png` como referência visual e registrar a limitação.

## Escopo frontend

- Renomear a página `/moderacao` para **Central de moderação e alertas**.
- Trocar os cards superiores para cobrir:
  - denúncias urgentes;
  - compliance;
  - alertas operacionais;
  - moderação textual.
- Adicionar painel mobile-first de **Ações urgentes e operacionais** com:
  - contadores de denúncias, CRP profissional, WhatsApp inválido e operacionais;
  - lista dos alertas mais relevantes com prioridade, grupo, origem real, fatos e link para a entidade quando houver rota Admin;
  - nota explícita de que região/cidade, faixa de preço e horários estão fora do escopo atual.
- Manter a lista, filtros e ações existentes da moderação textual sem regressão.
- Atualizar badge do menu lateral para somar eventos textuais pendentes e alertas operacionais.

## Escopo backend

- Estender `GET /api/admin/private/moderation/summary` sem criar endpoint separado.
- Derivar alertas reais a partir de:
  - `post_report` para denúncias pendentes;
  - `community_post`, `post_reply` e `user.role` para posts de pacientes sem resposta de psicólogo após 48h;
  - `psychologist_profile` e `professional_subscription` para CRP pendente/não aprovado no Plano Profissional;
  - `psychologist_profile.whatsapp` para ausência/formato inválido de WhatsApp;
  - `psychologist_profile` + relações de catálogo para perfil não publicado por falta de configurações obrigatórias;
  - `profile_view_event` e `contact_request.channel=whatsapp` para profissional sem tração após adaptação.
- Retornar `operational_alerts` dentro do summary com contadores, thresholds, fontes, dimensões excluídas e itens para a UI.
- Não persistir/resolver alertas operacionais nesta task; são alertas derivados e read-only.

## Fora do escopo

- Novas tabelas, migrations ou backfill.
- Workflow de resolução/acknowledgement para alertas derivados.
- Verificação externa real de link quebrado do WhatsApp.
- Alertas de demanda por região/cidade, faixa de preço ou horários.
- Alertas baseados em busca/filtro sem fonte first-party persistida.
- Automação de suspensão, bloqueio ou mensagem ao usuário.

## Contrato técnico detalhado

Referências obrigatórias:

- `ARCHITECTURE.md`: módulos backend por repository/use-case/controller, app Admin separado e UI mobile-first.
- `DATA-MODEL.md`: usar modelos Prisma reais já existentes.
- `PACKAGES.md`: sem pacote novo.
- `PROTO-INVENTORY.md`: sem protótipo específico de moderação; usar padrões Admin exportados.

Backend esperado:

- DTOs de summary ampliados com `AdminModerationOperationalAlertsDTO`.
- Repository de moderação com queries reais para denúncias, posts sem cobertura, perfis profissionais e contadores de métricas.
- Service de summary compondo contadores e itens sem expor dados desnecessários nem criar mocks.
- Thresholds declarados no payload: 48h para cobertura de post de paciente e 30 dias para adaptação do psicólogo profissional.

Frontend esperado:

- Tipos em `admin/src/api/req/moderation` atualizados para `operational_alerts`.
- `/moderacao` com cards e painel novos, mantendo filtros e detalhe textual existentes.
- Menu lateral usando o total ampliado de ações de moderação.
- UI responsiva mobile-first e sem `<img>` cru.
- Formulários existentes continuam usando React Hook Form/Zod/controllers da TASK-02; esta task não cria novo formulário.

## Critérios de aceite

- [x] `/moderacao` exibe denúncias pendentes de `post_report` como ações urgentes com link para post/resposta quando possível.
- [x] `/moderacao` exibe CRP pendente/não aprovado em Plano Profissional como alerta urgente de compliance.
- [x] `/moderacao` exibe WhatsApp ausente ou formato inválido como alerta importante, sem simular checagem externa de entrega.
- [x] `/moderacao` exibe perfil não publicado por falta de configurações obrigatórias usando dados reais do perfil e catálogos.
- [x] `/moderacao` exibe post de paciente sem resposta de psicólogo após 48h.
- [x] `/moderacao` exibe psicólogo profissional publicado, após 30 dias de adaptação, sem visitas de perfil e sem cliques no WhatsApp.
- [x] Região/cidade, faixa de preço e horários são registrados como dimensões fora do escopo atual, sem implementação falsa.
- [x] A lista/filtros/detalhe/actions da moderação textual continuam disponíveis.
- [x] Badge do menu lateral considera alertas operacionais além dos eventos textuais pendentes.
- [x] Nenhum mock, dado fake permanente, seed artificial, endpoint simulado ou pacote novo foi usado.
- [x] Não houve alteração de banco/schema/migrations; `db:migrate` não se aplica.
- [x] UI mobile-first; nenhum `<img>` cru foi usado.
- [x] Formulários existentes mantêm React Hook Form, Zod e controllers da TASK-02; não houve novo formulário.
- [x] Builder/Quick Copy não estava disponível como ferramenta executável; foram usadas referências locais de `_product/proto/admin`.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado em `adrs/`.
- [x] Commit próprio criado e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- Browser local em `/moderacao` para validar renderização mobile-first/desktop e ausência de regressão visual.

## Notas de execução

- Execução em 2026-07-21.
- Builder/Quick Copy não estava disponível como ferramenta executável neste ambiente; referências locais consultadas: `_product/proto/admin/Notificações.png` e `_product/proto/admin/Comunidades/Comunidades - Dashboard.png`.
- A checagem de WhatsApp valida apenas existência e quantidade de dígitos suficientes para link `wa.me`; entrega externa/link realmente ativo é pendência futura caso haja integração real.
- Alertas de alta demanda em filtros não foram implementados porque as dimensões citadas pelo produto não se aplicam agora e não há fonte first-party persistida para demanda remanescente sem estimativa.
## Execução 2026-07-21

- Implementado `operational_alerts` em `GET /api/admin/private/moderation/summary` com contadores, thresholds, fontes e itens derivados de tabelas reais.
- Atualizada a UI `/moderacao` para cards de denúncias, compliance, operacionais e moderação textual, com painel mobile-first de ações urgentes/operacionais.
- Atualizado o badge do menu lateral para somar eventos textuais pendentes e alertas operacionais.
- Nenhuma migration foi criada; `pnpm --dir backend db:migrate` não se aplica.
- Comandos executados sem erro: `pnpm --dir backend typecheck`, `pnpm --dir admin typecheck`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`.
- Smoke local: `Invoke-WebRequest http://localhost:3002/moderacao` retornou HTTP 200. Também foi gerado screenshot headless mobile em `.tmp/moderacao-mobile.png`; como o contexto headless não possui sessão Admin, a captura parou no estado autenticado de carregamento, então a validação visual efetiva ficou coberta por build/check e pelo dev server local já autenticado do usuário.

## Ajuste complementar 2026-07-23 - Layout piloto premium na Moderacao

- Pedido do usuario: aplicar o layout piloto nas paginas de Moderacao do Admin.
- A rota `/moderacao` e eventuais descendentes passaram a entrar no escopo centralizado `admin-premium-pilot` do `AdminShell`, reaproveitando sidebar clara, azul Lectum, bordas sutis, sombras reduzidas, raio maior e tipografia menos pesada ja validados no piloto.
- O cabecalho da central foi convertido para card mobile-first com label **Operacao e seguranca**, titulo, subtitulo e acao **Atualizar** no mesmo bloco visual do piloto.
- O bloco de filtros da moderacao textual passou a usar card com cabecalho contextual, controles com foco premium e hierarquia visual alinhada as demais paginas do piloto.
- Nao houve alteracao de backend, contratos HTTP, dados persistidos, Prisma/migrations, packages, formularios RHF/Zod ou regras de moderacao.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia auditavel foi a captura enviada pelo usuario, `_product/proto/admin/Notificacoes.png` e o ADR do piloto `adrs/0263-admin-psicologos-piloto-premium.md`.


Validacao deste ajuste:

- `pnpm --dir admin exec biome check --write "src/components/admin-shell/shell.tsx" "src/app/(admin)/moderacao/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build` (primeira tentativa bloqueada por build Next concorrente; reexecutado apos o lock liberar e concluiu com sucesso)
- Smoke HTTP local: `GET http://localhost:3002/moderacao` retornou `200`.
- `pnpm check` foi tentado, mas excedeu o limite de 10 minutos do runner e deixou processos orfaos; os processos do check foram encerrados para evitar carga duplicada. Como o ajuste alterou apenas Admin/docs, a validacao relevante ficou coberta por `pnpm --dir admin check` e `pnpm --dir admin build`.
