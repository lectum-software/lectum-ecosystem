# ADR-0092: Perfil público do psicólogo alinhado à tela de comunidade

## Status

Aceita em 2026-06-15.

## Contexto

O perfil público do psicólogo precisava ser visualmente padronizado com a tela principal de comunidade, mas sem alterar a implementação da própria comunidade. A referência ativa solicitada foi a estrutura do cabeçalho da comunidade: capa, avatar sobreposto, ação primária à direita, metadados, descrição e chips/pills abaixo.

O Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; portanto, a validação visual usou as imagens locais `_product/proto/Perfil Profissional - Sobre.jpg` e `_product/proto/Dentro da Comunidade.jpg`, além da implementação atual de `CommunityHeader` como referência de estrutura.

## Decisão

A alteração ficou restrita a `frontend/src/app/app/psychologist/[id]/logic.tsx`.

O cabeçalho do perfil do psicólogo passa a seguir a mesma organização visual da comunidade:

- capa com altura equivalente à comunidade e fallback para gradiente;
- avatar sobreposto à capa com tamanho, borda, raio e sombra equivalentes;
- botão de favorito sem texto no espaço equivalente ao botão "Seguir";
- nome, selo verificado, linha profissional, disponibilidade e bio organizados na mesma hierarquia;
- selos do profissional exibidos como pills horizontais sem quebra de linha no mobile.

As abas e cards internos foram ajustados para reforçar o mesmo sistema visual de pills, cards arredondados, bordas sutis e sombra leve usado nas áreas de comunidade. A lógica de favoritos, WhatsApp, dados carregados e tabs foi preservada.

## Consequências

- O perfil público do psicólogo passa a parecer parte do mesmo sistema visual das comunidades.
- A página de comunidade permanece inalterada e segue apenas como referência.
- O cabeçalho do perfil fica mais compacto e mobile-first, com selos em rolagem horizontal.
- A decisão não adiciona dependências nem altera contratos de API.
