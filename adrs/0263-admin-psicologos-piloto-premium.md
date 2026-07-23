# ADR-0263: Piloto visual premium do Admin em Psicólogos

## Status

Accepted

## Task relacionada

Piloto exploratório solicitado antes da criação de task formal.

## Contexto

O site/app público da Lectum transmite uma percepção mais premium, leve e sofisticada do que o painel Admin atual. Antes de criar uma task ampla para redesenhar todo o painel, foi decidido testar a nova direção visual somente no módulo administrativo de Psicólogos: dashboard, lista e detalhe do perfil.

O Builder/Quick Copy ativo não está acessível como ferramenta MCP neste ambiente. Foram consultadas as referências locais de `_product/proto/admin/Psicólogos` e a comparação visual fornecida em conversa. Não há protótipo específico para essa nova direção premium do Admin.

## Decisão

- Criar um escopo visual piloto aplicado por rota em `/psicologos*`, usando a classe `admin-premium-pilot`.
- Manter backend, contratos, queries e regras de negócio intactos.
- Reaproveitar tokens e componentes atuais do Admin, sem instalar packages e sem criar design system paralelo.
- Testar uma linguagem mais próxima do site:
  - sidebar clara;
  - azul Lectum como cor primária no escopo do piloto;
  - cards com borda mais suave, raio maior e sombra leve;
  - botões e campos mais arredondados;
  - abas e métricas menos agressivas visualmente.
- Não replicar automaticamente para Comunidades, Pacientes, Financeiro, Notificações ou demais telas até aprovação visual do piloto.

## Consequências

- O piloto permite validar a direção estética com baixo risco e sem mexer em domínio.
- A classe escopada evita uma troca global prematura do Admin.
- A sidebar muda para a linguagem premium somente nas rotas de Psicólogos, permitindo comparar com as demais áreas.
- Se aprovado, a próxima task deve formalizar a padronização para o Admin inteiro e transformar o piloto em fundação reutilizável.

## Refinamento pós-feedback

Após a primeira validação visual, foi identificado que a interface ficou mais leve, mas ainda mantinha detalhes pouco premium: pesos textuais agressivos, espaçamento uppercase duro e gráficos com curvas/linhas grossas.

Decisões adicionais:

- Carregar a fonte Manrope no Admin via `next/font`, alinhando a família tipográfica ao site público.
- Reduzir o peso efetivo de `font-black`/`font-extrabold` dentro de `admin-premium-pilot`, sem trocar o restante do Admin.
- Suavizar letter-spacing de textos uppercase administrativos no piloto.
- Criar `buildSmoothSvgPath` no utilitário de séries temporais do Admin para desenhar curvas SVG com cubic Bézier.
- Usar linhas e marcadores mais finos nos gráficos de Psicólogos e do detalhe Estatísticas, preservando dados reais e acessibilidade.

Consequência: o piloto passa a testar não só tema/cores/cards, mas também acabamento fino de tipografia e data visualization antes de virar task transversal.

## Ajuste de sombras p?s-feedback

Ap?s nova revis?o visual, o excesso de sombras no piloto foi considerado cafona e menos premium. A decis?o foi migrar o acabamento para uma linguagem mais editorial: superf?cie limpa, borda sutil e sombra quase impercept?vel apenas para separa??o de camadas.

Decis?es adicionais:

- Reduzir drasticamente `--admin-shadow`, `--admin-shadow-soft` e `--admin-shadow-control` dentro de `admin-premium-pilot`.
- For?ar `shadow-admin`, `shadow-admin-soft` e `shadow-control` no escopo premium a usarem sombras m?nimas.
- N?o trocar os componentes nem expandir a altera??o para o Admin inteiro at? aprova??o do piloto.

Consequ?ncia: o piloto passa a depender mais de espa?amento, borda e hierarquia tipogr?fica do que de profundidade artificial.

## Ajuste do gr?fico multi-linha p?s-feedback

O fundador esclareceu que todas as s?ries devem continuar vis?veis no mesmo gr?fico, mas o desenho das linhas e o fundo sombreado do plot n?o estavam alinhados com a est?tica premium.

Decis?es adicionais:

- Manter o gr?fico multi-linha e a sele??o por cards/chips.
- Remover o halo/glow das linhas para evitar apar?ncia artificial ou cafona.
- Reduzir strokes e marcadores para uma leitura mais editorial.
- Trocar o fundo sombreado do plot por superf?cie limpa com borda sutil.
- Aplicar a mesma dire??o ao dashboard e ao detalhe Estat?sticas de Psic?logos.

