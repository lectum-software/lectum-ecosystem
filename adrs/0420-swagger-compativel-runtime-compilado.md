# ADR-0420: Swagger compatível com o runtime compilado

## Status

Accepted

## Data

2026-08-08

## Contexto

O package local `backend/src/packages/swagger` descobre rotas e validators lendo a estrutura dos
arquivos. Em desenvolvimento ele analisa TypeScript em `src`; no container estão disponíveis
somente os arquivos JavaScript compilados em `dist`.

A auditoria encontrou uma diferença silenciosa: as operações continuavam na documentação, mas o
build CommonJS deixava de carregar parte dos validators. Isso removia parâmetros e corpos do
OpenAPI sem impedir a inicialização da API.

## Decisão

1. O diretório analisado é escolhido também pelo local real de execução, e não apenas por
   `NODE_ENV`: execução a partir de `dist` usa `dist/modules`.
2. O import dinâmico recebe o caminho absoluto do arquivo. Enquanto o backend gerar CommonJS, não
   deve receber URL `file://`, pois o código compilado delega a carga ao `require` do Node.
3. Nomes gerados pelo TypeScript, como `validator_1.indexValidator`, são normalizados para o export
   público `indexValidator`.
4. A estrutura de rotas e validators herdada dos packages portados permanece a mesma. Não é criada
   documentação manual paralela.
5. A saída gerada por `src` e por `dist` deve ser comparada semanticamente em mudanças futuras no
   gerador.

## Consequências

- Swagger/Scalar preserva parâmetros e corpos no container de homologação e produção.
- O gerador continua acoplado ao build CommonJS atual. Uma migração para ESM exige revisão e teste
  explícitos deste carregamento.
- Um teste automatizado cobre a resolução de validator nomeado no formato emitido pelo TypeScript.

## Compatibilidade, rollout e rollback

- Não há mudança em rota, payload, banco, migration, variável de ambiente ou dependência.
- Publicar primeiro em `homolog` e conferir o documento OpenAPI antes de promover para `main`.
- Em regressão, reverter o commit; nenhum dado precisa de rollback.

## Validação

- Build do backend em CommonJS.
- Geração com `node dist/doc.js` e `NODE_ENV=dev`, provando que a escolha não depende apenas do env.
- Comparação semântica com o OpenAPI gerado por `src`.
- Checks e testes do backend.
