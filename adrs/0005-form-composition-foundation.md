# ADR-0005: Form Composition Foundation

## Status

Accepted

## Task relacionada

TASK-02 - Form Composition Foundation.

## Contexto

O produto Lectum terá muitas telas com campos e validações. O sample possui uma arquitetura robusta de controllers, mas o frontend novo ainda renderizava inputs diretamente nas páginas, começando pelo login.

Ao mesmo tempo, `PACKAGES.md` define React Hook Form, `@hookform/resolvers` e Zod como a base recomendada em junho de 2026. TanStack Form foi avaliado e rejeitado neste momento para evitar uma segunda arquitetura de formulários.

## Decisão

Adotamos uma fundação única em `frontend/src/hooks/form` e `frontend/src/components/controllers`:

- `useFormList<FormType>()` compõe `fields`, schema Zod, valores iniciais, valores externos, `resetOptions`, `onlyRead` e estado de erro/dirty.
- `Form` renderiza campos por registry de controllers e mantém `Controller` encapsulado fora das páginas.
- `Container` centraliza label, required, tooltip simples, descrição e erro inline.
- Controllers foram criados para `input`, `textarea`, `checkbox`, `select`, `switch`, `phone`, `cpf`, `cnpj`, `cep`, `money`, `numeric`, `percentage` e `calendar`.
- Máscaras de CPF, CNPJ, CEP e telefone exibem valor formatado, mas armazenam valor de domínio sem máscara.
- Campos numéricos, moeda, percentual, select e calendário normalizam vazio para `null`; textarea normaliza vazio para `undefined`; checkbox/switch normalizam para `false`.
- Nenhum pacote novo foi instalado nesta task.

O login foi migrado como smoke test: `use-form.tsx` declara schema, defaults e fields; `logic.tsx` renderiza o `Form` e preserva a mutation real de autenticação.

## Consequências

- Próximas telas com campos devem declarar schema/fields em `use-form.tsx` e renderizar via `Form`.
- `register` direto em página fica restrito a buscas simples sem validação persistente.
- Controllers avançados podem evoluir por demanda, mas não devem ser duplicados por tela.
- Se uma task precisar de máscara mais sofisticada ou validação local de CPF/CNPJ/telefone, a instalação de `react-imask`, `react-number-format`, `cpf-cnpj-validator` ou `libphonenumber-js` precisa de ADR específico.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir frontend dev`
- `curl -I http://localhost:3000/auth/login`

## Pendências

- Validação visual automatizada por browser ficou bloqueada no ambiente desta execução: o browser MCP não expôs navegadores, Chrome bloqueou JavaScript via Apple Events e Safari exigiu habilitar "Allow JavaScript from Apple Events".
- Quando o ambiente de browser estiver disponível, repetir o smoke test visual: abrir `/auth/login`, submeter vazio e confirmar mensagens inline `Informe um e-mail válido` e `Informe sua senha`.
