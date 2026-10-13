# ADR-0615 - Comentarios e contexto pessoal

Data: 2026-10-13
Status: Aceito

## Decisao

Compartilhar o par Salvar/Compartilhar entre os menus de autoria e terceiros
na arvore. Reutilizar os handlers atuais para preservar conversao de visitante,
estado salvo e dialogos sociais. Nao alterar as barras dos posts nem metricas
das listas pessoais.

Adicionar descendants_count opcional ao DTO de resposta sem mudar replies_count.
A consulta paginada obtem apenas id/parent_reply_id dos comentarios nao excluidos
do post e soma os descendentes em tempo linear, sem recursao. A continuacao
reutiliza os registros que ja carrega. O custo adicional e uma consulta leve por
lista, O(n) por post, sem N+1 ou migracao. Pais excluidos interrompem a cadeia.
Usar o novo total no rotulo de ramo fechado, nunca como quantidade de filhos
diretos para expansao. Durante rollout com API antiga, manter o contador antigo.

Persistir a aba pessoal no parametro type da URL com router.replace e scroll:false.
Aceitar posts/replies; na ausencia ou valor invalido, usar o padrao da conta.
O historico do navegador restaura a selecao, sem storage compartilhado entre contas
ou uma entrada de historico para cada troca de aba.

## Validacao e rollout

Testar contagem profunda, ramificada e exclusoes, serializacao recursiva, estados
de menu e restauracao da aba. QA visual local continua obrigatorio antes da
publicacao. Backend e frontend separados e contrato aditivo; nenhum deploy nesta task.
