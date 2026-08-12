# ADR-0453: Composer de comentários com editor plaintext

## Status

Accepted

## Task relacionada

TASK-26

## Contexto

No iOS/Safari, campos nativos de formulário (`input`/`textarea`) podem ativar a barra de navegação do teclado com controles de anterior/próximo/concluir. No composer de comentários do detalhe do post existe apenas um campo textual, mas a barra ainda aparece com as setas desabilitadas, ocupando espaço e incomodando a experiência mobile.

O padrão de formulários do Lectum continua sendo React Hook Form + Zod + controllers da `TASK-02`. A alteração precisa preservar esse contrato, não introduzir package novo, não usar mock e não alterar backend, upload, votos, salvos ou regras de comentário.

## Decisão

Criar um controller `contenteditable` na fundação de formulários do frontend e usá-lo somente no campo `content` do `ReplyComposer` de comentários/respostas.

- O novo controller usa um elemento `contentEditable="plaintext-only"` com `role="textbox"`, `aria-multiline`, `aria-placeholder`, `aria-invalid` e integração via `Controller` do React Hook Form.
- O valor do formulário é sincronizado apenas por `textContent`, normalizado como texto plano, sem persistir HTML ou marcação colada pelo usuário.
- O limite de 2000 caracteres é preservado no controller por `beforeinput`, paste plain text e corte defensivo no `input`.
- Quebras de linha continuam disponíveis, substituindo o comportamento anterior do `textarea`.
- O composer passa a localizar o campo focável por um seletor compartilhado que aceita `textarea` legado e o novo textbox contenteditable, preservando foco, autofocus, blur, cancelamento por gesto e retorno após seleção de mídia.

## Consequências

- O composer de comentário deixa de depender de `textarea` nativo, reduzindo a chance de o Safari tratar o campo como formulário navegável e exibir a barra de anterior/próximo.
- A fundação da `TASK-02` é preservada: Zod, React Hook Form e registry de controllers continuam sendo a camada de formulário.
- O campo passa a exigir cuidados específicos de acessibilidade e texto plano; por isso o role ARIA é mantido com exceção documentada do Biome.
- A confirmação definitiva do comportamento da barra depende de smoke em iPhone/Safari ou PWA após deploy em homologação, porque a barra é UI nativa do sistema e não é reproduzível no build local desktop.

## Produção e rollout

- Sem alteração de banco, migration, seed, endpoint, contrato de API, upload, storage, provider ou dados existentes.
- Sem package novo e sem env nova obrigatória.
- Mudança frontend-only e compatível com backend antigo/novo, pois o payload final continua `{ content }` texto plano.
- Rollback: reverter o commit volta o composer ao `textarea` anterior e pode reintroduzir a barra nativa do Safari no comentário.
- Push em `homolog` dispara deploy automático de homologação; smoke recomendado após publicação: abrir um post com comentários no iPhone/Safari ou PWA, focar `Adicionar comentário`, confirmar que o teclado abre e verificar se a barra nativa não aparece.

## Validação

- `pnpm --dir frontend biome:check`
- `pnpm --dir frontend typecheck`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`

## Pendências

- Validar o comportamento específico da barra no iOS real após o deploy de homologação, pois o ambiente local disponível valida build/DOM, mas não emula a UI nativa do teclado do Safari.
