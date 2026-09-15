# ADR-0498: Links legais no rodape dos cadastros

## Status

Accepted

## Task relacionada

Ajuste operacional de 2026-09-13 no contexto das TASK-07, TASK-09 e TASK-41.

## Contexto

No fluxo de cadastro de paciente e de psicologo (`/auth/register/patient` e
`/auth/register/psychologist`) havia um bloco de aviso usando
`LegalRegistrationNotice` com o texto:

> Os documentos publicados estao indisponiveis no momento. Continue sem aceitar os
> termos abaixo no momento do cadastro.

Esse texto era exibido mesmo com os links de Termos de Servico e Privacidade
disponiveis, porque o componente tambem servia como copia operacional quando
`documents` ainda nao estava populado.

O ajuste solicitado foi especifico: manter a experiencia de cadastro alinhada ao
login, com links legais no rodape acima do copyright. As imagens anexadas pelo
usuario foram tratadas apenas como evidencias visuais (screenshot do estado atual
antes da mudanca), nao como instrucao tecnica adicional.

## Decisao

- Remover o componente `LegalRegistrationNotice` das telas de cadastro
  (`frontend/src/app/auth/register/patient/logic.tsx` e
  `frontend/src/app/auth/register/psychologist/logic.tsx`).
- Remover o texto operacional "Os documentos publicados estao indisponiveis..." desses
  fluxos.
- Inserir `LegalLinks` no rodape, acima do copyright, com `newTab`:
  `<LegalLinks className="mb-3" newTab />`.
- Manter o padrao de apresentacao usado no login: links legais no rodape e
  `© 2026 Lectum. Todos os direitos reservados.` apos os links.
- Remover o componente legado `frontend/src/components/legal/registration-notice.tsx`
  que deixou de ser usado nesses cenarios de cadastro.
- Ajustar o teste focado em `frontend/scripts/legal.test.mjs` para validar:
  - importacao de `LegalLinks`,
  - ausencia de `LegalRegistrationNotice`/texto indisponivel,
  - presenca de `<LegalLinks>` no `<footer>`.

## Consequencias

- A interface de cadastro passa a mostrar os links legais de forma clara e
  consistente com o login.
- O texto operacional de indisponibilidade nao aparece mais no cadastro.
- Nao houve alteracao de backend, banco de dados, migracao, env nova,
  package ou integracao externa.
- Compatibilidade entre versions frontend/backend preservada: essa alteracao e
  estritamente de UI.

## Rollout

- Task frontend-only.
- Release apenas com a pipeline de homologacao da branch `homolog`.
- Em caso de rollback, reverter o commit aplica a volta para o layout anterior.

## Validacao

- `pnpm --dir frontend check` e `pnpm --dir frontend build`.
- Foco de testes de legal em `frontend/scripts/legal.test.mjs` com Node runtime.
- Verificacao local/browser do comportamento visual em `patient` e `psychologist`.
- `pnpm version:bump` para sincronizar manifests e `pnpm check:version`.
