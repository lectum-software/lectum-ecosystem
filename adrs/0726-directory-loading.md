# ADR-0726 - Cookies e imagens no diretorio

## Contexto

PageSpeed de /psicologos apontou contraste no aceite de cookies, texto do aviso
como LCP e avatares 512px exibidos a aproximadamente 53px. As melhorias do feed
na TASK-360 nao cobriam os avatares das acoes do diretorio.

## Decisao

Usar tokens especificos do botao de cookies, sem alterar a paleta primaria global.
Remover apenas os 1800ms iniciais apos elegibilidade do aviso. Preservar adiamento
apos interacao, superficies ocupadas, identidade, escolhas e reserva de prompt.
Nao ocultar aviso nem alterar permissoes para melhorar a metrica.
Ativar next/image para os avatares HTTPS mobile/desktop do diretorio, com sizes
existentes e fallback HTTP local, seguindo a TASK-360. Nao alterar midia assinada.

## Consequencias

O aviso pode aparecer antes; nao ha promessa de nota ou LCP especificos.
Otimizacao usa cache do frontend e pode gerar custo no provedor. Validar imagens
reais em build local. Rollback por reversao dos componentes e tokens.
