# TASK-63: Fundação de campanhas e logs de notificações Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-63 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin / Notificações |
| Status | Pending |
| Dependências | TASK-29A, TASK-29B, TASK-38, TASK-45 |
| ADR alvo | ADR sobre campanhas manuais, rastreio de entrega/abertura/clique e ausência de e-mail na V1 |

## Contexto

A tela Admin de Notificações não representa notificações recebidas pelo administrador. Ela é um centro para:

1. criar notificações manuais para usuários da plataforma;
2. acompanhar campanhas manuais enviadas/agendadas/rascunhadas/canceladas;
3. exibir logs das notificações automáticas geradas pela plataforma.

A referência visual da tela final está em `_product/proto/admin/Notificações.png`, mas esta task é a fundação backend/domínio necessária antes da UI.

Decisão de produto:

- Não considerar **e-mail** nas notificações por enquanto.
- Canais V1:
  - `in_app`;
  - `push`, somente quando a infraestrutura real de web push/VAPID e subscription do usuário estiver disponível.
- Não criar SMTP, templates de e-mail, tracking pixel ou qualquer métrica de e-mail.

## Objetivo

Criar a fundação real para campanhas manuais e logs de notificações automáticas, com rastreio de entrega, leitura/abertura e clique para canais in-app/push, sem e-mail e sem métricas inventadas.

## Pré-requisitos e bloqueios

- TASK-29A concluída: central in-app, `notification`, `notification_subscription`, preferências, dispatcher, socket e web push.
- TASK-29B concluída: eventos reais de domínio produzindo notificações automáticas.
- TASK-38 concluída: permissão contextual para push.
- TASK-45 concluída: autenticação Admin real.
- Ler `ARCHITECTURE.md`, `DATA-MODEL.md`, `PACKAGES.md` e `PROTO-INVENTORY.md`.
- Se VAPID não estiver configurado, push deve ficar indisponível/honesto; in-app continua funcionando.
- Toda alteração em Prisma/migrations deve executar `pnpm --dir backend db:migrate`.

## Escopo frontend

- Nenhuma tela Admin nesta task.
- Se necessário, criar apenas callers/contratos mínimos para a TASK-64 consumir depois.
- Não alterar a central de notificações do usuário além do necessário para registrar leitura/clique real.

## Escopo backend

- Criar modelos/tabelas para:
  - campanha manual de notificação;
  - entrega/log por usuário;
  - eventos de leitura/abertura e clique;
  - origem manual ou automática.
- Integrar o dispatcher existente de notificações para registrar entregas automáticas.
- Criar serviços para:
  - criar rascunho de campanha manual;
  - atualizar rascunho;
  - agendar;
  - enviar agora;
  - cancelar campanha agendada/rascunho;
  - materializar entregas para o público escolhido;
  - registrar leitura/abertura;
  - registrar clique;
  - consultar métricas agregadas.
- Respeitar preferências reais dos usuários para in-app/push.
- Para push:
  - tentar envio somente quando houver `notification_subscription`, VAPID configurado e preferência habilitada;
  - registrar falha real quando o envio falhar;
  - não prometer entrega push quando não houver subscription/permissão.

## Fora do escopo

- E-mail.
- SMTP, Resend, Nodemailer ou templates de e-mail.
- Tracking pixel de abertura.
- WhatsApp/SMS.
- Segmentação comportamental avançada.
- Campanhas recorrentes.
- Editor rico/HTML.
- A/B testing.
- Push nativo de app mobile.
- Métricas sem fonte real.

## Contrato técnico detalhado

Modelos sugeridos, a ajustar conforme padrões de nomenclatura do schema:

- `admin_notification_campaign`
  - `id`;
  - `title`;
  - `body`;
  - `redirect`;
  - `audience`;
  - `channels Json` com valores permitidos `in_app` e/ou `push`;
  - `status`: `draft`, `scheduled`, `sending`, `sent`, `canceled`, `failed`;
  - `scheduled_at`;
  - `sent_at`;
  - `canceled_at`;
  - `created_by_admin_id`;
  - timestamps/deleted conforme padrão do projeto.
