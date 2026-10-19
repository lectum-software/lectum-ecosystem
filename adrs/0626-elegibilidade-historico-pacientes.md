# ADR-0626 - Historico de pacientes somente em periodos elegiveis

Status: Accepted

O historico nao deve inventar semanas anteriores ao cadastro nem oferecer formularios para semanas sem cliques. A consulta considera users.created_at, filtra semanas sem pessoas e limita arquivos a semanas posteriores ao cadastro com people_count positivo. Contagens recentes excluem eventos anteriores ao cadastro. A API de gravacao aplica as mesmas restricoes.

Preservamos week_start como chave canonica de segunda-feira para evitar duplicidade entre historico, resumo semanal e notificacao. period_start e um campo aditivo de apresentacao, limitado ao instante de cadastro na primeira semana; clientes anteriores continuam aceitos. A janela editavel permanece semana atual e quatro anteriores. Arquivos antigos sao somente leitura e mantem a contagem consolidada.

Textos da lista usam cliques, mantendo estimativa deduplicada. As modais perguntam quantos novos pacientes o profissional adquiriu pela Lectum no periodo, sem limitar a resposta as pessoas que clicaram naquela semana. Adquiridos podem superar cliques, por exemplo por agendamentos tardios. Permanecem inteiros nao negativos com limite tecnico de 1.000.000 (ja existente no validador da API), nao uma taxa de conversao atribuida aos cliques. Analytics e admin somam a resposta sem truncamento.

Migration 20261019190000 relaxa apenas o CHECK adquirido <= pessoas, mantendo adquirido >= 0 e pessoas > 0. Nao altera registros, remove colunas ou executa backfill. Aplicar migration e backend antes do frontend na publicacao futura. Clientes anteriores continuam restritivos, mas compativeis; rollback deve preservar a restricao relaxada e o suporte de leitura a valores maiores. Publicacao nao autorizada nesta tarefa.
