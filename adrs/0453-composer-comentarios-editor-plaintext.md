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
- Após validação no iOS, o wrapper nativo `<form>` do `ReplyComposer` também foi removido: o envio passa a ser acionado pelo botão com `hook.handleSubmit()`, mantendo validação e payload, para evitar que o Safari classifique o composer como formulário navegável.

## Consequências

- O composer de comentário deixa de depender de `textarea` nativo, reduzindo a chance de o Safari tratar o campo como formulário navegável e exibir a barra de anterior/próximo.
- A fundação da `TASK-02` é preservada: Zod, React Hook Form e registry de controllers continuam sendo a camada de formulário.
- O campo passa a exigir cuidados específicos de acessibilidade e texto plano; por isso o role ARIA é mantido com exceção documentada do Biome.
- A remoção do `<form>` no composer elimina submit nativo por teclado; no mobile o fluxo principal já é o botão de envio, e o envio continua protegido por React Hook Form/Zod.
- A confirmação definitiva do comportamento da barra depende de smoke em iPhone/Safari ou PWA após deploy em homologação, porque a barra é UI nativa do sistema e não é reproduzível no build local desktop.

## Produção e rollout

- Sem alteração de banco, migration, seed, endpoint, contrato de API, upload, storage, provider ou dados existentes.
- Sem package novo e sem env nova obrigatória.
- Mudança frontend-only e compatível com backend antigo/novo, pois o payload final continua `{ content }` texto plano.
- Rollback: reverter o commit volta o composer ao `textarea` anterior e pode reintroduzir a barra nativa do Safari no comentário.
- Push em `homolog` dispara deploy automático de homologação; smoke recomendado após publicação: abrir um post com comentários no iPhone/Safari ou PWA, focar `Adicionar comentário`, confirmar que o teclado abre, que o comentário é enviado pelo botão e verificar se a barra nativa não aparece.

## Validação

- `pnpm --dir frontend biome:check`
- `pnpm --dir frontend typecheck`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`

## Pendências

- Validar o comportamento específico da barra no iOS real após o deploy de homologação, pois o ambiente local disponível valida build/DOM, mas não emula a UI nativa do teclado do Safari.

## Atualizacao 2026-08-12 - ancoragem acima do teclado no Android

Apos a troca do campo nativo por editor plaintext, foi identificada uma regressao visual em alguns Androids: o teclado virtual podia cobrir a parte inferior do composer fixo de comentarios/respostas. A causa pratica e a diferenca de comportamento entre navegadores/teclados ao tratar elementos `position: fixed` durante a animacao do teclado; alguns redimensionam o viewport visual, outros mantem o layout viewport e apenas sobrepoem o conteudo.

Decisao complementar:

- O viewport do frontend passa a declarar `interactiveWidget: "resizes-content"`, permitindo que navegadores compativeis redimensionem o conteudo quando o teclado abre.
- O `ReplyComposer` principal, somente no modo fixo mobile, mede a sobreposicao real entre o bloco e o `visualViewport` e aplica `bottom` dinamico com uma pequena folga.
- O calculo e reexecutado em `resize`/`scroll` do `visualViewport` e em atrasos curtos apos o evento inicial, pois Android/Chrome e teclados de terceiros podem estabilizar a altura final alguns frames depois do foco.
- O composer inline dentro da arvore de respostas nao recebe esse deslocamento, porque ele participa do fluxo normal da pagina.

Consequencias:

- O campo de comentario deve permanecer visivel acima do teclado em Android sem depender apenas da heuristica `innerHeight - visualViewport.height`.
- A mudanca e frontend-only, sem impacto em payloads, backend, banco, storage, uploads ou permissoes.
- Navegadores que ignorarem `interactiveWidget` continuam usando o fallback medido no componente.
- Rollback: reverter o commit volta ao comportamento anterior, com risco de o teclado cobrir parte do composer em alguns Androids.

Validacao complementar:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome headless local em `http://localhost:3010/auth/login` confirmou render mobile basico e o meta viewport com `interactive-widget=resizes-content`.
- A sobreposicao do teclado Android depende de UI nativa e deve ser conferida no dispositivo apos o deploy de homologacao.

