# TASK-16: Contato por WhatsApp

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-16 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Perfil |
| Status | Pending |
| Dependências | TASK-02, TASK-03, TASK-15 |
| ADR alvo | ADR de contato WhatsApp |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Confirmação de WhatsApp - Inserir Número.jpg` | `figma-design-frame-54-Confirma--o-de-WhatsApp---Inserir-N-mero.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

O produto promete levar pacientes ao WhatsApp do psicólogo. Essa ação precisa ser registrada e só deve usar integração real ou link autorizado.

## Objetivo

Implementar confirmação de contato WhatsApp com persistência de intenção e integração real quando decidida.

## Pré-requisitos e bloqueios

- Contato WhatsApp foi decidido na TASK-03 / ADR-0006: registrar `contact_request` e abrir link direto `wa.me` com o número real do psicólogo.
- Verificação de número usa Twilio SMS/OTP. Sem credenciais/número de teste Twilio no ambiente, persistir o número como não verificado e não preencher `whatsapp_verified_at`.
- WhatsApp Business API não entra no MVP; não disparar mensagem ativa pelo WhatsApp.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/app/psychologist/[id]/contact` (dentro do shell privado da TASK-12, a partir do perfil da TASK-15)

Implementação esperada:

- Criar modal/tela de confirmação antes de abrir WhatsApp.
- Solicitar/confirmar número do paciente quando necessário.
- Registrar clique/intenção antes do redirecionamento.
- Exibir política curta de privacidade/consentimento.
- Não abrir WhatsApp com telefone fake ou placeholder.

## Escopo backend

Implementação esperada:

- Endpoint para criar contato/intenção, persistindo `contact_request` (ver `DATA-MODEL.md`; `channel` default `"whatsapp"`) para analytics e elegibilidade de avaliação.
- Validar profissional publicado (`psychologist_profile.published`) e WhatsApp configurado (`psychologist_profile.whatsapp`).
- Só liberar/abrir o WhatsApp quando `psychologist_profile.whatsapp` existir; o preenchimento de `whatsapp_verified_at` depende de verificação real por Twilio SMS/OTP (ADR-0006).
- Usar Twilio SMS/OTP quando for verificar o número; usar `wa.me` para contato do paciente.
- Não expor telefone sem regra de privacidade definida.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `contact_request`
- `psychologist_profile` (`whatsapp`, `whatsapp_verified_at`)
- `patient_profile` (`phone`)

Guarda de papel (ver `DATA-MODEL.md`, "Camadas de autenticação e autorização" e ADR-0002):

- Esta é uma rota de contato caller-neutra, montada sob `/api/private/directory/*`, guardada apenas por `_auth` (qualquer autenticado) — **nunca** por `requireRole`. Pacientes precisam contatar psicólogos a partir da descoberta, então o contato não pode ser psicólogo-only.
- Não usar `/api/private/psychologists` (confundível com a autogestão do psicólogo em `/api/private/psychologist/*`).
- Expor apenas campos PUBLIC-safe do `psychologist_profile`; o `whatsapp` só é liberado pelo fluxo de contato e nunca `cpf` ou campos de conta.

Endpoints esperados (ver "Convenção de rotas" do `DATA-MODEL.md`):

- POST `/api/private/directory/psychologists/:id/contact` (cria `contact_request`)

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

- libphonenumber-js
- TanStack Query
- Prisma
- twilio

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
- [ ] Rotas de descoberta sob `/api/private/directory/*` usam só `_auth` (neutras), nunca `requireRole`, conforme ADR-0002.
- [ ] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [ ] Backend implementado nos endpoints/modelos esperados quando aplicável.
- [ ] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
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
