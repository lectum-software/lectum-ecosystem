# TASK-265: Tempo das orientacoes de navegacao

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-265 |
| Prioridade | P1 |
| Esforco | S |
| Fase | Refinamento de navegacao |
| Status | Done |
| Dependencias | TASK-202 |
| ADR alvo | ADR-0628 |

## Contexto e objetivo

Pedido aprovado em 22/10/2026: orientar a publicacao somente apos 30 segundos
de navegacao ativa no feed/comunidade, e convidar ao cadastro apos 3 minutos
ativos com intervalo minimo de 2 minutos depois de fechar a orientacao.
Remover gatilhos automaticos por scroll, tres posts, tres perfis e 60 segundos.
Preservar pedidos imediatos de conta ao publicar, comentar, salvar e outras
acoes autenticadas. Layout e textos existentes permanecem, mobile-first.
Inventario PROTO-INVENTORY consultado; sem nova tela ou referencia visual.

## Escopo

Somente frontend: contador visivel acumulado por sessao da aba, sincronizacao
entre orientacao e convite, supressao diante de modais e testes. Aba visivel
define navegacao ativa; nao exige clique ou abertura de um post.
A orientacao conserva seu historico local/remoto. Nao reapresentar a quem ja viu.
O convite conserva limite de uma exibicao automatica por sessao.
WhatsApp publico nao exige conta e deixa de provocar convite por contagem de cliques.

## Producao e rollout

Sem alteracao de banco, contratos, envs, dependencias ou jobs.
Publicar somente frontend apos autorizacao; nenhum push/deploy nesta tarefa.
Rollback pelo artefato anterior; chaves novas de progresso podem ser ignoradas.
As flags existentes de orientacao vista continuam validas.

## Criterios de aceite

- [x] Orientacao em 30 segundos acumulados, sem contar aba oculta.
- [x] Convite somente em 180 segundos ativos, sem gatilhos antigos.
- [x] Bloqueio enquanto orientacao aberta e por 120 segundos apos fechamento.
- [x] Acoes autenticadas continuam imediatas e historico visto e preservado.
- [x] Nenhum aviso automatico sobre modal de criacao ou outra modal visivel.
- [x] Testes, check do frontend e QA local mobile/desktop aprovados.
- [x] ADR e commit local com versoes sincronizadas, sem push/deploy.

## Validacao

Em 22/10/2026: 52 testes focais aprovados e check completo do frontend aprovado.
QA Playwright com frontend/API/PostgreSQL locais reais, sem endpoints simulados,
em 393px e 1440px: limite de 30s, orientacao aberta bloqueando cadastro, limite
de 120s apos fechamento, convite unico e acao explicita imediata/repetivel.
Relogio controlado acelera apenas a espera. Feed local sem posts publicados;
nenhum dado foi criado para o teste. Screenshots conferidas sem overflow.
Testes unitarios cobrem 180s, aba oculta e acumulacao entre superficies.
Guardrail source-safety distingue chamadas de relogio do node:test em arquivos
de teste; proibicao de dados artificiais no produto permanece ativa.
Nao houve teste em aparelho fisico nem novo build de producao; layouts e rotas
nao mudaram. Producao permanece inalterada.