## Atualizacao 2026-08-12 - foco sincronico no responder da tela de thread

A tela dedicada `Respostas` / `Continuacao da conversa` reutiliza o `ReplyComposer` principal fixo no rodape, mas o handler mobile de `Responder` focava o editor apenas em um `setTimeout`. No iOS/Safari, foco programatico fora da mesma ativacao de usuario pode nao abrir o teclado, mesmo que o elemento receba foco visual depois.

Decisao complementar:

- Adicionar um helper local `focusComposerInput` na tela de thread, usando o seletor compartilhado que reconhece o editor `contenteditable` do composer e tambem cobre um textarea legado.
- No ramo mobile de `handleReplyTarget`, chamar `focusComposerInput()` imediatamente apos definir o alvo de resposta, ainda no mesmo ciclo do clique/toque.
- Manter o `setTimeout` subsequente como reforco para o rerender do contexto `Respondendo`, sem depender exclusivamente dele para abrir o teclado.
- Nao alterar o contrato do composer, payload de resposta, endpoints, upload, votos, salvos, denuncias, storage, envs ou packages.

Consequencias:

- A tela de thread passa a ter a mesma estrategia de foco da tela principal do post: foco sincronico para satisfazer iOS/Safari e reforco assincrono para estabilidade apos state update.
- O ajuste reduz risco de o usuario tocar em `Responder` e continuar vendo o composer inativo no rodape.
- Rollback: reverter este complemento volta a depender apenas do foco agendado por timeout na tela de thread, sem efeito persistente em dados ou contratos.

Validacao complementar 2026-08-12:

- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- Next local buildado em `http://127.0.0.1:3042`: `/version` respondeu `0.1.72`, a rota `/comunidades/ansiedade-em-equilibrio/publicacao/demo-post-ansiedade-apresentacao-video/resposta/demo-reply` respondeu `200` e o arquivo do thread contem foco sincronico antes do reforco por timeout.
- `pnpm check`: sucesso apos repetir com timeout maior; a primeira tentativa excedeu o tempo local e terminou em seguida sem resultado capturado.
- `git diff --check`: sucesso.
- `pnpm check:version` apos `pnpm version:bump` para `0.1.73`: sucesso.

## Atualizacao 2026-08-13 - edicao de comentario com editor plaintext

O teste em iPhone mostrou que a modal `Editar comentario` ainda podia apresentar comportamento visual inconsistente no campo textual. Diferente do composer principal, a edicao continuava usando um `textarea` nativo dentro de uma modal com midia e teclado virtual, mantendo a UI nativa de navegacao do iOS/Safari e deixando comentarios com quebra final posicionarem o cursor em uma linha vazia.

Decisao complementar:

- Reutilizar o controller `contenteditable` da fundacao de formularios no campo `content` da `ReplyEditModal`, preservando React Hook Form, Zod, limite de 2000 caracteres e payload texto plano.
- Normalizar apenas o valor inicial de edicao com `trimEnd()`, removendo espacos/quebras finais que ja seriam removidos no salvamento e evitando caret deslocado em comentario curto.
- Manter o `<form>` da modal para o submit dos botoes de acao, pois nao ha mais campo textual nativo que dependa da navegacao de formulario do Safari.
- Nao alterar backend, endpoint, payload, upload, thumbnails, permissoes, Prisma, migrations, envs ou packages.

Consequencias:

- A edicao de comentarios fica alinhada ao composer principal no iOS, reduzindo a chance de barra nativa e bugs de caret associados a `textarea`.
- Comentarios legados com newline final abrem com a mesma representacao que sera salva, sem linha vazia artificial no editor.
- Rollback: reverter este complemento volta o editor da modal para `textarea` nativo e pode reintroduzir a barra/caret visualmente quebrado no iOS.

Validacao complementar 2026-08-13:

- Validacao estatica via Node confirmou `field: "contenteditable"`, ausencia de `field: "textarea"` e default com `normalizeReplyEditContent`.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- `git diff --check`: sucesso.
- `pnpm check:encoding`: sucesso.
- `pnpm check:adrs`: sucesso.
- `pnpm check:tasks`: sucesso.
- `pnpm check:version` apos `pnpm version:bump` para `0.1.87`: sucesso.
