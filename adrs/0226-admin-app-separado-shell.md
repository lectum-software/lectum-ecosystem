# ADR-0226: App Admin separado com shell lateral próprio

## Status

Accepted

## Contexto

A TASK-46 inicia o painel administrativo da Lectum como um ambiente exclusivo para administradores. O produto exige que o Admin não seja apenas uma área do site principal: em produção, deve poder ser publicado em domínio próprio e consumir somente APIs reais do backend.

A referência visual ativa para esta etapa foi `_product/proto/admin/Dashboard.png`. O Builder/Quick Copy ativo do projeto não estava disponível no conjunto de ferramentas deste ambiente, então a implementação usou a imagem local exportada e registrou essa limitação.

## Decisão

- Criar uma aplicação Next.js independente em `admin/`, com `package.json`, lockfile, scripts e configuração próprios.
- Rodar o Admin localmente em `http://localhost:3002`, mantendo o site principal em `http://localhost:3000` e o backend em `http://localhost:3001`.
- Manter o app Admin sem imports runtime de `frontend/`; apenas ativos de marca foram copiados para `admin/public`.
- Adaptar localmente uma fundação mínima de API, sessão e formulário alinhada à TASK-02:
  - React Hook Form + Zod;
  - controllers locais;
  - slots de erro com altura fixa;
  - campos em largura total.
- Usar os endpoints reais da TASK-45:
  - `POST /api/admin/public/auth/login`;
  - `GET /api/admin/private/auth/hidrate`;
  - `POST /api/admin/private/auth/logout`.
- Armazenar sessão administrativa com prefixo `lectum.admin.*`, separado do storage/cookie do frontend de pacientes/psicólogos.
- Enviar `x-device` no client Admin com fingerprint local prefixado por `admin-` e fallback persistido em `lectum.admin.device`.
- Permitir explicitamente `Accept-Language` no CORS do backend, pois o Admin envia esse header
  nas chamadas cross-origin `localhost:3002 -> localhost:3001` para manter mensagens PT-BR sem
  transformar falha de preflight em erro genérico de conexão no navegador.
- Entregar shell mobile-first com sidebar escura, drawer em telas pequenas, recolher/expandir no desktop e placeholders honestos sem métricas fake até as tasks específicas.

## Consequências

- O Admin pode evoluir e ser publicado separadamente, sem acoplar rotas, providers ou sessão ao app principal.
- Existe duplicação controlada de pequenas fundações de API/formulário no `admin/`, justificada pela separação obrigatória entre aplicações.
- As próximas telas administrativas podem reutilizar o shell e a autenticação já criados, conectando dados reais nas tasks de cada domínio.
- Como não há mocks, o teste completo de login exige um administrador real criado via `pnpm --dir backend admin:bootstrap`.
- O contrato CORS local/produção precisa acompanhar os headers usados pelos clients separados; caso contrário, o browser bloqueia a request antes de o backend retornar erros reais de autenticação.

## Validação

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local em `http://localhost:3002/login` e `http://localhost:3002/dashboard`
- Smoke API real com administrador temporário:
  - bootstrap;
  - login;
  - hydrate;
  - logout;
  - remoção do administrador temporário ao final.
