# ADR-0664 - Convites de depoimento por janela de 24 horas

## Decisao

Tabelas aditivas de lotes e membros guardam o prazo fixo e a unicidade
paciente/profissional. Transacoes Serializable com retry protegem a abertura da
janela e a finalizacao. O scheduler usa o mesmo loop existente, antes do guard
VAPID: notificacao interna nao depende de push configurado. Sem campanha retroativa.

Somente media_type video com URL publicada entra; a publicacao de resposta ja
exige video pronto. Reavaliar alvo, perfil, assinatura, depoimento preexistente,
post/pai removido e silenciamento antes do envio. Depoimento oculto tambem exclui.
Preferencias de nova_resposta sao herdadas separadamente por canal. Sem email.

Claim persistente antes do provider: tentativa push at-most-once. Crash/timeout
ambiguo pode perder uma push, mas nao dispara duplicatas automaticamente. A lista
interna e o lote persistem; status sending exige inspecao operacional, nao retry
cego. Itens inelegiveis no envio nao aparecem no link do lote. Lotes vazios fecham
sem notificacao. A unicidade tambem impede insistir apos opt-out ou descarte.

## Rollout e rollback

Migracao cria somente tabelas/indices, sem backfill. Backend anterior continua
operando; manter TESTIMONIAL_INVITATIONS_ENABLED=false no rollout misto. Publicar
backend e frontend, confirmar scheduler e VAPID, inspecionar lotes e entao ativar
a flag com autorizacao. Sem flag, coleta e processamento param. Rollback desliga
a flag; preservar tabelas e historico. NOTIFICATION_DIGESTS_ENABLED=false tambem
pausa o processamento. Nenhuma configuracao remota alterada nesta task.

## Apresentacao

Copy compartilhada no backend para push/in-app; frontend acompanha o titulo.
Acao push e aditiva, filtrada por allowlist no service worker. Navegadores sem
acoes abrem a mesma lista ao tocar no corpo. Query batch opcional preserva links
antigos; autorizacao da lista sempre usa paciente autenticado, nunca ID da URL.
Menus compartilham os mesmos labels com iniciais maiusculas e conectivo e minusculo.

## Validacao

Migracao aplicada em banco PostgreSQL local isolado, sem reset. Integracao real
confirma Serializable, prazo exato, deduplicacao, filtros e acesso ao lote somente
pelo paciente dono. Browser autenticado usa API real com usuarios temporarios;
rotas legadas continuam aceitando ausencia de batch. Provider push nao foi
acionado: serializacao/acao e claim foram testados sem envio externo. Validacao
em aparelho e configuracao VAPID ficam no smoke de publicacao autorizada.
