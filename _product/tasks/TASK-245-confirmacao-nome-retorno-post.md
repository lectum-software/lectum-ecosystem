# TASK-245 - Confirmacao do nome no retorno ao post

## Escopo

Dar seguranca ao paciente depois de alterar o nome a partir da modal de criar post.
Ao retornar ao rascunho, a propria modal confirma qual nome identificara a publicacao
antes de liberar novamente o formulario. Extensao da TASK-244 e da ADR-0587.

## Aceite

- [x] Exibir a confirmacao apenas depois de salvar o perfil no fluxo do compositor.
- [x] Informar `Nome atualizado` e destacar o nome que identificara a publicacao.
- [x] Oferecer somente o botao `Continuar para o post`, sem link de nova edicao.
- [x] Restaurar o formulario e o rascunho somente depois da confirmacao do paciente.
- [x] Consumir o marcador uma unica vez e ignora-lo em edicoes comuns do perfil.
- [x] Manter comunidade, titulo e texto restaurados, com anonimato desligado.
- [x] Nao criar backend, banco, migration, env ou dependencia.

## Validacao

- [x] Teste focado da apresentacao e storage temporario: 28/28.
- [x] `pnpm --dir frontend check`.
- [x] `pnpm --dir frontend build`.
- [x] Validacao visual local mobile do retorno e do botao de continuar.

## Impacto de deploy

Frontend apenas. A confirmacao usa um marcador descartavel no `sessionStorage`,
associado ao usuario e a rota do compositor. Sem persistencia de produto ou mudanca
de contrato. Commit local em `homolog`; sem push ou deploy ate autorizacao explicita.
