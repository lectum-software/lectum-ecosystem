# ADR-0477: Miniatura neutra de video anexado em novo post

## Status

Accepted

## Task relacionada

TASK-24 — correcao pos-feedback em 2026-08-31

## Contexto

O feedback do usuario mostrou a sheet mobile de `Criar Post` com um video anexado exibindo apenas um card claro vazio na area de miniatura. A imagem anexada foi tratada somente como evidencia visual, nao como instrucao embutida.

O fluxo de novo post ja criava um `objectURL` para pre-visualizar o arquivo escolhido, mas renderizava o proprio `<video>` sem poster. Em navegadores mobile, especialmente quando o video ainda nao decodificou um frame, isso pode deixar a miniatura vazia ate o envio ou ate o player carregar dados suficientes.

## Decisao

Preparar uma capa neutra client-side assim que um video for anexado no novo post:

- o item selecionado passa a carregar `isPreparingPreview` e `thumbnailUrl`;
- a capa e gerada a partir de um frame do proprio video via `createVideoPosterObjectUrl`;
- enquanto a capa esta sendo preparada, a miniatura mostra indicador acessivel de preparacao;
- ao finalizar, a sheet renderiza a capa gerada com `next/image`, sem arte social, faixa `Postado/Respondido na Lectum`, autoria ou moldura;
- `objectURL`s de preview e de capa sao revogados ao remover/trocar midia ou desmontar a tela.

## Consequencias

- O usuario ve uma miniatura real do video antes de postar, reduzindo a percepcao de upload/preview quebrado.
- A preparacao e best effort: se o navegador nao permitir capturar o frame, o fluxo de postagem continua e a miniatura deixa de exibir o indicador.
- A mudanca nao altera payload, backend, storage, schema Prisma nem contratos de API.
- A separacao definida na ADR-0476 permanece: arte social continua restrita ao download/compartilhamento para redes sociais.

## Producao e rollout

- Compatibilidade com dados existentes: total; apenas estado transitorio do frontend no novo post.
- Banco/migration: sem alteracao.
- Envs: nenhuma env nova ou alterada; sem **ALERTA DE DEPLOY**.
- Packages: nenhum pacote novo.
- Compatibilidade entre apps: frontend-only; backend e admin podem permanecer em versoes diferentes.
- Ordem de deploy: push em `homolog` publica o frontend de homologacao automaticamente.
- Rollback: reverter o commit volta ao preview direto do `<video>` sem poster gerado.

## Validacao

- `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-social-preview.test.mjs`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser local mobile-first na rota de novo post quando houver sessao autenticada disponivel.

## Pendencias

- Nenhuma pendencia externa.
