# ADR-0702 — Contact sem login e com consentimento anterior

Status: aceito para implementação local, 22/11/2026.

O botão compartilhado cobre feed, diretório, perfil e vídeos. Visitantes enviam somente o token já confirmado no servidor antes do clique. A opção de associação à conta é independente. Recusa, captura pendente ou revogação não criam conversões.

A outbox recebe guest_token_hash opcional com FK e cascade para o consentimento anônimo. A chave interna legada patient_contact continua representando Contact; não afirma relação clínica. A origem canônica é a ação WhatsApp recebida no servidor na mesma requisição, com visitante e sessão correspondentes. Não há backfill. Deduplicação usa a origem canônica e nunca troca seu consentimento.

Claim e envio releem a ação e o consentimento, exigindo documento vigente, navegador capturado antes da ação, validade e ausência de revogação/claim. Login posterior não reassocia conversões antigas. Payload mantém apenas origem pública revisada, identificador de navegador e contexto técnico consentido; nunca conteúdo, destino ou identificador do profissional. IP segue gate próprio.

Migração expansiva, sem reescrever dados. Volume proporcional a cliques consentidos, elegibilidade de sete dias e retenção de deduplicação existente. Backend novo antes do frontend; workers antigos não suportam guest jobs, portanto concluir rollout backend antes de habilitar captura frontend. Rollback mantém envio desativado e restaura frontend; coluna opcional permanece. Nenhuma variável nova, reset ou seed.

Validação: migração local, integração HTTP/PostgreSQL, pnpm check, builds e Edge 390/1440 aprovados. Nenhum envio externo ou ativação geral. Evidências na TASK-337.
