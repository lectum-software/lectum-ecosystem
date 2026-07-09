# TASK-50: Tela Tráfego administrativo

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-50 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin |
| Status | Completed |
| Dependências | TASK-45, TASK-46, TASK-47, TASK-49 |
| ADR alvo | ADR se houver decisão nova sobre fórmulas de métricas, exportação, mapa ou gráficos |

## Contexto

A aba Tráfego do painel Admin foi definida visualmente em `_product/proto/admin/Tráfego.png`. Ela mostra comportamento de acesso, origem de tráfego, dispositivos, tipos de usuário, localização, páginas de entrada, conversões, qualidade do tráfego e rankings de comunidades/psicólogos.

Essa tela depende da fundação admin, do tracking de sessão/dispositivo e do tracking de pageviews/origem. Nenhuma métrica pode ser inventada.

## Objetivo

Implementar a tela Admin Tráfego com dados reais agregados, filtro de período e exportação honesta, permitindo à operação entender como usuários chegam e navegam na Lectum.

## Pré-requisitos e bloqueios

- TASK-45 concluída: auth admin.
- TASK-46 concluída: app `admin/` e shell lateral.
- TASK-47 concluída: `visitor_session`/tipo de dispositivo.
- TASK-49 concluída: `page_view_event`/origem/pageviews.
- Ler `_product/tasks/ARCHITECTURE.md`, `_product/tasks/PACKAGES.md` e `_product/tasks/PROTO-INVENTORY.md`.
- Usar `_product/proto/admin/Tráfego.png` como referência visual local.
- Se Builder/Quick Copy estiver disponível, usar como complemento; se não, registrar a limitação.

## Escopo frontend

- Criar rota protegida no app Admin:
  - `/traffic` ou `/trafego`, conforme convenção adotada na TASK-46.
- Renderizar:
  - breadcrumb Dashboard > Tráfego;
  - título e subtítulo;
  - filtro de período;
  - botão "Exportar relatório" somente se houver endpoint real;
  - visão geral com cards;
  - gráficos/listas de origem de tráfego, dispositivos e tipo de usuário;
  - acessos por localização;
  - mapa/lista de acessos quando houver implementação real;
  - páginas de entrada;
  - conversões geradas;
  - qualidade do tráfego;
  - tráfego por comunidade;
  - tráfego por psicólogo.
- Estados:
  - loading;
  - erro;
  - vazio;
  - métrica indisponível com explicação.
- UI mobile-first:
  - cards em 1 coluna no mobile;
  - tabelas com layout responsivo/scroll horizontal acessível;
  - gráficos com alternativa textual.

## Escopo backend

- Criar endpoint admin privado:
  - `GET /api/admin/private/traffic/summary?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Criar endpoint de exportação real, se o botão for habilitado:
  - `GET /api/admin/private/traffic/export?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Agregar dados reais:
  - sessões: `visitor_session`;
  - usuários únicos: `visitor_id` distintos;
  - novos visitantes: primeiro registro do `visitor_id` dentro do período;
  - visitantes anônimos: sessões/pageviews sem `user_id`;
  - psicólogos logados: `user.role="psicologo"` associado a sessões/pageviews;
  - pacientes logados: `user.role="paciente"` associado a sessões/pageviews;
  - pageviews: `page_view_event`;
  - páginas por sessão: pageviews / sessões com pageview;
  - origem do tráfego: `page_view_event.traffic_source`;
  - dispositivos: `visitor_session.device_type`;
  - PWA: `display_mode="standalone"` ou evento real de instalação;
  - localização: `visitor_location`;
  - páginas de entrada: primeira pageview por sessão;
  - conversões: eventos reais existentes, atribuindo por `visitor_id`/`session_id`/`user_id` quando possível;
  - rankings de comunidade/psicólogo: pageviews com `page_kind`/`target_type` correspondentes.

## Fora do escopo

- Criar tracking novo além do contrato da TASK-49.
- Criar BI externo.
- Criar mapa geográfico interativo com package novo sem ADR.
- Criar moderação ou ações operacionais de comunidades/psicólogos dentro da tela.
- Prometer precisão absoluta de atribuição cross-device.

## Contrato técnico detalhado

Referências obrigatórias:

- `ARCHITECTURE.md`: rotas, módulos, resposta, validação e separação admin.
- `PACKAGES.md`: não instalar charts/maps/tables sem necessidade concreta e ADR.
- `PROTO-INVENTORY.md`: referência visual Admin Tráfego.

Backend esperado:

- Módulo admin privado com controller/service/repository/validator.
- Validator de período:
  - default: últimos 30 dias;
  - limite máximo inicial: 180 dias, salvo ADR;
  - `from <= to`.
- Resposta sugerida:
  - `period`;
  - `overview_cards`;
  - `traffic_sources`;
  - `devices`;
  - `user_types`;
  - `locations`;
  - `entry_pages`;
  - `conversions`;
  - `quality`;
  - `top_communities`;
  - `top_psychologists`;
  - `unavailable`.
- Fórmulas devem estar documentadas no service:
  - taxa de cadastro = novos cadastros / visitantes únicos;
  - taxa de rejeição = sessões com 1 pageview e sem ação importante / sessões com pageview;
  - taxa de retorno = visitantes com sessão anterior ao período ou mais de uma sessão no período / visitantes únicos;
  - tempo médio = duração calculada por heartbeat/beacon quando disponível; se não disponível, retornar indisponível;
  - sessões com ação importante = sessões com conversão/evento de domínio relevante.
