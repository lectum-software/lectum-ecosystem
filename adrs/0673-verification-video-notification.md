# ADR-0673 - Aviso fixo sobre verificacao profissional

## Decisao

Um aviso editorial fixo, disponivel a visitantes e usuarios autenticados, abre o
video aprovado em modal nativa de tela cheia. Reutiliza VerticalVideoPlayer e a
barra de progresso existente, com layout progress opcional que nao altera os
players atuais. X fecha, Escape funciona, foco retorna ao aviso e o modal
existente suspende a midia ao fundo e bloqueia a rolagem.

O aviso nao pertence ao lote de notificacoes sociais: abrir a lista ou marcar
todas como lidas nao comprova reproducao. O indicador do navbar agrega os dois
estados, portanto outras notificacoes podem mante-lo visivel depois do video.

A conclusao usa TimeRanges played do navegador: pelo menos 90% da duracao.
Saltos de seek nao contam como trechos vistos. Isso e estado de experiencia,
nao comprovacao juridica nem autorizacao de acesso. O endpoint autenticado
registra somente a conta da sessao, sem aceitar user_id ou versao do cliente.

Contas persistem a conclusao em user_background, usando SHA-256 de finalidade,
versao e usuario como chave idempotente. Visitantes usam storage local sem
transferir automaticamente o estado anonimo para qualquer conta. Indisponibilidade
do storage conserva apenas a sessao; falha na API nao apaga o indicador.

O MP4 fornecido (H.264/AAC, 1080x1920, aproximadamente 33 segundos, 10 MB) e asset
estatico versionado do Frontend, carregado apenas ao abrir o aviso. Nao usa
upload em contas de profissionais nem campanhas de push.

## Rollout e rollback

Sem migration, package ou variavel nova. Backend antes do Frontend. Admin/Video
nao mudam. Cliente com API antiga conserva o indicador ate sincronizar.
Rollback de codigo preserva registros, sem necessidade de reversao de dados.
Testes apenas em localhost com PostgreSQL descartavel isolado.
