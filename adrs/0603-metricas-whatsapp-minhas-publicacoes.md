# ADR-0603 - Metricas WhatsApp e identidade em Minhas publicacoes

## Status
Aceito.

## Decisao
Reutilizar identidade do CommunityPostCard para Posts. Acrescentar whatsapp_clicks_count opcional no item da lista mine apenas para psicologo autenticado. Agregar important_action_event por target_id/tipo dos conteudos ja filtrados por autoria; whatsapp_click, deleted=false, excluir user_id do autor, incluindo visitantes sem login e aliases community_post/post e post_reply/reply usados no Analytics. Nao contar total do perfil, nao expor visitantes, nao aplicar filtro por assinatura e nao criar eventos. Contagem do historico registrado, nao garantia de cobertura de cliques anteriores ao tracking.

Frontend usa slot existente antes de salvar, icone neutro 17px e contador somente leitura com nome acessivel; campo ausente oculta metrica, zero confirmado aparece. Nao alterar Salvos/feed/publico.

## Rollout e validacao
Contrato aditivo, frontend tolera backend anterior. Backend primeiro recomendado, apps independentes. Sem migration/env/package novo. Rollback por reversao de codigo. Mobile-first 390px; proto/capturas do usuario, Builder indisponivel. Testes/check/build/integracao/browser pendentes. Sem push/deploy.

Validacao tecnica: check completo frontend e 27 testes focais aprovados; build frontend e backend aprovados. Backend Prisma/TypeScript/Biome aprovados, suite 895/896 com timeout do teste optional-auth-failure sob concorrencia; repeticao isolada passou sem mudanca. Integracao READ ONLY no PostgreSQL isolado conferiu 7 contribuicoes profissionais (zero cliques registrados), 2 itens de pacientes sem campo privado e ausencia do campo em Salvos. Nao validar incremento positivo como concluido: banco local nao possui evento elegivel. Sem escritas remotas ou mocks. Guards ADR/tasks/source-safety/ciclos aprovados; source-size continua bloqueado exclusivamente por reply-card.tsx preexistente com 708 linhas, fora deste ajuste. Conferencia visual solicitada; sem commit/bump/push/deploy deste complemento.

Usuario aprovou a conferencia visual de Posts e Respostas em 11/10/2026. Complemento concluido localmente, sem publicacao; limites de evidencia acima permanecem registrados. Frontend e API reiniciados, rota local e /health HTTP 200.

Fechamento: primeira tentativa de commit bloqueada por validator.ts gerado em .next/dev/types com erro de sintaxe durante recompilacao local. Frontend pausado, somente arquivo gerado removido e next typegen executado com sucesso. Repetir o mesmo commit sem novo bump; nenhum arquivo de produto ou regra de seguranca relaxado.
