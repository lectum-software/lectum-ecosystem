# ADR-0288: Conectividade do login Admin em desenvolvimento local

## Status

Accepted

## Task relacionada

TASK-46 / correção operacional do Admin

## Contexto

O login do Admin em `http://localhost:3002/login` exibiu o erro genérico
"Não foi possível conectar ao backend". O diagnóstico local confirmou que o
bundle do Admin apontava corretamente para `http://localhost:3001`, mas não
havia listener ativo do backend nessa porta no momento do submit.

O histórico de execução local também mostrava o `tsx watch` do backend
reiniciando repetidamente quando `prisma generate` atualizava arquivos em
`src/external/generated/prisma`. Esses arquivos são artefatos gerados e não
devem derrubar o servidor de desenvolvimento durante checks/builds.

## Decisão

- Manter o Admin consumindo a API real do backend; não foi criado mock,
  fallback local nem endpoint simulado.
- Normalizar e exportar a URL efetiva da API Admin no client para que erros de
  rede mostrem o destino real configurado.
- Tornar o erro de conexão do login acionável, citando a URL da API e a
  necessidade de manter o backend rodando/configurar `NEXT_PUBLIC_API_URL`.
- Ajustar o script `backend dev` para excluir
  `src/external/generated/prisma/**` do watcher e preservar a saída do terminal
  com `--clear-screen=false`, reduzindo reinícios silenciosos durante geração do
  Prisma Client.

## Consequências

- O Admin continua falhando de forma honesta se o backend real estiver offline,
  mas a mensagem passa a indicar a causa operacional mais provável.
- O servidor backend local fica mais estável durante validações que executam
  `prisma generate`.
- Mudanças reais de código backend continuam reiniciando o watcher; apenas
  artefatos Prisma gerados são ignorados.
- Não há alteração de contrato de API, schema, migration ou dependência.

## Validação

- `GET http://localhost:3001/health` respondeu `200` após subir o backend real.
- Login admin real via `POST /api/admin/public/auth/login` respondeu
  `admin_auth_success` usando administrador temporário de smoke removido ao
  final da validação.
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`

## Pendências

- Nenhuma pendência externa.