Consequ?ncia: o gr?fico preserva compara??o entre s?ries, mas com menos ru?do visual e sem efeito sombreado.

## Ajuste da lista de psic?logos p?s-feedback

A revis?o visual da lista mostrou que a tabela ainda destoava das demais telas do piloto: pesos textuais mais duros e largura m?nima fixa que gerava barra horizontal.

Decis?es adicionais:

- Remover a largura m?nima fixa da tabela de psic?logos e fazer a grade ocupar 100% da largura ?til dispon?vel.
- Substituir o wrapper com rolagem horizontal por conten??o sem scrollbar no desktop.
- Redistribuir colunas por percentuais para preservar todas as informa??es da lista sem barra horizontal.
- Reduzir o peso textual da p?gina, dos controles, cabe?alhos e c?lulas para seguir a tipografia do piloto premium.
- Adicionar leitura em cards no breakpoint mobile, evitando tabela comprimida ou scroll horizontal em telas menores.

Consequ?ncia: a lista mant?m todos os dados reais e a??es existentes, mas passa a se comportar como parte da mesma fam?lia visual do dashboard e do detalhe de Psic?logos.

## Remo??o de colunas de baixa prioridade na lista

Ap?s revis?o visual, as colunas **Favoritos** e **WhatsApp** foram consideradas ru?do para a leitura principal da lista administrativa. A decis?o foi remov?-las da tabela desktop e dos cards mobile, preservando esses dados nos contratos e em telas anal?ticas/detalhes onde fazem mais sentido.

Decis?es adicionais:

- Manter na lista apenas dados de identifica??o, plano, status de perfil, status de registro, avalia??o e a??es.
- Redistribuir a largura ?til da tabela entre as colunas restantes.
- N?o alterar backend, queries, ordena??o ou contratos neste ajuste visual.

Consequ?ncia: a lista fica mais limpa, respira melhor na largura dispon?vel e evita competir com dashboards/estat?sticas para m?tricas de engajamento.

## Busca autom?tica na lista de psic?logos

Ap?s revis?o do fluxo da lista, o bot?o **Buscar** foi considerado atrito desnecess?rio para uma busca simples por nome ou CRP. A decis?o foi transformar o campo em busca autom?tica com debounce, mantendo o estado real em URL e a mesma query backend j? existente.

Decis?es adicionais:

- Remover o bot?o expl?cito de busca da lista.
- Aplicar filtro automaticamente ap?s digita??o com debounce de 350ms.
- Manter `q` nos search params para deep link, reload e compartilhamento interno do estado da lista.
- N?o alterar contratos, endpoints ou regras de filtro no backend.

Consequ?ncia: a intera??o fica mais leve e compat?vel com a est?tica premium, sem criar estado paralelo nem endpoint novo.

## Valida??o

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Refinamento pós-feedback:
  - `pnpm --dir admin exec biome check --write "src/app/layout.tsx" "src/app/globals.css" "src/lib/chart-time-series.ts" "src/app/(admin)/psicologos/client.tsx" "src/app/(admin)/psicologos/[id]/client.tsx"`
  - `pnpm --dir admin check`
  - `pnpm --dir admin build`
  - `pnpm check`
- Ajuste de sombras p?s-feedback:
  - `pnpm --dir admin exec biome check --write "src/app/globals.css"`
  - `pnpm --dir admin check`
  - `pnpm --dir admin build`
- Ajuste do gr?fico multi-linha p?s-feedback:
  - `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx" "src/app/(admin)/psicologos/[id]/client.tsx"`
  - `pnpm --dir admin check`
  - `pnpm --dir admin build`
- Browser local com sess?o Admin real j? existente:
  - `/psicologos` em desktop;
  - `/psicologos/lista` em desktop;
  - `/psicologos/[id]?tab=estatisticas` em desktop.
- Capturas locais foram usadas para inspeção visual durante a execução e descartadas como artefatos temporários.

- Ajuste da lista de psic?logos p?s-feedback:
  - `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/lista/client.tsx"`
  - `pnpm --dir admin check`
  - `pnpm --dir admin build`
  - Smoke HTTP local: `GET http://localhost:3002/psicologos/lista` retornou 200.

- Remo??o das colunas Favoritos e WhatsApp na lista:
  - `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/lista/client.tsx"`
  - `pnpm --dir admin check`
  - `pnpm --dir admin build`
  - Smoke HTTP local: `GET http://localhost:3002/psicologos/lista` retornou 200.

- Busca autom?tica na lista de psic?logos:
  - `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/lista/client.tsx"`
  - `pnpm --dir admin check`
  - `pnpm --dir admin build`
  - Smoke HTTP local: `GET http://localhost:3002/psicologos/lista` retornou 200.


