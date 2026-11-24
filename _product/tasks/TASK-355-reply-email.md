# TASK-355 - Email de nova resposta

Status: implementada e validada localmente. Sem push/deploy ou envios reais.

## Publicacao autorizada em 24/11/2026

Usuario aprovou o layout final e solicitou producao. Confirmou novamente que os
autodeploys de homologacao estao desligados. Preflight: /ping 0.1.854, /health e
/ready HTTP 200. Promocao via PR homolog -> main; deploy somente do backend.
Dokploy indisponivel na automacao: acionamento manual pelo proprietario depois
do merge. Nenhum email real de teste autorizado ou disparado nesta etapa.

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
Apos os ajustes finais: 15 testes de reply-email e 1 teste do template/transporte
real sem SMTP passaram. Check final 0.1.857: 1622 testes, 1562 passaram,
60 skips preexistentes e zero falhas. Check:version passou em 0.1.857.
Sem banco local operacional: nao validado end-to-end via API, /ready ou entrega
em caixa real. Deduplicacao concorrente testada com double local e chave primaria
do schema existente revisada. Validar uma resposta controlada antes da ativacao
produtiva, com destinatario de teste autorizado.

## Operacao

Revisao visual solicitada: espacamento antes do CTA exclusivo destes avisos;
orientacao de preferencias em 11px/17px no rodape, depois de Enviado por Lectum.
CTA usa #004df5, azul predominante extraido do simbolo em backend/public/logo.png.
Os demais emails transacionais preservam o layout anterior. Previa regenerada
do template real para post/comentario em 390px e 680px, sem SMTP.

Sem migration, pacote novo ou variavel obrigatoria. Usa EMAIL_API_* e WEB_URL
existentes. Somente novos eventos apos deploy; publicacao requer autorizacao.
Rollback: artefato backend anterior. SMTP e banco reais nao usados nos testes.
Falhas ou claims interrompidos nao sao reenviados automaticamente, evitando
duplicidade quando o aceite SMTP e incerto. Consultar ADR-0719.
