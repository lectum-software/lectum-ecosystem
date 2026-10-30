# ADR-0658 - Controles reais e comentarios inline nos reels

Status: Accepted
Date: 2026-10-30

## Context

O usuario aprovou controles de navegacao e criacao no topo do reel e o
composer existente no rodape, em lugar da proposta anterior de navbar.
A experiencia deve coincidir com o diretorio e respeitar a preferencia do autor.

## Decision

Reutilizar CreateCommunityPostLogic dentro da fundacao Modal existente.
Reutilizar ReplyComposer e o controller real de detalhe do post; direcionar
comentarios ao reply_id quando o video for uma resposta. A variante reels
altera apenas apresentacao e informa foco/rascunho/envio ao viewer.
Bloquear troca de video durante edicao e confirmar descarte ao sair.
Confirmar tambem antes de abrir criacao com comentario pendente. A criacao
aninhada delega scroll ao modal externo, sem restaurar snapshots concorrentes.
Confirmacoes usam o host do dialog nativo para manter foco e interacao no
top layer, preservando o comportamento existente fora de dialogs nativos.
Pausar reproducao durante edicao, leitura e criacao de post; manter o
gradiente de leitura e a folha de comentarios existentes.

Os DTOs de autores recebem formation_years e show_experience_tag opcionais,
calculados com a regra efetiva do diretorio. Preferencia oculta retorna anos
null. Clientes antigos ignoram campos novos; clientes novos omitem experiencia
se a API antiga nao fornecer campos. Nao ha migration ou novas dependencias.

## Consequences

As regras de autenticacao, upload e cancelamento continuam centralizadas.
A composicao adicional exige testar foco, teclado, scroll, rascunhos e envio
real. Header e texto de leitura ficam em componentes pequenos, preservando
o limite de tamanho de fontes. Publicar backend antes do frontend. Admin e
Video nao precisam de deploy. Rollback por artefatos anteriores e sem perda
de dados, pois os contratos sao aditivos.