## Microajustes da lista apos feedback

A lista recebeu ajustes finos de proporcao e interacao para manter o piloto com leitura premium:

- O seletor **Ordenar por** passou a usar seta propria com respiro interno a direita, evitando que o icone fique colado na borda.
- O cabecalho e as celulas da coluna **Acoes** foram centralizados para alinhar o titulo aos botoes de acao.
- A busca automatica deixou de remontar o componente de campo a cada atualizacao de `q`, preservando o foco durante a digitacao continua.
- O selo de perfil verificado ao lado do nome foi reduzido para ficar proporcional ao texto da lista.

Consequencia: os ajustes nao alteram contrato, backend, dados exibidos ou navegacao; refinam apenas a apresentacao e a ergonomia da lista.

- Microajustes de dropdown, coluna Acoes, foco da busca e selo verificado:
  - `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/lista/client.tsx"`
  - `pnpm --dir admin check`
  - `pnpm --dir admin build`
  - Smoke HTTP local: `GET http://localhost:3002/psicologos/lista` retornou 200.


## Refinamento da aba Avaliacoes

A aba Avaliacoes do detalhe do psicologo foi refinada dentro do piloto visual para reduzir a percepcao de fonte pesada/grosseira e alinhar a leitura ao restante das telas de Psicologos.

Decisoes:

- Reduzir pesos `font-black` em titulos, autores, contadores, barras de distribuicao e comentarios.
- Adicionar hierarquia com labels pequenos em uppercase, titulos com tracking mais refinado e corpo com `font-medium`.
- Isolar a nota geral em um bloco discreto, sem sombra extra e com tipografia numerica mais elegante.
- Afinar as barras de distribuicao e suavizar contadores/labels para diminuir ruido visual.
- Manter todos os dados reais, filtros por estrela, paginacao e endpoints existentes sem mudanca de contrato.

Validacao deste refinamento:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local: `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=avaliacoes` retornou 200.

## Expansao 2026-07-18: Pacientes no piloto premium

Por pedido direto de produto, o escopo `admin-premium-pilot` deixa de cobrir apenas Psicologos/Comunidades e passa a incluir tambem `/pacientes` e `/pacientes/:id`.

Decisoes:

- Aplicar o mesmo escopo visual premium no shell Admin para dashboard e detalhe de Pacientes.
- Manter endpoints, contratos, calculos, privacidade e regras read-only de Pacientes intactos.
- Reorganizar o dashboard de Pacientes em um card de **Visao Geral** com contadores e grafico juntos, seguindo a linguagem do piloto ja validado em Psicologos.
- Trocar os graficos SVG de Pacientes para curvas suaves com `buildSmoothSvgPath`, strokes/markers mais finos e area de plot limpa com borda sutil.
- Remover a largura minima fixa da tabela desktop resumida de Pacientes, mantendo cards mobile e evitando scrollbar horizontal na leitura desktop.
- Corrigir a cor da serie **Comentarios** do detalhe de paciente para um valor definido, evitando `var(--admin-info)` inexistente.

Consequencia: Pacientes passa a participar do piloto visual premium sem criar design system paralelo, sem package novo, sem schema/migration, sem mock e sem alteracao de dados sensiveis.

Validacao desta expansao:

- `pnpm --dir admin exec biome check --write "src/components/admin-shell/shell.tsx" "src/app/(admin)/pacientes/client.tsx" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes` retornou 200.
- Smoke HTTP local: `GET http://localhost:3002/pacientes/demo-patient-reviewer-01` retornou 200.

## Ajuste pos-feedback 2026-07-18: seletor de periodo em Pacientes

Por feedback direto no dashboard de Pacientes, os atalhos em botoes **7 dias**, **30 dias** e **90 dias** foram removidos dos headers de `/pacientes` e `/pacientes/:id`. O filtro passa a usar um seletor **Periodo** com a mesma linguagem visual do dashboard de Psicologos, mantendo os campos de data para intervalo personalizado.

Decisoes:

- Exibir presets suportados pelo contrato atual de Pacientes: **Hoje**, **Esta semana** e **Este mes**.
- Nao adicionar **Este ano** nem **Todo o periodo** nesta iteracao, porque os endpoints de Pacientes ainda recebem apenas `from`/`to` e validam limite maximo de 90 dias; expor opcoes sem suporte real poderia gerar erro ou semantica falsa.
- Ao editar manualmente qualquer data, o seletor passa para **Personalizado** e o commit do intervalo continua usando o hook existente `useDateRangeCommitOnBlur`.
- Remover a linha solta **Periodo consultado:** abaixo dos headers, preservando o resumo de periodo retornado pelo backend dentro dos blocos de conteudo.
- Nao alterar backend, contratos HTTP, schema Prisma, migrations, packages, seeds ou mocks.

