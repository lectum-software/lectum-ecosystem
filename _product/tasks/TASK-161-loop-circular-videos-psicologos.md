# TASK-161: Loop circular dos videos da pagina de psicologos

## Metadata

| Campo | Valor |
| --- | --- |
| ID | TASK-161 |
| Prioridade | P1 |
| Esforco | P |
| Fase | Descoberta e video publico |
| Status | Completed |
| Dependencias | TASK-13, TASK-40, TASK-75, TASK-145 |
| ADR alvo | ADR-0471 |

## Contexto

A pagina publica/autenticada de psicologos (`/psicologos`, `/app/psicologos` e compatibilidade
`/app/psychologists`) usa a mesma experiencia vertical de videos de apresentacao. A experiencia
anterior mantinha cada video em loop proprio, o que impedia a sensacao de sequencia continua entre
profissionais.

O produto decidiu que, ao terminar o video ativo, a listagem deve avancar para o proximo video. Ao
terminar o ultimo psicologo, o proximo video deve ser novamente o primeiro psicologo, sem aviso, CTA,
mensagem de fim, reposicionamento visual para o topo ou duplicacao de contrato/API. A percepcao deve
ser de feed infinito.

## Objetivo

Implementar a navegacao circular silenciosa no feed de videos dos psicologos, preservando os eventos
reais de analytics do video de apresentacao, a navegacao manual mobile/desktop, as rotas existentes e
o comportamento sem dados simulados.

## Escopo

- Renderizar uma janela circular controlada no frontend para que o primeiro video tambem exista
  abaixo do ultimo ciclo visivel.
- Ao evento `ended` do video ativo:
  - registrar conclusao/flush da sessao de watch;
  - avancar para o proximo slide;
  - do ultimo psicologo, avancar para o primeiro psicologo do proximo ciclo visual.
- Manter video unico em loop quando houver apenas um psicologo na listagem.
- Preservar filtros, busca, favoritos, WhatsApp, compartilhamento e rotas publicas.

## Fora do escopo

- Alterar backend, banco, contratos HTTP, envs, storage ou analytics persistido.
- Criar aviso, CTA, toast, estado final ou copy nova.
- Alterar ordenacao, recomendacao ou paginacao da listagem.
- Trocar provider/player de video ou instalar package novo.

## Impacto de deploy

- **Aplicacao afetada:** frontend.
- **Banco:** sem alteracao.
- **Backend/API:** sem alteracao de contrato.
- **Env nova:** nenhuma.
- **Compatibilidade:** frontend novo consome o mesmo contrato atual de `directory`; backend antigo e
  novo continuam compativeis.
- **Rollback:** reverter o commit volta ao loop individual por video e remove a janela circular do
  feed, sem dados persistidos a desfazer.

## Criterios de aceite

- [x] Videos da pagina de psicologos deixam de repetir apenas o proprio video quando ha mais de um
  psicologo e avancam para o proximo profissional ao terminar.
- [x] Ao terminar o ultimo psicologo, o proximo video exibido e o primeiro psicologo novamente, sem
  aviso, CTA, toast ou mensagem intermediaria.
- [x] O retorno ao primeiro psicologo nao executa scroll suave para o topo; a lista usa ciclo
  visual abaixo do ultimo item e normaliza a posicao de forma silenciosa.
- [x] Com apenas um psicologo, o video continua em loop proprio.
- [x] Analytics de watch/conclusao continua fazendo flush do video que terminou e usa o slide ativo
  correto mesmo com ciclos duplicados.
- [x] Navegacao manual por scroll/mobile e controles desktop continuam circulares e sem botao
  desabilitado artificialmente no primeiro/ultimo quando ha mais de um psicologo.
- [x] Nao ha package, env, migration, seed, mock, endpoint ou contrato novo.
- [x] Teste automatizado cobre a resolucao circular do ultimo para o primeiro e a normalizacao de
  indices do feed.
- [x] `pnpm --dir frontend check`, `pnpm --dir frontend build`, browser local e `pnpm check`
  passam sem warnings.
- [x] ADR-0471 registra a decisao de janela circular controlada no frontend.
- [x] Versao, commit, push em `homolog` e smoke de homologacao sao registrados no fechamento.

## Validacao executada

- `pnpm --dir frontend check` - OK, 107 testes.
- `pnpm --dir frontend build` - OK, 90 rotas geradas e 0 source maps de producao removidos.
- Browser local em `/psicologos` com backend local e API local apontada para o dev server:
  - Chrome headless mobile 390x844 - OK, feed renderizado, sem erro de conexao e sem app error;
  - Chrome headless desktop 1440x900 - OK, feed renderizado, sem erro de conexao e sem app error;
  - banco local retornou 0 psicologos no diretorio, entao a validacao visual com videos reais ficou
    coberta por testes automatizados e pela preservacao do contrato/API, sem seed ou mock.
- Smoke backend local de apoio: `/health` 200, `/ready` 200 e
  `/api/private/directory/psychologists?limit=20&page=1` 200 com 0 itens.
- `pnpm check` - OK.
- `pnpm version:bump` e `pnpm check:version` - OK antes do commit.
- Commit em `homolog`: registrado no fechamento operacional da task.
- Push em `homolog`: registrado no fechamento operacional da task; o push inicia deploy automatico de
  homologacao.
