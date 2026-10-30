# TASK-294 - Refinamentos de reels e perfil

Status: implementada e validada localmente em 0.1.754. Sem novo push/deploy.

## Escopo

Referencia do Instagram enviada em 30/10/2026 e capturas da Lectum em iPhone.
PROTO-INVENTORY consultado; Builder indisponivel. Ajuste mobile-first,
preservando o composer existente, permissoes e a coluna externa do desktop.
Inclui o pedido adicional do mesmo lote: base do header do perfil igual a
comunidade, navegacao de abas imediata/suave e nome/selo do header fixo.

## Aceite

- [x] Orientacao do reel aparece somente com foco no campo de texto.
- [x] Rascunho ou foco em midia/enviar nao mantem a orientacao visivel.
- [x] Orientacao dos comentarios fora de reels permanece inalterada.
- [x] Coluna mobile compacta com alvos de toque de pelo menos 44px.
- [x] Pouca altura permite rolar as acoes sem sobrepor controles do topo.
- [x] Header do perfil usa o mesmo acabamento da comunidade.
- [x] Abas respondem imediatamente, com transicao suave e URL/historico corretos.
- [x] Selo fica proximo ao nome truncado; tipografia segue a fonte Lectum.
- [x] Check frontend, build e QA visual local aprovados.
- [x] Commit local versionado, sem push ou deploy.

## Decisao e evidencias

ADR-0658 atualizado. Estado visual derivado do foco real via CSS, sem novos
listeners ou mudancas no bloqueio de rascunhos. Padding vertical de acoes
reduzido de 13px para 6px e gap de 2px; rodape minimo reduzido de 84px para
64px. Coluna limitada ao espaco abaixo do topo, com scroll contido quando
o teclado reduz a altura. Desktop mantem geometria anterior.

104 testes focados aprovados, sem skips, incluindo largura 320/390/430/1440
e coluna em viewport de video de 260px; ultima acao alcancavel e toques 44px.
Sem backend, migrations, pacotes ou variaveis novos. Producao anterior
0.1.753 confirmada em frontend/backend, health/ready 200 em 30/10 16:38 UTC.

ADR-0657 atualizado para a sombra identica a comunidade, History API integrada
ao Next para abas sem espera de RSC e truncamento por grafemas com a fonte
computada para manter selo junto a ellipsis. Transicao de 160ms respeita
reduced motion. 32 testes focados de perfil aprovados pelo implementador.
Envio de reels preserva foco no pointerdown para evitar deslocar o alvo antes
do click. QA integrado aprovado.

Check completo do frontend aprovado em .tmp/task294-frontend-final-check.log.
QA real de reels 320/390/1440 e envio por primeiro clique aprovados, incluindo
um unico POST/comentario persistido no banco local e contador atualizado.
Probe real detectou utilitarios de animacao sem CSS; substituidos por CSS
Module local com reduced motion; novo QA aprovado em 320/390/1440.
Fonte Manrope real carregada e verificada, sem fallback no QA final.
Sombra, raio e ausencia de borda identicos a comunidade; selo proximo ao nome
truncado. Abas preservam URL, query/hash, historico e reduced motion. Evidencias
em .tmp/task294-profile-results.json e capturas task294-profile-*.png.
Biome e TypeScript revalidados apos o ultimo ajuste CSS; 20 testes de perfil,
incluindo CSS compilado no Chrome, aprovados. Revisao final sem bloqueadores.

Build completo aprovado em 30/10 17:14 UTC, Node 24.22.1, copia isolada,
cpus=1 e cache webpack desabilitado pelo modo de pouco disco existente.
Evidencias: .tmp/task294-build-2026-10-30T17-11-34-123Z.log e parity.json:
exit 0, 867 arquivos comparados sem divergencia de produto ou testes.
Rede restrita a loopback/fontes estaticas genuinas, sem efeitos produtivos.

Tentativa anterior parou por falta de disco. Limpeza autorizada removeu
caches .next inativos de task293-frontend/task290-build (207 MiB) e, apos
encerrar a QA, task294-frontend (154 MiB). pnpm store prune/npm cache verify
nao recuperaram espaco relevante. Dados, uploads e dependencias preservados.
Fixtures de QA limpos por IDs exatos; zero usuarios/comunidades/posts/respostas
restantes. Servicos QA 3102/3003 parados; previas antigas 3100/3002 intactas.
QA em Chromium nao substitui Safari/teclado fisico. Trafego legado local de
video inexistente e analytics500 foi registrado, sem falhas nas assercoes.
