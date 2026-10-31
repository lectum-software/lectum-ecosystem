# TASK-298 - Depoimentos com apresentacao de reviews

## Escopo

O usuario substituiu a decisao de arvore de comentarios pela referencia
98e5025c82d820375dbd747d9d0fe3a1.jpg enviada em 31/10/2026. Adaptar somente
depoimentos, nao o feed/comentarios. Usar Manrope e tokens Lectum existentes.
Sem nota media; sem grafico de distribuicao nesta rodada.
PROTO-INVENTORY e arquitetura consultados. Builder nao disponivel nesta execucao.

## Aceite

- [x] Lista branca continua com divisorias discretas, sem cards de comentario.
- [x] Autor seguido de estrelas individuais/data na mesma faixa, com wrap.
- [x] Resposta profissional identificada sem conectores ou arvore.
- [x] Resposta em fundo cinza suave, sem linha/borda/sombra; identidade no topo da modal somente ao escrever.
- [x] Perfil, modal e Meus Depoimentos usam o mesmo layout.
- [x] Mostrar nome completo e foto de perfil do autor; fallback de iniciais somente sem foto.
- [x] Posts/Respostas e Visiveis/Ocultos/Todos reutilizam o estilo das abas do perfil.
- [x] Preservar autoria, controles laterais, filtros, contadores e elegibilidade.
- [x] Preservar convite compacto; vazio usa EmptyState com ReviewsIcon, sem altura minima extra.
- [x] Resposta profissional e formulario com recuo original, restaurado a pedido do usuario.
- [x] Sem media/grafico no frontend dos depoimentos.
- [x] Testes, checks, build e QA mobile/desktop aprovados.

## Operacao

Frontend e serializers de depoimentos no backend. Campo avatar opcional aditivo;
nome deixa de ser abreviado. Sem mudanca de banco, dependencia ou configuracao.
O usuario confirmou em 31/10/2026 que nao existem depoimentos publicados e pediu
identificacao, sem anonimato. Nao realizar backfill nem consultar dados remotos.
Formulario informa que nome e foto de perfil acompanham o relato.
Fixtures somente em testes/component previews; nenhuma escrita em producao.
Preview visual para revisao. Sem push/deploy; publicar em proximo lote autorizado.
ADR-0662 substitui somente a apresentacao de comentario aprovada anteriormente.

## Evidencias locais

- Build frontend isolado e build backend aprovados em 0.1.758.
- Check completo frontend e guards do repositorio aprovados.
- Backend: Biome, dependencias de runtime e typecheck aprovados; 1139 testes passaram.
- Depoimentos: 66 testes passaram, sem skips, incluindo Chrome real.
- QA de componentes em Chrome: 18 cenarios, 320/390/1440 px, sem overflow.
- Modal de escrita incluida: titulo, identidade, pergunta, label, campo,
  placeholder e botao usam Manrope; publicar semibold. Campo reutiliza o controller
  padrao dos formularios, inclusive peso do placeholder.
- Fonte Manrope carregada e computada em textos, menus e controles; corpo usa
  text-sm leading-6 como feed/comentarios. Nomes de reviews semibold; identidade
  compacta segue text-xs font-bold dos comentarios aninhados.
- Recuo da resposta e alinhamento interno original verificados por coordenadas.
- Preview local em .tmp/task298-layout-preview.html; capturas e logs em .tmp/task298-*.
- Limite: preview usa componentes reais com dados sinteticos em memoria, nao e
  teste autenticado ponta a ponta; identidade/elegibilidade sinteticas na tela de
  escrita; nenhum envio/ocultacao/exclusao foi persistido.
- Ajustes no harness: retirar NODE_ENV/origens de QA dos testes de contrato;
  limitar a assercao de altura ao estado vazio, sem atingir a area de toque do botao.
