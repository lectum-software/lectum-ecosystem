# ADR-0441: Versionamento rastreável e promoção de produção por PR

## Status

Accepted

## Task relacionada

TASK-146

## Contexto

As três aplicações são construídas e publicadas separadamente, embora compartilhem o repositório.
Sem uma versão exposta pelo próprio artefato, uma pessoa não técnica não consegue diferenciar com
segurança código local, homologação e produção. Ao mesmo tempo, `homolog` e `main` possuem deploy
automático e exigem uma fronteira explícita contra publicação direta em produção.

## Decisão

- A versão de release será SemVer e ficará sincronizada nos manifests da raiz, backend, frontend e
  admin.
- Cada commit de desenvolvimento criado por agente executará o incremento de patch antes do commit.
- Um script único fará o bump; outro modo do mesmo script validará sincronização e o conteúdo
  preparado no índice Git. O Lefthook bloqueará commits sem incremento.
- Backend lerá seu manifest e adicionará `version` ao contrato aditivo de `/ping`.
- Frontend e admin lerão seus manifests no `next.config.ts`, injetarão a versão como constante de
  build e publicarão `GET /version` em JSON, sem autenticação, sem cache, com `noindex` e sem links ou
  sitemap. Os Route Handlers não importarão `package.json` diretamente.
- O Admin fixará `outputFileTracingRoot` no diretório de `admin/next.config.ts`, resolvido por
  `import.meta.url`, e nunca em `process.cwd()`, que varia conforme o executor do build.
- Uma solicitação explícita de produção será atendida por PR `homolog` -> `main` e merge via `gh`
  após checks/smoke. Não haverá commit/push direto em `main`, nem exclusão da branch `homolog`.

## Consequências

- O número consultado identifica o artefato de cada aplicação sem revelar infraestrutura ou segredo.
- O manifest da aplicação é necessário apenas durante o build e não integra o código de negócio dos
  Route Handlers.
- Durante deploy independente, versões podem divergir temporariamente e tornam o progresso visível.
- Commits exclusivamente documentais também incrementam patch quando criados por agente; isso é
  aceito para manter uma regra simples e verificável pelo hook.
- Se alguém preparar manualmente versões divergentes ou esquecer o bump, o commit falha com instrução
  para executar o comando correto.
- A promoção requer GitHub CLI autenticado e permissão para criar/mesclar PR; falta de acesso é um
  bloqueio explícito, não motivo para contornar `main`.

## Produção e rollout

- **Banco/migration:** sem alteração.
- **Envs:** nenhuma env operacional. `LECTUM_APP_VERSION` é uma constante interna criada pelo
  `next.config.ts`; não requer provisionamento no ambiente. O check de envs só a dispensa dos
  `.env.example` quando encontra sua declaração exata na configuração de build.
- **Contratos:** somente campo aditivo em `/ping` e duas novas rotas de leitura.
- **Compatibilidade:** backend, frontend e admin continuam independentes; a versão é local ao artefato.
- **Ordem:** qualquer uma das três aplicações pode publicar primeiro.
- **Smoke em homologação:** `/health`, `/ready`, `/ping` do backend e `/version` das duas aplicações
  Next.js.
- **Promoção:** PR `homolog` -> `main`, checks obrigatórios verdes, merge e smoke de produção.
- **Rollback:** restaurar o commit/imagem anterior; não há dados para desfazer.

## Validação

- Política de versão testada com quatro testes unitários e com os modos `check`/`check-staged`.
- `pnpm check` concluído sem erros.
- Checks e builds individuais de backend, frontend e admin concluídos sem erros.
- Builds locais responderam `0.1.1` em backend `/ping` e frontend/admin `/version`.
- Headers `no-store`/`noindex`, ausência no sitemap e permanência do guard administrativo foram
  confirmados por smoke HTTP.
- Smoke publicado executado depois do push em `homolog`.

## Correção pós-deploy

O primeiro deploy do Admin em `0.1.1` falhou quando a coleta da Vercel executou `lstat` em
`/vercel/path0/.next/package.json`. A investigação local confirmou que esse é um arquivo interno
normal do Next e que o Admin era a única aplicação com `outputFileTracingRoot: process.cwd()`. Esse
valor pode apontar para a raiz do checkout na Vercel, enquanto a saída pertence a `admin/.next`. A
correção ancora a raiz no diretório do próprio arquivo de configuração com `import.meta.url`, mantendo
o isolamento da aplicação e removendo a dependência do diretório de execução. Na mesma versão
`0.1.2`, a leitura da versão foi movida para `next.config.ts` e
`process.env.LECTUM_APP_VERSION` passou a ser substituída no bundle durante o build. O frontend
recebeu o mesmo endurecimento preventivo.

A validação local de `0.1.2` confirmou build do Admin sem warning de raiz inferida, trace ancorado em
`admin/`, versão literal nos dois bundles Next e os três contratos HTTP respondendo `0.1.2`. O smoke
publicado permanece obrigatório depois do push em `homolog`.

## Pendências

- Tags Git e GitHub Releases podem ser avaliadas futuramente se houver necessidade de changelog
  externo; não são necessárias para rastrear o deploy atual.
