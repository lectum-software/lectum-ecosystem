# TASK-238 - Lupa alinhada no campo de pesquisa de psicologos

## Escopo

Corrigir o InputController existente: a lupa deve permanecer centralizada no input
quando o slot de sugestoes cresce. Isolar tambem o botao de senha de contadores e
conteudo complementar. Nao alterar busca, debounce, resultados ou requisicoes.

Referencia mobile-first (~390px): captura de 08/10/2026 as 15:04, inventario e
`Filtros de Psicólogos - Serviços Expandidos.jpg`. Builder/Quick Copy indisponivel
neste cliente. Reutilizar React Hook Form, Zod e controllers da TASK-02.

## Aceite

- [x] Lupa permanece no centro vertical do input com/sem sugestoes e contador.
- [x] Sugestoes seguem abaixo do input, sem sobreposicao; largura responsiva preservada.
- [x] Botao de senha, label, foco, aria-describedby e slot de erro preservados.
- [x] Testes de regressao, frontend check/build e browser local 390px/1440px aprovados.
- [x] Sem banco, backend, dependencias ou alteracao da configuracao de autodeploy.

## Impacto e rollout

Somente frontend; sem env ou contrato novo. Rollback por revisao frontend.
Validacao local antes de qualquer publicacao. Nao promover a revisao anterior
enquanto o usuario revisa estes ajustes. ADR-0579.

A ordenacao de publicacoes e uma task separada: depende de definir o ranking e
autorizar a mudanca do endpoint backend que pagina os resultados; nao ordenar
apenas a pagina carregada nem aumentar carga transferindo todo o catalogo.

## Evidencias

- Frontend check e build 0.1.613 aprovados; 22 testes focais aprovados.
- Chromium local do InputController e painel reais com cinco resultados da API local em 390/1440px: centro da lupa igual ao centro do input (delta 0px), com e sem sugestoes; painel abaixo, sem overflow; selecao aprovada. Sem mocks ou escritas. Inspecao isolada, nao end-to-end autenticado; midia remota do catalogo pode nao carregar nesse harness.
- Tentativa da pagina completa em localhost:3002 encontrou falha de conexao com o servico; nao foi contada como aprovacao funcional. Nenhum guard, sessao ou configuracao de seguranca foi alterado.
- Usuario confirmou para a proxima task: votos decrescentes, comentarios como desempate em posts e respostas; autorizou alterar exclusivamente a ordenacao backend, sem banco.
