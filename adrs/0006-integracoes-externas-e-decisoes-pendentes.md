# ADR-0006: Integrações externas e decisões pendentes

## Status

Accepted

## Task relacionada

TASK-03 - Decisões externas e integrações obrigatórias.

## Contexto

As jornadas do Lectum dependem de fornecedores reais: storage, WhatsApp/SMS, CFP/CRP, e-mail, push, pagamentos, LGPD/termos, moderação e observabilidade. Sem decisões explícitas, uma IA poderia construir telas que parecem funcionais, mas dependem de mocks ou promessas falsas.

O gateway de pagamento já foi decidido anteriormente: Mercado Pago, com Checkout Bricks e Preapproval, registrado em `adrs/0003-gateway-pagamento-mercado-pago.md`. A TASK-03 registra as demais decisões e pendências.

## Decisão

Adotar as decisões registradas em `_product/decisions.md`:

- Storage: Cloudflare R2, via S3-compatible API e `@aws-sdk/client-s3`.
- WhatsApp: contato por `wa.me` e verificação de número por Twilio SMS/OTP.
- CFP/CRP: consulta automatica autorizada via InfoSimples `cfp-cadastro` com `DOCUMENT_TOKEN` (ADR-0026); aprovacao/upload manual continua para excecoes e depende de R2 privado.
- E-mail: Resend via Nodemailer/SMTP.
- SMS: Twilio quando houver verificação por código.
- Push: web-push real com VAPID e `notification_subscription`.
- LGPD/termos: telas padrão e aceite explícito no MVP; revisão posterior.
- Moderação: reativa manual no MVP.
- Observabilidade: Sentry implementado como complemento da TASK-34, conforme ADR-0465.
- Pagamento: Mercado Pago confirmado; plano Profissional R$ 29,90/mês, sem trial; preço atualizado por decisão de produto em 2026-08-03.

## Consequências

- Tasks futuras não podem usar mocks para simular integração externa.
- Se credenciais de R2, Resend, Twilio, VAPID ou Mercado Pago estiverem ausentes, a task deve pedir
  ao usuário e registrar bloqueio operacional. No Sentry, a ausência bloqueia somente a ativação e
  a validação no provider; código, build e boot permanecem seguros em modo no-op, com a pendência
  operacional registrada.
- Upload de documentos CRP precisa respeitar privacidade: persistir chave de arquivo e não URL pública.
- `psychologist_profile.cfp_verified_at` so pode ser preenchido por consulta real InfoSimples ou provider futuro aprovado por ADR.
- `psychologist_profile.whatsapp_verified_at` só pode ser preenchido depois de validação real por código.
- Push pode ser implementado como canal real; se VAPID/browser falhar, a UI deve mostrar estado honesto.
- Sentry foi implementado como complemento operacional da TASK-34, com fronteiras registradas no
  ADR-0465.

## Validação

- Revisão manual de `_product/decisions.md`.
- Revisão dos documentos afetados por decisões externas.
- Sem alteração de código de integração nesta task.

## Pendências

- Credenciais Mercado Pago sandbox/prod e webhook secret.
- Buckets e credenciais Cloudflare R2 definitivos.
- Test credentials/números Twilio para desenvolvimento.
- Chaves VAPID reais por ambiente.
- Provisionamento das envs Sentry em homologação e produção, conforme ADR-0465.
- Bucket/politica privada para documentos CRP (`CLOUDFLARE_R2_PRIVATE_BUCKET_NAME` ou equivalente); a fonte/API CFP foi decidida na ADR-0026.
