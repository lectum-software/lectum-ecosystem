# TASK-261 - Inicio programado do resumo semanal

Status: Done

## Escopo

Primeiro envio autorizado pelo usuario: 19/10/2026, a partir de 09h em America/Sao_Paulo, referente a 12/10 a 18/10. Sem envio retroativo de semanas anteriores.

- [x] Acrescentar limite inicial opcional por instante UTC, falhando fechado se invalido.
- [x] Aplicar o limite antes de consultas, criacao de notificacoes e envio push.
- [x] Testar primeira semana, semanas anteriores/seguintes, horario e integracao local.
- [x] Validar checks/build e registrar rollout com ativacao somente apos novo backend.

Sem mudanca visual, migration ou dependencia. ADR-0623.

## Validacao - 0.1.668

- Backend check completo aprovado, incluindo 925 testes; build aprovado.
- Sete testes focados de calendario/politica aprovados, incluindo cutoff e datas invalidas.
- Integracao real em PostgreSQL local isolado aprovada: cutoff futuro/invalido nao cria notificacao; primeiro horario elegivel libera uma unica semana apesar de concorrencia. Preferencias de push desligadas e nenhum envio externo.
- Versoes sincronizadas; arquivo de configuracao de producao e ADR documentam a ordem segura. Ativacao externa depende da publicacao do backend com a trava e das variaveis no Dokploy; nao confundir conclusao do codigo com ativacao em producao.
