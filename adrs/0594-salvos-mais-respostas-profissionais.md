# ADR-0594: Outras respostas profissionais em Salvos

Data: 2026-10-11. Status: aceita.

## Decisao

Reutilizar MoreProfessionalReplies do PostCard e a consulta em lote do feed para fornecer autores de outras respostas profissionais aos posts salvos de pacientes com destaque. Resposta salva isoladamente continua sem essa linha. Nao inferir autores pela contagem generica de comentarios.

## Compatibilidade e deploy

Campo opcional aditivo em PostListPost; clientes antigos ignoram e clientes novos toleram ausencia. Sem migration, env, package, job ou provider novo. Backend e frontend separados; preferir backend primeiro. Rollback por reversao revisada. Sem push/deploy neste lote.

## Referencia e validacao

Mobile-first 390px e desktop; referencia: capturas aprovadas e PostCard/feed existente, conforme PROTO-INVENTORY. Builder/Quick Copy indisponivel neste cliente. Usuario autorizou copia limitada de uma resposta publica adicional e dados minimos do autor para banco local isolado; origem consultada somente leitura, sem escrita em producao. Builds backend/frontend, regressao de apresentacao, integracao real de Salvos e browser autenticado em 390x844/1280x900 aprovados. Check geral encontrou timeout de concorrencia em optional-auth-failure; focal aprovado e suite backend reexecutada serialmente, sem mudar as assercoes. Selo de filtros ajustado ao token bg-primary-foreground/20 para cumprir check:source-safety sem mudanca visual.
