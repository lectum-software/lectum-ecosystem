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

## Pendências históricas

- Credenciais/número de teste Twilio continuam necessários para fluxos futuros de cadastro/alteração
  e verificação do WhatsApp do psicólogo. Esta pendência foi endereçada no complemento de
  2026-06-07, quando as variáveis `TWILIO_API_ACCOUNT_SID`, `TWILIO_API_AUTH_TOKEN` e
  `TWILIO_API_PHONE_NUMBER` foram encontradas no ambiente backend.

## Complemento: verificação real de WhatsApp por SMS

Em 2026-06-07 a pendência operacional de verificação foi implementada sem alterar a decisão de
contato por `wa.me`.

- Criar `phone_verification` para OTP por SMS com `purpose="psychologist_whatsapp"`, hash do código
  por `argon2`, expiração em 10 minutos, limite de tentativas e throttle de reenvio.
- Expor endpoints privados de autogestão do psicólogo em
  `/api/private/psychologist/whatsapp/verification/request` e
  `/api/private/psychologist/whatsapp/verification/confirm`, montados com
  `requireRole("psicologo")`.
- Usar Twilio SMS real por `TWILIO_API_ACCOUNT_SID`, `TWILIO_API_AUTH_TOKEN` e
  `TWILIO_API_PHONE_NUMBER`; se a configuração faltar ou o envio falhar, não preencher
  `whatsapp_verified_at`.
- Persistir `psychologist_profile.whatsapp` como número E.164 e preencher
  `whatsapp_verified_at` somente após confirmação correta do código.
- Manter o telefone fora do perfil público; o link `wa.me` continua sendo liberado apenas pelo fluxo
  de contato após consentimento e intenção persistida.

Validações adicionais:

