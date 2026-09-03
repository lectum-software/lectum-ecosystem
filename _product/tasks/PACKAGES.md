# Packages e Política de Dependências

Última auditoria dos manifests/lockfiles: **2026-08-29**, com `pnpm audit --prod` separado na raiz, backend, frontend e admin.
Resultado: **zero vulnerabilidades conhecidas** nos quatro escopos. React Hook Form permanece como
padrão de formulários; TanStack Query permanece como padrão de server state.

## Política

- Usar `pnpm`.
- Não instalar pacote novo sem necessidade explícita da task.
- Preferir pacotes já instalados e padrões locais.
- Registrar em ADR quando uma task adicionar dependência.
- Para integrações externas, escolher provedor na TASK-03 antes de instalar SDK definitivo.
- Manter frontend e backend com dependências separadas.
- Manter também o `admin/` como aplicação e lockfile separados; compartilhar decisões e contratos, não instalação/runtime.
- Não trocar Next App Router por TanStack Router neste projeto.
- Não trocar React Hook Form por TanStack Form sem ADR forte; a fundação de forms deve seguir `TASK-02`.
- Pacotes TanStack adicionais devem ser adotados por problema concreto: tabela, virtualização, lint/devtools ou server state.

## Frontend já instalado

| Pacote | Versão instalada | Última verificada | Uso |
|---|---:|---:|---|
| `next` | `16.2.11` | `16.2.11` | App Router, SSR, build |
| `react` | `19.2.4` | `19.2.7` | UI |
| `react-dom` | `19.2.4` | `19.2.7` | UI |
| `tailwindcss` | `^4` | `4.3.0` | Estilo |
| `@tailwindcss/postcss` | `^4` | `4.3.0` | PostCSS |
| `@tanstack/react-query` | `^5.101.0` | `5.101.0` | Server state |
| `tus-js-client` | `^4.3.1` | `4.3.1` | Upload resumível direto ao Cloudflare Stream, sem transportar vídeo pelo Next/Express (TASK-163) |
| `hls.js` | `1.7.2` | `1.7.2` | Reprodução HLS adaptativa no frontend e admin em browsers MSE; Safari usa HLS nativo (TASK-163) |
| `axios` | `^1.19.0` | `1.19.0` | HTTP client |
| `react-hook-form` | `^7.77.0` | `7.77.0` | Formulários |
| `@hookform/resolvers` | `^5.4.0` | `5.4.0` | Zod resolver |
| `zod` | `^4.4.3` | `4.4.3` | Schema validation |
| `mediabunny` | `^1.55.1` | `1.55.1` | Leitura e otimização client-side best effort de vídeos públicos em Web Worker (TASK-158/TASK-159) |
| `@mediabunny/aac-encoder` | `^1.55.1` | `1.55.1` | Fallback AAC carregado no worker somente quando o navegador não oferece encoder nativo (TASK-158/TASK-159) |
| `@mercadopago/sdk-react` | `^1.0.7` | `1.0.7` | Checkout Bricks/Card Payment Brick |
| `@reduxjs/toolkit` | `^2.12.0` | `2.12.0` | Client state |
| `react-redux` | `^9.3.0` | `9.3.0` | Redux bindings |
| `js-cookie` | `^3.0.8` | `3.0.8` | Cookies |
| `socket.io-client` | `^4.8.3` | `4.8.3` | Tempo real |
| `lucide-react` | `^1.17.0` | `1.17.0` | Ícones |
| `sonner` | `^2.0.7` | `2.0.7` | Toasts |
| `next-themes` | `^0.4.6` | `0.4.6` | Tema claro/escuro |
| `nprogress` | `^0.2.0` | `0.2.0` | Loading route progress |
| `@fingerprintjs/fingerprintjs` | `^5.2.0` | `5.2.0` | Device id |
| `@sentry/nextjs` | `10.70.0` | `10.70.0` | Captura de erros client/server/edge e upload condicional de source maps |
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

`redux-persist` foi removido na auditoria de produção de 07/08/2026. Estado de usuário fica em
memória e é reidratado pela API; JWTs ficam em cookies `HttpOnly`, não em storage JavaScript.

## Configuração frontend sem package novo

