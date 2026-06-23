# ADR 0156 — Botão de mídia na edição de comentário

Status: Aceito  
Data: 2026-06-23

## Contexto

Na modal de edição de comentário, quando o comentário já possuía uma mídia anexada, o controle compartilhado exibia uma miniatura e também um botão `Editar mídia`. Esse botão sugeria substituição direta e aumentava a complexidade visual da modal. A regra desejada para a Lectum é manter a edição focada: se já existe mídia efetiva, o usuário deve ver a mídia e poder removê-la; somente depois da remoção deve aparecer a opção de anexar outra mídia.

## Decisão

O controle `ReplyMediaAttachmentControl` no modo `editor` passa a renderizar o botão `Mídia` apenas quando não há mídia efetiva atual ou selecionada. O input de arquivo continua montado para preservar o fluxo de upload, mas a ação visível fica condicionada ao estado:

- com mídia atual ou selecionada: exibir somente a miniatura e o `X` de remoção;
- após remover a mídia atual: exibir o aviso discreto de remoção e o botão `Mídia` para anexar outra;
- sem mídia inicial: exibir o botão `Mídia` imediatamente.

## Consequências

- A modal fica mais limpa e evita a ambiguidade de `Editar mídia`.
- A substituição de mídia continua possível em dois passos explícitos: remover e anexar outra.
- Não há mudança em backend, storage, limites, formatos ou permissões; a regra é exclusivamente de apresentação/estado no frontend.
- Psicólogos verificados continuam sendo os únicos que veem a funcionalidade de mídia conforme as regras já existentes.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
## Atualização: orientação da miniatura na edição de comentário (2026-06-23)

A miniatura exibida na modal de edição de comentário passa a tratar orientação indefinida como `landscape` até a detecção assíncrona de dimensões concluir. A modal também passa a detectar a orientação de novas mídias selecionadas no fluxo de edição, usando a mesma função compartilhada já utilizada no composer de comentários.

Essa decisão evita que imagens ou vídeos horizontais apareçam inicialmente em moldura vertical/narrow quando o navegador ainda não carregou os metadados da mídia, sem alterar formatos aceitos, limites de upload, storage, permissões ou backend.