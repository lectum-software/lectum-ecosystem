# TASK-355 - Email de nova resposta

Status: implementada e validada localmente. Sem push/deploy ou envios reais.

## Escopo

Enviar aviso transacional ao autor do post ou comentario diretamente respondido,
para pacientes e psicologos. Reutilizar SMTP, template e preferencias existentes.
Nao enviar conteudo da conversa, nao notificar a propria resposta nem publicacoes
silenciadas. Nao enviar avisos retroativos.

## Aceite

- [x] Destinatario direto e link com focusReplyId.
- [x] Preferencias, conta ativa e email confirmado respeitados.
- [x] Claim atomico por destinatario/resposta e auditoria de envio/falha.
- [x] Testes locais, check/build e revisao.

## Evidencias e limites

Backend check: 1619 testes, 1559 passaram, 60 skips preexistentes, zero falhas.
Apos os ajustes finais: 14 testes de reply-email e 1 teste do template/transporte
real sem SMTP passaram. Build backend e check:version passaram em 0.1.856.
Sem banco local operacional: nao validado end-to-end via API, /ready ou entrega
em caixa real. Deduplicacao concorrente testada com double local e chave primaria
do schema existente revisada. Validar uma resposta controlada antes da ativacao
produtiva, com destinatario de teste autorizado.

## Operacao

Sem migration, pacote novo ou variavel obrigatoria. Usa EMAIL_API_* e WEB_URL
existentes. Somente novos eventos apos deploy; publicacao requer autorizacao.
Rollback: artefato backend anterior. SMTP e banco reais nao usados nos testes.
Falhas ou claims interrompidos nao sao reenviados automaticamente, evitando
duplicidade quando o aceite SMTP e incerto. Consultar ADR-0719.
