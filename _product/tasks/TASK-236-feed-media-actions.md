# TASK-236 - Controles abaixo da midia no post de psicologo

## Objetivo

No feed inicial e da comunidade, colocar a barra de util, comentarios, salvar
e compartilhar depois da midia quando o post for de psicologo e tiver anexos.
Referencia: captura do usuario de 07/10/2026 18:38; PROTO-INVENTORY consultado.
Mobile-first 390px, mantendo o design existente, sem dependencia do Builder.

## Escopo e decisao

Reordenar o bloco existente no PostCard compartilhado por inicio/comunidade.
Condicao: autor psicologo e media_url ou media_items presentes. Sem duplicar
barra/player; ordem visual e DOM iguais. Preservar handlers, autoplay, CTA,
carrosseis, pacientes com resposta profissional e posts sem midia. ADR-0576.
CommunityPostCard do perfil/Minhas Publicacoes ja coloca midia antes da barra.
Sem mudar a pagina de detalhe, API, banco, env ou pacotes.

## Aceite

- [x] Video, imagem unica e carrossel de psicologo precedem os controles.
- [x] Pacientes e posts sem midia mantem a ordem anterior.
- [x] Barra unica com contadores, links e handlers preservados.
- [x] Conferir feed/comunidade reais em 320/390/1440px.
- [x] Frontend check/build e gates estruturais aprovados.

## Publicacao

Mudanca local, sem push/deploy neste pedido. Rollback: reverter a condicao
de ordenacao, sem qualquer alteracao de dados. PWA fisico requer conferencia.

## Evidencias

Teste React/SSR do PostCard real: matriz psicologo/paciente com video, imagem,
item unico, carrossel e sem midia. Ordem DOM e barra unica verificadas.
Contrato de handlers existentes atualizado para a nova ordem condicional.
Frontend check completo e gates estruturais aprovados.
outputs/check-feed-media-order-0608.cjs: browser real contra localhost e API
de desenvolvimento, sem mocks/escritas. Post profissional existente com video
e paciente com resposta profissional existentes. Inicio/comunidade em
320/390/1440px: controles apos midia, video unico, sem overflow/pageerrors;
paciente preserva controles antes da resposta. Captura 390px inspecionada.
Sem mudancas funcionais nos outros apps; suites backend/admin/video nao repetidas.
Build frontend 0.1.608 aprovado (90 paginas), com aviso nao bloqueante de cache
Webpack. Nenhum build remoto ou alteracao de banco.
