# ADR-0533 - Abas visiveis no perfil profissional

## Status

Aceita em 2026-09-27.

## Contexto e decisao

O acesso a publicacoes e avaliacoes exigia rolar o perfil. Exibir Sobre,
Publicacoes e Avaliacoes logo apos o cabecalho, com estilo das abas da comunidade,
sem icones e com contadores em azul escuro. O menu permanece acessivel ao rolar.
Preservar os valores legados geral/publicacoes/avaliacoes na query tab, o historico,
o rastreamento existente e a paginacao. Sobre concentra a apresentacao profissional;
as listas e seus resumos ficam nas respectivas abas, sem cabecalho de subpagina.

Reutilizar a primeira pagina da consulta infinita de publicacoes para obter o total
e preparar a lista, evitando uma segunda consulta de previa. Avaliacoes usam
rating_count do perfil, atualizado pelo resumo da consulta quando disponivel.
Quantidade desconhecida nao e apresentada como zero. O menu tem semantica de abas,
foco por teclado e painel associado. O CTA de contato permanece disponivel.

## Impacto e validacao

Somente frontend, sem API nova, banco, env obrigatoria ou pacote novo.
Referencia: imagens fornecidas pelo usuario e PROTO-INVENTORY; Builder/Quick Copy
indisponivel neste cliente. Validar tipos, lint, build e perfil real em mobile e
desktop. Publicacao inicial em homolog; rollback por reversao revisada.

## Refinamento de dimensoes

Em 2026-09-27, apos comparacao em homolog, igualar a altura h-8, texto text-xs,
peso font-bold e espacamento gap-1.5 ao menu da comunidade. Aplicar tipografia nos
spans internos, como na comunidade, pois o reset global de button herda a fonte.
Apenas as larguras das tres colunas se adaptam; sem quebra de linha nem rolagem.
Playwright confirmou altura de 30px e fonte 11.25px no mobile (raiz de 15px), e
32px/12px no desktop, peso 700, sem overflow em 320/390/1440px.
