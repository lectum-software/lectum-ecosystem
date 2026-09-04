# TASK-166: Estabilizar origem pública da migração R2 para Stream

## Metadata

| Campo | Valor |
| --- | --- |
| ID | TASK-166 |
| Prioridade | P0 |
| Esforço | M |
| Fase | Correção operacional pós-deploy de mídia |
| Status | Completed |
| Dependências | TASK-157, TASK-163, TASK-165 |
| ADR alvo | ADR-0481 |

## Contexto

O primeiro `dry-run` real da TASK-165 em homologação encontrou cinco vídeos de apresentação. Um foi
considerado elegível e quatro falharam fechados com `public_source_head_invalid`. Nenhuma escrita foi
feita: o modo de inspeção não criou `video_asset`, não chamou `/stream/copy` e não removeu objetos R2.

A rota legada contém a extensão original (`.mp4`, `.webm` ou `.mov`). Para recursos considerados
cacheáveis, a Cloudflare pode transformar um `HEAD` recebido na borda em `GET` ao consultar a origem.
O código anterior adicionava `Content-Range` apenas quando o Express recebia `HEAD`; portanto, a
resposta convertida podia perder justamente o header exigido pela importação por link do Stream.

O mesmo teste operacional também revelou que o `backend/package.json` entregue isoladamente no
container não fixava o package manager. Ao executar `pnpm`, Corepack tentou baixar pnpm 11 e propôs
reinstalar o `node_modules` produzido pela imagem com pnpm 10.33.0. A operação foi interrompida antes
de qualquer reinstalação.

Não há alteração visual. Builder/Quick Copy e protótipos não se aplicam a esta correção backend-only.

## Objetivo

1. disponibilizar uma URL pública técnica, extensionless e limitada às origens de vídeo legadas;
2. manter `HEAD` e `GET Range` compatíveis mesmo quando há Cloudflare Proxy entre Stream e backend;
3. acrescentar diagnóstico sanitizado suficiente para diferenciar status, cache e headers;
4. impedir que Corepack selecione uma versão diferente do pnpm dentro da imagem;
5. preservar integralmente o comportamento seguro, idempotente e não destrutivo da TASK-165.

## Implementação

### Rota técnica de origem

A migração passa a gerar:

```text
/public/video-stream-import/v1/{source}
```

`source` é a chave R2 codificada em Base64URL canônico. Ela não possui ponto/extensão no path e não
contém credencial, assinatura, usuário ou dado pessoal. A rota:

- aceita apenas token Base64URL canônico, UTF-8 válido e até o limite definido;
- decodifica somente chaves de `psychologist/video/` ou `posts/media/`;
- recusa traversal, controles, barra invertida, query string e prefixos desconhecidos;
- consulta o bucket configurado e entrega somente objeto reconhecido como vídeo;
- responde `HEAD 200` com `Content-Length`, `Accept-Ranges` e `Content-Range` completos;
- responde `GET Range` com `206` e o intervalo informado pelo R2;
- também preserva o `Content-Range` completo no fallback de `GET` sem Range, caso um intermediário
  converta o método;
- aplica `Cache-Control`, `CDN-Cache-Control` e `Cloudflare-CDN-Cache-Control` como `no-store`, além
  de `X-Robots-Tag` não indexável.

O path termina em token sem extensão para não entrar na lista padrão de arquivos cacheáveis do CDN.
A rota `/public/files/*` continua disponível sem quebra para vídeos e demais mídias antigas. Como os
mesmos objetos já eram públicos nessa rota, a origem técnica não amplia o inventário acessível nem
transforma bucket privado em público.

### Probe e observabilidade

O `dry-run` continua exigindo:

- igualdade entre tamanho no R2 e `Content-Length` do `HEAD`;
- `Accept-Ranges: bytes`;
- `Content-Range` completo no `HEAD`;
- `GET bytes=0-0` com status `206`, um byte e total coerente.

Em uma recusa, o log pode incluir somente:

- etapa `head` ou `range`;
- status HTTP numérico;
- classificação controlada de cache;
- booleanos indicando igualdade dos três headers.

URL, object key, nome, UID do provider, usuário, resposta bruta e valores de headers não são
registrados. A referência curta SHA-256 já existente continua sendo a única correlação por item.

