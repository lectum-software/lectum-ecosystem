# Decisões de Integração Lectum

Última atualização: 2026-06-03.

Este documento registra decisões externas necessárias para evitar implementação falsa de integrações. Quando uma credencial real estiver ausente, a task futura deve pedir ao usuário e parar antes de simular sucesso.

## Gateway de pagamento

Status: Decidido.

Provedor: Mercado Pago.

Ambiente: sandbox e produção pendentes de credenciais reais.

Webhooks: `subscription_preapproval`, `subscription_authorized_payment` e `payment`.

Plano: Profissional por R$ 9,90/mês, sem período de teste.

Pacotes:

- Backend: `mercadopago`, instalar somente na TASK-32 dentro do `MercadoPagoAdapter`.
- Frontend: `@mercadopago/sdk-react`, instalar somente na TASK-32 para Checkout Bricks/Card Payment Brick.

Pendências:

- Solicitar ao usuário `MERCADO_PAGO_ACCESS_TOKEN`, public key e segredo de webhook quando TASK-32/TASK-33 iniciarem.
- Nunca ativar assinatura sem confirmação real do gateway/webhook.

Impacto nas tasks: TASK-31, TASK-32, TASK-33.

Referências: `adrs/0003-gateway-pagamento-mercado-pago.md` e `DATA-MODEL.md` seção "Assinatura e cobrança".

## Storage

Status: Decidido.

Provedor: Cloudflare R2, usando API S3-compatible.

Implementação base existente: `backend/src/config/multer/*` com `@aws-sdk/client-s3`, `multer` e envs `CLOUDFLARE_R2_*`.

Política de acesso:

- Persistir sempre `file_key`/`key`, nunca URL temporária.
- Avatar e mídia pública podem ser servidos por rota controlada ou bucket público conforme configuração.
- Documentos profissionais/CRP devem ser privados por padrão; não expor URL pública.
- Se a implementação atual usar apenas bucket público, a task de documentos deve criar/adaptar política privada antes de armazenar CRP.

Tipos de arquivo:

- Avatar/imagem: `image/jpeg`, `image/png`, `image/webp`.
- Documento CRP: `application/pdf`, `image/jpeg`, `image/png`.
- Anexos de comunidade: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, quando a task permitir anexos.

Limites iniciais:

- Avatar: até 5 MB.
- Documento CRP: até 10 MB.
- Anexos de comunidade: até 10 MB por arquivo, até 3 arquivos por post no MVP.

Pendências:

- Confirmar buckets e credenciais R2 reais no `.env` antes de qualquer upload produtivo.
- Separar bucket/política para documentos privados se a configuração atual não suportar privacidade.

Impacto nas tasks: TASK-11, TASK-18, TASK-21, TASK-24.

## WhatsApp e verificação de telefone

Status: Decidido para MVP.

Contato: abrir link direto `wa.me` com o número real do psicólogo após registrar `contact_request`.

Verificação: usar Twilio para envio de código por SMS/OTP e confirmação do número do psicólogo. Em desenvolvimento, usar números/test credentials da Twilio para evitar custo real.

Não decidido/adotado no MVP:

- WhatsApp Business API para envio ativo de mensagens.
- Provedor intermediário adicional além da Twilio.

Regras:

- `psychologist_profile.whatsapp_verified_at` só pode ser preenchido após validação real por código.
- Sem validação real, persistir o número como não verificado e não liberar comportamento que prometa número confirmado.
- O telefone do psicólogo não deve ser exposto fora do fluxo de contato.

Pacotes: `twilio` já instalado no backend.

Impacto nas tasks: TASK-16, TASK-18, TASK-20, TASK-29.

## CFP/CRP

Status: Parcialmente decidido; consulta automática bloqueada.

Decidido:

- Aprovação e bloqueio manual de CRP é o fluxo inicial e continuará necessário mesmo que uma API seja adicionada no futuro.
- Psicólogo envia documento CRP via R2; operação/admin revisa e altera status (`pendente`, `em_analise`, `aprovado`, `rejeitado`).

