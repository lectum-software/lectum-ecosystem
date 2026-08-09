# TASK-83: Erro no cadastro em Operacionais Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-83 |
| Prioridade | P1 |
| Esforço | S |
| Fase | Admin / Operação / Cadastro |
| Status | Completed |
| Dependências | TASK-45, TASK-46, TASK-77, TASK-78 |
| ADR alvo | ADR-0318 sobre alertas operacionais derivados de cadastro não confirmado |

## Contexto

A página `/moderacao/operacionais` já centraliza pendências operacionais derivadas de dados reais. O produto decidiu incluir problemas logo no cadastro de pacientes e psicólogos, especialmente usuários criados por e-mail/senha que não concluem a confirmação de e-mail. Cadastros via Google tendem a chegar confirmados, mas o modo de cadastro deve ser exibido de forma explícita caso exista pendência.

## Objetivo

Exibir em `/moderacao/operacionais` pendências de cadastro não concluído usando a tag **Erro no cadastro**, com detalhes do modo de cadastro tentado (**Email/senha** ou **Google**) e o e-mail do usuário. A pendência deve desaparecer automaticamente quando o usuário confirmar o e-mail/concluir o cadastro, por ser derivada do estado real do usuário.

## Pré-requisitos e bloqueios

- TASK-45 e TASK-46 concluídas: backend Admin e app Admin reais.
- TASK-77 e TASK-78 concluídas: central de moderação, submenus e contadores reais existentes.
- Usar os campos reais de identidade documentados em `DATA-MODEL.md`: `user.provider`, `user.email`, `user.confirmed`, `user.confirmed_date`, `user.role`.
- Não criar tabela, migration, mock, seed artificial ou workflow persistido de resolução nesta task.
- Não instalar package novo.
- Builder/Quick Copy ativo não está exposto como ferramenta callable neste ambiente; usar a captura enviada pelo usuário e referências locais de `_product/proto/admin`.

## Escopo frontend

- Atualizar a página `/moderacao/operacionais` para aceitar e exibir o novo tipo de pendência.
- Adicionar **Erro no cadastro** ao filtro **Tipo** da página de Operacionais.
- Na coluna **Pendência**, exibir a tag **Erro no cadastro**.
- Na coluna **Detalhes**, exibir **Modo de cadastro** e **Email**.
- Manter layout mobile-first, tabela responsiva existente e sem `<img>` cru.

## Escopo backend

- Estender `GET /api/admin/private/moderation/summary` e `GET /api/admin/private/moderation/operational-alerts` com alertas derivados de `user.confirmed=false` para pacientes e psicólogos ativos/não deletados.
- Derivar o modo de cadastro de `user.provider`: `google` => **Google**; demais valores => **Email/senha**.
- Usar links reais de detalhe Admin: `/pacientes/:id` para pacientes e `/psicologos/:id` para psicólogos.
- Remover automaticamente da fila por derivação: quando `user.confirmed=true`, o alerta deixa de ser retornado.

## Fora do escopo

- Criar nova persistência de pendências de cadastro.
- Criar ação administrativa de reenvio direto nesta tela.
- Alterar o fluxo público de cadastro, login, confirmação de e-mail ou Google OAuth.
- Criar backfill, dados artificiais, mocks ou seeds.
- Enviar e-mails nesta task.

## Contrato técnico detalhado

Referências obrigatórias:

- `ARCHITECTURE.md`: backend em repository/use-case/controller, app Admin separado, UI mobile-first e sem design system paralelo.
- `DATA-MODEL.md`: identidade existente (`user.provider`, `user.confirmed`, `user.confirmed_date`, `confirm_code`, `confirm_date`) e roles `paciente`/`psicologo`.
- `PACKAGES.md`: sem package novo.
- `PROTO-INVENTORY.md`: padrões Admin exportados; sem protótipo específico de Operacionais.

Backend esperado:

- Reutilizar o módulo existente `backend/src/modules/api/admin/private/moderation`.
- Adicionar select/query real de usuários não confirmados sem alterar Prisma schema.
- Adicionar novo tipo `registration_error` aos DTOs e filtros operacionais.
- Atualizar contadores `registration_errors` e `operational_total`.
- Atualizar gráficos operacionais com pontos de `registration_errors`.

Frontend esperado:

- Atualizar `admin/src/api/req/moderation` para o novo tipo, contadores e pontos de gráfico.
- Atualizar `admin/src/app/(admin)/moderacao/operational-category-client.tsx` para filtro, tag e detalhes.
- Atualizar `admin/src/app/(admin)/moderacao/overview-charts.tsx` para o contador visual de cadastros.
- Reutilizar React Hook Form/Zod/controllers já existentes na barra de filtros da página.

## Critérios de aceite

- [x] `/moderacao/operacionais` lista usuários pacientes e psicólogos ativos/não deletados com `user.confirmed=false` como pendência real.
- [x] A coluna **Pendência** exibe a tag **Erro no cadastro** para essa pendência.
- [x] A coluna **Detalhes** exibe **Modo de cadastro: Email/senha** ou **Google** e o e-mail do usuário.
- [x] O filtro **Tipo** em Operacionais inclui **Erro no cadastro** e filtra via backend real.
- [x] Quando `user.confirmed=true`, a pendência não é mais retornada por `operational-alerts` nem contabilizada.
- [x] Contadores da Moderação e do submenu Operacionais incluem `registration_errors` sem afetar Compliance.
- [x] Nenhum mock, dado fake permanente, seed artificial, endpoint simulado ou package novo foi usado.
- [x] Não houve alteração de banco/schema/migrations; `db:migrate` não se aplica.
- [x] UI mobile-first; nenhum `<img>` cru foi usado.
- [x] Formulários/filtros mantêm React Hook Form, Zod e controllers existentes.
- [x] Builder/Quick Copy não estava disponível como ferramenta executável; captura do usuário e referências locais de `_product/proto/admin` foram usadas.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado em `adrs/`.
- [x] Commit próprio criado e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- Browser local em `/moderacao/operacionais` para validar renderização mobile-first/desktop quando houver sessão Admin disponível.

## Notas de execução

- Execução iniciada em 2026-07-25.
- A pendência é derivada e read-only; a resolução acontece no fluxo real de confirmação de e-mail já existente.