### Package manager do container

- `backend/package.json` declara `packageManager: pnpm@10.33.0`;
- o Dockerfile continua preparando a mesma versão;
- o cache do Corepack é compartilhado e legível pelo usuário não privilegiado do runtime;
- `COREPACK_DEFAULT_TO_LATEST=0` impede seleção silenciosa da versão mais recente;
- a rede do Corepack fica desabilitada no estágio de runtime e o build prova `pnpm --version` como
  usuário `node`;
- um teste de contrato falha se manifesto e Docker divergirem.

Não é instalado ou atualizado nenhum package. A alteração apenas fixa a ferramenta já usada na
construção da imagem.

## Segurança e rollout

- O deploy não inicia migração automaticamente.
- O comando permanece `dry-run` por padrão e `--apply` ainda exige confirmação exata do ambiente.
- Nenhuma migration Prisma, coluna, backfill automático ou env nova é introduzida.
- Nenhum vídeo/capa R2 é apagado e nenhum registro de conteúdo é alterado por esta correção.
- A primeira validação pós-deploy deve repetir somente o dry-run de cinco apresentações.
- O primeiro apply continua limitado a um item depois de todos os probes esperados ficarem elegíveis.
- Rollback do código restaura a URL legada de origem; referências já migradas continuam no Stream e
  objetos R2 continuam disponíveis.

## Critérios de aceite

- [x] Evidência do dry-run real é registrada sem tratar falha como migração concluída.
- [x] Apply permanece bloqueado até corrigir o contrato público de HEAD/Range.
- [x] Migração usa rota dedicada cujo path final não possui extensão cacheável.
- [x] Token aceita somente Base64URL canônico, UTF-8 e prefixos R2 permitidos.
- [x] Rota rejeita query, origem não-vídeo e chave inválida sem expor detalhe técnico.
- [x] HEAD e GET Range retornam tamanho/range coerentes e headers de no-store.
- [x] Probe continua fail-closed e acrescenta somente diagnóstico sanitizado.
- [x] pnpm 10.33.0 fica fixado no manifesto e no Corepack sem reinstalar dependências em runtime.
- [x] Testes cobrem token, URL, rota HTTP, probe e contrato do package manager.
- [x] Nenhum package, env, schema ou migration é adicionado.
- [x] Backend check/build, check da raiz e validação de versão passam sem warnings.
- [x] Versão dos cinco manifests é incrementada uma vez no commit.
- [x] Commit e push ocorrem em `homolog`; deploy e smoke são registrados ou eventual bloqueio
  externo é reportado.

## Validação

- testes focados da rota, URL, probe e package manager;
- `pnpm --dir backend check`;
- `pnpm --dir backend build`;
- execução de `--help` pelo artefato compilado;
- build Docker do backend quando o daemon estiver disponível;
- `pnpm check`;
- após deploy: `/health`, `/ready`, `/ping` e novo dry-run real em homologação.

## Registro de execução — 2026-09-04

- Branch `homolog` confirmada antes da edição.
- O dry-run fornecido pelo usuário registrou quatro recusas `public_source_head_invalid`, um item
  elegível e `r2_objects_deleted: 0`; nenhum apply foi autorizado.
- A causa foi corrigida sem reset, seed, `db push`, alteração de schema ou limpeza de bucket.
- A documentação oficial da Cloudflare sobre conversão de HEAD e importação por link foi usada para
  definir a rota extensionless e o contrato de headers; o código gerado por terceiros não foi usado.
- Onze testes focados validaram token, URL, HEAD, fallback GET, Range, rejeição de não-vídeo,
  diagnóstico e runtime do package manager. O check completo do backend aprovou 256 testes.
- `pnpm --dir backend build`, ajuda do artefato compilado, `pnpm check` e sincronização dos cinco
  manifests em `0.1.264` passaram sem warnings ou erros.
- O build Docker foi executado até a imagem final. A própria imagem provou pnpm `10.33.0` como
  usuário não privilegiado e uma execução posterior não tentou baixar pnpm nem reinstalar módulos.
- Não houve mudança de schema/migration; por isso `db:migrate` não se aplica à TASK-166.
- A validação real pós-deploy permanece obrigatória antes do primeiro apply.
