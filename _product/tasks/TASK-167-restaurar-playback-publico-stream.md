# TASK-167: Restaurar playback público seguro no Cloudflare Stream

## Metadata

| Campo | Valor |
| --- | --- |
| ID | TASK-167 |
| Prioridade | P0 |
| Esforço | M |
| Fase | Correção de regra de negócio e segurança de mídia |
| Status | Completed |
| Dependências | TASK-40, TASK-163, TASK-165, TASK-166 |
| ADR alvo | ADR-0482 |

## Contexto e regressão confirmada

Antes do Cloudflare Stream, vídeos de apresentação, posts e respostas eram lidos por
`/public/files/*`. O backend aceitava anonimamente os prefixos R2 `psychologist/video/` e
`posts/media/`, em coerência com a TASK-40: descoberta de psicólogos, perfil, comunidades, feed,
post e thread são superfícies públicas; autenticação é exigida para autoria e interação, não para
leitura.

A TASK-163 preservou corretamente o ativo do provider como privado (`requireSignedURLs`) e passou a
emitir HLS assinado pelo backend. Porém, também colocou o único endpoint de autorização sob
`privateAuth` e transformou “provider privado” em “conteúdo exige login”. A migração da TASK-165
substituiu as URLs R2 públicas pela referência Stream e tornou a divergência visível: visitantes
passaram a receber `401`, enquanto os mesmos vídeos eram públicos antes da migração.

Esta task corrige a fronteira sem tornar o vídeo Cloudflare irrestrito. O ativo continua privado no
provider e sem UID público; o backend só emite URL assinada curta quando comprova que o ativo está
associado ao conteúdo público e ativo correspondente. Donos autenticados mantêm a prévia de ativos
prontos ainda não publicados; Admin mantém seu endpoint separado.

Não há mudança visual, package, env, schema ou migration. Builder/Quick Copy e protótipos não se
aplicam porque o trabalho restaura contrato de acesso e remove uma mensagem de login indevida.

## Objetivo

Restabelecer a leitura anônima de vídeos que pertencem a superfícies públicas, preservando o modelo
de segurança do Cloudflare Stream, a privacidade de rascunhos e a compatibilidade durante deploys
independentes de frontend e backend.

## Matriz de autorização

| Estado do ativo/conteúdo | Visitante anônimo | Terceiro autenticado | Dono autenticado | Admin |
| --- | --- | --- | --- | --- |
| Perfil publicado e usuário ativo | playback assinado | playback assinado | playback assinado | playback admin |
| Post publicado em comunidade ativa | playback assinado | playback assinado | playback assinado | playback admin |
| Resposta ativa em post/comunidade públicos | playback assinado | playback assinado | playback assinado | playback admin |
| Ativo pronto ainda não associado/publicado | `404` | `404` | playback assinado | playback admin |
| Conteúdo removido/inativo ou ativo não pronto | `404` | `404` | `404`, salvo vínculo de dono ainda válido | `404` se ativo inválido |

O `404` é deliberado na rota pública: não revela se um ID corresponde a vídeo privado, removido ou
inexistente. A associação pública é consultada no banco a cada emissão de token; conhecer a
referência interna não concede acesso.

## Contrato backend

- Adicionar `GET /api/public/video-assets/:id/playback` com `optionalAuth`.
- Autorizar visitante quando a referência exata estiver associada a:
  - perfil de psicólogo publicado, não removido e com usuário ativo;
  - post publicado, não removido, de autor ativo e comunidade ativa;
  - resposta não removida, de autor ativo, cujo post publicado, autor e comunidade estejam ativos.
- Se houver sessão válida, também autorizar o próprio dono para prévia do ativo pronto.
- Continuar exigindo autenticação para `POST /uploads`, `GET /:id/status` e `DELETE /:id`.
- Manter `GET /api/private/video-assets/:id/playback` como alias temporário de leitura opcional,
  montado antes do router privado e contendo somente o `GET` de playback. Isso permite que frontend
  antigo funcione quando backend novo for publicado primeiro.
- Registrar o alias no gate central de rotas como exceção nominal e auditada; a propriedade não
  pode liberar outros paths privados.
- Marcar respostas do novo namespace como `private, no-store`, aplicar no-store também nos headers
  específicos de CDN e `X-Robots-Tag` não indexável, impedindo cache compartilhado de URLs
  assinadas.
- Não retornar UID, token de API, segredo, erro do provider ou causa de autorização.

## Contrato frontend

- Consultar primeiro o endpoint público canônico.
- Usar o endpoint privado legado somente quando um backend anterior responder `404` sem código de
  domínio, evitando repetir requisição para ativo realmente indisponível.
- Continuar reconhecendo a referência persistida histórica
  `/api/private/video-assets/:id/playback` como identificador opaco; reconhecer também a forma
  pública para evolução aditiva futura.
