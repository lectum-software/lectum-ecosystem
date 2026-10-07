# TASK-234 - Comunidade sem faixa vazia acima da capa

## Objetivo

Remover o espaco cinza acima da capa da comunidade, alinhando seu inicio ao
topo do conteudo como no perfil do psicologo. Referencia: captura do usuario
de 07/10/2026 16:56. PROTO-INVENTORY consultado; sem mudanca de design.

## Causa e decisao

O sticky de altura zero ocupava uma linha propria no grid com gap-4. A margem
negativa nao eliminava o gap: medicao real local em 390px confirmou section top 0
e header top 15px. Capa e sticky passam a compartilhar a primeira celula do grid.
Nao alterar safe-area, PageShell nem a regra de exibir sticky apenas ao subir.
ADR-0574. Frontend apenas, sem pacote, env, migration ou mudanca de contrato.

## Aceite

- [x] Capa alinhada ao topo em 320/390/1440px sem overflow horizontal.
- [x] Sticky oculto ao descer, visivel no topo ao subir e oculto ao voltar ao inicio.
- [x] Busca e retorno preservados; espacamento para regras permanece normal.
- [x] Testes frontend, check e build aprovados.

## Publicacao

Validacao e commit locais. Sem push/deploy neste pedido.
Rollback: reverter posicionamento de grid dos dois headers; sem dados afetados.
PWA iOS real requer conferencia do usuario; emulacao nao reproduz barra de status.

## Evidencias

Browser real contra localhost, sem mocks nem escritas em APIs:
outputs/check-community-top-0606.cjs. Capa top=0 nas tres larguras; gap para
regras 15px no mobile e 16px no desktop, identico ao gap do grid. Sticky top=0
apos ultrapassar a capa e rolar para cima; sem pageerrors. Busca abre e retorna
com a capa ainda no topo. Capturas mobile/desktop inspecionadas.
Frontend check completo aprovado. Teste de markup atualizado para exigir
primeira celula compartilhada em vez de aceitar a margem negativa defeituosa.
Sem alteracao no PageShell, safe-area ou layout do perfil do psicologo.
Build frontend 0.1.606 aprovado (90 paginas), com aviso nao bloqueante de cache
Webpack. Gates estruturais da raiz aprovados. Suites backend/admin/video nao
repetidas porque nao tiveram mudancas funcionais.
