# TASK-189 — Observabilidade backend no GlitchTip

| Campo | Valor |
|---|---|
| Status | Completed |

## Escopo e dependências

Concluir a integração opcional de observabilidade do backend com o GlitchTip hospedado pela
Lectum, que já usa o protocolo Sentry. TASK-186 confirmou GlitchTip nos apps Next e TASK-187
registrou que o backend ainda rejeitava esse DSN. Esta task altera apenas a política de aceitação
do DSN e oferece uma verificação operacional explícita; não cria painel, não altera upload,
banco, filas, vídeos, R2, pagamentos ou dados de usuários.

## Decisão e impacto de deploy

- O backend aceitará exclusivamente o host HTTPS canônico `glit.lectum.com.br`, além dos hosts
  Sentry SaaS já aceitos. Não aceitará host, porta, prefixo de path, query, fragmento ou credencial
  arbitrários, evitando transformar `SENTRY_DSN` em destino livre de telemetria.
- `SENTRY_DSN` e `SENTRY_ENVIRONMENT` já existem e continuam opcionais: configuração ausente ou
  inválida mantém a API funcional, apenas sem envio de observabilidade. Não há nova env obrigatória.
- A sanitização permanece error-only e remove corpo HTTP, headers, cookies, URLs, PII, segredo,
  SQL, breadcrumbs e paths reais. O provider nunca recebe dados de produto além dos metadados
  permitidos.
- A operação `observability:check` só envia um evento sintético sanitizado quando invocada com
  confirmação explícita do ambiente; ela não deve entrar no start, scheduler ou healthcheck.
- Rollback: reverter a política/commit ou remover o DSN do runtime. Sem migration, backfill ou
  alteração de dados publicados.
- Compatível com rollout desigual: versões anteriores continuam iniciando; a nova versão apenas
  passa a habilitar uma env já provisionada. Validar homolog antes de qualquer merge para `main`.

## Critérios de aceite

- [x] A política aceita apenas DSN HTTPS do GlitchTip canônico ou Sentry SaaS já permitido, e
      rejeita variações, destinos arbitrários e formatos inseguros.
- [x] Sem DSN/environment válido, boot e fluxo de erro continuam disponíveis sem falhar aberto.
- [x] A captura continua limitada a erros operacionais sanitizados, sem dados pessoais, secretos ou
      detalhes técnicos em logs/eventos.
- [x] Existe comando manual confirmado que valida a configuração e o transporte sem incluir segredo
      na saída e sem ser executado automaticamente.
- [x] Template de produção e documentação deixam de indicar uma limitação inexistente.
- [x] Checks, build, ADR, bump, commit/push em `homolog` e smoke pós-deploy são registrados.

## Validação esperada

- Testes focados da política e da operação; `pnpm --dir backend check`,
  `pnpm --dir backend build` e `pnpm check`.
- Após deploy em homolog, verificar `/health`, `/ready`, `/ping` e executar no container:
  `node --enable-source-maps dist/operations/observability/check-observability.js --confirm=homolog`.
  Conferir no GlitchTip apenas o evento sanitizado/release/ambiente, sem publicar DSN ou payload.
- Produção permanece sem promoção nesta task; o mesmo comando só poderá ser executado no runtime
  produtivo após merge revisado e com `--confirm=production`.

## Evidências de conclusão

- A política e o parser da operação possuem testes focados; `pnpm --dir backend check` (821 casos),
  `pnpm --dir backend build` e `pnpm check` passaram localmente.
- Sem DSN, a operação confirmada falha de forma segura com `configuration_invalid`, sem tentativa de
  transmissão. O script compilado está disponível como `pnpm --dir backend observability:check --
  --confirm=homolog`.
- O commit funcional `63fa9c3e` foi publicado em `homolog` como versão `0.1.413`. Em homolog,
  `/health`, `/ready` e `/ping` responderam saudáveis e o `/ping` informou `0.1.413`.
- No runtime de homolog, a execução confirmada retornou
  `[OBSERVABILITY_CHECK_OK] { environment: 'homolog', event: 'sanitized_operational_error',
  transport: 'accepted' }`.
- A interface autenticada do GlitchTip registrou o evento `HOMOLOG-BACKEND-1` no ambiente `homolog`,
  release `lectum-backend@0.1.413`, operação `observability_probe` e boundary `runtime`. A tela
  exibiu somente os frames saneados `runtime/*` e metadados permitidos.
- Nenhuma promoção ou alteração de configuração de produção ocorreu nesta task.