Validacao deste ajuste:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes` retornou 200.
- Smoke HTTP local: `GET http://localhost:3002/pacientes/demo-patient-reviewer-01` retornou 200.

## Ajuste pos-feedback 2026-07-18: padrao completo de periodo em Pacientes

Novo feedback de produto pediu que o seletor de **Periodo** de Pacientes tivesse as mesmas opcoes das demais paginas do painel Admin. Para nao expor opcoes falsas, o contrato de Pacientes foi ampliado para aceitar `period=today|week|month|year|all|custom` em `/pacientes` e `/pacientes/:id`.

Decisoes:

- Adicionar **Este ano** e **Todo o periodo** aos seletores de `/pacientes` e `/pacientes/:id`, mantendo **Hoje**, **Esta semana**, **Este mes** e **Personalizado**.
- Alinhar o backend de Pacientes ao padrao de Psicologos, elevando `max_days` para 3660 dias e resolvendo presets no servidor.
- Em **Todo o periodo**, o dashboard usa o paciente mais antigo carregado de `user.createdAt`; o detalhe usa `user.createdAt` do paciente aberto.
- Presets enviam somente `period`; intervalo manual envia `period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD`.
- Manter dados reais e evitar mock/backfill; nao houve mudanca de schema Prisma, migrations ou packages.

Validacao deste ajuste:

- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/client.tsx" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/dashboard/DTOs/IAdminPatientsDashboardDTO.ts" "src/modules/api/admin/private/patients/detail/DTOs/IAdminPatientDetailDTO.ts" "src/modules/api/admin/private/patients/dashboard/validator/index.ts" "src/modules/api/admin/private/patients/detail/validator/index.ts" "src/modules/api/admin/private/patients/dashboard/use-cases/services.ts" "src/modules/api/admin/private/patients/detail/use-cases/services.ts"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke de servico local: `buildPatientsDashboard({ period: "year" })` retornou `200 Este ano 3660`; `buildPatientsDashboard({ period: "all" })` retornou `200 Todo o periodo`; `showAdminPatient(...period: "year")` retornou `200 Este ano 3660`.

## Ajuste pos-feedback 2026-07-18: contadores e grafico de Pacientes

Novo feedback de produto pediu que o bloco **Visao Geral** de `/pacientes` seguisse exatamente a leitura dos contadores + grafico do dashboard de Psicologos, removendo o card de **Tempo medio do paciente** desse agrupamento.

Decisoes:

- Exibir na Visao Geral somente metricas agregaveis no grafico temporal: total, ativos, inativos e novos cadastros.
- Converter os cards de pacientes para botoes acessiveis com `aria-pressed`, estados ativo/inativo e alternancia de series, preservando pelo menos uma serie visivel.
- Remover legenda separada, resumo textual expansivel e texto auxiliar acima do grafico, porque no padrao de Psicologos os cards funcionam como controle/legenda das series.
- Manter `platform_usage` no contrato e nas notas de cobertura, mas sem card dentro do bloco de contadores + grafico.
- Nao alterar backend, contrato HTTP, schema Prisma, migrations, packages ou dados reais.

Validacao deste ajuste:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes` retornou 200.
- Browser local em `http://localhost:3002/pacientes` inspecionado com sessao Admin existente.

## Ajuste pos-feedback 2026-07-19: remocao dos controles superiores de Pacientes

O detalhe `/pacientes/:id` tinha controles superiores redundantes antes do card do paciente: hero com `TASK-61`, botao **Voltar para pacientes** e filtros de **Periodo**, **De** e **Ate**. Depois do feedback visual, a decisao foi iniciar a tela diretamente pelo card de identificacao do paciente.

Decisoes:

- Remover o hero/card superior do detalhe de Pacientes.
- Remover o botao **Voltar para pacientes** da tela de detalhe.
- Remover os controles visuais de periodo/data do topo do detalhe.
- Preservar o card de dados do paciente como primeiro bloco de conteudo da tela.
- Manter a consulta em dados reais do contrato atual, sem criar mock, fallback artificial ou endpoint novo.
- Nao alterar backend, contratos, privacidade, schema Prisma, migrations, packages ou dados retornados.

