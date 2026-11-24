# ADR-0719 - Email transacional para respostas diretas

O evento notifyNewPostReply ja resolve o destinatario direto, exclui auto-respostas
e filtra publicacoes silenciadas. Acrescentar email apos os canais existentes,
independente de in-app e push. Usar nova_resposta/email e o template transacional.

A chave primaria da notification_delivery deriva de SHA-256 de destinatario e
resposta, com prefixo proprio. Insercao antes do SMTP reserva o envio atomicamente;
P2002 significa evento ja tratado. Nao exige migration. Nao reutilizar o estado
da notificacao interna como deduplicador de email.

Entrega at-most-once: nao repetir automaticamente falhas ou queued apos crash,
pois SMTP pode ter aceitado o email antes da queda. Registro sent significa aceite
do provedor, nao leitura/entrega confirmada. Falhas nao invalidam respostas salvas.
SMTP usa timeouts de conexao, saudacao e inatividade de 10 segundos neste envio;
os demais emails preservam seus defaults. O envio e aguardado no fluxo existente.

O email nao inclui nome do autor nem texto/titulo da conversa. Link construido
com origem publica validada e focusReplyId, sem tokens. Somente contas ativas,
nao excluidas e confirmadas recebem. Sem campanhas ou varreduras retroativas.

Deploy apenas backend, apos autorizacao; sem acao de banco. Rollback pelo artefato
anterior, preservando historico de entregas. Configuracao SMTP ausente gera skipped.
