# ADR-0623 - Inicio programado do resumo semanal

Status: Accepted

## Contexto

Usuario autorizou primeiro envio em 19/10/2026 as 09h de Brasilia, referente a 12/10 a 18/10. Ativar a versao 0.1.667 no sabado enviaria o resumo de 05/10 a 11/10.

## Decisao

Adicionar WEEKLY_WHATSAPP_REPORTS_START_AT opcional, em formato UTC estrito YYYY-MM-DDTHH:mm:ssZ. Ausente preserva comportamento; valor invalido bloqueia geracao e entrega. Comparar com availableAt da semana, nao apenas com o relogio atual, para nunca recuperar semanas anteriores ao inicio autorizado. A verificacao existente de segunda 09h continua em vigor.

Primeira liberacao: 2026-10-19T12:00:00Z. O scheduler existente executa no primeiro ciclo a partir desse horario, nao necessariamente no segundo exato. Mantem deduplicacao e preferencias de push da ADR-0622.

## Rollout

Publicar backend com a trava antes de ativar. Em PRODUCTION-Lectum > Backend configurar WEEKLY_WHATSAPP_REPORTS_START_AT=2026-10-19T12:00:00Z e WEEKLY_WHATSAPP_REPORTS_ENABLED=true; confirmar que NOTIFICATION_DIGESTS_ENABLED nao esta false. Nunca ativar ENABLED no backend 0.1.667, que ignora START_AT. Se NOTIFICATION_DIGESTS_ENABLED estiver false, avaliar os demais digests antes de habilitar o scheduler compartilhado.

Sem migration nem alteracao de interface. Rollback: desativar WEEKLY_WHATSAPP_REPORTS_ENABLED antes de retornar ao backend antigo. Nao remover registros existentes. Sem novos pacotes.
