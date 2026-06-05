# ADR-0018: Shell privado mobile-first e navegação por papel

## Status

Accepted

## Task relacionada

TASK-12: Shell privado mobile.

## Contexto

As primeiras rotas privadas já existiam em caminhos transitórios como `/dashboard`,
`/patient/welcome` e `/app/professional/billing/plans`. A TASK-12 define `/app` como prefixo
canônico para telas internas e exige que o shell compartilhe header, container responsivo,
navegação inferior e estados de sessão sem recriar layout por página.

As referências visuais consultadas foram as imagens locais:

- `_product/proto/Psicólogos.jpg`;
- `_product/proto/Feed Comunidade.jpg`;
- `_product/proto/Notificações.jpg`;
- `_product/proto/Perfil do paciente.jpg`;
- `_product/proto/Perfil - Psicólogo.jpg`.

Builder/Quick Copy não estava disponível como ferramenta direta nesta sessão, então foi usado o
fallback auditável das imagens exportadas.

## Decisão

- O prefixo privado canônico do frontend passa a ser `/app`.
- `frontend/src/templates/private` centraliza:
  - header sticky mobile-first;
  - container responsivo;
  - estado inicial de sessão;
  - erro de sessão em PT-BR;
  - bottom nav fixa com ícones `lucide-react`;
  - ramificação da navegação a partir de `user.role`.
- O shell lê a sessão real por `GET /api/private/auth/hidrate` e atualiza a store persistida com o
  `user` retornado, sem criar endpoint `/me`.
- As rotas base criadas ou ajustadas são:
  - `/app`;
  - `/app/psychologists`;
  - `/app/community`;
  - `/app/notifications`;
  - `/app/profile`;
  - `/app/favorites`, adicionada para não deixar o item obrigatório da navegação inferior sem rota.
- Rotas sem API real nesta task exibem estado vazio honesto e não usam mock, seed ou dado fake.
- A conclusão do onboarding do paciente passa a redirecionar para `/app`, não mais para
  `/dashboard`.
- O backend mantém `requireRole(...)` como fronteira de segurança fail-closed e consolida os mounts
  de namespaces role-only em `write.ts`:
  - `/api/private/patient/*` com `_auth` + `requireRole("paciente")`;
  - `/api/private/psychologist/*` com `_auth` + `requireRole("psicologo")`.
- O boot do backend valida os mounts registrados e falha se uma rota sob esses namespaces for
  registrada sem o papel esperado.
- O frontend pode esconder/mostrar atalhos por papel, mas a autorização real continua no backend.

## Consequências

- Tasks futuras de descoberta, comunidade, perfil e conta podem reaproveitar `PrivateTemplate` em
  vez de recriar header/bottom nav.
- `/dashboard` permanece apenas como rota transitória legada; novos destinos privados devem usar
  `/app`.
- A navegação para áreas ainda não implementadas fica disponível com estados vazios, sem falsa
  conclusão de listagens ou feeds.
- O shell depende da sessão hidratada real; se a API privada estiver indisponível sem usuário
  persistido, o usuário vê erro de sessão em PT-BR.
- Tokens de papel divergente seguem bloqueados pelo servidor, independentemente da navegação
  exibida no cliente.

## Validações

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Smoke real de autorização:
  - paciente em `/api/private/psychologist/billing/plans` retornou `403`;
  - psicólogo em `/api/private/patient/profile` retornou `403`.
- Browser local headless em `390x844` validou `/app/profile` com cookie real, sessão hidratada,
  header e bottom nav. Usuários temporários de smoke foram removidos do banco.