- `next/image` não deve permitir `hostname: "**"`.
- Hosts remotos devem ser explícitos em `frontend/next.config.ts`.
- Para CDNs/R2 públicos adicionais, usar `NEXT_PUBLIC_IMAGE_REMOTE_HOSTS` no frontend, separado por vírgula, mantendo `NEXT_PUBLIC_API_URL`, `localhost`, `127.0.0.1` e `lh3.googleusercontent.com` como fontes explícitas.
- Qualquer inclusão de novo host de imagem precisa ser justificada pela task e validada com `pnpm --dir frontend build`.

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
| `prisma` | `^7.9.1` | `7.9.1` | ORM CLI |
| `@prisma/client` | `^7.9.1` | `7.9.1` | ORM client |
| `@prisma/adapter-pg` | `^7.9.1` | `7.9.1` | Adapter PostgreSQL |
| `pg` | `^8.21.0` | `8.21.0` | PostgreSQL driver |
| `passport` | `^0.7.0` | `0.7.0` | Auth strategies |
| `passport-jwt` | `^4.0.1` | `4.0.1` | JWT auth |
| `passport-google-oauth20` | `^2.0.0` | `2.0.0` | Google OAuth |
| `jsonwebtoken` | `^9.0.3` | `9.0.3` | JWT |
| `argon2` | `^0.44.0` | `0.44.0` | Hash senha |
| `bcrypt` | `^6.0.0` | `6.0.0` | Compat senha |
| `zod` | `^4.4.3` | `4.4.3` | Validation |
| `i18next` | `^26.3.0` | `26.3.0` | i18n |
| `nodemailer` | `^9.0.5` | `9.0.5` | E-mail transacional via Resend SMTP |
| `twilio` | `^6.0.2` | `6.0.2` | SMS/OTP para verificação de telefone/WhatsApp |
| `web-push` | `^3.6.7` | `3.6.7` | Push web |
| `socket.io` | `^4.8.3` | `4.8.3` | Tempo real |
| `helmet` | `^8.2.0` | `8.2.0` | Segurança HTTP |
| `cors` | `^2.8.6` | `2.8.6` | CORS |
| `cookie-parser` | `^1.4.7` | `1.4.7` | Cookies |
| `multer` | `^2.2.0` | `2.2.0` | Upload |
| `@aws-sdk/client-s3` | `^3.1059.0` | `3.1060.0` | Cloudflare R2 via API S3-compatible |
| `mercadopago` | `^3.1.0` | `3.1.0` | Gateway Mercado Pago via adapter backend |
| `date-fns` | `^4.4.0` | `4.4.0` | Datas |
| `@paralleldrive/cuid2` | `^3.3.0` | `3.3.0` | IDs |
| `@scalar/express-api-reference` | `^0.9.20` | `0.9.20` | API docs |
| `swagger-ui-express` | `^5.0.1` | `5.0.1` | Swagger UI |
| `libphonenumber-js` | `^1.13.4` | `1.13.4` | Telefone |
| `dotenv` | `^17.4.2` | `17.4.2` | Carregamento de env no processo backend |
| `uuid` | `^14.0.0` | `14.0.0` | Identificadores de correlação |
| `@sentry/node` | `10.70.0` | `10.70.0` | Captura sanitizada de falhas operacionais e Express 5 |
| `playwright-core` | `1.60.0` | `1.60.0` | Acionamento programático do Chromium do sistema no backend para POC de renderização social (TASK-42) |
| `mediabunny` | `1.55.1` | `1.55.1` | Bundle browser servido em origem local ao Chromium backend para exportar MP4 fast-start experimental (TASK-42) |
| `@mediabunny/aac-encoder` | `1.55.1` | `1.55.1` | Encoder AAC auxiliar dentro do Chromium backend; não adota `@mediabunny/server`/NodeAV nesta POC (TASK-42) |

O OAuth Google usa `state` autenticado e criptografado, com nonce curto `HttpOnly`; `express-session` foi removido por não ser necessário para esse fluxo. O verificador mantém transição temporária para states assinados pela versão anterior durante o rollout.
Para a POC Chromium + MediaBunny da TASK-42, o backend usa `playwright-core` sem download de browser e instala o pacote Debian `chromium` no Docker runner. A escolha evita `@mediabunny/server`/NodeAV e mantém FFmpeg fora do runtime.

## Admin já instalado

| Pacote | Versão instalada | Última verificada | Uso |
|---|---:|---:|---|
| `next` | `16.2.11` | `16.2.11` | App Router e build do painel separado |
| `react` / `react-dom` | `19.2.4` | `19.2.4` | UI |
| `tailwindcss` | `^4` | `4.x` | Estilo |
| `@tanstack/react-query` | `^5.101.0` | `5.101.0` | Server state |
| `axios` | `^1.19.0` | `1.19.0` | HTTP client |
| `react-hook-form` + `@hookform/resolvers` | `^7.77.0` / `^5.4.0` | manifests atuais | Formulários |
| `zod` | `^4.4.3` | `4.4.3` | Validação |
| `sonner` | `^2.0.7` | `2.0.7` | Feedback não técnico |
| `@fingerprintjs/fingerprintjs` | `^5.2.0` | `5.2.0` | Identificação do dispositivo admin |
| `@sentry/nextjs` | `10.70.0` | `10.70.0` | Captura de erros client/server/edge e upload condicional de source maps |
| `lucide-react` | `^1.17.0` | `1.17.0` | Ícones |

