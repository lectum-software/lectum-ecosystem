# Packages e Política de Dependências

Última verificação no registry: 2026-06-03, via `pnpm view`.
Revisão técnica de frontend em junho/2026: React Hook Form permanece como padrão de formulários; TanStack Query permanece como padrão de server state.

## Política

- Usar `pnpm`.
- Não instalar pacote novo sem necessidade explícita da task.
- Preferir pacotes já instalados e padrões locais.
- Registrar em ADR quando uma task adicionar dependência.
- Para integrações externas, escolher provedor na TASK-03 antes de instalar SDK definitivo.
- Manter frontend e backend com dependências separadas.
- Não trocar Next App Router por TanStack Router neste projeto.
- Não trocar React Hook Form por TanStack Form sem ADR forte; a fundação de forms deve seguir `TASK-02`.
- Pacotes TanStack adicionais devem ser adotados por problema concreto: tabela, virtualização, lint/devtools ou server state.

## Frontend já instalado

| Pacote | Versão instalada | Última verificada | Uso |
|---|---:|---:|---|
| `next` | `16.2.7` | `16.2.7` | App Router, SSR, build |
| `react` | `19.2.4` | `19.2.7` | UI |
| `react-dom` | `19.2.4` | `19.2.7` | UI |
| `tailwindcss` | `^4` | `4.3.0` | Estilo |
| `@tailwindcss/postcss` | `^4` | `4.3.0` | PostCSS |
| `@tanstack/react-query` | `^5.101.0` | `5.101.0` | Server state |
| `axios` | `^1.16.1` | `1.17.0` | HTTP client |
| `react-hook-form` | `^7.77.0` | `7.77.0` | Formulários |
| `@hookform/resolvers` | `^5.4.0` | `5.4.0` | Zod resolver |
| `zod` | `^4.4.3` | `4.4.3` | Schema validation |
| `@reduxjs/toolkit` | `^2.12.0` | `2.12.0` | Client state |
| `react-redux` | `^9.3.0` | `9.3.0` | Redux bindings |
| `redux-persist` | `^6.0.0` | `6.0.0` | Persistência local |
| `js-cookie` | `^3.0.8` | `3.0.8` | Cookies |
| `socket.io-client` | `^4.8.3` | `4.8.3` | Tempo real |
| `lucide-react` | `^1.17.0` | `1.17.0` | Ícones |
| `sonner` | `^2.0.7` | `2.0.7` | Toasts |
| `next-themes` | `^0.4.6` | `0.4.6` | Tema claro/escuro |
| `nprogress` | `^0.2.0` | `0.2.0` | Loading route progress |
| `@fingerprintjs/fingerprintjs` | `^5.2.0` | `5.2.0` | Device id |
| `class-variance-authority` | `^0.7.1` | `0.7.1` | Variants de UI |
| `clsx` | `^2.1.1` | `2.1.1` | Class composition |
| `tailwind-merge` | `^3.6.0` | `3.6.0` | Merge Tailwind |

## Decisões frontend junho/2026

| Tema | Decisão | Motivo |
|---|---|---|
| Server state | Manter `@tanstack/react-query` | Já instalado, adequado para queries/mutations, cache, invalidação e optimistic UI. |
| Formulários | Manter `react-hook-form` + `@hookform/resolvers` + `zod` | Já instalado, compatível com sample, permite controllers robustos e erro inline. |
| TanStack Form | Não adotar agora | Apesar de moderno, criaria arquitetura paralela à fundação pedida na `TASK-02`. |
| TanStack Router | Não adotar agora | O projeto usa Next.js App Router; trocar roteamento aumentaria complexidade e conflito de arquitetura. |
| URL state | Considerar `nuqs` em filtros complexos | Next expõe `useSearchParams`, mas validação/tipagem de filtros avançados pode justificar package dedicado. |
| Tabelas/listas densas | Considerar `@tanstack/react-table` e `@tanstack/react-virtual` | São headless e preservam controle visual, úteis para filtros/listas longas sem design system paralelo. |
| Query quality | Considerar `@tanstack/react-query-devtools` e `@tanstack/eslint-plugin-query` | Melhoram depuração e evitam mau uso de keys/deps em tasks futuras. |

## Frontend candidatos por task

Instalar apenas quando a task precisar:

| Pacote | Versão verificada | Quando usar |
|---|---:|---|
| `@radix-ui/react-dialog` | `1.1.15` | Modais e confirmação |
| `@radix-ui/react-dropdown-menu` | `2.1.16` | Menus |
| `@radix-ui/react-tabs` | `1.1.13` | Abas do perfil |
| `@radix-ui/react-checkbox` | `1.3.3` | Termos, filtros |
| `@radix-ui/react-label` | `2.1.8` | Form labels |
| `@radix-ui/react-tooltip` | `1.2.8` | Tooltips |
| `@radix-ui/react-avatar` | `1.1.11` | Avatares |
| `@radix-ui/react-scroll-area` | `1.2.10` | Listas longas |
| `@radix-ui/react-separator` | `1.1.8` | Separadores |
| `@radix-ui/react-switch` | `1.2.6` | Modo escuro/preferências |
| `@radix-ui/react-select` | `2.2.6` | Filtros/selects |

## Frontend candidatos de formulário

Instalar somente na `TASK-02` ou em task que realmente precise do campo.

