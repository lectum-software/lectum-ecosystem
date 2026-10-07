# ADR-0569 - Header da comunidade por direcao de rolagem

## Status

Aceito.

## Contexto

O usuario pediu que a barra da comunidade apareca somente ao voltar para cima,
diferentemente do perfil profissional. A ADR-0567 usava apenas a saida do hero.

## Decisao

Restringir a mudanca ao CommunityScrollHeader. Scroll passivo agrupado por frame
alimenta uma transicao pura com tolerancia acumulada de 8px desde o extremo da
direcao. Subir revela, descer oculta; nunca revelar com a linha original visivel.
IntersectionObserver pode ocultar, mas nao revelar por alteracoes de layout.
Inicio, resize e remontagem ocultam a barra. Limitar posicao ao documento evita
interpretar a recuperacao do overscroll como gesto inverso.

## Consequencias

Preserva dimensoes, estado de participacao, inert e handlers existentes. Gestos
lentos funcionam sem exigir 8px num unico evento. O header do psicologo nao muda.
Sem dependencias ou contratos novos. Testes puros e smoke em navegador real;
PWA em aparelho fisico depende da conferencia do usuario. Sem publicacao remota.