Validacao deste ajuste:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes/demo-patient-reviewer-01` retornou 200.

## Ajuste pos-feedback 2026-07-19: header com abas em detalhe de Pacientes

O detalhe `/pacientes/:id` passa a seguir a mesma estrutura de header do detalhe de Psicologos: identidade no bloco superior e navegacao contextual em abas dentro do mesmo card.

Decisoes:

- Aplicar ao paciente o mesmo padrao visual de header usado no detalhe de Psicologos, sem botao de voltar, sem filtros de periodo no topo e sem hero separado.
- Exibir as abas **Geral**, **Perfil e cadastro**, **Estatisticas**, **Publicacoes**, **Denuncias**, **Atividades** e **Conta**.
- Usar `?tab=` no App Router para estado da aba ativa, mantendo **Geral** como default.
- Reaproveitar apenas dados reais ja retornados pelo contrato atual de paciente para preencher as abas.
- Exibir estado honesto quando uma aba ainda nao tem contrato dedicado, sem simular denuncias, publicacoes completas ou acoes de conta.
- Nao alterar backend, contratos, privacidade, schema Prisma, migrations, packages ou dados retornados.

Validacao deste ajuste:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local: `GET http://localhost:3002/pacientes/demo-patient-reviewer-01` retornou 200.
- Smoke HTTP local: `GET http://localhost:3002/pacientes/demo-patient-reviewer-01?tab=perfil` retornou 200.
- `pnpm check` foi tentado, mas falhou em `pnpm --dir backend check` por erros TypeScript preexistentes em m?dulos backend n?o alterados nesta execu??o.

## Expansao 2026-07-21: Configuracoes no piloto premium

Por pedido direto de produto, a pagina Admin **Configuracoes** tambem passa a usar o escopo
`admin-premium-pilot`, mantendo o gerenciamento real de catalogos da TASK-65.

Decisoes:

- Incluir `/configuracoes` e o alias `/settings` na regra centralizada do `AdminShell`, sem duplicar
  layout por pagina.
- Reaproveitar os tokens do piloto premium: sidebar clara, azul Lectum, cards com borda sutil,
  raio maior, sombra quase imperceptivel e tipografia menos pesada.
- Ajustar o header de Configuracoes para card mobile-first com label **Catalogos e filtros**, titulo
  **Configuracoes**, subtitulo e CTA **Restaurar padroes**.
- Alinhar superficies e controles de catalogo aos tokens (`bg-surface`, `rounded-control`,
  `bg-overlay`) sem alterar endpoints, contratos HTTP, formularios RHF/Zod, Prisma, migrations,
  packages ou dados persistidos.

Consequencia: Configuracoes fica visualmente consistente com Psicologos, Comunidades e Pacientes
no piloto premium, enquanto Financeiro, Notificacoes, Trafego, Moderacao e Dashboard permaneciam
fora do escopo ate nova decisao de produto.

Validacao desta expansao:

- `pnpm --dir admin exec biome check --write "src/components/admin-shell/shell.tsx" "src/app/(admin)/configuracoes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/configuracoes` retornou 200.
- Builder/Quick Copy nao estava exposto como ferramenta callable; a referencia auditavel foi
  `_product/proto/admin/Configurações.png` e a captura enviada pelo usuario.

## Expansao 2026-07-21: Notificacoes no piloto premium

Por pedido direto de produto, a pagina Admin **Notificacoes** tambem passa a usar o escopo
`admin-premium-pilot`, mantendo o gerenciamento real de campanhas manuais e logs automaticos da
TASK-64/TASK-63.

Decisoes:

- Incluir `/notificacoes` e descendentes na regra centralizada do `AdminShell`, sem duplicar shell
  ou criar tema paralelo.
- Reaproveitar os tokens do piloto premium: sidebar clara, azul Lectum, cards com borda sutil,
  sombra quase imperceptivel, `rounded-card`/`rounded-control` e tipografia menos pesada.
- Converter o topo de Notificacoes em card mobile-first com label **Campanhas e logs**, titulo,
  subtitulo, filtros de periodo e CTA **Nova notificacao** dentro do mesmo bloco.
- Alinhar os status visuais de campanhas aos tokens semanticos do Admin (`danger`, `warning`,
  `success`, `primary`), evitando utilitarios de cores soltas no componente alterado.
- Nao alterar endpoints, contratos HTTP, regras de envio, disponibilidade real de push, metricas,
  Prisma/migrations, packages, formularios RHF/Zod ou dados persistidos.

Consequencia: Notificacoes fica visualmente consistente com Psicologos, Comunidades, Pacientes e
Configuracoes no piloto premium, sem mudar o escopo funcional da tela nem prometer canais/metricas
que nao existam como dado real.