- Export:
  - CSV ou JSON real com os mesmos agregados;
  - sem dados pessoais sensíveis além do necessário para agregados.

Frontend esperado:

- `admin/src/api/req/traffic`;
- `admin/src/api/callers/traffic`;
- query keys próprias;
- componentes reutilizáveis de cards/gráficos do Dashboard quando existirem.
- Gráficos:
  - preferir SVG/CSS próprio e acessível, sem package novo;
  - se houver mapa, pode começar com ranking por estado/país e mapa estático só se houver asset real autorizado;
  - nunca usar imagem do protótipo como gráfico final.
- Tabelas/listas:
  - sem `@tanstack/react-table` nesta primeira versão, salvo ADR por necessidade concreta;
  - usar tabelas responsivas simples.

Packages usados:

- Nenhum pacote novo por padrão.
- Qualquer gráfico/mapa/tabela avançada exige validação em `PACKAGES.md` e ADR.

Regras anti-recriação:

- Reutilizar app admin, shell, API client e cards da TASK-46/TASK-48.
- Reutilizar dados de `visitor_session`, `page_view_event`, `visitor_location` e modelos de domínio existentes.
- Não criar JSON estático para reproduzir os números do protótipo.

Regras de UI obrigatórias:

- Mobile-first obrigatório.
- Nenhum `<img>` cru; usar `next/image` se imagem for inevitável.
- Cores por tokens.
- Foco visível e labels acessíveis.
- Gráficos com nomes/valores legíveis por leitores de tela via tabela/resumo alternativo.

## Critérios de aceite

- [x] A rota de Tráfego só abre para admin autenticado.
- [x] Cards de visão geral usam dados reais.
- [x] Origem do tráfego usa `page_view_event.traffic_source` real.
- [x] Dispositivos usam `visitor_session.device_type` real.
- [x] Tipo de usuário distingue pacientes, psicólogos e anônimos por dados reais.
- [x] Localização usa `visitor_location` real.
- [x] Páginas de entrada são derivadas da primeira pageview por sessão.
- [x] Métricas de qualidade são exibidas somente quando houver fórmula e dados confiáveis; caso contrário, aparecem como indisponíveis.
- [x] Conversões são baseadas em eventos reais e documentam limitações de atribuição.
- [x] Rankings de comunidade/psicólogo são derivados de pageviews/target real.
- [x] Filtro de período atualiza todas as agregações.
- [x] Exportação só aparece/habilita se usar endpoint real.
- [x] Estados loading, erro, vazio e indisponível foram implementados.
- [x] UI mobile-first validada em ~390px, tablet e desktop.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Nenhum `<img>` cru foi usado.
- [x] `_product/proto/admin/Tráfego.png` foi citado como referência visual; Builder/Quick Copy foi usado se disponível.
- [x] `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build` e `pnpm check` foram executados sem erros.
- [x] Browser local validado com admin real.
- [x] ADR criado ou atualizado em `adrs/` se houver nova decisão relevante.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local:
  - login admin;
  - abrir Tráfego;
  - trocar período;
  - validar relatório/export se implementado;
  - validar mobile ~390px e desktop.

## Notas de execução

- Os números do protótipo são referência visual, não dados de seed.
- Se uma métrica ainda não tiver dado suficiente, retornar `unavailable` com copy clara.
- A tela pode ser entregue incrementalmente desde que todos os blocos indisponíveis sejam honestos e não simulem dados.


## Execucao TASK-50

- Implementada a rota protegida do Admin em `/trafego`, seguindo a convencao adotada no app `admin/`.
- Implementados os endpoints reais `GET /api/admin/private/traffic/summary` e `GET /api/admin/private/traffic/export`, com agregacoes derivadas de `visitor_session`, `page_view_event`, `important_action_event`, `visitor_location` e modelos reais de dominio.
- A exportacao CSV usa o mesmo servico de agregacao do resumo, sem dados pessoais sensiveis alem de labels agregados ou publicos.
- O mapa foi entregue como ranking/lista acessivel de localizacao nesta primeira versao, sem pacote novo e sem imagem do prototipo como grafico final.
- Builder/Quick Copy nao estava exposto como ferramenta MCP nesta execucao; a referencia visual usada foi `_product/proto/admin/Tráfego.png`.
- Nenhuma alteracao em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; portanto `pnpm --dir backend db:migrate` nao foi necessario.
- Foram criados registros transitorios para smoke de API com admin real e dados reais relacionais; os registros transitorios foram removidos apos a validacao.
- Browser local validado com admin real em dev server do Admin na porta 3102 por indisponibilidade/conflito local da porta 3002 durante a validacao; a porta alvo local do app Admin permanece 3002.
- ADR criado: `adrs/0230-admin-trafego-agregacoes.md`.

## Evidencias de validacao

- `pnpm --dir backend check`: sem erros.
- `pnpm --dir backend build`: sem erros.
- `pnpm --dir admin check`: sem erros.
- `pnpm --dir admin build`: sem erros.
- `pnpm check`: sem erros.
- Smoke API: resumo e exportacao retornaram dados agregados reais, incluindo origem, dispositivos, PWA, localizacao, paginas de entrada, conversoes e rankings.
- Browser local: login admin real, abertura de `/trafego`, troca de periodo para 7 dias, exportacao CSV e validacao visual mobile (~390px), tablet (768px) e desktop.
