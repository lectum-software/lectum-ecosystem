# ADR-0625 - Historico de pacientes adquiridos

Status: Aceito

Uma linha por profissional/semana continua sendo a fonte de verdade. Preenchimento manual nao cria notificacao ou cadastro de pacientes. notification_id torna-se opcional por migration expansiva. Atualizar substitui total, inclusive zero, e marca notificacao existente como respondida.

Calendario America/Sao_Paulo: semana atual e quatro anteriores editaveis no servidor. Historico paginado inclui semanas editaveis sem registro; antigas persistidas sao somente leitura. Quantidade limitada as pessoas estimadas da semana. Semana corrente usa contagem atual. Scheduler consolida pessoas e nao cria nova pergunta para semanas ja respondidas.

Notificacoes de semanas editaveis seguem pendentes ate resposta. Uma semana encerrada, sem possibilidade de resposta, torna-se lida ao abrir explicitamente a consulta; isto nao preenche acquired_count nem answered_at. Evita marcador pendente impossivel de resolver.

Preview gratuito retorna resumo adquirido e midia propria, nunca indicadores pagos. Semanas encerradas permanecem atribuidas ao encerramento no periodo; corrente informada entra quando periodo inclui o dia atual de Sao Paulo. Admin e Analytics compartilham predicado.

Migration local obrigatoria, sem reset; concluir atualizacao de todas as instancias do backend antes de liberar frontend com entrada manual. Rollback preserva coluna nullable e dados manuais, sem reimpor NOT NULL; apos entradas manuais, usar backend compativel com notification_id nullable, nao um Prisma Client antigo que exige a relacao. Sem nova env/dependencia ou ativacao de jobs. UI usa template, modal e RHF/Zod existentes; referencia visual do usuario e inventario local, Builder indisponivel. Validacoes na TASK-263.
