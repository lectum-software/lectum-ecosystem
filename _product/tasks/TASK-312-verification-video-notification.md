# TASK-312 - Notificacao sobre o selo verificado

## Escopo

Aviso fixo acessivel a visitantes e contas. Video real em tela cheia com X e progresso.
O indicador permanece ate reproduzir 90% do video, sem contar saltos como visualizacao.
Visitantes guardam a conclusao neste navegador; contas guardam no backend.

## Aceite

- [x] Notificacao fixa e navegacao anonima com os textos aprovados.
- [x] Video em tela cheia, X, progresso e acessibilidade.
- [x] Indicador independente de abrir a lista ou marcar todas como lidas.
- [x] Persistencia isolada por conta e visitante.
- [x] Testes, check, build e validacao visual mobile/desktop.

## Validacao

Check geral e builds de Backend e Frontend passaram. Integracao em banco local
descartavel confirmou idempotencia e isolamento por conta; API anonima retorna 401.
Playwright com video real em 320, 390 e 1440px confirmou reproducao, X, progresso,
persistencia apos recarregar e ausencia de overflow. Saltar ao fim nao marca como
assistido; reproduzir 90% remove o indicador. Evidencias locais em .tmp/task312-*.

## Publicacao

Implementacao local em homolog. Sem push/deploy nesta tarefa.
Backend antes do Frontend; sem mudancas em Admin ou Video.
Sem migration: evidencia usa user_background com chave idempotente.
Rollback preserva evidencia registrada. Testes nao alteram dados remotos.
Builder indisponivel; lista e player existentes como referencia visual.