- Escopar a chave TanStack Query por ativo e usuário atual/`anonymous`, para que hidratação ou troca
  de sessão não reutilize negação/token de outro escopo.
- Não persistir HLS/thumbnail assinados e não fazer proxy de manifesto ou segmentos.
- Remover a orientação “entre na sua conta” do erro genérico de player, pois login não é requisito
  para conteúdo público.

## Compatibilidade de rollout

1. Backend novo + frontend antigo: o alias privado de playback aceita leitura anônima conforme a
   associação pública.
2. Frontend novo + backend antigo: o cliente tenta o endpoint público e recua para o alias anterior;
   usuários autenticados continuam funcionando até o backend novo entrar. A janela anônima termina
   assim que o backend for publicado.
3. Ambos novos: o cliente usa somente o endpoint público na resposta normal.
4. A referência persistida não muda neste deploy. Gerar referências públicas no banco exigiria
   primeiro publicar parsers compatíveis em todos os consumidores e pertence a eventual contração
   posterior.

Rollback pode restaurar o código anterior sem alterar dados ou provider, mas reintroduz login
obrigatório nos vídeos já migrados. Portanto, a reversão preferencial é somente diante de falha de
segurança/estabilidade e deve ser seguida de correção imediata; nenhum objeto R2/Stream é apagado.

## Critérios de aceite

- [x] A regra pública anterior foi localizada em `/public/files/*` e na TASK-40.
- [x] A regressão foi localizada no mount `privateAuth` criado para playback pela TASK-163.
- [x] Visitante recebe playback assinado somente para perfil/post/resposta publicamente associado.
- [x] Ativo sem associação pública continua invisível para anônimo e terceiro, com resposta `404`.
- [x] Dono autenticado mantém prévia de seu próprio ativo pronto e Admin permanece separado.
- [x] Upload, status e exclusão continuam protegidos; a compatibilidade abre somente o `GET` de
  playback.
- [x] Endpoint público é no-store e não expõe UID, segredo nem explicação de autorização.
- [x] Frontend usa endpoint canônico com fallback compatível apenas para rota ausente.
- [x] Cache de playback é separado por visitante/usuário e URLs assinadas continuam apenas em
  memória.
- [x] Mensagem indevida de login foi removida sem expor detalhe técnico.
- [x] Testes cobrem anônimo público/privado, dono, terceiro, exceção de rota e referências dos dois
  namespaces.
- [x] Não houve package, env, schema, migration, reset, seed ou limpeza de bucket/provider.
- [x] Documentação arquitetural e ADRs registram a correção da regra de negócio.
- [x] Backend/frontend checks, builds, check da raiz e sincronização de versão passam sem warnings.
- [x] Commit e push ocorrem em `homolog`; deploy e smoke público são registrados.

## Validação

- testes focados de autorização, route policy e contrato frontend;
- `pnpm --dir backend check`;
- `pnpm --dir backend build`;
- `pnpm --dir frontend check`;
- `pnpm --dir frontend build`;
- `pnpm check`;
- após deploy em homologação: `/health`, `/ready`, `/ping`, frontend `/version` e playback de um
  vídeo publicado sem cookie; confirmar também que um ID inexistente recebe `404`.

## Registro de execução — 2026-09-04

- Branch `homolog` confirmada limpa antes da edição.
- A auditoria comparou o contrato R2 anterior, TASK-40, TASK-163, mounts do Express, autorização de
  associação e caller/cache do frontend; a causa foi a autenticação aplicada antes da regra de
  visibilidade pública.
- O smoke anterior ao patch encontrou sete referências Stream na listagem pública de psicólogos e
  confirmou a regressão sem expor dados: o alias retornou `401 token_not_provided` sem cookie e o
  endpoint canônico ainda inexistente retornou `404`.
- Seis testes focados de autorização/route policy, 258 testes backend e 97 testes frontend passaram.
  `pnpm --dir backend check`, `pnpm --dir frontend check`, os dois builds e `pnpm check` foram
  concluídos sem warnings; o gate completo também aprovou 33 testes Admin e 10 do serviço de vídeo.
- Os cinco manifests foram sincronizados em `0.1.265` com um único `version:bump`; `check:version`
  aprovou a versão de release.
- O smoke local comprovou que status permanece autenticado (`401`) e que os dois paths de playback
  chegam ao controller opcional. O banco local configurado estava indisponível (`/ready 503`), por
  isso a associação real será validada somente em homologação após o deploy, usando um dos itens
  públicos já inventariados e sem acessar credenciais pelo ambiente de desenvolvimento.
- A correção é aditiva e preserva versões diferentes das aplicações durante o rollout.
- Não houve alteração de banco ou configuração; `db:migrate` e alerta de env não se aplicam.
