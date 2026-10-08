# ADR-0577 - Avatar e sugestao de cor na criacao

Status: Accepted

## Decisao

Extrair sugestao localmente de uma amostra Canvas 64x64 do recorte central do
avatar, sem envio remoto, IA ou pacote. Agrupar canais em faixas de 32 e usar
a media do grupo mais frequente. Ignorar pixels quase transparentes e preferir
grupos cromaticos significativos (>= 5% dos pixels opacos) para nao escolher
o branco do desenho. Para imagens neutras, usar o grupo neutro dominante.
Imagem transparente ou falha de leitura deixa a cor editavel com fallback
existente. Fotografias/multicores podem precisar de ajuste manual.

Cor manual e protegida durante analises assincronas e troca/remocao do avatar.
Restaurar sugestao e acao explicita. Descartar resultados de selecoes antigas
e liberar object URLs. Upload so no submit, pelo contrato atual de avatar.

Reutilizar criacao JSON seguida de upload preparado. Guardar identidade criada
na tela antes do upload; falha parcial oferece retry so do avatar ou acesso ao
detalhe. Dados ja criados nao permanecem editaveis como se fossem rascunho.
Nao e uma transacao atomica: a comunidade pode aparecer sem avatar entre as
duas requisicoes. Nao alterar backend/banco nesta task.

## Consequencias

Baixa complexidade na sugestao; maior cuidado na recuperacao da operacao em
duas etapas. Sem credenciais novas ou custo de provider. Revisao manual
permanece disponivel. Apenas Admin deve ser publicado; rollback de codigo
nao apaga comunidades nem avatares ja salvos.
