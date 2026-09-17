# ADR-0511 — Isolamento do serviço de vídeo de produção na porta 4000

## Status

Accepted — validação operacional de credenciais pendente

## Task relacionada

TASK-190

## Contexto

O servidor dedicado mantém duas implantações independentes de `video/`: homologação na porta 3003 e
produção planejada na porta 4000. A aplicação suporta `PORT` configurável, mas o isolamento não pode
ser presumido apenas por alterar a porta: Redis, volume persistente, credencial interna e regra de rede
precisam ser independentes para impedir mistura de jobs e outputs entre ambientes.

## Decisão proposta

Manter produção na porta privada 4000 por WireGuard e homologação na 3003, com recursos de runtime
separados por implantação: Redis/credencial, volume de mídia e `VIDEO_SERVICE_API_KEY`. O backend de
cada ambiente alcança somente sua API correspondente por endereço WireGuard e porta explícita. A porta
não é publicada para a Internet; Redis e worker não expõem portas externas.

## Consequências

- O Compose já injeta `PORT` tanto na API quanto nos probes da API/worker; não é necessário bifurcar
  código ou criar um serviço novo para mudar de 3003 para 4000.
- A confirmação depende de evidência operacional nos dois servidores e do check autenticado do backend
  de produção, sem executar upload ou transformação de vídeo.
- Se algum recurso estiver compartilhado, a implantação não é aprovada até sua correção compatível e
  uma nova validação.

## Produção e rollout

- Sem migration, mudança de contrato público, novo package ou nova env de produto.
- A alteração de `VIDEO_PROCESSING_SERVICE_URL` para a URL privada `:4000`, se necessária, exige
  validar o serviço primeiro e depois o backend de produção. Nunca usar URL pública como fallback.
- Esta ADR não promove branch por iniciativa própria. Em 2026-09-16, após smoke de homolog e pedido
  explícito do usuário, a promoção revisada `homolog` → `main` foi feita pelo PR #3 sem excluir
  `homolog`; o backend público de produção respondeu saudável na versão 0.1.414. A validação da
  conexão backend → vídeo `:4000` continua obrigatória e independente.

## Validação

A conectividade local, via WireGuard, o bloqueio público e a autenticação do backend foram confirmados
em produção. A comparação sanitizada das credenciais e dos recursos entre os dois stacks não foi
concluída; não declarar essa parte como validada até retomar a TASK-190.
