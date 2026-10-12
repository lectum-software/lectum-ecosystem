# ADR-0604 - Exclusao preserva video-respostas profissionais

## Status
Aceito e aprovado pelo usuario para producao em 11/10/2026.

## Decisao
Paciente so e impedido de excluir seu post/comentario se a cascata atingir resposta ativa de psicologo com media_type=video, independente de selo/assinatura ou disponibilidade momentanea do player. Comentario considera todos os descendentes, nao respostas de outras ramificacoes. Psicologo continua livre para excluir seu proprio conteudo; nunca conteudo alheio. Preservar verificacao de autoria e papel persistido do autor, transacao Serializable/retry, soft-delete e recalculo de contadores.

Flags has_psychologist_reply e has_verified_professional_reply sao badges, nao permissao de exclusao. Remover prebloqueio local baseado nelas: apos confirmacao, backend valida regra atual e recusa com 409 sem escrever; UI reaproveita modal de bloqueio e Silenciar, com copia sobre video. Nao criar preflight sujeito a corrida nem duplicar calculo de subarvore no cliente.

## Rollout
Sem migration, contrato novo, env ou package. Backend primeiro recomendado; cliente antigo pode continuar bloqueando texto conservadoramente ate atualizar. Cliente novo aceita 409 do servidor anterior. Rollback de codigo nao restaura conteudo excluido. Nenhuma exclusao em ambiente publicado.

## Validacao
Mobile-first 390px, capturas enviadas e proto existente; Builder indisponivel. Testes em PostgreSQL local dedicado com fixtures efemeras e repositorios reais (sem endpoints simulados), cleanup restrito ao banco de teste. Checks/builds e browser pendentes.

Evidencias tecnicas 11/10/2026: integracao PostgreSQL real (banco descartavel lectum_delete_video_audit_20261011, nunca banco de produto) passou 20 cenarios + suite. Cobertura: texto/imagem/video, exclusao logica anterior, descendente direto/indireto, video fora da ramificacao, cascata/contadores, nenhum write no bloqueio, autoria e papel persistido. Fixtures efemeras removidas; catalogo de comunidades das migrations preservado. Comando: pnpm --dir backend exec node --import tsx scripts/delete-video-policy.integration.mjs, DATABASE_URL apontando explicitamente ao banco descartavel local. Sem mocks ou assets simulados para conferencia visual.

Backend Biome/Prisma/TypeScript e build aprovados. Suite geral: 895/896; optional-auth-failure apresentou timeout sob concorrencia e passou na repeticao isolada. Root pnpm check bloqueado por BOM preexistente em ADR-0599; source-size separado bloqueado por reply-card.tsx preexistente (708/700). Guards ADR/tasks/source-safety aprovados. Nenhum desses arquivos alheios foi alterado para mascarar resultados. Logs .tmp/oct11-delete-video-*.log. Frontend e conferencia autenticada em andamento; sem bump/commit/push/deploy desta task.

Frontend check completo e build aprovados; backend /ping local respondeu 200 apos reinicio com a regra nova. Frontend reiniciado apos build. Browser integrado nao concluiu Page.navigate (timeout); conferencia autenticada pendente. Sem version:bump, commit, push ou deploy desta task.

Aprovacao visual explicita recebida: Conferidos e aprovados. Commit proprio em homolog; publicacao autorizada condicionada aos gates completos do lote.
