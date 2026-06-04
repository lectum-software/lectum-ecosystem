# ADR-0010: Fluxo frontend de recuperacao de senha

## Status

Accepted

## Task relacionada

TASK-05: Recuperacao de senha.

## Contexto

O backend ja possui o fluxo real de recuperacao por link:

- `POST /api/public/auth/recovery`;
- `POST /api/public/auth/reset/:code`.

A task exige que o frontend consuma esses endpoints sem criar auth paralelo, preserve
anti-enumeracao no envio do link e alinhe a rota do link com `RECOVERY_URL`. As
referencias visuais ativas foram consultadas pelas imagens locais exportadas em
`_product/proto`, porque o Builder/Quick Copy nao esta exposto como ferramenta MCP
direta nesta sessao.

## Decisao

- `/auth/recovery` implementa a tela de e-mail e o estado "Link enviado!" na mesma
  rota, chamando `POST /api/public/auth/recovery`.
- `/auth/reset-password` le `?code=` e chama `POST /api/public/auth/reset/:code`.
- O client HTTP continua centralizado em `frontend/src/api/req/auth/index.ts` via
  `callEndpoint` + `handleReq`; os componentes usam somente o hook `useAuth`.
- Os formularios usam a fundacao da TASK-02 (`useFormList`, controllers e Zod).
- A validacao frontend da nova senha espelha a regra do backend: minimo 12 caracteres,
  maiuscula, minuscula, numero, caractere especial e confirmacao igual.
- A tela de envio nunca revela se o e-mail existe; qualquer sucesso mostra a mesma
  mensagem de envio.
- O reset bem-sucedido usa `useUserSet("/dashboard")`, porque o backend retorna o
  usuario hidratado com token por device.
- A env local `backend/.env` foi alinhada para `RECOVERY_URL=/auth/reset-password`.
  Como `.env` e ignorado pelo Git, a decisao fica registrada aqui para reproducao em
  outros ambientes.

## Consequencias

- Nao ha endpoint, validator, repository, service, client HTTP, store ou fluxo de
  sessao duplicado.
- O usuario fica autenticado imediatamente apos redefinir a senha, respeitando o
  contrato real do backend.
- Se um ambiente nao configurar `EMAIL_API_EMAIL`, `EMAIL_API_KEY` e demais
  `EMAIL_API_*`, o Nodemailer faz no-op e o envio real nao deve ser considerado
  validado ponta a ponta. No ambiente local desta execucao, as chaves esperadas estavam
  presentes; por seguranca, a entrega em caixa real nao foi verificada com destinatario
  real.
- As proximas telas de auth podem reutilizar o mesmo padrao de mutations em `useAuth`
  sem criar novo client ou store.

## Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Dev local em `http://localhost:3000` e `http://localhost:3001`
- `GET /auth/recovery` retornou 200.
- `GET /auth/reset-password?code=invalid-task05` retornou 200.
- `POST /api/public/auth/recovery` retornou 200 com `recovery_code_success`, preservando
  anti-enumeracao.
- `POST /api/public/auth/reset/invalid-task05` retornou 404 com `code_incorrect`.
- Chrome headless via CDP validou:
  - render de `/auth/recovery`;
  - submit do formulario de envio ate o estado "Link enviado!";
  - render de `/auth/reset-password?code=invalid-task05-browser`;
  - submit com codigo invalido exibindo CTA "Solicitar novo link".

## Pendencias

- Em producao/homologacao, conferir se `RECOVERY_URL` tambem aponta para
  `/auth/reset-password`.
- Validar entrega em caixa de e-mail real quando houver destinatario operacional de
  teste autorizado.