## Candidatos condicionais

| Pacote | Versão verificada | Condição |
|---|---:|---|
| `stripe` | `22.2.0` | Não escolhido. Manter como referência caso troque de gateway (novo adapter). |
| `asaas` | `1.1.0` | Não escolhido. |
| `@aws-sdk/s3-request-presigner` | `3.1060.0` | URLs assinadas S3 |

## Overrides transitivos de segurança

Aplicados no manifest de cada aplicação porque raiz, frontend, backend e admin têm instalações separadas. O `pnpm-workspace.yaml` raiz foi removido para não transformar o repositório em monorepo operacional nem invalidar overrides por aplicação.

O postinstall oficial de `@sentry/cli` é permitido apenas nos manifests Next (`frontend/` e
`admin/`) por `pnpm.onlyBuiltDependencies`. A lista preserva também `sharp` e `unrs-resolver`, já
autorizados pelo `pnpm-workspace.yaml` de cada app. O binário Sentry é usado no build para publicar
source maps quando as credenciais de CI estiverem presentes; não roda como serviço da aplicação e
não recebe credenciais no bundle.

| Aplicação | Override | Motivo |
|---|---:|---|
| Frontend | `ws@8.21.0` | Corrige advisory de DoS transitivo em `socket.io-client > engine.io-client > ws`. |
| Frontend | `form-data@4.0.6`, `brace-expansion@5.0.9` | Corrige advisories transitivos em `axios > form-data` e no tooling Sentry. |
| Frontend | `postcss@8.5.26` | Mantém a correção de advisories transitivos do pipeline CSS/Next. |
| Frontend | `sharp@0.35.3`, `socket.io-parser@4.2.7`, `nanoid@3.3.17` | Correções transitivas preservando as majors exigidas pela aplicação. |
| Backend | `ws@8.21.0` | Corrige advisory de DoS transitivo em `socket.io > engine.io > ws`. |
| Backend | `form-data@4.0.6` | Corrige advisory de CRLF injection transitivo em `twilio > axios > form-data`. |
| Backend | `hono@4.12.34`, `@hono/node-server@2.0.5` | Corrige advisories transitivos do tooling Prisma. |
| Backend | `deepmerge-ts@8.0.0` | Corrige CVE-2026-40345 em `prisma > @prisma/config`; o CLI/config foi revalidado sem alterar banco. |
| Frontend | `browserslist@4.28.7`, `fast-uri@3.1.6` | Corrige advisories transitivos do pipeline Sentry/Babel/webpack. |
| Backend | `axios@1.19.0`, `body-parser@2.3.0`, `brace-expansion@5.0.9`, `fast-uri@3.1.6`, `mysql2@3.23.1`, `nanoid@5.1.16`, `qs@6.16.0`, `socket.io-parser@4.2.7`, `valibot@1.4.2` | Patches transitivos fixados após auditoria; `mysql2` permanece apenas dependência transitiva do CLI Prisma, não datasource da aplicação. |
| Admin | `form-data@4.0.6`, `brace-expansion@5.0.9`, `browserslist@4.28.7`, `fast-uri@3.1.6`, `postcss@8.5.26`, `sharp@0.35.3`, `ws@8.21.0`, `nanoid@3.3.17` | Patches transitivos equivalentes ao frontend. |
| Raiz | `fast-uri@3.1.6`, `js-yaml@4.3.1` | Correções transitivas das ferramentas de commit/hook. |

Validação obrigatória após alteração de dependências de produção: `pnpm audit --prod`, `pnpm --dir frontend audit --prod`, `pnpm --dir backend audit --prod`, `pnpm --dir admin audit --prod`, `pnpm check` e os três builds.

## Testes e qualidade candidatos

Atualmente o backend também possui testes unitários com o test runner nativo do Node + `tsx`, sem framework adicional. Frontend/admin validam Biome sem warnings, ESLint com `--max-warnings=0` e TypeScript. Para uma suíte automatizada futura:

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

## Decisao InfoSimples (TASK-10)

- Nao instalar `infosimples-sdk` por padrao. A integracao CFP/CRP deve usar HTTP nativo do backend em adapter isolado, apos confirmar o endpoint/payload na documentacao autenticada da InfoSimples.
- `DOCUMENT_TOKEN` e segredo backend-only; nunca expor ao frontend, logs ou commits.
- Qualquer adocao futura de SDK da InfoSimples exige nova validacao deste arquivo e ADR especifico.
