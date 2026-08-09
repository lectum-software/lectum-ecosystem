# TASK-XX: Nome da task

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-XX |
| Prioridade | P0/P1/P2 |
| Esforço | S/M/L |
| Fase | Nome da fase |
| Status | Pending |
| Dependências | TASK-... |
| ADR alvo | ADR esperado |

## Contexto

Explique o problema, a jornada do PRD/fluxogramas, as imagens/protótipos conhecidos e o estado atual do produto. Este texto deve bastar para execução sem histórico de chat.

## Objetivo

Descreva o resultado funcional que o usuário não-dev conseguirá validar em tela ou por comportamento.

## Pré-requisitos e bloqueios

- Decisões externas necessárias.
- Imagens de `_product/proto` e, quando disponível no cliente, contexto Builder/Quick Copy.
- Dados reais necessários.
- Migrações ou comandos prévios.
- Arquitetura obrigatória em `ARCHITECTURE.md`.
- Packages permitidos ou candidatos em `PACKAGES.md`.

Se qualquer item obrigatório estiver ausente, a task deve parar e registrar bloqueio.

## Escopo frontend

- Rotas, telas, estados e interações.

## Escopo backend

- Modelos, endpoints, regras de domínio e integrações.

## Fora do escopo

- O que não deve ser implementado nesta task.

## Impacto em produção e plano de rollout

Ambientes publicados desde 2026-08-07: `homolog` → homologação e `main` → produção.

- Compatibilidade com dados existentes: explicar como registros antigos continuam válidos.
- Banco: declarar “sem alteração” ou descrever expandir → backfill retomável → contrair, volume, verificação e rollback. Migration aplicada nunca é editada.
- Envs: listar somente nomes, app afetado, fallback e ordem de provisionamento. Se alguma for obrigatória, abrir **ALERTA DE DEPLOY** antes da implementação.
- Contratos: explicar como frontend/backend/admin em versões diferentes continuam compatíveis durante o rollout.
- Jobs/providers: efeitos externos, idempotência, limites e chave de ativação/desativação.
- Ordem de deploy: backend/frontend/admin e eventuais ações manuais.
- Rollback: como reverter código sem corromper ou perder dados.
- Smoke de homologação: rotas e jornadas reais que devem ser validadas antes de promover para `main`.

## Contrato técnico detalhado

Referências obrigatórias:

- `ARCHITECTURE.md`, seções aplicáveis.
- `PACKAGES.md`, seções aplicáveis.

Backend esperado:

- Modelos Prisma.
- Migration aplicada com `pnpm --dir backend db:migrate` quando houver mudança de banco/schema/migrations.
- Endpoints.
- Validators.
- Controllers/services/repositories.
- Traduções.
- Eventos/logs.

Frontend esperado:

- Rotas.
- Components/templates.
- Controllers de formulário da `TASK-02` quando houver campo, edição, filtro avançado ou submit.
- `api/req`.
- `api/callers`.
- Query keys.
- Store/cookies quando aplicável.

Packages usados:

- Já instalados.
- Candidatos condicionais.
- Pacotes proibidos ou dependentes de decisão externa.

Regras anti-recriação:

- Componentes existentes a reutilizar.
- Helpers existentes a reutilizar.
- Forms existentes a reutilizar: `frontend/src/hooks/form` e `frontend/src/components/controllers`.
- Motivos que justificam estrutura nova.

Regras de UI obrigatórias (ver `ARCHITECTURE.md` › "Regras de UI"):

- **Mobile-first**: implementar primeiro para mobile (~390px) e progredir com breakpoints.
- **Nunca usar `<img>`**; sempre `Image` de `next/image`.
- **Tema claro/escuro/sistema**: cores por tokens (`bg-background`/`bg-surface`/`text-foreground`/`border-border`/`text-primary`…), nunca hardcoded; funcionar nos dois temas.
- Campos de formulário em largura total; slot de erro com altura fixa (sem layout shift).

## Critérios de aceite

- [ ] Critério verificável 1.
- [ ] Critério verificável 2.
- [ ] UI mobile-first; nenhum `<img>` cru (somente `next/image`).
- [ ] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [ ] Se houve alteração de banco/schema/migrations, `pnpm --dir backend db:migrate` foi executado sem erro.
- [ ] Dados existentes continuam compatíveis; nenhuma migration aplicada foi alterada.
- [ ] Envs, ordem de deploy, rollback e smoke de homologação foram registrados; env obrigatória nova possui ALERTA DE DEPLOY.
- [ ] Contratos toleram aplicações em versões diferentes durante o rollout.
- [ ] Formulários/campos usam React Hook Form, Zod e controllers da `TASK-02` quando aplicável.
- [ ] Builder/Quick Copy foi usado quando disponível, ou as imagens locais de `_product/proto` foram citadas quando houver UI.
- [ ] Checks/builds relevantes foram executados sem erros.
- [ ] ADR criado ou atualizado em `adrs/`.
- [ ] Versão dos quatro manifests foi incrementada uma vez e permanece sincronizada.
- [ ] Commit criado com mensagem convencional.
- [ ] Commit e push ocorreram em `homolog`; o deploy de homologação foi comunicado e não houve push direto em `main`.

## Validação mínima

- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend db:migrate` quando houver alteração em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`.
- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir admin check` quando admin mudar.
- `pnpm check` quando mais de uma aplicação mudar.
- Builds relevantes.
- Browser local quando houver interface.

## Notas de execução

Registre observações úteis para o executor, sem depender de arquivos externos não garantidos.

Se `prisma migrate dev` falhar por dados ou estado preexistente no banco local, registre o erro e pergunte ao usuário se pode resetar apenas esse banco antes de rodar comando destrutivo como `pnpm --dir backend exec prisma migrate reset`. Reset, seed destrutivo, `db push`, limpeza de bucket e exclusão em massa são proibidos em homologação/produção.
