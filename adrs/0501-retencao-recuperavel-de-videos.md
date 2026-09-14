# ADR-0501 — Retenção recuperável de vídeos

## Status

Accepted

## Task relacionada

TASK-181

## Contexto

O operador pediu recuperação de conteúdos excluídos/versões antigas, com identificação
para revisão periódica futura. O inventário R2 contém objetos sem video_asset e múltiplos
tipos de vínculo. Reaproveitar deleted como autorização de exclusão física ou inventar
UID Stream para esses arquivos seria incorreto. A substituição do perfil ainda excluía
cópias Stream e o scheduler legado podia expirar artefatos R2.

## Decisão

Criar video_retention_record, catálogo operacional por provider/namespace/object key,
independente da publicação e sem cascade de usuário. Manter motivo controlado, retained_at,
review_after nullable, deletion_hold=true e metadados mínimos de integridade. Identidade
hash deduplica registro; não é credencial. Campos técnicos permanecem internos.

Aposentar logicamente não reativa acesso: a autorização existente continua recusando
ativos deleted/canceled. Registrar retenção de substituições e cancelamentos prontos na
mesma transação da aposentadoria. Cancelamento de reserva nunca pronta permanece distinto.
Helpers de vídeo legado não excluem bytes; imagens mantêm seu comportamento atual.
O scheduler antigo deixa de iniciar. Nenhum job destrutivo ou liberação do hold é criado.

Catalogar R2 somente por CLI manual em lotes. Dry-run não grava; apply exige confirmação
do ambiente e só cria metadados. A inspeção lê prefixo limitado e falha fechada; não migra,
apaga, altera metadata no provider nem associa vídeos a conteúdo. Reexecução não prorroga
retenção, não remove hold e não sobrescreve revisão existente. Mudança de objeto gera
conflito conservador, não atualiza silenciosamente a identidade observada.

## Consequências

- Recuperação continua possível enquanto o objeto existe, sem repúblicação automática.
- Custos de armazenamento podem aumentar; não há promessa de retenção infinita ou prazo legal.
- Data de revisão não é expiração e não habilita purge. Política de retenção, aprovação,
  reconciliação atualizada e recuperação verificada serão requisitos da futura limpeza.
- Uma marcação não comprova cópia íntegra/qualidade nem esvazia R2. Originais legados e
  multipart observado permanecem intactos até operação específica posterior.

## Produção e rollout

Tabela nova compatível; sem coluna obrigatória em registros existentes, env nova ou
package. Migration Prisma antes do backend, catálogo manual depois; sem backfill no start.
Contratos públicos não mudam. Backend/Next/video podem coexistir em versões diferentes.
Rollback conserva o catálogo, mas código antigo pode apagar versões: não recomendar
rollback com troca/cancelamento de vídeo em andamento. Nenhuma promoção main nesta task.

## Validação

Migration dev aplicada em PostgreSQL local descartável, sem usar o banco do `.env`.
Backend Prisma/TypeScript/Biome, 791 testes, build, `pnpm check` e versão 0.1.383 aprovados.
Imagem Docker compilada validada com 12 verificações reais de retenção/persistência/CLI
e 28 regressões reais de associação. Sem mocks nem chamadas Cloudflare nessas provas.
O inventário R2 real e a gravação das marcações remotas ainda dependem do operador;
não são certificados pelo teste isolado. Runbook e evidências na TASK-181.

## Pendências

Execução manual do catálogo em homolog, prazo de retenção, transferência do acervo legado,
UI de recuperação/revisão e eventual limpeza futura permanecem operações distintas.
