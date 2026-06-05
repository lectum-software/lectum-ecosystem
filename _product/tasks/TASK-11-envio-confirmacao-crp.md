# TASK-11: Envio e confirmação de CRP

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-11 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Psicólogo |
| Status | Blocked |
| Dependências | TASK-02, TASK-03, TASK-10 |
| ADR alvo | ADR de documentos profissionais e storage |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Confirmação de Envio de CRP - Layout Ajustado.jpg` | `figma-design-frame-47-Confirma--o-de-Envio-de-CRP---Layout-Ajustado.html` |
| `_product/proto/Confirmação de Envio de CRP - Layout Ajustado-1.jpg` | `figma-design-frame-48-Confirma--o-de-Envio-de-CRP---Layout-Ajustado.html` |
| `_product/proto/Confirmação de Envio de CRP - Layout Ajustado-2.jpg` | `figma-design-frame-49-Confirma--o-de-Envio-de-CRP---Layout-Ajustado.html` |
| `_product/proto/Confirmação de Envio de CRP - Layout Ajustado-3.jpg` | `figma-design-frame-53-Confirma--o-de-Envio-de-CRP---Layout-Ajustado.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

As telas variam a confirmação do envio. A implementação deve separar upload, submissão e status, sem aprovar automaticamente o psicólogo por dado falso.

## Objetivo

Permitir envio/registro de CRP com storage real e status de validação profissional.

## Pré-requisitos e bloqueios

