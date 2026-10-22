# TASK-266: Tipografia dos contadores e legendas de analytics

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-266 |
| Prioridade | P2 |
| Esforco | S |
| Fase | Refinamento visual |
| Status | Done |
| Dependencias | TASK-265 |
| ADR alvo | ADR-0629 |

## Contexto e escopo

Pedido de 22/10/2026: exibir Favoritos em Acesso ao perfil e padronizar os
rotulos dos contadores e legendas com as metricas do video de apresentacao.
Inclui percentual comparativo e Novo, preservando o tamanho secundario de 10px.
Mesma familia, tamanho e cor existentes; aplicar font-semibold e leading-4
dos rotulos de video. Nao alterar numeros, layout, filtros, series ou totais.
PROTO-INVENTORY consultado; referencia visual sao as capturas do usuario e
o componente PresentationVideoDashboardMetricCard existente. Mobile-first.

## Criterios de aceite

- [x] Favoritos na legenda e nos detalhes/acessibilidade do grafico.
- [x] Contadores e legendas usam o peso das metricas do video.
- [x] Testes, check, build e QA local responsiva registrados.
- [x] ADR e versao sincronizada preparados para commit e publicacao autorizada.

## Validacao

Implementacao local concluida, validacao final bloqueada pelo ambiente:

- Cinco testes focais aprovados, incluindo Favoritos na descricao acessivel,
  preservacao dos dados e estilo dos rotulos/percentual comparativo.
- Check completo do frontend aprovado; apos incluir o wrapper semibold no
  percentual, os testes focais foram executados novamente e aprovados.
- Build frontend tentou compilar e falhou com ENOSPC. Cache regeneravel de
  frontend/.next/cache removido com caminho verificado; nenhum dado foi apagado.
- QA com login real e conta temporaria no PostgreSQL localhost chegou a API de
  analytics, que retornou HTTP 500. Nao simular resposta para encobrir a falha.
- Conta temporaria e suas sessoes removidas no finally do teste. Sem alteracao
  de contas existentes, plano remoto, dados produtivos ou credenciais.

## Revalidacao em 22/10/2026

- Limpeza restrita a caches regeneraveis; build frontend aprovado com
  LECTUM_LOW_DISK_MODE=1, configuracao ja existente, sem pular etapas.
- Migration aditiva existente 20261019230000_analytics_origins aplicada somente
  no PostgreSQL local lectum_privacy_dev. Sem reset ou mudanca remota.
- QA autenticada com API real HTTP 200 em 393px e 1440px: fontes dos contadores,
  percentuais e legendas; Favoritos na legenda e tooltip; ausencia de overflow.
  Capturas inspecionadas. Conta temporaria removida ao concluir.
- Usuario aprovou a previa visual e autorizou publicacao em producao.
- Lote inclui TASK-265; somente frontend funcionalmente alterado. Backend
  produtivo 0.1.701 saudavel e compativel, sem migration nova neste lote.
