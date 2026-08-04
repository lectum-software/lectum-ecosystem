# ADR-0415: Dockerfile de produção para o backend

## Status

Accepted

## Data

2026-08-04

## Contexto

O backend Lectum usa Express 5, Prisma 7 com client gerado em `src/external/generated/prisma`, dependências nativas (`bcrypt`, `argon2`) e assets de runtime em `locales/`, `public/`, `templates/` e `swagger/`.

Era necessário criar uma imagem Docker capaz de buildar o backend de forma reprodutível sem transformar o repositório em monorepo operacional e sem depender das envs reais de produção durante o build.

## Decisão

- Criar `backend/Dockerfile` multi-stage usando `node:22-bookworm-slim` e `pnpm@10.33.0` via Corepack.
- Usar `backend/` como contexto de build (`docker build -t lectum-backend ./backend`).
- Instalar dependências completas no estágio `deps`, buildar no estágio `builder` e rodar com dependências podadas para produção no estágio `runner`.
- Usar uma `DATABASE_URL` dummy apenas no build para permitir `prisma generate`; a `DATABASE_URL` real continua obrigatória em runtime.
- Copiar para runtime apenas `dist/`, `node_modules` de produção e assets necessários (`locales/`, `prisma/`, `public/`, `swagger/`, `templates/`).
- Rodar o processo como usuário não-root `node`.
- Definir `SWAGGER=false` por padrão na imagem, permitindo habilitar via env quando necessário.
- Ajustar a geração de docs para usar `dist/modules` em runtime de produção, evitando dependência da árvore TypeScript `src/` dentro da imagem.

## Consequências

- A imagem pode ser construída sem credenciais reais de banco.
- O container exige envs reais em runtime, especialmente `DATABASE_URL`, `JWT_SECRET_KEY`, `ADMIN_JWT_SECRET`, `BASE`, `WEB_URL` e as envs de Google OAuth atualmente necessárias no boot (`GOOGLE_CLIENT_ID_API_USER`, `GOOGLE_CLIENT_SECRET_API_USER`, `CALLBACK_URL_API_USER`).
- Dependências nativas são compiladas/instaladas em imagem Debian slim compatível com o runtime.
- A documentação Swagger/Scalar permanece desativada por padrão na imagem para reduzir superfície pública; se habilitada, passa a funcionar a partir dos arquivos compilados em `dist/`.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `docker build -t lectum-backend:local ./backend`
- Smoke local do container com `GET /health`
