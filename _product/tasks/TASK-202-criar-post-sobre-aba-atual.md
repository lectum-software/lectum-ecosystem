# TASK-202 - Criar post sobre a aba atual

Dependencia: TASK-201 (Completed). Status: Completed.

## Escopo

Corrigir o + central nas abas Perfil, Notificacoes, Favoritos e Psicologos:
abrir o formulario existente sobre a pagina atual, sem navegar antes ao feed.
Fechar a modal vazia ou confirmar descarte preserva a pagina de origem.
Feed e comunidade mantem seus handlers contextuais. Visitantes continuam com
o convite existente para login/cadastro sobre a mesma pagina.

Mobile-first, base 390px. PROTO-INVENTORY consultado; Builder/Quick Copy nao
disponivel nesta sessao. Sem redesenho: reutilizar a modal publicada da TASK-201
e sua composicao existente em community-feed.tsx e community-detail.tsx.

## Criterios de aceite

- [x] Acao autenticada padrao impede navegacao e abre modal local no template.
- [x] Fechamento usa onCloseComplete, sem router.back/replace da pagina base.
- [x] Formulario, comunidade, rascunho, upload e suspensao de midia reutilizados.
- [x] Visitante mantem convite de autenticacao e destino de criar post.
- [x] Clique explicito no + funciona nas abas privadas sem liberar dicas passivas.
- [x] Feed/comunidade preservam os handlers e pre-selecao atuais.
- [x] Check/build frontend e regressoes aprovados.
- [x] Inspecao local e roteiro de smoke de homologacao documentados.

## Causa e decisao

A acao padrao so cancelava o Link para anonimos. Autenticados seguiam para
/app/comunidades/feed/publicacao/nova, cuja pagina compoe o feed ao fundo.
O template agora monta CreateCommunityPostLogic asModalSlot sob demanda e
desmonta por callback, sem criar formulario ou fluxo de autenticacao paralelo.
ADR-0547. A navegacao apos publicacao bem-sucedida permanece a atual.

## Deploy e rollback

Somente frontend, sem API, migration, env ou dependencia nova. Modal carregada
sob demanda para nao carregar editor/upload em todas as abas no primeiro acesso.
Risco: template compartilhado; verificar visitante e contrato de fechamento.
Rollback por reversao revisada em homolog; nenhum dado precisa ser revertido.
Producao nao autorizada neste pedido.

## Validacao

Frontend check completo aprovado: Biome, ESLint, TypeScript, suite principal
505/505 e navegacao 11/11. Um skip preexistente de symlink no Windows. Build
Next aprovado, com 90 paginas geradas. Guards de versao, ADRs, tasks, source
safety/size, ciclos, encoding, segredos e env aprovados.

Preview local 390x844: + no Perfil anonimo abre o convite de criar conta sobre
/app/perfil; fechar o convite preserva a URL. Nenhum post ou upload realizado.

Smoke apos deploy: recarregar Perfil autenticado, abrir +, conferir formulario
e comunidades reais sem enviar dados, fechar modal vazia e verificar URL e
rolagem preservadas; repetir em outra aba. Usuario autenticou manualmente.
Resultado remoto e evidencias registrados fora do repo em
outputs/modal-publicacao-0537.md do workspace apos este commit ser publicado.

