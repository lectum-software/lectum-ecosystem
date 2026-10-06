# ADR-0562 - Header solido no Inicio

## Status

Aceito.

## Contexto

Sobre videos, o header transparente do Inicio separava visualmente busca,
seletor de comunidade e filtro. O usuario aprovou uma faixa continua solida.

## Decisao

- Aplicar bg-background e border-b border-border no header existente.
- Preservar largura, espacos, ordem e comportamento de ocultar/reaparecer.
- Remover sombras dos tres controles, inclusive ativos; manter foco e cores.
- Manter sombra e fundo dos dropdowns para separa-los do conteudo.
- Usar tokens existentes, sem cores literais, blur ou translucidez.

## Consequencias

O conteudo deixa de aparecer nos intervalos entre controles. Nao ha mudanca
de API, navegacao, banco, dependencia ou configuracao. A alteracao limita-se
ao Inicio e nao modifica headers internos das comunidades ou dos perfis.
