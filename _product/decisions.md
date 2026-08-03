# Decisões de Integração Lectum

Última atualização: 2026-08-03.

Este documento registra decisões externas necessárias para evitar implementação falsa de integrações. Quando uma credencial real estiver ausente, a task futura deve pedir ao usuário e parar antes de simular sucesso.

## Gateway de pagamento

Status: Decidido.

Provedor: Mercado Pago.

Ambiente: sandbox e produção pendentes de credenciais reais.

Webhooks: `subscription_preapproval`, `subscription_authorized_payment` e `payment`.

Plano: Profissional por R$ 29,90/mês, sem período de teste.

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

Execução TASK-11 em 2026-06-05:

- Bloqueio confirmado e formalizado em `adrs/0017-bloqueio-storage-privado-crp.md`.
- A configuração atual contém apenas `CLOUDFLARE_R2_PUBLIC_BUCKET_NAME=public`; documentos
  CRP não podem ser armazenados nesse bucket público.
- Antes de retomar TASK-11, provisionar bucket/política privada e env específico para
  documentos profissionais, por exemplo `CLOUDFLARE_R2_PRIVATE_BUCKET_NAME`, mantendo a
  regra de persistir somente `file_key`.

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

Execucao complementar TASK-16 em 2026-06-07:

- Verificacao real do WhatsApp do psicologo implementada com Twilio SMS/OTP usando as envs backend
  `TWILIO_API_ACCOUNT_SID`, `TWILIO_API_AUTH_TOKEN` e `TWILIO_API_PHONE_NUMBER`.
- Novo modelo `phone_verification` guarda hash do codigo, expiracao, tentativas e auditoria minima;
  nunca persiste o OTP puro.
- Endpoints privados de psicologo:
  `POST /api/private/psychologist/whatsapp/verification/request` e
  `POST /api/private/psychologist/whatsapp/verification/confirm`.
- `whatsapp_verified_at` continua sendo preenchido somente apos confirmacao correta do codigo SMS.

## CFP/CRP

Status: Decidido para consulta automatica; upload/analise manual ainda depende de storage privado.

Decidido:

- Consulta automatica CFP/CRP usa InfoSimples `Conselho Federal de Psicologia / Cadastro` (`cfp-cadastro`) com token backend-only `DOCUMENT_TOKEN` (ADR-0026).
- Aprovacao e bloqueio manual de CRP continuam necessarios para casos nao encontrados, ambiguos, divergentes ou quando o produto exigir arquivo documental.
- Psicologo envia documento CRP via R2 privado; operacao/admin revisa e altera status (`pendente`, `em_analise`, `aprovado`, `rejeitado`).

Bloqueado:

- Nao fazer scraping nao autorizado.
- Nao preencher `psychologist_profile.cfp_verified_at` sem consulta real via InfoSimples ou provider futuro aprovado por ADR.
- Se `DOCUMENT_TOKEN` estiver ausente/invalido ou sem acesso ao `cfp-cadastro`, TASK-10 volta a ficar bloqueada operacionalmente.
- TASK-11 continua bloqueada ate existir bucket/politica R2 privada para documento CRP.

Fallback quando registro nao for encontrado:

- Encaminhar para upload de CRP e analise manual.
- Nunca aprovar automaticamente por ausencia de retorno.

Impacto nas tasks: TASK-10, TASK-11, TASK-18.

Execucao TASK-10 em 2026-06-05/2026-06-06:

- Bloqueio historico formalizado em `adrs/0015-bloqueio-consulta-cfp-automatica.md`; desbloqueio em `adrs/0026-infosimples-validacao-cfp-crp.md`.
- Execucao TASK-10 concluida em 2026-06-06 com InfoSimples, sem mock, usando endpoint autenticado `POST https://api.infosimples.com/api/v2/consultas/cfp/cadastro`.
- CPF sem registro no CFP retorna `code=612` pela InfoSimples; o backend trata esse codigo como estado vazio auditavel (`found=false`), nao como erro de provedor.
- Encaminhar para TASK-11 quando a consulta nao aprovar de forma inequivoca ou quando houver exigencia de documento CRP; TASK-11 ainda exige R2 privado.

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

## Fluxo de cadastro do psicólogo

Status: Definido em 2026-06-07.

Decisão:

- Após cadastro com Google ou confirmação de e-mail, psicólogos entram em `/app/professional/billing/plans`.
- Plano gratuito persiste assinatura gratuita real (`professional_subscription.status="ativa"`) e segue para verificação de telefone por SMS.
- Depois do telefone, plano gratuito segue para `/app/professional/profile/setup`; essa tela informa o bloqueio real da TASK-18/TASK-11 sem simular edição final.
- Plano profissional segue para `/app/professional/billing/checkout`; sem credenciais Mercado Pago, o checkout fica bloqueado e não ativa assinatura.
- Quando o pagamento real existir, assinatura profissional ativa segue para telefone, endereço de faturamento, verificação CRP e configuração de perfil.

Regras:

- Nunca enviar psicólogo recém-cadastrado direto para `/psychologist/cfp` antes de plano.
- Nunca ativar plano profissional sem confirmação real do gateway/webhook.
- Nunca salvar endereço de faturamento ou publicar perfil como atalho enquanto TASK-32/TASK-18 estiverem bloqueadas.

Impacto nas tasks: TASK-09, TASK-16, TASK-18, TASK-31, TASK-32.
