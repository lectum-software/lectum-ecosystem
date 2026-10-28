# ADR-0648 — Backend Node 24 com validação da imagem final

## Status

Aceito; implementado e validado localmente — 2026-10-28.

## Task e contexto

TASK-32 — Diagnóstico de assinatura. Após a publicação 0.1.736/PR #137, o usuário
autorizou avaliar e adotar Node 24 caso exista ganho real de robustez, segurança
ou visibilidade. Nesta execução: implementar, validar e commitar localmente;
publicação do novo runtime depende de autorização separada.

## Decisão

1. Alterar somente o runtime do backend de Node 22 para **24.22.1**, patch de
   segurança da linha 24 disponível na consulta de 28/10. Preservar Debian
   Bookworm slim, base comum aos stages, pnpm 10.33.0 via Corepack, instalação
   frozen-lockfile, prune de dependências dev e usuário não-root. Fixar tag e
   digest da imagem oficial testada; revisar ambos a cada atualização de segurança.
2. Alinhar `backend/package.json` para `>=24.22.1 <25`. Não adicionar pacote nem atualizar types ou impor runtime comum aos
   apps Next/video. Como exceção focal de segurança encontrada na auditoria,
   atualizar somente `qs` 6.16.0 → 6.16.1 nos lockfiles independentes backend/video
   e nos overrides; GHSA-6pq8-jhm2-2vcw. Não migrar o runtime do video. Não atualizar o Node global da máquina do usuário.
3. Executar os testes de transporte loopback já existentes na imagem final e
   exigir uma versão Undici com canal `bodyChunkSent`. No runtime escolhido,
   o observador do ADR-0647 pode comparar `payer_email` no corpo enviado, além
   do payload do adapter. Mantêm-se 16 KiB de captura temporária, limpeza do
   buffer e logs somente booleanos/enums. Não registrar corpo, e-mail, tokens,
   sessão, documento ou dados de cartão; não interceptar/consumir streams.
4. Validar o artefato Linux amd64 localmente, reconstruindo os módulos nativos.
   Não usar `node_modules` do macOS como prova de compatibilidade da imagem.
   Exercitar argon2/bcrypt, sharp, Prisma/pg, entrypoint, migrações existentes
   contra PostgreSQL isolado e health/readiness. Sem credenciais ou chamadas
   financeiras externas, sem simular aprovação do Mercado Pago.

5. A auditoria identificou um advisory moderado em `qs` transitivo de Express
   nos dois serviços. O vetor exige serialização `arrayFormat: comma` de objetos
   controlados por entrada; não foi encontrado esse uso no código da aplicação.
   Corrigir preventivamente com o patch mínimo e testes reais da dependência,
   sem declarar exploração constatada. Repetir cinco auditorias e quatro builds
   conforme PACKAGES.md. Demais dependências permanecem nas versões travadas.

## Ganhos e limites

- Node 24 recebe manutenção até 30/04/2028, versus 30/04/2027 para Node 22,
  conforme calendário consultado. Ambas as linhas estão em Maintenance LTS
  nesta data. A mudança de major, por si só, não demonstra maior segurança:
  Node 22.23.4 também recebeu correções em outubro.
- Node 24.22.1 embarca Undici 7.30.1 e o canal de chunks ausente no Undici 6 do
  Node 22. Há ganho concreto de observabilidade sem alterar a chamada financeira.
- Testes não são benchmark nem prova de ausência de bugs/vulnerabilidades. Manter
  patching e auditoria. Um patch fixado não deve ficar congelado indefinidamente.
- A mudança não remove `cc_rejected_high_risk`, não substitui validação de dados
  reais do comprador/titular e não comprova consumo do sinal pelo antifraude.

## Deploy e rollback

