# ADR-0423: Hardening de code review pré-produção

## Status

Accepted

## Data

2026-06-30

## Contexto

Durante a revisão técnica pré-produção foi identificado que a aplicação havia sido evoluída por múltiplas execuções de IA e usuário não-dev. O objetivo desta rodada foi reduzir riscos críticos antes de produção sem recriar a arquitetura nem introduzir mocks.

Os principais riscos encontrados foram:

- hashes/campos sensíveis de usuário podiam trafegar em respostas e persistir em Redux Persist/localStorage;
- logs de criação de usuário podiam armazenar payloads com campos sensíveis;
- `JWT_SECRET_KEY` tinha fallback inseguro em alguns fluxos;
- `getLimiter` era um stub e não aplicava rate limit real;
- `helmet` estava instalado mas não aplicado no Express;
- rotas pessoais do frontend estavam liberadas como públicas no `proxy.ts`;
- `GET /api/public/user` expunha e-mails/status de usuários;
- `handleReq` usava assinaturas incorretas de Axios para GET/DELETE;
- `trust proxy` aceitava todos os proxies, permitindo spoof de IP em ambientes diretos;
- `next/image` permitia qualquer host HTTPS (`hostname: "**"`);
- geração Swagger/Scalar emitia erros no boot ao encontrar pastas auxiliares e validators nomeados;
- handler genérico podia devolver mensagens internas de erros 5xx;
- `pnpm audit --prod` reportava vulnerabilidades transitivas e diretas em frontend/backend;
- o `pnpm-workspace.yaml` raiz fazia o PNPM tratar o repositório local como workspace raiz, invalidando overrides por aplicação e contrariando a separação operacional entre frontend e backend.

## Decisão

1. Sanitizar respostas HTTP do backend centralmente em `send`, removendo chaves sensíveis como `password`, `password_confirm`, `recovery_code`, `confirm_code`, `gateway_token`, `code_hash`, segredos e API keys.
2. Sanitizar logs de criação de usuário com remoção adicional de tokens de autenticação.
3. Sanitizar defensivamente o usuário antes de persistir no Redux/localStorage do frontend.
4. Criar `getJwtSecret` e remover fallback `development-secret` de JWT/sessão/OAuth/socket/analytics.
5. Exigir `JWT_SECRET_KEY` mínimo de 32 caracteres no schema de ambiente do backend.
6. Aplicar `helmet` no Express e manter `crossOriginResourcePolicy: cross-origin` para não quebrar assets públicos/Scalar.
7. Substituir o stub de rate limit por limiter in-memory por IP, com mesma semântica do sample (`window` em minutos e `max` por janela), sem adicionar package novo.
8. Corrigir middleware de upload para não chamar `next(err)` depois de enviar resposta 400.
9. Reduzir `GET /api/public/user` a dados públicos mínimos (`id`, `name`, `avatar`, `role`, `createdAt`) e endurecer paginação.
10. Proteger no `proxy.ts` rotas pessoais (`/app/favorites`, `/app/notifications`, `/app/profile`) e rotas de escrita da comunidade (`suggest`, `post/new`, `post/success`).
11. Corrigir `handleReq` para usar `api.request`, respeitando `method`, `data` e `config`.
12. Atualizar dependências diretas vulneráveis (`next`, `axios`, `multer`, `nodemailer`, `@types/nodemailer`) e aplicar overrides transitivos por aplicação (`ws`, `form-data`, `postcss`, `hono`, `@hono/node-server`).
13. Remover o `pnpm-workspace.yaml` raiz para preservar frontend/backend como aplicações separadas e permitir overrides válidos em cada package.
14. Tornar `trust proxy` configurável via `TRUST_PROXY`, com padrão fechado para acesso direto.
15. Remover wildcard de hosts remotos em `next/image`; novos hosts devem ser declarados em `NEXT_PUBLIC_IMAGE_REMOTE_HOSTS`.
16. Endurecer Nodemailer com TLS mínimo 1.2 e logs sem payload completo.
17. Corrigir geração Swagger/Scalar para ignorar pastas auxiliares sem rota e aceitar validators nomeados.
18. Impedir que respostas 5xx devolvam mensagens internas ao cliente.

## Consequências

- `pnpm --dir frontend audit --prod` e `pnpm --dir backend audit --prod` passam sem vulnerabilidades conhecidas no momento da revisão.
- Respostas e stores deixam de carregar hashes/códigos/tokens de gateway mesmo que repositórios Prisma retornem modelos completos.
- Deploys sem `JWT_SECRET_KEY` forte falham cedo em vez de operar com segredo previsível.
- Rate limiting passa a existir sem dependência nova; em deploy multi-instância será necessário avaliar store distribuído em task operacional futura.
- Deploy atrás de proxy/load balancer deve definir `TRUST_PROXY=1` ou valor equivalente ao número de hops confiáveis.
- Novos domínios de imagens externas exigem configuração explícita em env, evitando SSRF/superfície ampla no otimizador de imagens do Next.
- O contrato público de `/api/public/user` fica mais restrito; se alguma tela depender de e-mail/status públicos, ela deve migrar para endpoint privado adequado.
- Remover o workspace raiz reduz warnings e reforça que frontend/backend têm lockfiles, overrides e installs separados.

## Validação

- `pnpm --dir frontend audit --prod`
- `pnpm --dir backend audit --prod`
- `pnpm check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm --dir backend exec prisma migrate status`
- `pnpm dev` com smoke em `GET /health` e `HEAD /auth/login`