Validacao desta expansao:

- `pnpm --dir admin exec biome check --write "src/components/admin-shell/shell.tsx" "src/app/(admin)/notificacoes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/notificacoes` retornou 200.
- Browser local/headless sem sessao admin valida confirmou protecao com redirecionamento para login;
  a inspecao visual autenticada completa depende de sessao Admin interativa.
- Builder/Quick Copy nao estava exposto como ferramenta callable; as referencias auditaveis foram
  `_product/proto/admin/Notificações.png` e a captura enviada pelo usuario.

## Ajuste pos-feedback 2026-07-21: periodo/data no header de Notificacoes

O feedback visual do header de Notificacoes pediu que os controles de periodo e data seguissem o
padrao do painel Admin, em vez de manter atalhos soltos abaixo dos campos.

Decisoes:

- Substituir os botoes **Ultimos 7 dias**, **Ultimos 30 dias** e **Ultimos 90 dias** por um seletor
  **Periodo** ao lado dos campos **De** e **Ate**, dentro do card de header.
- Preservar as janelas reais suportadas pelo contrato atual de Notificacoes: **Hoje**,
  **Ultimos 7 dias**, **Ultimos 30 dias** e **Ultimos 90 dias**.
- Manter **Personalizado** apenas como estado interno quando as datas forem editadas manualmente,
  sem tornar essa opcao um preset selecionavel.
- Nao expor **Este ano** ou **Todo o periodo** enquanto o backend de Notificacoes seguir limitado a
  consultas por `from`/`to` com maximo de 90 dias.
- Nao alterar backend, contratos HTTP, Prisma/migrations, packages, canais ou regras de metricas.

Consequencia: o header fica alinhado ao padrao visual dos demais dashboards Admin sem prometer
periodos que a API de Notificacoes ainda nao suporta como dado real.

## Pendências

- Validar a aceitação visual com o fundador antes de criar a task de replicação para as demais telas.
- Se aprovado, criar task formal para consolidar tokens/componentes compartilhados e aplicar o modelo no restante do Admin.
- Validação mobile em ~390px deve ser repetida em sessão Admin autenticada dedicada; a tentativa headless sem sessão caiu no fluxo protegido/login e não serve como evidência completa do conteúdo autenticado.

## Ajuste pos-feedback 2026-07-21: Configuracoes recolhidas e arrastaveis

O feedback visual da pagina Configuracoes indicou excesso de ruido operacional nos catalogos: slugs expostos, setas de reordenacao competindo com as acoes principais e listas abertas por padrao.

Decisoes:

- Ocultar slugs na UI administrativa, preservando-os somente nos contratos/dados reais.
- Substituir as setas de reordenacao por drag-and-drop nativo nos blocos de categorias e itens, alinhado ao padrao visual das regras de Comunidades e sem instalar pacote novo.
- Manter as secoes principais e categorias de Especialidades recolhidas por padrao, com chevron para expansao progressiva.
- Reutilizar o endpoint real de reordenacao de TASK-65; nao criar mock, endpoint paralelo, package novo ou migracao.

Consequencia: Configuracoes fica mais limpa e escaneavel dentro do piloto premium, mantendo a mesma fonte de dados real e a mesma persistencia dos catalogos.

Validacao deste ajuste:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/configuracoes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/configuracoes` retornou 200.

## Ajuste pos-feedback 2026-07-21: drag animado em Configuracoes

A primeira versao arrastavel de Configuracoes usava HTML5 drag/drop nativo. O feedback visual mostrou que a experiencia nao comunicava bem o deslocamento da lista e ainda exibia um toast verde excessivo a cada atualizacao de ordem.

Decisoes:

- Migrar a reordenacao visual de Configuracoes para Pointer Events, reaproveitando a logica de deslocamento animado ja adotada nas regras de Comunidades.
- Animar o card arrastado e os cards vizinhos com `translate3d`, mantendo o layout mobile-first e sem instalar dependencia de drag-and-drop.
- Aplicar ordem otimista por escopo de catalogo enquanto o endpoint real de reordenacao persiste a mudanca.
- Remover o toast de sucesso **Ordem atualizada** para reduzir ruido visual; manter feedback de erro se a persistencia falhar.

Consequencia: a interacao fica mais previsivel e premium, com animacao clara de rearranjo e menos ruido de notificacao, sem alterar dominio, contrato ou persistencia.

Validacao deste ajuste:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/configuracoes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/configuracoes` retornou 200.

## Expansao 2026-07-22: Financeiro no piloto premium

