# TASK-30: Configurações de conta

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-30 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Conta |
| Status | Completed |
| Dependências | TASK-02, TASK-12 |
| ADR alvo | ADR de configurações de conta e segurança |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Configurações de Conta - Login Google.jpg` | `figma-design-frame-41-Configura--es-de-Conta---Login-Google.html` |
| `_product/proto/Editar E-mail e Senha.jpg` | `figma-design-frame-34-Editar-E-mail-e-Senha.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Mudanças de e-mail e senha são sensíveis. Devem exigir senha atual/código quando necessário e atualizar sessão sem quebrar autenticação.

## Objetivo

Criar configurações de conta para login Google, e-mail e senha com segurança real.

## Pré-requisitos e bloqueios

- Sem OAuth Google configurado, bloquear vínculo/desvínculo Google e manter edição e-mail/senha.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Integração com backend existente (não recriar)

- Vínculo/desvínculo Google **reaproveita o módulo Google já existente** em `backend/src/modules/api/public/google/*`. Estender esse módulo conforme necessário; **não** especificar um endpoint OAuth paralelo.
- E-mail/senha/sessão operam sobre os modelos reais `user` e `user_token` (ver `DATA-MODEL.md` › "Identidade (já existe — não recriar)"). Verificação de novo e-mail reusa `user.confirm_code`/`user.confirmed`; nunca criar `emailVerifiedAt`. `user_token` **não tem coluna `type`** — não armazenar tokens tipados nele.
- Persistência de tema/dark mode: armazenar em `user_background` (`type:"preference"`) conforme `DATA-MODEL.md`. **Não** inventar `user_identity` (não existe no `DATA-MODEL.md`).

Implementação esperada:

- Criar tela de conta e segurança.
- Permitir conectar/desconectar Google quando regra permitir.
- Formulário de alteração de e-mail e senha.
- Validar senha atual, nova senha e confirmação.
- Exibir estados de confirmação/erro em PT-BR.

## Escopo backend

Implementação esperada:

- Endpoints privados para alterar e-mail/senha.
- Validar senha atual antes de troca de senha.
- Gerar verificação para novo e-mail.
- Gerenciar vínculo Google sem remover último método de login sem alternativa.
- Invalidar tokens se necessário.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md` › "Identidade (já existe — não recriar)"; reutilizar campos reais, sem inventar):

- `user` (real; e-mail/senha/`confirm_code`/`confirmed`).
- `user_token` (real; sem coluna `type`).
- `user_background` (`type:"preference"`) para preferências como tema/dark mode. **Não** usar `user_identity` (não existe no `DATA-MODEL.md`).

Endpoints esperados:

- PUT `/api/private/account/email`
- PUT `/api/private/account/password`
- Vínculo/desvínculo Google: **estender o módulo existente** `backend/src/modules/api/public/google/*` (reuso, não endpoint paralelo). Expor as ações de link/unlink dentro desse módulo/contrato existente.

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

- React Hook Form
- Zod
- argon2
- Passport Google OAuth
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
- [x] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [x] Backend implementado nos endpoints/modelos esperados quando aplicável.
- [x] Todos os estados obrigatórios existem e usam textos em PT-BR.
- [x] Formulários e campos usam a fundação da `TASK-02` quando aplicável.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] Nenhum código gerado por Builder foi aceito sem revisão e adequação à arquitetura.
- [x] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.

## Evidências de execução

- 2026-06-13: Builder/Quick Copy não estava exposto como ferramenta callable nesta sessão do Codex; foram consultadas as imagens locais `_product/proto/Configurações de Conta - Login Google.jpg` e `_product/proto/Editar E-mail e Senha.jpg`.
- 2026-06-13: Implementada a rota `/app/settings/account`, acessada pelo item “E-mail e senha” do menu de perfil.
- 2026-06-13: Implementados `GET /api/private/account/security`, `PUT /api/private/account/email`, `PUT /api/private/account/password` e extensão do módulo Google em `/api/public/google/link`.
- 2026-06-13: Validações executadas: `pnpm --dir backend check`, `pnpm --dir frontend check`, `pnpm --dir backend build`, `pnpm --dir frontend build`, `pnpm check` e smoke local em `http://localhost:3000/app/settings/account`.
- 2026-06-17: Extensão complementar implementou exclusão de conta para pacientes e psicólogos dentro de Editar perfil/setup profissional, com modal destrutiva, senha atual ou reautenticação Google, limpeza persistente de dados pessoais/preferências/notificações/favoritos e anonimização de publicações/comentários como `Membro Excluído` ou `Psicólogo Excluído`.
- 2026-06-17: ADR `adrs/0113-exclusao-conta-usuarios-anonimizacao-google.md` registra a decisão de preservar conteúdo público anonimizado e usar `user_background` como prova temporária de reautenticação Google.
- 2026-06-17: Validações executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e smoke local via Chrome headless em `/app/profile/edit` e `/app/professional/profile/setup`.
