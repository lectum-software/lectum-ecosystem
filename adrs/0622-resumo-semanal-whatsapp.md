# ADR-0622 - Resumo semanal WhatsApp

Status: Accepted

## Contexto

Psicologos gratuitos e assinantes informam agendamentos via resumo semanal. Analytics completo permanece pago. Estimativa de pessoas nao equivale a conversao comprovada.

## Decisao

Reutilizar identidade anonima aleatoria do Analytics. Deduplicar por conta quando presente e por navegador caso contrario; eventos sem identidade legados permanecem distintos. Contagem compartilhada entre resumo e indicador principal.

Nos detalhamentos do Analytics do profissional, selecionar o primeiro evento por pessoa dentro do conjunto filtrado. Categorias independentes podem compartilhar visitantes; sua soma nao substitui o total unico. Nao identificar pacientes nem expor identificadores nos resumos. Uma pessoa anonima que depois autentica pode aparecer duas vezes: a contagem continua sendo estimativa, sem reconciliacao invasiva de identidade.

Tabela expansiva com unicidade profissional/semana, notificacao criada atomicamente e resposta nullable. Abertura automatica reclamada atomicamente no servidor; somente semana anterior mais recente depois de segunda 09h de Brasilia. Pendencia protegida de marcar lida individual/coletivamente. Resumos antigos acessiveis somente pela notificacao.

`WEEKLY_WHATSAPP_REPORTS_ENABLED=true` habilita geracao/entrega; ausente desativa com seguranca. Habilitar em producao somente apos migration e revisao das semanas elegiveis. Nenhum push real nos testes locais. Agregacao de pacientes pelo fim da semana, com indicador de semanas pendentes; filtros parciais nao permitem atribuir agendamentos a dias individuais.

Reutilizar o ciclo existente de notificacoes, que tambem depende de `NOTIFICATION_DIGESTS_ENABLED`. Push respeita preferencia e inscricoes existentes. A tentativa e reclamada atomicamente antes do provider; falhas ambiguas nao sao reenviadas automaticamente. Uma interrupcao em `sending` exige reconciliacao operacional para evitar duplicatas. Sem permissao de push, a notificacao interna continua disponivel.

No admin, adicionar Pacientes adquiridos imediatamente depois de Cliques no WhatsApp dentro de Estatisticas > Conversao. O endpoint administrativo existente retorna total, pendencias e historico somente leitura, com origem `psychologist_reported`. O filtro usa a semana de origem, nao a data de preenchimento; o total cobre todo o intervalo e o historico mostra ate 104 semanas recentes. Correcoes feitas pelo profissional atualizam o mesmo registro. Nao alterar outros diagnosticos administrativos.

Gratuitos recebem o resumo e podem responder, mas o endpoint de Analytics retorna apenas o estado de previa, sem metricas reais. O frontend mostra contadores estaticos embacados e direciona o upgrade ao checkout de cartao existente. Resumos antigos continuam nas notificacoes; nao ha formulario de resposta dentro do Analytics.

## Rollout e rollback

Migration aditiva antes do backend, depois frontend e admin. Backend antigo ignora tabela/campo novos; admin novo tolera ausencia do campo aditivo. Desabilitar flag pausa geracao; respostas existentes permanecem. Reverter codigo nao apaga respostas. Sem novos pacotes. Validacao visual e execucao de testes registradas na TASK-260.
