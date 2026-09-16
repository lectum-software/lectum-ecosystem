# TASK-187 — Template de produção do backend no Dokploy

| Campo | Valor |
|---|---|
| Status | Completed |

## Escopo

Criar `backend/.env.production` local solicitado pelo usuário, com valores públicos de produção e placeholders `YOUR_OWN_...`, conferidos contra os consumidores atuais. Manter um modelo versionado sem segredos em `.env.production.example`. Não configurar Dokploy nem promover produção.

## Decisões e impacto

- Fonte: `.env.example`, consumidores backend, Dockerfile e entrypoint atuais. Sem mudança de runtime, schema, packages, UI ou requisitos novos de env.
- Arquivo preenchível permanece ignorado pelo Git/Docker. Apenas o modelo vazio pode ser versionado.
- Não copiar credenciais/recurso de homolog para produção nem inventar conta Cloudflare, banco, bucket ou endpoint privado de vídeo.
- Excluir configurações de dev/reset, migração automática R2 e limpeza. Schedulers com efeitos administrativos permanecem desligados.
- Observabilidade backend ainda rejeita DSNs GlitchTip: registrar limitação real, não alegar integração válida por preencher a variável. Esta task entrega configuração, não muda SDK.
- Bump obrigatório gera deploy de homolog; não há mudança de funcionalidade nem promoção.

## Critérios de aceite

- [x] Arquivo local criado com proteção e template versionável equivalente.
- [x] Origens production e placeholders de credenciais/infraestrutura corretos; opcionais claramente separados.
- [x] Alertas de webhook único Stream, serviço video isolado, pagamento real pendente e GlitchTip backend documentados.
- [x] Testes do template e checks backend aprovados, sem carregar credenciais reais nem acessar providers.
- [x] ADR e proteção de segredos registrados; sem alteração de runtime ou configuração publicada.


## Validação e entrega

- Cinco testes do template aprovados: parse dotenv real, unicidade/cobertura de chaves canônicas, defaults/origens, placeholders, opcionais, ausências justificadas e regras Git/Docker.
- `pnpm --dir backend check` e `pnpm check` aprovados (Prisma generate, TypeScript, Biome e suítes). Revalidar no hook após sincronizar os commits concorrentes de homolog.
- Guards de env, segredos, tasks e ADRs aprovados. Arquivo local idêntico ao template no momento da criação, modo 0600, confirmado ignorado via `git check-ignore`; exemplo versionável.
- Nenhuma credencial real, provider, banco ou env existente foi carregada pelo teste do template. Não executar o modelo para validar serviços externos.
- `pnpm version:bump` executado uma vez; após incorporar três commits concorrentes (homolog 0.1.406), o mesmo incremento foi reconciliado em 0.1.407 nos cinco manifests, sem repetir o comando. `pnpm check:version` aprovado. Commit/push em homolog são o próximo passo de entrega; smoke pós-push deve ser conferido sem configurar produção.
- Incorporada a configuração atual da TASK-176: `VIDEO_PROCESSING_SERVICE_REQUEST_TIMEOUT_MS=30000` no template e cópia local, em vez do antigo valor de 5000 ms.
- Integrações reais de produção, habilitação de SMS, compatibilidade GlitchTip backend e isolamento de Stream/video são ressalvas explícitas do modelo, não testes realizados por esta task documental.
