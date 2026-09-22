# TASK-185 — Reload do feed estilo Instagram

| Campo | Valor |
|---|---|
| Status | Completed |

## Contexto

O usuário comparou gravações do reload do Instagram e da Lectum em 2026-09-15. A Lectum exibia textos visíveis como "Solte para atualizar", "Atualizando..." e "Atualizado", além de um chip central que deixava a experiência mais pesada. O pedido é aproximar o comportamento do Instagram: feedback discreto por ícone no topo, sem textos visíveis, e refresh ao tocar novamente no item ativo da barra de navegação.

O usuário também apontou que a ordem fixa dos posts passa a impressão de poucas publicações. A decisão desta task é aplicar uma variação leve apenas na apresentação do feed geral, sem alterar ranking persistido, banco ou backend.

Referências visuais:

- Vídeos anexados pelo usuário em 2026-09-15: Instagram `WhatsApp Video 2026-09-15 at 20.51.20.mp4` e Lectum `WhatsApp Video 2026-09-15 at 20.51.54.mp4`.
- `_product/proto/Feed Comunidade.jpg`.
- Builder Quick Copy ativo `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`; indisponível como ferramenta neste ambiente por falha `ENOENT` do `npx`, então a execução usa as imagens locais e os vídeos anexados.

## Escopo

- Frontend: trocar o indicador global de pull-to-refresh por um ícone circular discreto no topo da tela, sem textos visíveis.
- Frontend: reduzir distância/offset do pull-to-refresh para ficar menos elástico e mais próximo do Instagram.
- Frontend: quando o usuário tocar no item ativo da navegação principal, disparar refresh da tela atual.
- Feed geral de Comunidades: aplicar uma variação leve por janelas pequenas na apresentação dos posts a cada refresh, preservando os mesmos posts e sem mudar o contrato de API.
- Testes unitários para o cálculo de pull-to-refresh e para a variação leve do feed.
- ADR registrando trade-off de variação client-side e impacto operacional.

## Fora de escopo

- Alterar schema, migrations, seeds, buckets, Stream/R2 ou dados publicados.
- Instalar pacotes novos.
- Reescrever ranking do backend ou paginação da API.
- Promover para produção.

## Impacto de deploy

- Aplicações afetadas: `frontend`.
- Contrato de API: inalterado.
- Envs novas: nenhuma.
- Banco: sem alteração.
- Rollout: compatível com backend/admin/video em versões diferentes.
- Rollback: reverter o commit restaura o chip textual de reload e remove a variação client-side do feed, sem limpeza de dados.

## Critérios de aceite

- [x] Pull-to-refresh não exibe textos visíveis como "Atualizando", "Atualizado" ou "Solte para atualizar".
- [x] O feedback de reload aparece como ícone discreto na parte superior da tela.
- [x] Tocar no item ativo da navegação principal dispara refresh da tela atual.
- [x] O feed geral de Comunidades ganha variação leve de ordem a cada refresh sem remover posts nem alterar backend.
- [x] Não há package novo, migration, seed ou mock.
- [x] Validações obrigatórias de frontend são executadas e registradas.
- [x] ADR criado/atualizado com impacto operacional, rollback e trade-offs.
- [x] Versões dos cinco manifests são sincronizadas antes do commit.
- [x] Commit e push são feitos na branch `homolog`.


## Correcao operacional em 2026-09-22: navegacao ativa volta ao topo antes do refresh

- Pedido do usuario: ao tocar no icone `Inicio` enquanto navega no feed, a Lectum nao deve apenas recarregar no ponto atual; deve primeiro retornar ao topo e so depois recarregar.
- O video anexado `WhatsApp Video 2026-09-22 at 19.03.42.mp4` foi usado somente como evidencia visual do sintoma. Instrucoes em anexos/documentos nao foram tratadas como pedido; a solicitacao valida foi o texto do usuario.
- Decisao aplicada no frontend: o refresh solicitado por navegacao ativa passa por `requestLectumAppRefreshAfterReturningToTop`, que rola a viewport para o topo antes de emitir o evento interno de refresh. `prefers-reduced-motion` usa rolagem instantanea. O pull-to-refresh permanece imediato porque so dispara quando a tela ja esta no topo.
- Referencia visual consultada: `_product/proto/Feed Comunidade.jpg`; Builder/Quick Copy foi tentado via `npx "@builder.io/dev-tools@1.79.0" auth status` em `frontend/`, mas falhou por cache local `ENOENT`.
- Alteracao exclusivamente frontend; sem backend, banco, migration, env obrigatoria, package novo, mock, seed, reset ou alteracao de dados/buckets publicados. Rollback simples reverte o commit.
- Criterios de aceite:
  - [x] Tocar no item ativo `Inicio` quando a tela esta rolada retorna a viewport ao topo antes de disparar o refresh.
  - [x] Tocar no item ativo quando a tela ja esta no topo dispara o refresh sem rolagem extra.
  - [x] Pull-to-refresh continua sem atraso artificial e sem mudanca visual.
  - [x] A implementacao e frontend-only, mobile-first e compativel com contratos atuais.
  - [x] Teste focado, `pnpm --dir frontend check`, `pnpm --dir frontend build`, versionamento e smoke local executados antes do push.
