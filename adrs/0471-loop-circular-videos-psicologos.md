# ADR-0471: Loop circular silencioso no feed de videos de psicologos

## Status

Accepted

## Task relacionada

TASK-161

## Contexto

A pagina de psicologos exibe videos de apresentacao em formato vertical. O comportamento anterior
mantinha cada video em `loop` proprio, fazendo o mesmo profissional repetir indefinidamente e
impedindo a sensacao de sequencia continua. O produto pediu que, ao terminar o ultimo video do ultimo
psicologo, o proximo video seja novamente o primeiro psicologo, sem aviso, CTA, toast ou scroll suave
para o topo.

## Decisao

Implementar a continuidade como uma janela circular controlada exclusivamente no frontend:

- quando houver mais de um psicologo, o feed renderiza tres ciclos da pagina atual de resultados;
- o indice ativo passa a ser um indice virtual de slide, enquanto o profissional ativo real e
  resolvido por modulo sobre a lista recebida da API;
- o primeiro ciclo e o ultimo ciclo funcionam como bordas de transicao, e a posicao e normalizada de
  volta para o ciclo central com `scrollTo(..., behavior: "auto")` quando o usuario/auto-avanco
  cruza uma borda;
- o evento `ended` do video ativo faz flush de analytics com conclusao e avanca para o proximo slide;
- quando a lista tem apenas um psicologo, o video permanece em loop proprio.

Essa decisao evita pedir uma nova pagina ao backend, evita criar estado final/copy nova e preserva a
ordem atual entregue pelo diretorio.

## Consequencias

- A experiencia fica parecida com feed infinito: do ultimo profissional, o proximo item visual e o
  primeiro profissional abaixo dele, sem rolagem para cima.
- O DOM contem ciclos duplicados apenas para a pagina atual, mantendo o contrato do backend intacto.
- A selecao do video ativo precisou deixar de usar somente `data-psychologist-id`, porque IDs se
  repetem nos ciclos; o player ativo agora e identificado tambem por `data-psychologists-slide-index`.
- A paginacao/ordenacao continuam as mesmas. O loop nao representa busca infinita de novos registros;
  ele apenas reinicia silenciosamente os videos ja carregados.

## Producao e rollout

- Compatibilidade com dados existentes: sem alteracao de dados persistidos.
- Banco/migration: sem alteracao.
- Envs: nenhuma env nova ou alterada.
- Backend/API/Admin: sem alteracao de contrato; o frontend novo continua consumindo a resposta atual
  de diretorio e o backend antigo permanece compativel.
- Deploy: frontend em `homolog`; rollback e reverter o commit, voltando ao loop individual/sem janela
  circular.

## Validacao

- `pnpm --dir frontend check` passou com 107 testes.
- `pnpm --dir frontend build` passou com 90 rotas geradas.
- Browser local em `/psicologos`:
  - Chrome headless mobile 390x844 com backend/API local: feed renderizado, sem erro de conexao;
  - Chrome headless desktop 1440x900 com backend/API local: feed renderizado, sem erro de conexao;
  - a base local retornou 0 psicologos, entao a navegacao circular de videos reais foi validada por
    testes automatizados de indices/ciclos e pelo build, sem seed ou mock.
- Smoke backend local de apoio: `/health` 200, `/ready` 200 e diretorio 200 com 0 itens.
- `pnpm check` passou.

## Pendencias

- Sem decisao externa pendente para a TASK-161.