Sem env, schema, migration ou contrato HTTP novo; nenhum frontend obrigatório.
Mudança de runtime somente no backend e apenas após rebuild completo. O patch
transitivo de segurança também exige rebuild independente do video; nenhum job,
Redis ou FFmpeg foi reconfigurado. Validar
imagem/pacotes antes de promover por PR; não usar build VPS como substituto do local.
Rollback do backend pela imagem anterior Node 22/release 0.1.736, e do video pela
imagem anterior própria, sem limpeza de dados; isso reintroduz a versão antiga de qs.
Não há UI nova; Builder/proto/browser visual não se aplicam a esta mudança.

## Critérios de validação

Check integral no patch exato, build Docker Linux amd64, testes de transporte com
corpo observável, smoke de módulos nativos/Prisma/pg e API não-root com banco local
isolado. Manter schedulers e providers desabilitados no QA. Registrar resultados
reais e limites antes de marcar os critérios da TASK-32.

## Evidências locais — 0.1.737

- Binário macOS Node 24.22.1 verificado contra checksum oficial, sem alterar Node
  global. `pnpm check` completo aprovado; backend 1.032/1.032, video 96 aprovados
  e 13 testes FFmpeg opcionais ignorados por ausência local de drawtext/libfreetype.
- Builds backend/frontend/admin/video aprovados com ambiente isolado; sem envs
  reais carregadas nem envio de source maps. `pnpm check:dependencies` aprovado:
  cinco escopos sem advisories conhecidos em 28/10. Não equivale a scan completo
  de CVEs da imagem/OS ou garantia contra vulnerabilidades ainda não publicadas.
- Build Docker completo `linux/amd64` no Mac (emulação), Debian Bookworm, Node
  24.22.1/Undici 7.30.1, pnpm 10.33.0 offline, `USER node` UID 1000. A imagem final
  executou 20/20 testes reais de transporte; guard exige canal de corpo. Imagem
  local `lectum-backend:node24-qa-737`, identificador
  `sha256:e6e58edb352275aa2ecba1fb7152a3023e8de754b333560912f4cd22ebfc69f0`.
- Imagem final: hash/verify argon2 e bcrypt, transformação/decodificação sharp,
  regressão qs real e usuário não-root aprovados. Testes da dependência real nos
  dois apps cobrem casos que falhavam no qs 6.16.0, além de formatos usuais.
- PostgreSQL 18.6 efêmero em tmpfs e rede Docker interna sem egress: entrypoint
  aplicou as 109 migrations existentes em banco vazio, sem seed; repetição idempotente
  aprovada. Prisma/pg executaram SELECT 1; não houve alteração de migration/schema.
- API real em `NODE_ENV=test`: `/ping`, `/health`, `/ready` 200, versão 0.1.737,
  `Cache-Control: no-store`. API em `NODE_ENV=production`, **sem credenciais Stream**:
  `/ping` e `/health` 200, `/ready` 503 deliberado (fail-closed). Não enfraquecer a
  readiness ou inventar credenciais para passar o teste. Não é smoke de produção.
  Ambos os processos encerraram com SIGTERM e código 0.
- Revisão independente sem bloqueantes. Nenhum pagamento ou chamada financeira,
  nenhum acesso a dados publicados, nenhuma mudança visual. A compatibilidade
  com sinais/respostas reais do gateway ainda depende da observação autorizada
  após publicação; não prometer remoção da recusa de risco.
- Bump único para 0.1.737 nos cinco manifests; commit local em homolog. Sem
  push/deploy deste runtime. Publicação deve seguir LOCAL-TO-PRODUCTION.md.

## Fontes primárias

- [Node 24.22.1](https://nodejs.org/en/blog/release/v24.22.1)
- [Atualizações de segurança de outubro](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)
- [Calendário Node](https://github.com/nodejs/Release/blob/main/schedule.json)
- [Canais do runtime escolhido](https://github.com/nodejs/node/blob/v24.22.1/deps/undici/src/lib/core/diagnostics.js)
- [Prisma 7: requisitos](https://www.prisma.io/docs/orm/v7/reference/system-requirements)
- [Sharp: instalação e Node-API](https://sharp.pixelplumbing.com/install/)

- [Advisory qs / patch 6.16.1](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw)
