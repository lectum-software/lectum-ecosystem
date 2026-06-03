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

## Contrato técnico detalhado

Referências obrigatórias:

- `ARCHITECTURE.md`, seções aplicáveis.
- `PACKAGES.md`, seções aplicáveis.

Backend esperado:

- Modelos Prisma.
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
- Campos de formulário em largura total; slot de erro com altura fixa (sem layout shift).

## Critérios de aceite

- [ ] Critério verificável 1.
- [ ] Critério verificável 2.
- [ ] UI mobile-first; nenhum `<img>` cru (somente `next/image`).
- [ ] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [ ] Formulários/campos usam React Hook Form, Zod e controllers da `TASK-02` quando aplicável.
- [ ] Builder/Quick Copy foi usado quando disponível, ou as imagens locais de `_product/proto` foram citadas quando houver UI.
- [ ] Checks/builds relevantes foram executados sem erros.
- [ ] ADR criado ou atualizado em `adrs/`.
- [ ] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm check` quando ambos mudarem.
- Builds relevantes.
- Browser local quando houver interface.

## Notas de execução

Registre observações úteis para o executor, sem depender de arquivos externos não garantidos.
