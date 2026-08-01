# ADR-0396: Tags medias e cores na tabela comportamental Admin

## Status

Accepted

## Task relacionada

TASK-132

## Contexto

A tabela comportamental por Conversao do Admin de Psicologos precisa orientar decisoes de produto com leituras comparaveis entre faixas. Exibir totais nas tags fazia categorias com mais psicologos parecerem melhores mesmo quando a produtividade media era padrao ou baixa.

## Decisao

- O backend passa a enviar `display_value` e `tone` em cada metrica de `profile_conversion_behavior`.
- As tags visiveis passam a ser um conjunto curado por coluna, composto por medias, predominancias ou classificacoes semanticas.
- `Cliques WhatsApp` e sempre a primeira tag de cada coluna e representa media por psicologo daquela faixa na pagina/origem correspondente.
- O frontend renderiza as cores diretamente a partir de `tone`:
  - `standard`: azul;
  - `above`: verde;
  - `below`: amarelo;
  - `zero`: vermelho.
- O frontend usa `display_value` para copy de produto e nao tenta recalcular a semantica localmente.
- Metricas detalhadas antigas podem permanecer no payload para auditoria, mas nao entram no conjunto visivel da tabela.
- Nao criar schema, migration, tracking ou package novo.

## Consequencias

- A leitura visual passa a comparar categorias por produtividade media e padrao, reduzindo vies de volume bruto.
- A cor da tag fica consistente entre backend e UI porque a regra de dominio mora no backend.
- Novas copys especificas podem ser atendidas sem alterar unidade numerica ou quebrar consumidores existentes.
- Clientes que ignorarem `display_value` e `tone` continuam podendo ler `value`, `unit` e `label`.

## Validacao

- `pnpm --dir backend typecheck`
- `pnpm --dir admin typecheck`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local em `http://localhost:3002/psicologos`.

## Pendencias

- Nenhuma pendencia externa.
