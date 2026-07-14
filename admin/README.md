# Lectum Admin

Aplicação administrativa separada do `frontend/`, criada na TASK-46 para consumir apenas APIs reais do `backend/`.

## Desenvolvimento local

1. Garanta que o backend esteja rodando em `http://localhost:3001` e que `WEB_URL` inclua `http://localhost:3002`.
2. Configure `admin/.env.local` a partir de `admin/.env.example`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

3. Crie um administrador real no backend quando necessário:

```bash
$env:ADMIN_BOOTSTRAP_PASSWORD="uma-senha-segura"
pnpm --dir backend admin:bootstrap -- --email admin@lectum.local --name "Admin Lectum" --password-env ADMIN_BOOTSTRAP_PASSWORD
```

4. Rode o painel em uma porta própria:

```bash
pnpm --dir admin dev
```

URL local: `http://localhost:3002`.

Também é possível subir backend, frontend e Admin juntos pela raiz:

```bash
pnpm dev
```

Nesse modo, `ADMIN_PORT` controla a porta do Admin e o padrão continua sendo `3002`.

## Observações

- O token e o storage do Admin usam o prefixo `lectum.admin.*`, separado do site/app principal.
- O app não importa código do `frontend/` em runtime. Fundações mínimas de API, formulário e shell foram adaptadas localmente para preservar a separação entre aplicações.
- As telas internas fora do shell exibem placeholders honestos até as tasks específicas de métricas e conteúdo real.
