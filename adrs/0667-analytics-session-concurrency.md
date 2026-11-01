# ADR-0667 - Atualizacao condicional da sessao de analytics

Data: 2026-10-31. Status: aceito.

## Contexto

Page views, localizacao, atencao, video e acoes compartilham visitor_session. O read-before-upsert serializavel gera P2034 sob concorrencia normal do navegador e pode esgotar o retry. O diagnostico e a reproducao utilizaram apenas PostgreSQL local.

## Decisao

Manter Prisma e transacao, usando ReadCommitted com createMany/skipDuplicates pela chave unica visitor_id/session_id e updateMany condicionado a user_id nulo ou igual ao solicitante. A atualizacao faz a verificacao de autoria sob lock de linha; findUnique ocorre antes do commit. Nao usar check de autoria fora da atualizacao, lock global, aumento arbitrario de retries ou retorno de sucesso quando a gravacao falha.

O primeiro insert vence; chamadas concorrentes aguardam a mesma linha. A vinculacao anonima existente tambem usa predicado user_id nulo e continua compativel. Outros usuarios e chamadas anonimas recebem null quando a sessao ja pertence a alguem. Nao mudar isolamento de transacoes de pagamentos ou outros dominios.

## Consequencias

A flag ANALYTICS_SESSION_INTEGRATION e documentada no exemplo local e explicitamente excluida pelo teste do template de producao. Nao configurar essa flag nos provedores; ela so habilita o teste que exige banco local dev/test.

Tres operacoes pequenas por sessao, serializadas somente na linha disputada. Falhas reais de banco continuam propagadas e sanitizadas na fronteira HTTP. Sem migration/configuracao/dependencia nova. Testes reais cobrem criacao concorrente, disputa de autoria, chamada anonima, metadados e vinculacao. Rollback do backend restaura a implementacao anterior sem alterar esquema ou dados.
