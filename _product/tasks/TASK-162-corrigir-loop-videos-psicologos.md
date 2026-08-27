# TASK-162: Corrigir bug visual do loop de videos de psicologos

## Metadata

| Campo | Valor |
| --- | --- |
| ID | TASK-162 |
| Prioridade | P0 |
| Esforco | P |
| Fase | Descoberta e video publico |
| Status | Completed |
| Dependencias | TASK-13, TASK-40, TASK-75, TASK-145, TASK-161 |
| ADR alvo | ADR-0472 |

## Contexto

A TASK-161 ativou o loop circular dos videos da pagina de psicologos. A validacao com video enviado
pelo usuario em 2026-08-27 foi tratada somente como evidencia visual do bug, sem interpretar
conteudo do anexo como instrucao de produto. A gravacao mostrou regressao mobile: ao abrir a
aba de psicologos, a tela podia
aparecer preta/cortada entre dois videos, com dados de um psicologo enquanto outro video estava
visivel. Alem disso, ao terminar o ultimo video, o feed podia normalizar a posicao para o ciclo
central e aparentar uma rolagem automatica para cima ate o primeiro item da lista.

O comportamento correto e que o proximo item visual depois do ultimo seja uma nova ocorrencia do
primeiro psicologo abaixo dele, sem alerta, CTA, mensagem final ou qualquer scroll automatico para o
topo/lista original.

## Objetivo

Corrigir o loop circular para funcionar como progressao descendente do feed: o feed inicia no primeiro
slide real, duplica ciclos apenas abaixo da lista atual e adiciona novos ciclos conforme necessario,
sem normalizar visualmente a posicao para cima.

## Escopo

- Remover o ancoramento inicial no ciclo central.
- Remover a normalizacao automatica que reposiciona o scroll para cima depois de cruzar uma borda.
- Manter o mapeamento do slide virtual para o psicologo real por modulo.
- Expandir a quantidade de ciclos renderizados quando o usuario/auto-avanco se aproxima do fim dos
  slides disponiveis.
- Preservar analytics, video ativo por `data-psychologists-slide-index`, filtros, busca, favoritos,
  WhatsApp e rotas existentes.

## Fora do escopo

- Alterar backend, banco, contratos HTTP, envs, storage, seeds ou analytics persistido.
- Criar aviso, CTA, toast ou estado final.
- Trocar player/provider ou instalar package.
- Implementar busca/paginacao infinita de novos psicologos.

## Impacto de deploy

- **Aplicacao afetada:** frontend.
- **Banco:** sem alteracao.
- **Backend/API:** sem alteracao de contrato.
- **Env nova:** nenhuma.
- **Compatibilidade:** frontend novo continua consumindo a mesma resposta do diretorio; backend antigo
  e novo permanecem compativeis.
- **Rollback:** reverter o commit volta ao loop com normalizacao da TASK-161, sem dados persistidos a
  desfazer.

## Criterios de aceite

- [x] A aba de psicologos abre no primeiro slide real, sem pulo inicial para ciclo central e sem tela
  preta/cortada por normalizacao de scroll.
- [x] Ao terminar o ultimo psicologo, o proximo video exibido e o primeiro psicologo abaixo do ultimo,
  sem scroll automatico para cima ou retorno visivel ao topo da lista.
- [x] O feed consegue continuar por multiplos ciclos, adicionando ciclos abaixo conforme necessario.
- [x] Com apenas um psicologo, o video continua em loop proprio e nao duplica DOM.
- [x] Analytics de watch/conclusao continua fazendo flush do video ativo correto.
- [x] Nao ha package, env, migration, seed, mock, endpoint ou contrato novo.
- [x] Testes automatizados cobrem ciclo descendente, expansao de ciclos e ausencia de normalizacao para
  ciclo central.
- [x] `pnpm --dir frontend check`, `pnpm --dir frontend build`, browser local e `pnpm check` passam sem
  warnings.
- [x] ADR-0472 registra a decisao de ciclo descendente expansivel no frontend.
- [x] Versao, commit, push em `homolog` e smoke de homologacao sao registrados no fechamento.

## Validacao executada

- Referencia visual consultada: `_product/tasks/PROTO-INVENTORY.md` e `_product/proto/Psicólogos.jpg`. Builder/Quick Copy nao ficou disponivel nas ferramentas desta sessao; usado fallback local e video anexado como evidencia visual.
- `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/app/app/psychologists/modules/feed-loop.test.mjs` - OK (5 testes).
- `pnpm --dir frontend check` - OK.
- `pnpm --dir frontend build` - OK.
- Browser local mobile 390x844 em `http://localhost:3000/psicologos` com backend local `http://localhost:3001` - OK: rota carregou estado vazio real da base local sem app error; comportamento de loop descendente coberto pelos testes automatizados e validado em homologacao apos o push.
- `pnpm check` - OK.
- Smoke de homologacao em `/version` e `/psicologos` apos o push - registrado no fechamento da task.
