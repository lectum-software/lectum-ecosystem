# TASK-29: Notificações

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-29 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Conta |
| Status | Pending |
| Dependências | TASK-02, TASK-03, TASK-12 |
| ADR alvo | ADR de notificações e preferências |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Notificações.jpg` | `figma-design-frame-17-Notifica--es.html` |
| `_product/proto/Configurações de Notificações.jpg` | `figma-design-frame-24-Configura--es-de-Notifica--es.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Notificações precisam refletir eventos reais e respeitar preferências. Push/e-mail/WhatsApp dependem de decisões externas.

## Objetivo

Criar notificações reais e preferências de recebimento por canal.

## Pré-requisitos e bloqueios

- Push web real foi decidido na TASK-03 / ADR-0006, usando `web-push`/VAPID e `notification_subscription`. Sem VAPID configurado no ambiente, persistir a preferência em `notification_preference` mas **não prometer entrega push**.
- E-mail usa Resend via Nodemailer; telefone/WhatsApp usa Twilio SMS/OTP quando aplicável. Sem credenciais reais, implementar apenas preferências e lista in-app para o canal ausente.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/app/notifications`
- `/app/settings/notifications`

Implementação esperada:

- Criar lista de notificações com lida/não lida.
- Criar tela de configurações de notificações.
- Permitir marcar como lida e atualizar preferências.
- Usar Socket.IO quando disponível para atualização em tempo real.
- Exibir vazio real.

## Escopo backend

Implementação esperada:

- Criar/usar modelo de notificação e preferências.
- Endpoints de listagem, marcar lida e atualizar preferências.
- Emitir eventos Socket.IO para usuário conectado quando aplicável.
- Push web só se VAPID/configuração existir.
- Não enviar mensagem por canal sem consentimento.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md` › "Notificações"; usar nomes/campos/enums exatos, sem inventar):

- `notification` (in-app; `type` segue o enum do PRD §12 já listado no `DATA-MODEL.md`: `nova_avaliacao`, `novo_favorito`, `visualizacao_perfil`, `clique_whatsapp`, `novo_post`, `nova_resposta`, `upvote`, `downvote`, `compartilhamento`, `salvamento`).
- `notification_preference` (`prefs Json`, 1:1 por `user_id`).
- `notification_subscription` (**já existe** no schema real; guarda a inscrição web-push). Não confundir com `notification` — não recriar nem repropósito.

Endpoints esperados:

- GET `/api/private/notifications` — lista paginada conforme "Contrato padrão de API" (`page`/`limit`, default 20, máx 50; resposta `data.items/total/page/limit`).
- PUT `/api/private/notifications/:id/read`
- PUT `/api/private/notifications/preferences`

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

- socket.io
- socket.io-client
- web-push
- TanStack Query
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

- [ ] As referências visuais desta task foram consultadas via Builder Quick Copy ou imagens locais citadas acima.
- [ ] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [ ] Backend implementado nos endpoints/modelos esperados quando aplicável.
- [ ] Todos os estados obrigatórios existem e usam textos em PT-BR.
- [ ] Formulários e campos usam a fundação da `TASK-02` quando aplicável.
- [ ] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [ ] Nenhum código gerado por Builder foi aceito sem revisão e adequação à arquitetura.
- [ ] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
- [ ] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [ ] ADR criado ou atualizado em `adrs/`.
- [ ] Checks/builds relevantes foram executados sem erros.
- [ ] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.