- O upload de documento usa **Cloudflare R2 via API S3-compatible e `@aws-sdk/client-s3`** (decisão da TASK-03 / ADR-0006). Sem bucket/credenciais R2 reais no ambiente, este é um **bloqueio obrigatório**: parar antes de qualquer upload real, registrar pendência e **não usar mock** nem URL temporária de protótipo.
- Documentos CRP devem ser privados por padrão. Se a configuração atual usar apenas bucket público, adaptar a política/bucket antes de armazenar CRP.
- `professional_document.file_key` persiste a chave no bucket (nunca URL temporária), conforme `DATA-MODEL.md`.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/psychologist/crp-confirmation`

Implementação esperada:

- Criar tela de confirmação/status CRP conforme imagens.
- Implementar upload somente se storage real estiver decidido.
- Exibir estados pendente, enviado, em análise, rejeitado e aprovado.
- Permitir reenviar documento quando rejeitado.
- Não usar URL temporária de protótipo como asset final.

## Escopo backend

Este é um **módulo novo** (documentos profissionais): seguir os padrões de controller/service/repository do `ARCHITECTURE.md` e registrar as rotas em `backend/src/main/server/imports/write.ts`. Não recriar autenticação, helpers de resposta ou validator.

Implementação esperada:

- Criar endpoints privados de upload/submissão/status.
- Usar storage real Cloudflare R2 definido em TASK-03.
- Persistir documento profissional em `professional_document` (`type="crp"`, `file_key`, `status`) conforme `DATA-MODEL.md`.
- Refletir o status no `psychologist_profile.crp_status` (`"pendente" | "em_analise" | "aprovado" | "rejeitado"`, ver `DATA-MODEL.md`).
- Registrar logs de alteração de status.
- Não tornar perfil público (`psychologist_profile.published`) antes de `crp_status="aprovado"`.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `professional_document` (ver `DATA-MODEL.md`) — `type`, `file_key`, `status`.
- `psychologist_profile` (ver `DATA-MODEL.md`) — campo `crp_status` (não existe `psychologist_profile.status`; usar `crp_status`).

Endpoints esperados (autogestão do psicólogo, sob `/api/private/psychologist/*`):

- POST `/api/private/psychologist/documents`
- GET `/api/private/psychologist/documents/status`
- POST `/api/private/psychologist/documents/resubmit`

**Guarda de papel:** estes endpoints são exclusivos de psicólogo. Vivem sob `/api/private/psychologist/*` e são protegidos por `requireRole("psicologo")` (criado na TASK-12), aplicado no mount em `write.ts`, **fail-closed** (papel divergente → `403`, sem `next()`). O escopo de ownership é feito por `req.auth.id`. Ver `DATA-MODEL.md` "Camadas de autenticação e autorização" e `adrs/0002-arquitetura-auth-roles.md`.

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

- multer
- @aws-sdk/client-s3
- Prisma
- Zod

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
- [ ] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [ ] Rotas sob `/api/private/psychologist/*` exigem `requireRole("psicologo")` (fail-closed), conforme ADR-0002.
- [ ] Storage R2 respeitado: sem bucket/credenciais reais no ambiente, parar com pendência, sem mock nem URL temporária.
- [ ] Todos os estados obrigatórios existem e usam textos em PT-BR.
- [ ] Formulários e campos usam a fundação da `TASK-02` quando aplicável.
- [ ] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [ ] Nenhum código gerado por Builder foi aceito sem revisão e adequação à arquitetura.
- [ ] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
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

## Execução bloqueada em 2026-06-05

- Dependências documentais verificadas: TASK-02, TASK-03 e TASK-09 estão concluídas; a
  TASK-10 permanece `Blocked` porque a consulta CFP automática não possui fonte/API
  autorizada, mas registrou o encaminhamento operacional para validação manual por CRP.
- Referências visuais consultadas pelas imagens locais:
  - `_product/proto/Confirmação de Envio de CRP - Layout Ajustado.jpg`;
  - `_product/proto/Confirmação de Envio de CRP - Layout Ajustado-1.jpg`;
  - `_product/proto/Confirmação de Envio de CRP - Layout Ajustado-2.jpg`;
  - `_product/proto/Confirmação de Envio de CRP - Layout Ajustado-3.jpg`.
- Builder/Quick Copy não está exposto como ferramenta direta neste ambiente; por isso foi
  usado o fallback auditável das imagens locais.
- Bloqueio externo confirmado: a configuração atual de storage expõe apenas
  `CLOUDFLARE_R2_PUBLIC_BUCKET_NAME=public`. Não há env/bucket privado documentado, como
  `CLOUDFLARE_R2_PRIVATE_BUCKET_NAME`, nem política privada confirmada para documentos CRP.
- A implementação existente em `backend/src/config/multer/storage.ts` grava no
  `PUBLIC_BUCKET`, portanto não pode ser reutilizada para documentos profissionais sem
  violar a regra de privacidade da TASK-11 e do ADR-0006.
- A implementação de `POST /api/private/psychologist/documents`,
  `GET /api/private/psychologist/documents/status`,
  `POST /api/private/psychologist/documents/resubmit`, schema `professional_document` e
  upload real foi interrompida antes de qualquer endpoint, migration, chamada R2, mock,
  URL temporária ou dado inventado.
- `psychologist_profile.crp_status` deve permanecer `"pendente"`/estado atual e
  `psychologist_profile.published` não deve ser ativado sem análise profissional real.
- ADR criado: `adrs/0017-bloqueio-storage-privado-crp.md`.
- Pendência operacional para retomar: provisionar e informar bucket privado Cloudflare R2
  para CRP, credenciais com permissão adequada e política de acesso privada. Só depois
  implementar upload, persistência de `file_key` e status manual.

## Validação executada

- Revisão manual de TASK-11, TASK-10, `_product/decisions.md`,
  `DATA-MODEL.md`, `adrs/0006-integracoes-externas-e-decisoes-pendentes.md` e
  configuração `backend/src/config/multer/*`.
- `git diff --check`

## Observação sobre critérios de aceite

Os critérios acima permanecem sem marcação completa porque a task está formalmente
bloqueada por requisito externo de storage privado. Não houve implementação de tela,
endpoint, schema, migration, upload, mock ou URL temporária.
