# ADR-0555 - Favoritar junto ao selo e rotulo profissional neutro

## Status

Aceita em 2026-10-05. TASK-215.

## Contexto

A acao alinhada a direita se afasta do profissional em nomes curtos.
O rotulo azul Resposta profissional compete com Favoritar.

## Decisao

Manter o layout flex e a reserva de 66px existente; substituir margem automatica
por 4px adicionais ao gap de 4px da linha. Alinhar o controle ao inicio da reserva.
O nome encolhe com reticencias apenas quando necessario; selo e reserva nao
encolhem. O coracao usa o mesmo inicio, e a reserva nao muda na animacao.

Preservar FeedFavoriteButton, comportamento de favoritos, icones, fonte,
transicao e reduced motion. Aplicar a todos os cabecalhos de posts e respostas,
inclusive cards reutilizados em publicacoes do perfil, sem mudar o botao hero.

Rotulos profissionais usam text-foreground/70, font-semibold e tracking-normal,
adaptados aos tokens dos temas claro e escuro. Sem brilho, gradiente ou animacao.
Azul continua reservado ao selo e a acao de favoritar nessa identificacao.

## Consequencias

Sem nova abstracao, dependencia, contrato ou migracao. O espaco reservado evita
deslocamento de nome/selo ao favoritar, ao custo de manter 66px mesmo para o
coracao de 24px. Publicacao primeiro em homolog; producao exige autorizacao.