- `pnpm --dir backend db:migrate -- --name add_phone_verifications`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`

## Atualização em 2026-06-07: diagnóstico de falha Twilio SMS

### Contexto

A rota `/app/professional/whatsapp/verify` falhava ao enviar o OTP por SMS. A auditoria consultou os logs recentes da própria API Twilio usando as credenciais locais sem expor segredos, telefones completos ou tokens.

A Twilio retornou mensagens `failed` com `errorCode=21659`. A documentação oficial da Twilio descreve esse erro como remetente `From` que não pertence à Twilio/conta ou incompatibilidade de país para shortcode; a checagem da conta local não encontrou `incomingPhoneNumbers` nem `Messaging Services` disponíveis.

### Decisão

- Não simular SMS nem preencher `whatsapp_verified_at` sem confirmação real.
- Manter Twilio como provedor real de OTP, mas aceitar `TWILIO_API_MESSAGING_SERVICE_SID` como alternativa ao `TWILIO_API_PHONE_NUMBER` quando a conta usar Messaging Service.
- Tratar erro Twilio `21659` como configuração inválida de remetente, retornando mensagem específica em PT-BR para o frontend.
- Persistir `provider_message_id` em `phone_verification` quando a Twilio aceitar o envio.

### Consequências

- A falha deixa de aparecer como erro genérico de envio e passa a apontar a pendência real de configuração.
- O fluxo permanece bloqueado até existir número Twilio SMS-capable pertencente à conta configurada ou Messaging Service válido.
- Não há mock, bypass de OTP ou alteração manual de `whatsapp_verified_at`.

## Atualização em 2026-06-07: WhatsApp sem OTP

### Contexto

Por decisão de produto, o cadastro do WhatsApp profissional deixou de exigir autenticação do número por SMS ou por WhatsApp. O contato entre paciente e psicólogo continuará acontecendo por WhatsApp, mas a Lectum não fará verificação de posse do número no MVP.

### Decisão

- O endpoint existente `/api/private/psychologist/whatsapp/verification/request` passa a salvar o número informado em E.164, sem disparar SMS, sem criar OTP e sem preencher `whatsapp_verified_at`.
- O fluxo de contato `wa.me` passa a exigir apenas `psychologist_profile.whatsapp` em perfil publicado, mantendo consentimento do paciente e persistência de `contact_request` antes de retornar o link.
- O campo `whatsapp_verified_at` permanece no schema como histórico/compatibilidade, mas não é requisito para liberar o contato no MVP atual.
- A tela `/app/professional/whatsapp/verify` vira uma etapa de inserção/salvamento do WhatsApp profissional, sem etapa de código.

### Consequências

- Não há custo ou dependência operacional de Twilio para cadastrar o WhatsApp profissional.
- O risco aceito é não validar posse do número antes de gerar o link interno de contato.
- O telefone segue fora do perfil público; ele só é embutido no `wa.me` após intenção de contato e consentimento.

## Atualização em 2026-06-18: refinamento visual da etapa de WhatsApp profissional

### Contexto

Produto solicitou que a etapa `/app/professional/whatsapp/verify` ficasse mais
direta e consistente com os CTAs de WhatsApp da plataforma, sem rótulos
redundantes nem textos auxiliares repetidos no campo.

### Decisão

- Reutilizar o componente compartilhado `WhatsAppIcon` no cabeçalho da etapa,
  preservando a cor azul da Lectum.
- Remover o eyebrow `WhatsApp profissional` abaixo do ícone e concentrar o
  contexto no título e na descrição.
- Manter o formulário real e a mesma mutation de salvamento do número; a mudança
  é apenas visual/copy.
- Ajustar o `PhoneController` para renderizar a seta do seletor de país como
  ícone próprio com `appearance-none`, criando respiro à direita sem depender do
  visual nativo do navegador.
- Direcionar o link de retorno da configuração inicial para
  `/app/professional/billing/plans`, com o texto `Voltar para planos`.
- No estado de sucesso, trocar o retorno para `Voltar para configuração de
  WhatsApp`, limpando o estado local de sucesso e voltando ao formulário.
- Atualizar o card de próxima etapa para `Vídeo de apresentação e perfil
  profissional`, orientando vídeo vertical e complemento do perfil para gerar
  mais oportunidades de atendimento.
- Remover da configuração inicial o alerta verde de WhatsApp já salvo e o botão
  `Configurar perfil`, porque ambos competiam com a ação principal de editar e
  salvar o número.
- Atualização de 2026-08-13: remover também o bloco informativo azul
  **Privacidade do número** da etapa `/app/professional/whatsapp/verify`, mantendo a
  explicação principal do cabeçalho, o campo de WhatsApp e o CTA de salvamento.

### Consequências

- A tela fica mais alinhada ao fluxo de planos -> WhatsApp -> perfil, sem mudar
  contratos de API ou persistência.
- A etapa inicial fica mais direta para atualização do telefone, mesmo quando já
  existe um WhatsApp persistido no perfil.
- Todos os usos do `PhoneController` com seletor de país herdam uma seta mais
  consistente e menos colada à borda.
- Não há alteração em validação de posse do número, Twilio, `wa.me`,
  `contact_request` ou `whatsapp_verified_at`.
- A remoção do bloco azul é apenas visual; o telefone bruto segue fora do perfil
  público e só é usado no link `wa.me` pelos fluxos internos já documentados.

Validações da atualização de 2026-08-13:

- Validação de fonte confirmou ausência do texto **Privacidade do número** na tela.
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Smoke local com `next start -p 3213`: `/app/profissional/whatsapp/verificar`
  retornou `307` para login sem sessão e o alias EN retornou `308` para a rota
  PT-BR.

## Atualização em 2026-06-26: mensagem WhatsApp personalizada por contexto

### Contexto

Produto solicitou que a mensagem pronta do WhatsApp mencione o primeiro nome do psicólogo, especialmente nos CTAs de posts da comunidade, para deixar o primeiro contato mais natural.

### Decisão

- Centralizar a composição do link `wa.me` em um utilitário backend compartilhado.
- Gerar mensagens com saudação nominal quando houver nome do psicólogo:
  - perfil/listagem/favoritos: `Olá {primeiro nome}, encontrei seu perfil na Lectum e gostaria de conversar sobre atendimento.`
  - post de comunidade: `Olá {primeiro nome}, encontrei seu post na Lectum e gostaria de conversar sobre atendimento.`
  - resposta/comentário de comunidade: `Olá {primeiro nome}, encontrei sua resposta na Lectum e gostaria de conversar sobre atendimento.`
- Manter o registro real de `contact_request` antes do redirecionamento.
- No componente de transição para WhatsApp, preservar o texto contextual recebido da tela de origem mesmo quando o endpoint de tracking retorna uma URL atualizada.

### Consequências

- O paciente chega ao WhatsApp com uma mensagem mais pessoal e coerente com o ponto de origem do clique.
- CTAs de comunidade deixam de perder o contexto de post/resposta quando a chamada de tracking retorna rapidamente.
- Não há mudança de schema Prisma, endpoints, permissões, tracking, packages ou exposição do telefone bruto.
