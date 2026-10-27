# ADR-0641 — Correlação segura de cobrança e sessão antifraude

## Status

Aceito; implementação validada localmente, publicação bloqueada — 2026-10-27.

## Task relacionada

TASK-32 — Checkout de assinatura, complemento de diagnóstico.

## Contexto

Após troca de conta recebedora, respostas genéricas de criação não distinguem falha de
credenciais de rejeição por risco. Consultas autenticadas somente leitura de faturas e
pagamentos confirmaram causas diferentes antes/depois da configuração de Assinaturas.
O SDK frontend já coleta sinais antifraude, mas não encaminha explicitamente sua sessão
ao backend. Não há evidência de que essa omissão seja a causa da recusa.

## Decisão

Encaminhar `device_session_id` opcional, limitado e validado, capturado do SDK no submit;
nunca substituir pelo identificador Lectum, registrar seu valor ou persistir a sessão.
O adapter traduz para `meliSessionId` em configuração isolada por operação: o SDK Node
mescla opções mutáveis, podendo reter a sessão anterior se um client for compartilhado.

O validator antigo rejeita campos desconhecidos no body. Por isso `billing/current`
anuncia `capabilities.device_session_id=true`; o frontend só inclui a sessão quando essa
capability foi confirmada. Backend antigo/consulta indisponível omite o campo, sem retry
de POST. Rollback coordenado: frontend primeiro, recarregar abas e depois backend para
não preservar capability antiga em uma aba já aberta.

Logs usam operação fixa, timestamp, hash da referência local e categorias fechadas.
Webhooks autenticados de fatura consultam somente GET para classificar a resposta real,
correlacionando com assinatura local sem expor payloads, mensagens técnicas, identificadores
pessoais, cartão, token ou sessão. Diagnóstico não altera o fluxo de ativação e não cria
retries de cobrança; indisponibilidade de leitura tem fallback seguro.

A consulta diagnóstica de fatura tem timeout de 3 segundos e ocorre uma vez por evento
persistido novo. Duplicatas não reconsultam após falha; não se promete reconciliação ou
diagnóstico garantido em falha de rede. Operação manual posterior deve ser somente leitura.

## Consequências e deploy

Sem novas dependências, variáveis ou alterações de banco. Contrato aditivo com ausência
permitida durante rollout independente. Preferir backend primeiro. Rollback por revert
de código, sem apagar dados. Não mudar API, credenciais ou configuração Mercado Pago.
Publicação autorizada pelo usuário; validar local e homolog antes do PR homolog → main.
Nenhum teste deve criar cobrança real. Sinal antifraude adicional não garante aprovação.

## Fontes

- https://www.mercadopago.com.br/developers/pt/docs/subscriptions/how-tos/improve-payment-approval/recommendations
- https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/get-authorized-payment/get
- SDK mercadopago instalado: opções `meliSessionId` e isolamento necessário de `config.options`.

## Validação

Backend check (992 testes), frontend check, admin check e video check aprovados. Video
reporta 13 testes opcionais ignorados. Builds backend/frontend aprovados. Testes novos
cobrem contrato real de validators, ausência/capability, concorrência no SDK, não retenção
de sessão, GET limitado, classificação fechada e correlação sem expor valores. Interceptação
de transporte existe somente em testes unitários; não representa aprovação real do gateway.

Prisma gerado. Migrations existentes aplicadas a PostgreSQL local efêmero separado;
`/health`, `/ready`, `/ping` HTTP 200 e rotas privadas de billing HTTP 401 sem sessão.
Browser local confirmou redirect ao login sem enviar dados de cartão. Não foi realizado
checkout autenticado/pagamento: nenhuma cobrança foi autorizada como teste.

Guardas de segredos, encoding, ADRs, tasks, source-safety, env e ciclos aprovados. Check
integral da raiz bloqueado por notificações já acima de 600 linhas no HEAD recebido.
Solicitada autorização para extração mínima sem comportamento novo. Frontend também
reporta uma informação Biome preexistente sobre template literal em teste de analytics;
build informa depreciação preexistente do import de Sentry. Não ocultar esses resultados.

Usado pnpm 10.33.0 via Corepack no PATH dos subprocessos. Uma invocação inicial do pnpm
12 do ambiente reificou dependências; efeitos em lock/workspace foram restaurados e
backend/frontend reinstalados com frozen-lockfile no pnpm correto. Nenhum pacote novo.
Backend test runner exige NODE_ENV não definido para testes que validam ausência de
ambiente; execução final sem a variável passou integralmente. Credenciais de serviços
foram removidas do ambiente dos checks, banco de testes apontado a loopback.

## Bloqueio de promoção

Autodeploy Dokploy de homolog/produção confirmado desligado na UI. Homolog backend em
0.1.617 com health/ready 200 não valida este release. Vercel atual sem acesso à equipe
Lectum; login solicitado. Não promover sem resolver check raiz e smoke de homolog da
versão nova. Nenhum deploy ou alteração financeira executado nesta implementação.

Atualização: extração mínima autorizada na TASK-277 resolveu o gate arquitetural e a
informação Biome. Check integral da raiz e builds backend/frontend passam em 0.1.731.
Primeiro push de 0.1.730 foi bloqueado pelo hook (nenhum bypass); promoção segue
pendente do smoke homolog da nova versão e acesso Vercel adequado.
