# ADR-0480: Backfill retomável de vídeos R2 para Cloudflare Stream

## Status

Accepted

## Task relacionada

TASK-165 — Migração segura de vídeos legados do R2 para Cloudflare Stream

## Contexto

A adoção do Cloudflare Stream na TASK-163 preservou corretamente as referências R2 existentes para
um rollout compatível. Esses vídeos continuam funcionais, mas não recebem transcodificação nem HLS
adaptativo. Uma substituição em massa simples seria insegura em ambiente publicado: o provider pode
falhar, o processo pode reiniciar e o usuário pode editar a mídia durante a cópia.

A operação será iniciada manualmente por usuário não técnico no terminal do container. Ela precisa
falhar fechada, explicar resultados sem revelar dados e permitir repetição sem reset ou SQL manual.

## Decisão

- Criar operação compilada backend-only, em dry-run por padrão e com lote sequencial pequeno.
- Usar `POST /stream/copy` com URL HTTPS reconstruída pelo backend, `requireSignedURLs`, allowed
  origins e `creator` determinístico.
- Validar o objeto pelo R2 e provar `HEAD`/`GET Range` antes de reservar ou copiar.
- Persistir no `video_asset` a origem, miniatura, chave de migração única e data de associação.
- Derivar ID/chave por SHA-256 de finalidade + alvo + object key. A chave não contém PII e o log
  expõe apenas prefixo curto.
- Reconciliar o provider pelo `creator` antes de `/copy`; zero vídeos permite criação, um permite
  retomada, resposta múltipla/malformada bloqueia o item.
- Manter lock advisory transacional em conexão dedicada durante o apply, compatível com pool
  transacional, além da unicidade por item.
- Trocar perfil/post/resposta somente após estado `ready`, dentro de transação com compare-and-swap
  sobre dono, contexto, URL e miniatura observados.
- Preservar sempre objetos e capas R2. Uma futura remoção exige outra task, inventário pós-migração,
  período de retenção e rollback aprovados.
- Não instalar SDK Cloudflare: `fetch`, `node:crypto`, `pg` e AWS S3 client já existentes cobrem o
  contrato.

## Alternativas consideradas

### Upload/download pelo processo Node

Rejeitado porque transfere arquivos grandes pelo container, aumenta disco/memória/egress e recria o
gargalo que o Stream removeu. A API `/copy` deixa Cloudflare buscar a origem por Range.

### Atualizar banco imediatamente após criar o vídeo

Rejeitado porque deixaria conteúdo indisponível durante download/transcodificação ou após falha. A
origem permanece associada até `ready`.

### Apagar R2 depois de cada sucesso

Rejeitado nesta fase. A economia de storage não compensa perder rollback/auditoria antes de validar
todo o inventário e as superfícies. O script não possui opção destrutiva.

### Usar URL R2 persistida diretamente

Rejeitado porque registros históricos podem conter host antigo ou valor inesperado. A operação
extrai apenas uma object key de prefixo permitido, confirma sua existência no bucket configurado e
reconstrói a URL a partir do `BASE` atual.

### Fila automática ou job no boot

Rejeitado porque deploy não deve iniciar cópias reais silenciosamente. A execução manual em lotes
permite observar custo, falhas e reprodução antes de continuar.

## Consequências

- Vídeos migrados passam a usar o mesmo playback privado/HLS dos uploads novos.
- O banco mantém evidência suficiente para auditoria e uma eventual estratégia de rollback.
- Durante a retenção, R2 e Stream armazenam temporariamente o mesmo vídeo e geram custo duplicado.
- Itens alterados pelo usuário durante o processamento são pulados e podem deixar um ativo Stream
  não associado para inspeção posterior; o dado funcional não é sobrescrito.
- O endpoint público de arquivos continua servindo origens legadas e agora inclui `Content-Range`
  em `HEAD` de vídeo, requisito da importação por link.
- Um lote pode terminar com exit code `2` quando ainda processa ou foi pulado; isso é sinal
  operacional, não perda de mídia.

## Produção e rollout

1. Aplicar a migration aditiva pelo pipeline antes de disponibilizar o comando.
2. Publicar backend; o deploy não inicia backfill.
3. Confirmar Stream/R2/banco em `/ready` e executar dry-run em homologação.
4. Aplicar primeiro item em homologação, validar autorização e reprodução, depois ampliar para
   lotes de cinco.
5. Repetir até inventário zero e manter R2 intacto.
6. Planejar produção separadamente e somente após promoção revisada `homolog` → `main`.

As cinco colunas novas são nullable e não alteram linhas existentes. Não há env nova. Backend
anterior ignora os campos; backend novo continua reproduzindo referências antigas e novas. Rollback
de código não remove migration nem dados. Nunca editar/reverter a migration aplicada ou limpar R2
como parte do rollback.

## Validação

- Prisma generate, Biome e TypeScript sobre os novos contratos.
- Testes de importação privada, reconciliação por creator, contrato ambíguo, origem HTTPS,
  identidade determinística, prefixos e confirmação de ambiente.
- Migration SQL aplicada em schema PostgreSQL local descartável e verificada quanto a nulabilidade e
  índice único; nenhum banco publicado foi resetado.
- Checks/build/audit backend e check da raiz antes do commit.
- Ajuda do comando validada no artefato compilado.
- Dry-run/apply com mídia real ficam no runbook de homologação após deploy; não são simulados.

## Pendências

- Executar e registrar os lotes reais de homologação.
- Definir em task futura retenção, prova de não uso e eventual remoção segura das origens R2.
- Definir limpeza de ativos Stream não associados somente após observar casos reais; esta task os
  preserva por segurança.

## Emenda pós-deploy

O primeiro dry-run de homologação não escreveu dados e expôs que respostas `HEAD` de quatro origens
perdiam parte do contrato esperado ao atravessar o Cloudflare Proxy. A ADR-0481 substitui a URL
legada pela origem técnica extensionless/no-store e mantém o probe fail-closed. Nenhum apply deve ser
executado até a nova versão ser publicada e o dry-run de cinco itens ser repetido.
