# ADR-0199: Fluxo pago valida CFP antes do WhatsApp profissional

## Status

Superseded em 2026-07-11 por ADR-0201 (complemento de fluxo: WhatsApp antes da verificação profissional).

## Task relacionada

Ajuste operacional no onboarding do Plano Profissional.

## Contexto

O checkout do Plano Profissional ativava a assinatura, seguia para o endereço de faturamento e então direcionava para o cadastro do WhatsApp. A tela de verificação profissional via InfoSimples/CFP existia em `/app/professional/cfp`, mas não estava garantida no caminho principal após pagamento.

Como a verificação CFP é uma etapa de confiança do Plano Profissional, ela deve entrar no fluxo antes da coleta/ativação do canal de contato profissional.

## Decisão

O fluxo pago passa a ser:

1. Plano Profissional;
2. checkout;
3. endereço de faturamento;
4. verificação profissional via InfoSimples/CFP;
5. WhatsApp profissional;
6. configuração do perfil.

Ao salvar o endereço de faturamento, o backend retorna `/app/professional/cfp` como próximo passo. Ao confirmar o resultado CFP, o frontend segue para `/app/professional/whatsapp/verify`. O redirecionamento de onboarding também considera endereço e `cfp_verified_at` antes do WhatsApp para assinaturas profissionais ativas.

## Consequências

- A API InfoSimples/CFP fica no fluxo principal do Plano Profissional.
- O WhatsApp profissional passa a ser preenchido depois da validação profissional.
- O plano gratuito continua seguindo para WhatsApp e configuração de perfil sem exigir CFP nesse fluxo.
- Se a InfoSimples estiver indisponível ou sem token válido, o usuário pago fica corretamente bloqueado na etapa de validação, sem mock ou aprovação automática.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm check`

## Pendências

- Validar manualmente no navegador com assinatura profissional ativa e `DOCUMENT_TOKEN` válido para confirmar o percurso completo com chamada real da InfoSimples.

## Supersessão em 2026-07-11

Produto decidiu inverter a ordem para reduzir fricção quando a API automática estiver instável. A ordem vigente do Plano Profissional pago passa a ser:

1. Plano Profissional;
2. checkout/pagamento real;
3. endereço de faturamento;
4. WhatsApp profissional;
5. verificação profissional;
6. configuração do perfil.

O cadastro do WhatsApp não libera edição/publicação completa do perfil profissional pago; a verificação profissional continua obrigatória antes do perfil. A decisão vigente está documentada no complemento do ADR-0201 e nas tasks TASK-44/TASK-66.
