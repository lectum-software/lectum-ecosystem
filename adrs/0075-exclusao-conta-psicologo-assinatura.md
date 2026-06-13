# ADR-0075 — Exclusão de conta do psicólogo com proteção de cobrança

## Status

Aceito em 2026-06-13.

## Contexto

O perfil do paciente já expunha uma área visual de exclusão, mas o perfil do psicólogo não tinha uma ação equivalente. O psicólogo possui uma camada adicional de assinatura/pagamento: excluir a conta sem tratar uma cobrança externa poderia deixar uma assinatura ativa no gateway mesmo após ocultar o perfil.

O checkout/gateway pago ainda pertence às tasks de pagamento futuras, mas o modelo `professional_subscription` já possui `source`, `gateway`, `gateway_subscription_id` e `status`, suficientes para diferenciar assinaturas locais sem cobrança externa de cobranças vinculadas ao gateway.

## Decisão

- Criar `POST /api/private/account/delete` no módulo compartilhado de conta.
- Exigir confirmação textual `EXCLUIR` e, quando a conta tiver senha cadastrada, exigir a senha atual.
- Para usuários psicólogos, bloquear a exclusão quando existir assinatura com cobrança externa (`source="mercadopago"`, `gateway` ou `gateway_subscription_id`) ou status `inadimplente`.
- Permitir exclusão de assinaturas locais sem gateway, como plano gratuito/cortesia administrativa, cancelando-as por soft delete no mesmo fluxo transacional.
- Realizar soft delete e anonimização de conta, removendo tokens, notificações/preferências e ocultando o perfil profissional (`published=false`) sem apagar fisicamente registros relacionais.
- No frontend, expor o botão apenas no perfil do psicólogo e usar a fundação de formulários da TASK-02 para confirmação e senha atual.

## Consequências

- A conta do psicólogo não pode ser removida enquanto houver risco de cobrança externa ou pagamento em aberto; a UI orienta o usuário a regularizar a assinatura.
- Perfil público, dados sensíveis do perfil profissional e sessões são desativados em uma transação única.
- O fluxo fica compatível com a futura TASK-33: quando houver cancelamento real no gateway, a exclusão poderá prosseguir após a assinatura deixar de ser bloqueante.
- Não houve alteração de schema nem instalação de packages.
