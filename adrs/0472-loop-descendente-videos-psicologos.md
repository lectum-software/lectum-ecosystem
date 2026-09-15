# ADR-0472: Loop descendente expansivel no feed de videos de psicologos

## Status

Accepted

## Task relacionada

TASK-162

## Contexto

O loop circular inicial do feed de psicologos usava tres ciclos e normalizava a posicao de volta para
o ciclo central com `scrollTo(..., behavior: "auto")`. Na pratica, o video enviado pelo usuario em 2026-08-27 foi tratado somente como evidencia visual do bug, sem assumir instrucoes a partir do conteudo do anexo, e mostrou dois problemas perceptiveis no mobile: abertura da aba com tela preta/cortada entre slides e,
ao terminar o ultimo video, uma rolagem automatica para cima ate o primeiro item original.

O requisito de produto e que o loop pareca um feed infinito: depois do ultimo, o primeiro psicologo
deve aparecer como proximo video abaixo, sem mensagem final e sem qualquer retorno visual para o topo.

## Decisao

Substituir a normalizacao para ciclo central por um loop descendente expansivel no frontend:

- o feed inicia no primeiro slide real (`index 0`), sem ancoragem inicial em um ciclo duplicado;
- os slides virtuais continuam resolvendo o psicologo real por modulo;
- ciclos duplicados sao renderizados abaixo da lista atual;
- ao se aproximar do fim dos slides renderizados, o frontend aumenta a contagem de ciclos para manter
  pelo menos mais uma volta disponivel abaixo;
- nao ha normalizacao automatica de scroll para um ciclo anterior/central;
- lista com zero ou um psicologo permanece sem duplicacao e, no caso de um video, usa `loop` nativo.

## Consequencias

- A experiencia deixa de ter salto visual para cima e passa a se comportar como progressao continua.
- O DOM pode crescer durante uma sessao longa de visualizacao, mas apenas com ciclos da pagina atual de
  resultados e sob demanda; a pagina atual segue limitada pelo contrato existente do diretorio.
- A selecao do video ativo por `data-psychologists-slide-index` permanece necessaria porque o mesmo
  psicologo aparece em ciclos diferentes.
- A implementacao nao altera ordenacao, paginacao, backend, envs, banco ou analytics persistido.

## Producao e rollout

- Compatibilidade com dados existentes: sem alteracao de dados persistidos.
- Banco/migration: sem alteracao.
- Envs: nenhuma env nova ou alterada.
- Backend/API/Admin: sem alteracao de contrato.
- Deploy: frontend em `homolog`; rollback e reverter o commit.

## Validacao

- `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/app/app/psychologists/modules/feed-loop.test.mjs` - OK.
- `pnpm --dir frontend check` - OK.
- `pnpm --dir frontend build` - OK.
- Browser local mobile 390x844 em `/psicologos` com backend local - OK, sem app error; base local sem psicologos publicados.
- `pnpm check` - OK.
- Homologacao: validar `/version` e `/psicologos` apos o push automatico de `homolog`.

## Pendencias

- Sem decisao externa pendente.