- `notification_delivery`
  - `id`;
  - `campaign_id` opcional;
  - `notification_id` opcional;
  - `user_id`;
  - `source`: `manual` ou `automatic`;
  - `trigger_key` para automáticas;
  - `channel`: `in_app` ou `push`;
  - `status`: `queued`, `sent`, `delivered`, `read`, `clicked`, `failed`, `skipped`;
  - `sent_at`;
  - `delivered_at`;
  - `read_at`;
  - `clicked_at`;
  - `failure_reason`;
  - `metadata Json?`;
  - timestamps/deleted conforme padrão do projeto.

Regras:

- Uma campanha manual pode gerar várias entregas por usuário e canal.
- Push não substitui in-app; se uma campanha usar push e in-app, cada canal deve ter entrega rastreável.
- Se a UI optar por "push" sem in-app, registrar claramente que somente usuários com subscription real serão alcançados.
- Automáticas devem ser logadas quando o dispatcher real criar/enviar uma notificação de domínio.
- Abertura:
  - in-app: marcar `read_at` quando a notificação for lida na central;
  - push: só contar como abertura se houver evento real de clique/interação, não por recebimento.
- Clique:
  - registrar somente quando o usuário acionar o redirect/link da notificação.
- Alcance:
  - usuários com entrega `sent`/`delivered` real;
  - não contar usuários filtrados, pulados ou sem subscription push como alcançados no canal push.

Endpoints admin privados esperados:

- `POST /api/admin/private/notifications/campaigns`
- `PUT /api/admin/private/notifications/campaigns/:id`
- `POST /api/admin/private/notifications/campaigns/:id/send`
- `POST /api/admin/private/notifications/campaigns/:id/schedule`
- `POST /api/admin/private/notifications/campaigns/:id/cancel`
- `GET /api/admin/private/notifications/campaigns`
- `GET /api/admin/private/notifications/campaigns/:id`
- `GET /api/admin/private/notifications/automatic-logs`
- `GET /api/admin/private/notifications/metrics`

Endpoints privados do usuário, se necessários:

- `POST /api/private/notification/:id/click`
- Ajustar `PUT /api/private/notification/update/:id` para refletir `read_at` na entrega quando houver vínculo.

Audiências V1 permitidas:

- `all_users`;
- `patients`;
- `psychologists`;
- `active_patients`;
- `active_psychologists`.

Definições:

- "active" deve ser explicitamente definido na task de execução:
  - preferir `user.active=true`;
  - se for atividade recente, criar ADR e ajustar copy.

Validação:

- Payloads devem ser validados com Zod/validator do backend.
- Canais aceitos: somente `in_app` e `push`.
- Rejeitar payload com `email`.
- Título/corpo com limite de caracteres.
- Redirect deve ser rota interna permitida ou URL validada conforme política do produto.

## Critérios de aceite

- [ ] Modelos/migrations de campanha e entrega/log foram criados.
- [ ] `pnpm --dir backend db:migrate` executado após alteração de Prisma/migrations.
- [ ] Não existe canal e-mail na V1.
- [ ] Payloads com canal `email` são rejeitados.
- [ ] Campanhas manuais suportam rascunho, agendamento, envio e cancelamento.
- [ ] Entregas são materializadas por usuário e canal com fonte real.
- [ ] Logs automáticos são gerados a partir do dispatcher real.
- [ ] Push só é tentado com subscription/VAPID reais.
- [ ] Abertura/leitura e clique só são registrados por eventos reais.
- [ ] Métricas agregadas não inventam abertura/clique.
- [ ] Preferências reais de notificação são respeitadas.
- [ ] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [ ] Checks/builds relevantes executados sem erros.
- [ ] ADR criado/atualizado.
- [ ] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend db:migrate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Teste manual/API com admin real criando rascunho e enviando campanha in-app para usuário real.