Bloqueado:

- Consulta automática CFP/CRP por CPF fica aberta até existir fonte oficial, API contratada ou processo autorizado.
- Não fazer scraping não autorizado.
- Não preencher `psychologist_profile.cfp_verified_at` sem consulta real.

Fallback quando registro não for encontrado:

- Encaminhar para upload de CRP e análise manual.
- Nunca aprovar automaticamente por ausência de retorno.

Impacto nas tasks: TASK-10, TASK-11, TASK-18.

## E-mail e SMS

Status: Decidido.

E-mail:

- Usar Nodemailer existente no backend com SMTP do Resend.
- Credenciais já esperadas no env: `EMAIL_API_HOST`, `EMAIL_API_PORT`, `EMAIL_API_SECURE`, `EMAIL_API_EMAIL`, `EMAIL_API_KEY`, `EMAIL_API_NAME`, `EMAIL_API_SENDER`.
- Templates transacionais seguem em `backend/src/modules/api/config/nodemailer/messages`.

SMS:

- Usar Twilio para OTP/verificação de telefone/WhatsApp quando a task exigir.
- Em desenvolvimento, usar número/test credentials da Twilio.

Regras:

- Se credenciais de Resend/Twilio estiverem ausentes, a task deve pedir ao usuário; não simular envio.
- E-mail de recuperação/confirmação pode validar UI/contrato sem marcar envio ponta a ponta quando env estiver ausente.

Impacto nas tasks: TASK-05, TASK-06, TASK-16, TASK-29, TASK-30.

## Push e notificações

Status: Decidido.

Canal in-app: obrigatório, via modelos `notification` e `notification_preference`.

Push web: real, usando `web-push`, VAPID e `notification_subscription` já existente no schema.

Implementação base existente:

- Backend: `backend/src/config/webPush.ts` e `backend/src/main/notification`.
- Frontend: `frontend/src/hooks/notification/index.tsx` existe como rascunho não commitado; deve ser revisado e portado para a arquitetura atual antes de uso.

Pendências:

- Confirmar `VAPID_EMAIL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` no env.
- Criar/ativar endpoints de subscription no padrão do frontend/backend atual.
- Não prometer push se o browser negar permissão ou as chaves VAPID estiverem ausentes.

Impacto nas tasks: TASK-29.

## LGPD, termos e privacidade

Status: Decidido para MVP.

Decisão:

- Gerar telas padrão de Termos de Uso e Política de Privacidade no produto.
- Exigir aceite explícito nos fluxos de cadastro/onboarding quando aplicável.
- Registrar consentimento quando o modelo de dados da task correspondente existir.
- Revisão jurídica/produto ocorrerá depois, mas não bloqueia a criação das telas padrão.

Regras mínimas:

- Campos sensíveis (`cpf`, `whatsapp`, endereço de cobrança, token de pagamento, documentos) não devem aparecer em logs.
- Exclusão/exportação/anonimização entram na TASK-34 como fechamento operacional.

Impacto nas tasks: TASK-04, TASK-07, TASK-09, TASK-30, TASK-34.

## Moderação de comunidade

Status: Decidido.

Modo MVP: moderação reativa manual.

Regras:

- Posts entram inicialmente como `status="publicado"`.
- Denúncias, ocultação e remoção manual podem alterar status para `"removido"`.
- `status="pendente"` fica reservado para futura pré-moderação aprovada por ADR.
- Moderação por IA fica fora do MVP.

Impacto nas tasks: TASK-22, TASK-24, TASK-26, TASK-28, TASK-34.

## Observabilidade

Status: Decidido para task dedicada.

Provedor: Sentry.

Decisão:

- Usar Sentry no projeto.
- Não instalar agora; implementar em task dedicada de observabilidade/hardening, preferencialmente na TASK-34 ou em uma task específica antes dela se o time precisar.

Pacotes candidatos:

- Frontend: `@sentry/nextjs`.
- Backend: `@sentry/node`.

Impacto nas tasks: TASK-34 ou task dedicada de observabilidade.