Por pedido direto de produto, a pagina Admin **Financeiro** tambem passa a usar o escopo
`admin-premium-pilot`, mantendo intactas as regras reais da TASK-62 para receita confirmada, MRR,
ticket medio, cancelamentos e CSV.

Decisoes:

- Incluir `/financeiro` e descendentes na regra centralizada do `AdminShell`, sem duplicar shell ou
  criar tema paralelo.
- Reaproveitar os tokens do piloto premium: sidebar clara, azul Lectum, cards com borda sutil,
  sombra quase imperceptivel, `rounded-card`/`rounded-control` e tipografia menos pesada.
- Converter o header de Financeiro em card mobile-first com label **Receitas e assinaturas**,
  titulo, subtitulo, resumo do periodo, selo **CSV real disponivel**, filtros e CTA **Exportar
  relatorio** dentro do mesmo bloco.
- Substituir os atalhos soltos de **7 dias**, **30 dias** e **90 dias** por um seletor **Periodo**
  que mapeia as mesmas janelas reais para `from`/`to`; **Personalizado** permanece somente como
  estado interno apos digitacao manual nas datas.
- Manter o seletor **Agrupar** usando `groupBy=day|week|month`, sem alterar endpoint, contrato,
  calculo financeiro, gateway, schema Prisma, migrations, packages ou dados persistidos.

Consequencia: Financeiro fica visualmente consistente com o piloto premium ja aplicado em
Psicologos, Comunidades, Pacientes, Configuracoes e Notificacoes, sem transformar o painel em
dashboard fiscal/contabil e sem simular metricas financeiras.

Validacao desta expansao:

- `pnpm --dir admin exec biome check --write "src/components/admin-shell/shell.tsx" "src/app/(admin)/financeiro/client.tsx"`
- `pnpm --dir admin exec biome check "src/components/admin-shell/shell.tsx" "src/app/(admin)/financeiro/client.tsx"`
- `pnpm --dir admin exec eslint "src/app/(admin)/financeiro/client.tsx" "src/components/admin-shell/shell.tsx"`
- `pnpm --dir admin typecheck`
- `pnpm --dir admin build` em worktree temporario contendo os arquivos alterados, sem usar o
  `.next/lock` do dev server local ativo.
- Smoke HTTP local: `GET http://localhost:3002/financeiro` retornou `200`.
- `pnpm --dir admin check` no checkout principal foi tentado e ficou bloqueado por formatacao
  preexistente sem diff desta task em `admin/src/app/(admin)/pacientes/client.tsx`.

## Ajuste pos-feedback 2026-07-22: Visao Geral unificada em Financeiro

Novo feedback visual pediu que `/financeiro` acompanhasse mais de perto o padrao ja consolidado
em `/pacientes`: header limpo e um bloco unico de **Visao Geral** contendo contadores e grafico.

Decisoes:

- Remover do header os chips redundantes de periodo consultado e CSV, deixando o bloco superior
  focado em titulo, subtitulo, filtros reais e CTA **Exportar relatorio**.
- Reorganizar o conteudo principal em um card unico de **Visao Geral** com periodo retornado pelo
  backend, quatro contadores financeiros e o grafico **Receita ao longo do tempo** dentro do mesmo
  agrupamento visual.
- Compactar os cards de metricas para proporcao semelhante aos contadores de Pacientes, mantendo
  descricoes reais em `title`/estado indisponivel e sem esconder indisponibilidades financeiras.
- Usar `buildSmoothSvgPath` tambem no grafico financeiro, com plot limpo, borda sutil, labels
  reduzidos e barras discretas para novas assinaturas pagas.
- Nao alterar endpoints, contrato HTTP, calculos financeiros, gateway, schema Prisma, migrations,
  packages, CSV ou dados persistidos.

Consequencia: Financeiro passa a seguir o mesmo padrao de leitura dos demais dashboards do piloto
premium sem criar componente ou tema paralelo e sem simular receita, assinatura ou cancelamento.

Validacao deste ajuste:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/financeiro/client.tsx"`
- `pnpm --dir admin exec biome check "src/app/(admin)/financeiro/client.tsx"`
- `pnpm --dir admin exec eslint "src/app/(admin)/financeiro/client.tsx"`
- `pnpm --dir admin typecheck`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local: `GET http://localhost:3002/financeiro` retornou `200`.

## Ajuste pos-feedback 2026-07-22: filtros do Financeiro dentro da Visao Geral

O refinamento visual do Financeiro indicou que o header deveria ficar ainda mais proximo do padrao das demais paginas Lectum/Admin, deixando controles analiticos dentro do bloco de leitura correspondente.

