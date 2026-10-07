# TASK-227 - Identidade e seguir na comunidade ao rolar

## Objetivo

Repetir na comunidade o header compacto existente no perfil do psicologo:
avatar, nome e acao de seguir acessiveis quando a acao original sai pelo topo.
Mobile-first (390px), com validacao tambem em 320px e desktop.

## Referencias

Pedido do usuario e ProfileHeader/CommunityHeader existentes. PROTO-INVENTORY
consultado; Builder/Quick Copy indisponivel neste cliente. Preservar a identidade
visual existente, sem introduzir tela nova. ADR-0567.

## Aceite

- [x] Barra aparece apos a linha original sair pelo topo e some ao retornar.
- [x] Avatar, nome longo e seguir cabem em mobile e desktop sem sobreposicao.
- [x] Estado, pending, guard de login e mutacoes sao compartilhados com o hero.
- [x] Busca contextual nao disputa o topo com a barra compacta.
- [x] Barra oculta e inert; desmontagem desconecta o observador.
- [x] Testes, check, build e smoke local registrados.

## Rollout

Somente frontend. Sem banco, contrato, dependencia ou env nova. Sem push/deploy.
Risco: posicionamento sticky e espaco do grid. Rollback: reverter a integracao
do CommunityScrollHeader, preservando o CommunityHeader original.

## Validacao

Check completo do frontend e build Next aprovados. Seis testes novos cobrem
renderizacao real, estado following/pending, acessibilidade e observador.
Lint direcionado repetido apos ajustar a chave do header para nao colidir com
a chave das regras. Bump local 0.1.599; sem push ou deploy.

Smoke Playwright com frontend/backend locais reais e banco Lectum Development,
sem simular respostas: 320/390/1440px, comunidade depressao. Barra em top=0,
altura 4rem, sem overflow horizontal nem sobreposicao nome/botao; rolar para
baixo/cima, retornar ao topo, abrir/fechar busca e remontar passaram. Nenhum
pageerror ou erro de chave duplicada. Capturas inspecionadas em outputs/
community-scroll-{320,390,1440}.png, fora do Git.

Nao houve alteracao de participacao real no teste nem teste em aparelho fisico.
Seguir/desseguir autenticado e conferencia visual no PWA ficam para o usuario;
o handler original nao foi alterado. Backend local encerrou durante uma tentativa
de QA e foi reiniciado com a configuracao de desenvolvimento existente; smoke
completo passou apos reinicio. Convites de visitante foram fechados pela UI.

Checks de versao, segredos, encoding, ADRs, tasks, env e source-safety aprovados.
Check global interrompido por dois arquivos preexistentes acima do limite:
community-post-card.tsx (724 linhas) e community-post-controls.test.mjs (916).
Ambos inalterados. Demais apps nao foram modificados (exceto manifests exigidos).
