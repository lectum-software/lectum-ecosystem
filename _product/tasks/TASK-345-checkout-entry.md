# TASK-345 — InitiateCheckout na entrada da página

## Escopo
Registrar a chegada consentida ao checkout profissional, tanto no cadastro quanto no upgrade por qualquer caminho. Não depende de cartão nem cria operação Stripe.

## Critérios
- [x] Captura no componente comum de pagamento após configuração elegível, sem tela nova.
- [x] Horário/identidade no servidor, consentimento vigente e navegador associado.
- [x] Uma entrada por usuário/revisão em janela fixa de 30 minutos, incluindo recargas e abas simultâneas. Retorno posterior pode contar novamente.
- [x] Enfileiramento atômico e validação da origem antes da entrega.
- [x] Compatibilidade com captura antiga por operação, sem duplicar a mesma entrada.
- [x] Revogação remove evidência por cascade; retenção de no máximo 24 horas.
- [x] Checks e builds completos; commit local.

## Validação
PostgreSQL isolado 127.0.0.1:55443/lectum_stripe_test: entrada em conta antiga (upgrade), concorrência, retorno depois de 30 minutos, identidade diferente, revisão inválida, consentimento revogado e zero operações financeiras criadas. Sem chamadas a Stripe/Meta.

## Deploy e rollback
Migração aditiva cria marketing_checkout_entries. Publicar backend/migração antes do frontend. Backend anterior não entende os novos registros, portanto não reverter o worker enquanto houver entradas pendentes sem primeiro pausar CAPI e examinar a fila. Preservar tabela em rollback. Nenhuma variável nova. Subscribe permanece bloqueado. Mudança de coleta sem alteração visual (mobile-first preservado). Publicação não autorizada nesta task.

Checks frontend/backend aprovados; backend 1535 testes aprovados e 60 integrações opt-in omitidas na suíte geral. Três integrações PostgreSQL específicas aprovadas e cenário final de concorrência/cortesia revalidado. Builds frontend/backend 0.1.840 aprovados. Guardas de repositório aprovadas. Smoke do artefato local: /health 200, /ready 200 e checkout-entry sem autenticação 401. Sem alteração visual; não houve chamada a Stripe/Meta, push ou deploy.
