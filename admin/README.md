# Lectum Admin

Aplicação administrativa separada do `frontend/`, criada na TASK-46 para consumir apenas APIs reais do `backend/`.

## Desenvolvimento local

1. Garanta que o backend esteja rodando em `http://localhost:3001` e que `WEB_URL` inclua `http://localhost:3002`.
2. Configure `admin/.env.local` a partir de `admin/.env.example`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

3. Crie um administrador real somente no banco local de desenvolvimento, quando necessário.
   Nunca execute este comando apontando para homologação ou produção. Configure
   `ADMIN_BOOTSTRAP_PASSWORD` no terminal ou no gerenciador de segredos local, sem registrar o
   valor no repositório ou no histórico do shell, e então rode:

```bash
pnpm --dir backend admin:bootstrap -- --email admin@lectum.local --name "Admin Lectum" --password-env ADMIN_BOOTSTRAP_PASSWORD
```

4. Rode o painel em uma porta própria:

```bash
pnpm --dir admin dev
```

URL local: `http://localhost:3002`.

Se o login exibir erro de conexão com o backend, valide primeiro:

```bash
curl http://localhost:3001/health
```

Sem resposta `200`, suba ou reinicie o backend real com `pnpm --dir backend dev`;
se a API estiver em outra porta/origem, ajuste `NEXT_PUBLIC_API_URL`.

Também é possível subir backend, frontend e Admin juntos pela raiz:

```bash
pnpm dev
```

Nesse modo, `ADMIN_PORT` controla a porta do Admin e o padrão continua sendo `3002`.

## Observações

- A sessão autenticada do Admin usa o cookie seguro emitido pela API como mecanismo principal. O
  token legado, quando ainda recebido durante a transição, fica apenas em memória ou
  `sessionStorage`; JWT e dados do administrador não são gravados em `localStorage`.
- Preferências locais e o marcador não sensível de navegação usam o prefixo `lectum.admin.*`,
  separado do site/app principal. A API continua sendo a autoridade de autorização.
- O app não importa código do `frontend/` em runtime. Fundações mínimas de API, formulário e shell foram adaptadas localmente para preservar a separação entre aplicações.
- Todas as telas administrativas consomem endpoints reais; não use mocks para substituir requisitos
  externos ausentes.
- A branch `homolog` publica automaticamente em homologação. A `main` publica em produção e só deve
  receber promoção revisada depois do smoke test em homologação.
