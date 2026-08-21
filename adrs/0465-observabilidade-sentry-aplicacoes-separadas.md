# ADR-0465: Observabilidade Sentry em aplicações separadas

## Status

Accepted

## Task relacionada

TASK-34 — complemento de observabilidade em 2026-08-20.

## Contexto

Frontend, backend e admin são publicados e operados separadamente, mas ainda não possuíam captura
centralizada de falhas. A ADR-0006 já havia escolhido Sentry e reservado a implementação para uma
execução dedicada. O usuário criou dois projetos Next e um projeto Node no provider.

O produto processa dados potencialmente sensíveis. A integração não pode enviar PII, credenciais,
corpos HTTP, query strings OAuth, SQL, variáveis locais ou mensagens cruas de providers. Ela também
não pode tornar a disponibilidade do Sentry um requisito para boot ou build do Lectum.

## Decisão

- Instalar `@sentry/nextjs@10.70.0` separadamente em `frontend/` e `admin/`, e
  `@sentry/node@10.70.0` no `backend/`.
- Usar um projeto/DSN por aplicação. Nenhum runtime ou credencial é compartilhado por pressuposto;
  um token organizacional de upload só pode ser reutilizado quando o próprio provider lhe conceder
  acesso explícito aos dois projetos Next.
- Iniciar em modo error-only. Não habilitar tracing/performance, Replay, Logs, User Feedback nem
  profiling nesta etapa.
- Aplicar configuração de coleta explicitamente restrita e um `beforeSend` allowlist-based. Eventos
  mantêm tipo genérico/controlado da exceção, frames com identificadores sintéticos sem segmentos
  ou símbolos da origem, tags operacionais literais e metadados técnicos validados necessários à
  simbolicação (`event_id`, timestamp, level, platform, release, environment e debug ids
  sanitizados); removem caminhos absolutos, usuário, request, headers, cookies, body, query,
  extras, breadcrumbs, mensagens, token, PII, SQL e detalhe cru de provider.
- No Next App Router, inicializar client, server e edge pelos entrypoints oficiais, capturar os error
  boundaries existentes sem trocar sua UX e incluir na CSP apenas o origin HTTPS extraído de um
  DSN cloud Sentry válido.
- Publicar source maps dos apps Next somente quando `NEXT_PUBLIC_SENTRY_DSN`,
  `NEXT_PUBLIC_SENTRY_ENVIRONMENT`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` e `SENTRY_PROJECT` estiverem
  presentes e válidos no build. Falha de upload é degradável; a etapa de remoção aguarda o upload
  terminar, inclusive quando ele falha, e verifica que nenhum source map externo ou inline ficou no
  artefato público.
- Inicializar o SDK Node antes de Express/Prisma, instalar seu handler entre as rotas e o handler
  público existente e capturar manualmente catches que consomem falhas inesperadas. Respostas 4xx,
  probes e recusas esperadas permanecem fora da captura.
- Ausência ou invalidade de DSN ou environment explícito desabilita o SDK sem interromper a
  aplicação; `NODE_ENV` não ativa coleta como fallback. No backend, os
  handlers fatais sanitizados continuam ativos mesmo sem o provider, para impedir que o fallback do
  Node imprima stack ou mensagem crua. Nenhuma env Sentry é obrigatória para manter o produto
  operacional; as envs são necessárias somente para ativar coleta e simbolicação.

## Consequências

- Falhas inesperadas passam a ser centralizadas por aplicação e ambiente.
- O rollout preserva LGPD e a regra de não expor detalhes técnicos, ao custo de eventos menos ricos.
- Sem credenciais de source maps, issues Next continuam chegando, mas com simbolicação degradada.
- Sem tracing não existe correlação distribuída frontend/API nesta fase e nenhum header adicional
  precisa ser liberado no CORS.
- O package oficial aumenta cada instalação/deploy separadamente. O postinstall do
  `@sentry/cli` é permitido somente nos dois apps Next para o upload de artefatos.
- A auditoria obrigatória revelou CVE-2026-40345 recém-publicada no `deepmerge-ts@7.1.5` exato de
  `@prisma/config`. O backend fixa `8.0.0`, versão corrigida; `prisma validate`, geração do client,
  check e build validam a compatibilidade sem conectar ou alterar o banco.

## Produção e rollout

- Sem banco, migration, backfill, seed ou alteração de contrato HTTP.
- As novas envs possuem fallback seguro; se faltarem, o SDK fica desabilitado ou os source maps não
  são publicados. O produto continua funcionando.
- **ALERTA DE DEPLOY — frontend:** configurar antes do build/redeploy
  `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT`, `SENTRY_ORG`, `SENTRY_PROJECT` e o
  segredo `SENTRY_AUTH_TOKEN`.
- **ALERTA DE DEPLOY — admin:** configurar antes do build/redeploy as mesmas cinco chaves, usando o
  DSN e o projeto do Admin; `SENTRY_AUTH_TOKEN` permanece segredo de build.
- **ALERTA DE DEPLOY — backend:** configurar antes do restart/redeploy `SENTRY_DSN` e
  `SENTRY_ENVIRONMENT`, usando o projeto Node.
- O environment correspondente é operacionalmente obrigatório ao ativar uma DSN. Se faltar ou for
  inválido, SDK, CSP e upload ficam em no-op e o produto continua funcionando, evitando que homolog
  seja classificada como produção.
- Ordem em duas etapas: (1) publicar o código desativado por fallback seguro em homolog; (2)
  cadastrar as envs de homolog, redeployar as três aplicações, validar versões e saúde e confirmar
  no provider as releases `lectum-frontend@<versão>` e `lectum-admin@<versão>`, seus artefatos e a
  simbolicação de uma issue orgânica sanitizada, sem emitir erro artificial. Repetir em produção
  somente após essa homologação.
- `SENTRY_AUTH_TOKEN` deve ter o menor privilégio de CI e acesso apenas aos projetos necessários;
  seu valor nunca é registrado no repositório ou logs e deve ser rotacionado/revogado conforme a
  política da organização.
- Frontend, backend e admin antigos/novos são compatíveis em qualquer ordem porque não existe
  contrato entre eles para observabilidade.
- Rollback imediato: remover/desabilitar DSN, environment e credenciais de upload da aplicação
  afetada e redeployar/reiniciar; rollback de código é revert do commit. Nenhum dado Lectum precisa
  ser revertido.

## Validação

- Testes unitários das policies de DSN, environment, sanitização e classificação de erros: 43 no
  frontend, 204 no backend e 23 no Admin dentro de suas suítes completas.
- `pnpm check` e builds dos três projetos com as envs ausentes, comprovando fallback seguro.
- Falha de upload exercitada contra endpoint local indisponível: build não bloqueado e zero source
  maps externos ou inline no artefato público final.
- Audits de dependências de produção separados por aplicação: zero vulnerabilidades conhecidas em
  2026-08-21; Prisma também validado após o override transitivo de segurança.
- Smoke HTTP local dos três builds concluído. O browser visual não estava conectado e essa limitação
  foi registrada na task; não existe alteração visual nesta integração.
- Smoke dos endpoints publicados `/health`, `/ready`, `/ping` e `/version` obrigatório após o push
  em homologação.

## Pendências

- Provisionar as envs primeiro nos três deploys de homolog e, após validação, nos três de
  produção.
- Validar no provider as releases/artefatos dos projetos Next e a primeira issue orgânica,
  sanitizada e simbolicada em cada projeto; não gerar exceção fake em ambiente com dados reais.
- Qualquer adoção futura de tracing, Replay, Logs, User Feedback ou profiling exige task/ADR
  próprios.
