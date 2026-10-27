# ADR-0642 — Sessão antifraude opaca com separador ponto

## Status

Aceito; implementado e validado localmente, publicação pendente — 2026-10-27.

## Task relacionada

TASK-32 — Diagnóstico e correção do encaminhamento da sessão antifraude.

## Contexto

A release 0.1.731 (ADR-0641, PR #133) lê a global do SDK no submit e usa a mesma
allowlist alfanumérica com hífen/underscore nos dois apps. No checkout real o usuário
confirmou, sem enviar cartão, uma string de 231 caracteres, ASCII visível, cujo único
caractere fora dessa regra é ponto. O valor não foi coletado nem registrado. Nosso helper
omite essa sessão legítima pelo formato, apesar de SDK e widget carregados. Isso não
comprova que a omissão é a causa da rejeição por risco previamente observada.

## Decisão

Ampliar minimamente a allowlist para `[A-Za-z0-9_.-]`, mantendo 1–256 caracteres.
Preservar o valor opaco integralmente, sem trim, coerção, encode/decode ou truncamento.
Não inferir formato JWT nem decodificar seu conteúdo. Não ampliar para pontuação não
observada nesta correção. Espaços, controles, CR/LF, DEL e Unicode continuam recusados.
Não modificar o validator de identificadores de fatura usados em URLs.

Anunciar `capabilities.device_session_id_dotted=true` adicionalmente à capability
existente em `billing/current`. Frontend novo só inclui valor com ponto quando a nova
capability for estritamente verdadeira; backend antigo recebe o body legado sem esse
valor. Sessões do formato anterior continuam aceitas com a capability original. Atualizar
as refs do checkout/cartão sem remontar o Brick nem reexecutar POST. Ausência de sessão
continua opcional; não criar retry financeiro ou logs com seu conteúdo.

## Consequências e rollout

Frontend/backend continuam independentes. Preferir backend primeiro, mas a capability
aditiva também protege frontend novo contra backend 0.1.731. Frontend antigo contra
backend novo mantém comportamento anterior. Sem env, pacote ou migration nova; layout
inalterado, sem necessidade de alteração visual/Builder. Não duplicar o script antifraude.
Não alterar conta Mercado Pago, tipo de API, cartão, planos ou dados persistidos.

Rollback coordenado por revert: frontend primeiro, recarregar abas que possam ter
capability positiva em cache e só depois retornar backend à allowlist anterior.

## Validação executada

Testes aprovados com string unitária sintética de 231 caracteres contendo ponto (não o identificador
real), preservação byte-exata no header e isolamento por operação, schema dos dois
endpoints, limites e tentativa de injeção. Cobertura de SSR, capability ausente/antiga/nova e
ausência de retries. Check integral aprovado (995 testes backend; 92 video aprovados e 13 opcionais
ignorados), builds backend/frontend e revisão independente aprovados. Smoke isolado:
backend ping/health/ready 200, billing privado sem sessão 401; frontend version 200 em
0.1.732 e browser de pagamento redirecionando ao login com callback. Sem checkout
autenticado ponta a ponta ou envio de cartão. Testes focais: 10 backend e 9 frontend.
Sem acesso ao banco remoto nem credenciais reais de provider durante validação. Testes
unitários não substituem aprovação financeira real; a causa do 400 permanece em investigação.

## Referências

- [Mercado Pago: coleta e envio de Device ID](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/how-tos/improve-payment-approval/recommendations)
- ADR-0641 e evidências operacionais do PR #133.