Decisoes:

- Manter o header de Financeiro apenas com label, titulo, subtitulo e CTA **Exportar relatorio**.
- Mover `Periodo`, `De` e `Ate` para o card **Visao Geral**, acima dos contadores e do grafico, para que filtro, numeros e serie temporal fiquem em um mesmo contexto visual.
- Remover o controle visual **Agrupar**, reduzindo ruido e delegando a granularidade ao backend conforme a janela consultada.
- Usar os presets **Hoje**, **Esta semana**, **Este mes**, **Este ano** e **Todo o periodo**; **Personalizado** permanece apenas como estado interno quando o usuario edita datas manualmente.
- Nao criar componente/tema paralelo, nao instalar package novo e nao alterar dados persistidos.

Consequencia: Financeiro acompanha melhor o modelo de leitura de Pacientes e das demais telas do piloto premium: header limpo, card de visao geral autocontido e menos controles operacionais expostos.

## Ajuste pos-feedback 2026-07-22: Visao Geral de Financeiro espelhada em Pacientes

Novo feedback visual pediu que o bloco **Visao Geral** de `/financeiro` seguisse de forma mais fiel
o layout ja validado em `/pacientes`.

Decisoes:

- Padronizar a composicao interna do card: titulo e periodo no lado esquerdo, filtros de
  `Periodo`, `De` e `Ate` no lado direito em desktop e empilhados no mobile.
- Usar o mesmo grid de contadores de Pacientes (`2` colunas no mobile e `4` no desktop), mantendo
  os quatro indicadores financeiros reais da TASK-62.
- Remover legenda visual separada e resumo expansivel para deixar a leitura do grafico logo
  abaixo dos contadores, mantendo titulo/descricao compactos e chip de fonte junto ao grafico
  para preservar rastreabilidade do dado real.
- Preservar a explicacao do grafico em `figcaption` acessivel e manter notas de cobertura
  financeira no bloco proprio, sem esconder indisponibilidades reais.
- Nao alterar backend, contratos HTTP, calculos financeiros, CSV, Prisma/migrations, packages ou
  dados persistidos neste refinamento.

Consequencia: o Financeiro fica visualmente consistente com a hierarquia da Visao Geral de
Pacientes, sem criar componente paralelo nem transformar dados financeiros indisponiveis em numeros
estimados.

Validacao deste ajuste:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/financeiro/client.tsx"`
- `pnpm --dir admin exec biome check "src/app/(admin)/financeiro/client.tsx"`
- `pnpm --dir admin exec eslint "src/app/(admin)/financeiro/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- Smoke de service real: `buildAdminFinanceDashboard` retornou `200` para `today`, `week`,
  `month`, `year` e `all`.
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/financeiro` retornou `200`.


## Expansao 2026-07-23: Moderacao no piloto premium

Por pedido direto de produto, a pagina Admin **Moderacao** tambem passa a usar o escopo
`admin-premium-pilot`, mantendo intactos os dados reais e regras da TASK-77/TASK-74.

Decisoes:

- Incluir `/moderacao` e descendentes na regra centralizada do `AdminShell`, sem duplicar shell ou
  criar tema paralelo.
- Reaproveitar os tokens do piloto premium: sidebar clara, azul Lectum, cards com borda sutil,
  sombra quase imperceptivel, `rounded-card`/`rounded-control` e tipografia menos pesada.
- Converter o topo de Moderacao em card mobile-first com label **Operacao e seguranca**, titulo,
  subtitulo e CTA **Atualizar** no mesmo bloco.
- Transformar o bloco de filtros textuais em um card com header contextual, mantendo os mesmos
  filtros reais por status, decisao, categoria, severidade, comunidade, busca e periodo.
- Nao alterar endpoints, contratos HTTP, derivacao de alertas, Prisma/migrations, packages,
  formularios RHF/Zod ou dados persistidos.

Consequencia: Moderacao fica visualmente consistente com Psicologos, Comunidades, Pacientes,
Configuracoes, Notificacoes e Financeiro no piloto premium, sem mudar o escopo funcional da central
nem simular novas acoes operacionais.


Validacao desta expansao:

- `pnpm --dir admin exec biome check --write "src/components/admin-shell/shell.tsx" "src/app/(admin)/moderacao/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build` (primeira tentativa bloqueada por build Next concorrente; reexecutado com sucesso)
- Smoke HTTP local: `GET http://localhost:3002/moderacao` retornou `200`.
- `pnpm check` foi tentado, mas excedeu 10 minutos no runner; sem alteracoes em backend/frontend nesta expansao.
