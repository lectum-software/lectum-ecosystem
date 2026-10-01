# ADR-0543: Reconciliação manual e não destrutiva de uploads Stream

## Status

Accepted

## Task relacionada

TASK-198

## Contexto

Reserva precede a transferência. Cliente pode desaparecer antes do polling/cleanup;
o backend não reconcilia autonomamente todas as reservas. Logs efêmeros não demonstram
causa histórica. Pendingupload não prova zero bytes, vídeo publicado ou defeito no aparelho.

## Decisão

CLI manual de inventário/GET, dry-run padrão. Não reutilizar serviço de status que pode
autoassociar perfil e remover mídia anterior. Apply requer asset único, ambiente confirmado
e CAS do estado/UID/versão observada. Snapshot concorrente não sobrepõe webhook/cancelamento.
Somente uploads diretos de Comunidades em uploading/processing ou error upload_expired
são elegíveis. Prontos/excluídos/cancelados, migrações e apresentação ficam read-only.

Provider ready recupera estado sem reenviar bytes; pendingupload só vira upload_expired
após GET válido e prazo vencido. Falha HTTP, inclusive 404, não altera estado. Nunca alterar
autorização, contas, associações, post/resposta, provider ou bytes. Referências hash e
booleans distinguem dono da resposta de autor original, sem dados pessoais/segredos.
Não adicionar scheduler nem modificar frontend sem defeito demonstrado no cliente.

## Consequências

- Permite investigar/reconciliar sem repetir upload produtivo.
- Não recupera bytes não recebidos nem remove pendências do painel Cloudflare.
- Não substitui observabilidade durável ou manutenção periódica; exigem escopo próprio.
- Ativo sem associação continua privado: comando não decide publicação.

## Produção e rollout

Sem schema/migration, env nova, package ou boot automático. Só backend muda; contratos
compatíveis com outros apps. Homolog primeiro, health/ready/ping e CLI. Produção exige
inventário e autorização de apply. Rollback de código não muda dados nem apaga mídia.

## Validação e pendências

Executados: dez testes de políticas/parser, dezesseis verificações de CAS/CLI em PostgreSQL
18.6 isolado e build backend. Baseline raiz e smoke de publicação são acompanhados na
TASK-198 e não devem ser presumidos pela presença deste ADR.

Inventário produtivo recebido: reserva pendente sem associação, pertencente a outro dono,
com envio posterior ready de mesmo tamanho/formato associado a resposta. Isso não comprova
identidade de bytes nem causa da interrupção. GET remoto autenticado ainda pendente;
template local não equivale a acesso. Nenhum apply ou reparo de mídia produtiva realizado.
