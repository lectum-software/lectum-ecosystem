# ADR-0022: Contato WhatsApp por wa.me com intenção persistida

## Status

Accepted

## Task relacionada

TASK-16: Contato por WhatsApp.

## Contexto

A TASK-16 precisa permitir que um usuário autenticado contate um psicólogo publicado pelo WhatsApp,
sem expor o telefone no perfil público e sem usar envio ativo por WhatsApp Business API no MVP. A
TASK-03/ADR-0006 definiu o contato como link direto `wa.me` e a verificação de número por Twilio
SMS/OTP quando o número for cadastrado/alterado.

A referência visual consultada foi a imagem local
`_product/proto/Confirmação de WhatsApp - Inserir Número.jpg` (base mobile ~430px). O Builder Quick
Copy ativo foi revalidado com `npx "@builder.io/dev-tools@latest" auth status`, mas o ambiente não
estava autenticado no Builder; por isso a execução usou as imagens locais como fallback auditável.

## Decisão

- Criar `contact_request` conforme `DATA-MODEL.md`, usando `psychologist_id = user.id`,
  `user_id` opcional e `channel = "whatsapp"`.
- Expor `POST /api/private/directory/psychologists/:id/contact` dentro do módulo existente de
  descoberta, protegido somente por `_auth` via `routes.use(middlewares)`, sem `requireRole`, para
  manter a rota caller-neutra conforme ADR-0002.
- Validar que o psicólogo existe, está ativo, possui `role="psicologo"` e tem
  `psychologist_profile.published = true`.
- Liberar o link `wa.me` somente quando o perfil tiver `whatsapp` e `whatsapp_verified_at`. A task
  menciona `whatsapp` configurado, mas a execução mantém a trava de verificação já exposta pela
  TASK-15 (`whatsapp_available`) para não liberar telefone antes da verificação real definida na
  ADR-0006.
- Não usar WhatsApp Business API e não disparar mensagem ativa. O backend retorna apenas
  `whatsapp_url` com mensagem inicial codificada após persistir a intenção.
- Normalizar telefone do paciente para E.164 com `libphonenumber-js`; quando o usuário autenticado é
  paciente, atualizar `patient_profile.phone` com o número confirmado no fluxo.
- Implementar `/app/psychologist/[id]/contact` como tela mobile-first de confirmação, com React Hook
  Form/Zod e controllers da TASK-02 para telefone e consentimento.

## Consequências

- Cliques/intenções de WhatsApp ficam persistidos para analytics da TASK-20 e elegibilidade futura de
  avaliação da TASK-17.
- O telefone do psicólogo continua ausente do perfil público e só aparece embutido no link de contato
  depois do consentimento e do registro da intenção.
- Psicólogos com WhatsApp não verificado exibem estado de indisponibilidade, coerente com a regra de
  verificação real por Twilio SMS/OTP.
- Não houve instalação de pacote novo; foram usados pacotes já permitidos/instalados (`Prisma`,
  `libphonenumber-js`, TanStack Query e React Hook Form/Zod).

## Validação

- `npx "@builder.io/dev-tools@latest" auth status` (não autenticado; fallback para imagem local).
- `pnpm --dir backend db:migrate --name add_contact_requests`.
- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir frontend check`.
- `pnpm --dir frontend build`.
- `pnpm check`.
- Smoke real de API com paciente e psicólogo temporários, removidos ao final: o endpoint persistiu
  `contact_request`, normalizou `patient_profile.phone` e retornou `whatsapp_url` iniciado por
  `https://wa.me/5511987654321`.
- Browser local headless em Chrome na rota `/app/psychologist/[id]/contact`, com cookie/token real e
  backend/frontend locais: tela renderizou cópia de WhatsApp, profissional real temporário, card de
  privacidade, CTA de registro e campo de telefone pré-preenchido.

## Pendências

- Credenciais/número de teste Twilio continuam necessários para fluxos futuros de cadastro/alteração
  e verificação do WhatsApp do psicólogo.