| Pacote | Versão verificada | Quando usar |
|---|---:|---|
| `react-imask` | `7.6.1` | Máscaras de CPF, CNPJ, CEP, telefone e campos com formatação progressiva. |
| `react-number-format` | `5.4.5` | Moeda, percentual e número formatado quando o controller precisar preservar UX e valor normalizado. |
| `cpf-cnpj-validator` | `2.1.2` | Validação local de CPF/CNPJ quando Zod + regex não forem suficientes. |
| `libphonenumber-js` | `1.13.4` | Validação client-side de telefone quando o fluxo exigir precisão antes do submit. |

## TanStack candidatos

| Pacote | Versão verificada | Decisão |
|---|---:|---|
| `@tanstack/react-query-devtools` | `5.101.0` | Candidato dev-only para depuração de cache/query/mutation. |
| `@tanstack/eslint-plugin-query` | `5.101.0` | Candidato dev-only para reforçar boas práticas de Query. |
| `@tanstack/react-table` | `8.21.3` | Candidato para tabelas/datagirds complexos; não usar para cards simples. |
| `@tanstack/react-virtual` | `3.14.2` | Candidato para listas longas, feeds e selects infinitos com performance. |
| `@tanstack/react-form` | `1.33.0` | Avaliado; não instalar agora por conflito com a fundação React Hook Form. |
| `@tanstack/react-router` | `1.170.11` | Avaliado; não instalar porque Next App Router já é a arquitetura de rotas. |
| `nuqs` | `2.8.9` | Candidato não-TanStack para filtros/search params tipados no Next App Router. |

## Backend já instalado

| Pacote | Versão instalada | Última verificada | Uso |
|---|---:|---:|---|
| `express` | `^5.2.1` | `5.2.1` | API HTTP |
| `prisma` | `^7.8.0` | `7.8.0` | ORM CLI |
| `@prisma/client` | `^7.8.0` | `7.8.0` | ORM client |
| `@prisma/adapter-pg` | `^7.8.0` | `7.8.0` | Adapter PostgreSQL |
| `pg` | `^8.21.0` | `8.21.0` | PostgreSQL driver |
| `passport` | `^0.7.0` | `0.7.0` | Auth strategies |
| `passport-jwt` | `^4.0.1` | `4.0.1` | JWT auth |
| `passport-google-oauth20` | `^2.0.0` | `2.0.0` | Google OAuth |
| `jsonwebtoken` | `^9.0.3` | `9.0.3` | JWT |
| `argon2` | `^0.44.0` | `0.44.0` | Hash senha |
| `bcrypt` | `^6.0.0` | `6.0.0` | Compat senha |
| `zod` | `^4.4.3` | `4.4.3` | Validation |
| `i18next` | `^26.3.0` | `26.3.0` | i18n |
| `nodemailer` | `^8.0.10` | `8.0.10` | E-mail |
| `twilio` | `^6.0.2` | `6.0.2` | SMS/WhatsApp candidato |
| `web-push` | `^3.6.7` | `3.6.7` | Push web |
| `socket.io` | `^4.8.3` | `4.8.3` | Tempo real |
| `helmet` | `^8.2.0` | `8.2.0` | Segurança HTTP |
| `cors` | `^2.8.6` | `2.8.6` | CORS |
| `cookie-parser` | `^1.4.7` | `1.4.7` | Cookies |
| `express-session` | `^1.19.0` | `1.19.0` | Sessão OAuth |
| `multer` | `^2.1.1` | `2.1.1` | Upload |
| `@aws-sdk/client-s3` | `^3.1059.0` | `3.1060.0` | S3/storage |
| `date-fns` | `^4.4.0` | `4.4.0` | Datas |
| `@paralleldrive/cuid2` | `^3.3.0` | `3.3.0` | IDs |
| `@scalar/express-api-reference` | `^0.9.20` | `0.9.20` | API docs |
| `swagger-ui-express` | `^5.0.1` | `5.0.1` | Swagger UI |
| `libphonenumber-js` | `^1.13.4` | `1.13.4` | Telefone |

## Candidatos condicionais

| Pacote | Versão verificada | Condição |
|---|---:|---|
| `stripe` | `22.2.0` | Se TASK-03 escolher Stripe |
| `mercadopago` | `3.1.0` | Se TASK-03 escolher Mercado Pago |
| `asaas` | `1.1.0` | Se TASK-03 escolher Asaas e pacote for suficiente |
| `@aws-sdk/s3-request-presigner` | `3.1060.0` | URLs assinadas S3 |
| `@sentry/nextjs` | `10.56.0` | Observabilidade frontend |
| `@sentry/node` | `10.56.0` | Observabilidade backend |

## Testes e qualidade candidatos

Atualmente o projeto valida com Biome, ESLint e TypeScript. Para uma suíte automatizada futura:

| Pacote | Versão verificada | Uso |
|---|---:|---|
| `vitest` | `4.1.8` | Testes unitários |
| `@vitest/coverage-v8` | `4.1.8` | Coverage |
| `@testing-library/react` | `16.3.2` | Teste de componentes |
| `@testing-library/jest-dom` | `6.9.1` | Matchers DOM |
| `@playwright/test` | `1.60.0` | E2E/browser |
| `supertest` | `7.2.2` | Testes HTTP backend |
| `@types/supertest` | `7.2.0` | Tipos |

Adicionar esses pacotes somente em task de qualidade/testes ou quando uma task exigir cobertura automatizada.
