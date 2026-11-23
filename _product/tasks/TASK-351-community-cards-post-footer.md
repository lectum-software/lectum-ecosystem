# TASK-351 - Cards compactos e final da publicacao

## Escopo

Aplicar a previa aprovada: cards de 204px, titulos centralizados em duas linhas e contagem Manrope 12px/500. Remover o indice visual duplicado de videos no final da publicacao. Reduzir o espaco inferior, preservando folga para o compositor fixo e safe area.

Referencia: imagens e previa aprovadas no chat. Inventario consultado; Builder indisponivel. Sem mudancas de API ou deploy.

## Aceite

- [x] Cards compactos com botoes e contagens alinhados.
- [x] Sem secao Videos desta publicacao; videos e transcricoes preservados.
- [x] Remover padding inferior duplicado e reduzir reserva mobile.
- [x] Validar testes, build e navegador local.

Validacao: 16 testes focados passaram, Biome passou e build frontend passou. Chrome local em 390x844 confirmou ausencia do indice, ultimo bloco terminando em 740.34px e compositor iniciando em 748.25px (folga de 7.91px). Leitura do post publico, sem mutacoes. Captura em `.tmp/previa-final-publicacao.png`. Teclado nativo do iPhone nao testado. Sem push/deploy.
