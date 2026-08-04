# TASK-62: Financeiro administrativo

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-62 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin / Financeiro |
| Status | Completed |
| Dependências | TASK-45, TASK-46, TASK-31, TASK-32, TASK-33 |
| ADR alvo | ADR se houver decisão nova sobre cálculo de receita, MRR, cancelamento ou exportação financeira |

## Contexto

A tela **Financeiro** do Admin usa como referência `_product/proto/admin/Financeiro.png`.

Ela deve mostrar uma visão geral das receitas da plataforma, baseada apenas em assinaturas profissionais pagas e eventos financeiros reais. A tela da referência possui cards de receita, novas assinaturas, assinaturas ativas, cancelamentos, gráfico de receita, MRR, LTV médio e lista inferior. Por decisão de produto, a lista inferior deve se chamar **Novas assinaturas de psicólogos**, não "Novos cadastros de psicólogos".

Também foi definido que esta tela deve incluir **Exportar relatório**.

## Objetivo

Implementar o dashboard financeiro administrativo com dados reais de assinatura/pagamento, cálculo honesto de MRR/LTV médio e exportação CSV do relatório filtrado.

## Pré-requisitos e bloqueios

- TASK-45 concluída: autenticação Admin real.
- TASK-46 concluída: app `admin/` e shell lateral.
- TASK-31, TASK-32 e TASK-33 concluídas e com contratos reais de planos, checkout e gestão de assinatura.
- Ler `_product/tasks/ARCHITECTURE.md`, `_product/tasks/DATA-MODEL.md`, `_product/tasks/PACKAGES.md` e `_product/tasks/PROTO-INVENTORY.md`.
- Usar `_product/proto/admin/Financeiro.png` como referência visual local.
- Usar Mercado Pago como gateway vigente; não criar referência a Stripe.
- Se `payment_event`/gateway não permitir confirmar uma métrica financeira, exibir indisponível ou omitir a métrica com copy honesta.

## Escopo frontend

- Criar rota protegida:
  - `/finance` ou rota equivalente definida no Admin.
- Renderizar:
  - título "Financeiro";
  - subtítulo;
  - filtro de período;
  - botão **Exportar relatório**;
  - cards:
    - Receita total;
    - Novas assinaturas;
    - Assinaturas ativas;
    - Cancelamentos;
  - gráfico "Receita ao longo do tempo";
  - seção com:
    - Receita recorrente mensal (MRR);
    - LTV médio dos psicólogos;
  - lista **Novas assinaturas de psicólogos**.
- Exportação:
  - botão deve chamar endpoint real;
  - exportar com os mesmos filtros de período da tela;
  - download em CSV na V1;
  - não instalar pacote novo para CSV.
- Se cancelamentos não tiverem fonte real, exibir card como indisponível ou omitir conforme decisão de UX da task.

## Escopo backend

- Criar endpoints admin privados:
  - `GET /api/admin/private/finance/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD&groupBy=day|week|month`;
  - `GET /api/admin/private/finance/dashboard/export?from=YYYY-MM-DD&to=YYYY-MM-DD`.
- Usar dados reais de:
  - `professional_subscription`;
  - `subscription_plan`;
  - `payment_event`;
  - `payment_method` apenas para metadados seguros quando necessário;
  - `psychologist_profile`;
  - `user` do psicólogo.
- O service financeiro deve separar:
  - assinaturas pagas;
  - plano gratuito;
  - cortesia/admin grants.

## Fora do escopo

- Criar cobranças manuais.
- Cancelar assinatura pelo Admin.
- Alterar forma de pagamento.
- Exibir token, PAN, CVV ou qualquer dado sensível de cartão.
- Simular eventos do Mercado Pago.
- Contar cortesia como receita.
- Contar plano gratuito como assinatura paga.
- Criar dashboard contábil/fiscal completo.
- Criar PDF ou XLSX na V1.

## Contrato técnico detalhado

Definições de métrica:

- **Receita total**:
  - receita confirmada no período;
  - deve vir de pagamento confirmado no gateway/evento financeiro real;
  - não usar projeção nem multiplicação simples de assinaturas como substituto de pagamento confirmado;
  - se não houver granularidade confiável em `payment_event`, retornar `unavailable` e explicar na UI.
- **Novas assinaturas**:
  - assinaturas profissionais pagas iniciadas no período;
  - excluir plano gratuito;
  - excluir `source="admin_grant"` e demais cortesias.
- **Assinaturas ativas**:
  - assinaturas profissionais pagas com status ativo;
  - excluir plano gratuito e cortesia do card financeiro;
  - se a task optar por mostrar cortesias, devem aparecer em indicador separado e sem impacto financeiro.
- **Cancelamentos**:
  - contar somente quando houver status/evento real de cancelamento;
  - se o gateway ainda não fornecer cancelamento confiável, não inferir por ausência de renovação.
- **MRR**:
  - soma do valor mensal dos planos pagos ativos;
  - excluir gratuito e cortesia;
  - se houver planos com intervalos diferentes no futuro, normalizar para mês em ADR.
- **LTV médio dos psicólogos**:
  - receita confirmada lifetime vinculada por id local da assinatura ou `gateway_subscription_id`;
  - dividir por psicólogos com assinatura profissional paga Mercado Pago até o fim do período;
  - se houver pagamento confirmado vinculado sem valor monetário extraível, exibir indisponível com copy honesta.

- **Receita ao longo do tempo**:
  - agrupar receita confirmada por dia/semana/mês conforme `groupBy`;
  - barras podem representar assinaturas ativas ou novas assinaturas, mas a legenda precisa ser explícita.
- **Novas assinaturas de psicólogos**:
  - lista das assinaturas pagas iniciadas no período;
  - colunas mínimas:
    - data;
    - psicólogo;
    - CRP quando disponível;
    - plano;
    - início da assinatura;
    - valor;
    - status.

Exportação CSV:

- Endpoint deve aplicar os mesmos filtros do dashboard.
- CSV deve conter, no mínimo:
  - resumo financeiro;
  - séries agregadas;
  - novas assinaturas de psicólogos no período.
- Gerar CSV manualmente com escape correto de aspas, vírgulas/quebras e charset UTF-8.
- Retornar headers:
  - `Content-Type: text/csv; charset=utf-8`;
  - `Content-Disposition: attachment; filename="lectum-financeiro-YYYY-MM-DD_YYYY-MM-DD.csv"`.
- Não exportar dados sensíveis de pagamento.

Frontend esperado:

- Reutilizar shell Admin da TASK-46.
- Reutilizar tokens/componentes existentes; não criar design system paralelo.
- Mobile-first:
  - cards empilhados no mobile;
  - gráfico responsivo;
  - lista inferior adaptada para cards ou tabela rolável acessível.
- Filtro de período com React Hook Form, Zod e controllers da TASK-02 quando houver formulário.
- `Exportar relatório` deve ter loading, erro e feedback de download.
- Gráficos:
  - usar implementação existente ou CSS/SVG controlado sem instalar pacote novo;
  - instalar pacote novo somente se `PACKAGES.md` permitir e com ADR.

## Critérios de aceite

- [x] Rota Financeiro só abre para admin autenticado.
- [x] `_product/proto/admin/Financeiro.png` foi citada como referência visual.
- [x] A lista inferior original **Novas assinaturas de psicólogos** foi substituída por **Últimas cobranças realizadas** no ajuste pós-feedback de 2026-07-22.
- [x] Novas assinaturas excluem plano gratuito e cortesia/admin grant.
- [x] Receita total usa pagamento confirmado real ou aparece indisponível com copy honesta.
- [x] MRR exclui gratuito e cortesia.
- [x] LTV médio dos psicólogos usa payment_event confirmado vinculado à assinatura paga real, sem mock ou projeção por plano.
- [x] Cancelamentos só aparecem como número real se houver fonte confiável.
- [x] Nenhum dado financeiro é simulado.
- [x] Nenhuma referência a Stripe foi criada.
- [x] Exportar relatório gera CSV real com os filtros atuais.
- [x] CSV não contém token, PAN, CVV ou dado sensível de cartão.
- [x] UI mobile-first validada.
- [x] Nenhum `<img>` cru foi usado.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Checks/builds relevantes executados sem erros.
- [x] ADR criado/atualizado se houver decisão sobre métrica financeira, cancelamento, MRR ou exportação.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local com admin real e assinaturas reais.
- Teste manual do download CSV e conferência de conteúdo.

## Execucao 2026-07-10

- Referencia visual usada: `_product/proto/admin/Financeiro.png`.
- Builder/Quick Copy nao ficou disponivel como ferramenta no ambiente; a implementacao usou a imagem local exportada e registrou a limitacao na UI/cobertura de dados.
- Backend criado em `/api/admin/private/finance/dashboard` e `/api/admin/private/finance/dashboard/export`, protegido por autenticacao Admin real.
- Receita total usa apenas `payment_event` real do Mercado Pago com pagamento confirmado e valor extraivel; se houver evento confirmado sem valor, a UI mostra indisponivel com copy honesta.
- MRR e ticket medio usam `subscription_plan.price_cents` das assinaturas profissionais pagas ativas, excluindo plano gratuito e `source="admin_grant"`.
- Cancelamentos usam apenas `professional_subscription.status="cancelada"` sincronizado pelo fluxo real, sem inferir ausencia de renovacao.
- Exportacao CSV validada por service real com filtros de periodo, contendo resumo, serie agregada e novas assinaturas de psicologos, sem token/PAN/CVV.
- Validacoes executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, rota local `http://localhost:3002/financeiro` (HTTP 200), endpoints em backend isolado `:3011` protegidos com HTTP 401 sem token e teste de geracao CSV via service real.
- ADR criado: `adrs/0242-admin-financeiro-receita-mrr-exportacao.md`.

## Ajuste complementar 2026-07-22 - Layout piloto premium no Financeiro

- Pedido do usuario: aplicar o layout piloto nas paginas do painel Financeiro Admin.
- A rota `/financeiro` passou a entrar no escopo centralizado `admin-premium-pilot` do `AdminShell`, reutilizando a sidebar clara, azul Lectum, bordas sutis, sombras reduzidas e tipografia menos pesada ja validadas em Psicologos, Comunidades, Pacientes, Configuracoes e Notificacoes.
- O topo de Financeiro foi convertido em card mobile-first com label **Receitas e assinaturas**, titulo, subtitulo, resumo do periodo consultado, selo **CSV real disponivel**, filtros e CTA **Exportar relatorio** no mesmo bloco.
- Os atalhos soltos de **7 dias**, **30 dias** e **90 dias** foram substituidos por um seletor **Periodo** com as mesmas janelas reais mapeadas para `from`/`to`; o estado **Personalizado** aparece somente quando o usuario digita datas manualmente.
- O seletor **Agrupar** continua usando o contrato real `groupBy=day|week|month`, sem alterar endpoints, calculos financeiros, CSV, Prisma/migrations, packages ou dados exibidos.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia auditavel permanece `_product/proto/admin/Financeiro.png` e o padrao piloto documentado no ADR `adrs/0263-admin-psicologos-piloto-premium.md`.
- Validacoes executadas para este ajuste:
  - `pnpm --dir admin exec biome check --write "src/components/admin-shell/shell.tsx" "src/app/(admin)/financeiro/client.tsx"`;
  - `pnpm --dir admin exec biome check "src/components/admin-shell/shell.tsx" "src/app/(admin)/financeiro/client.tsx"`;
  - `pnpm --dir admin exec eslint "src/app/(admin)/financeiro/client.tsx" "src/components/admin-shell/shell.tsx"`;
  - `pnpm --dir admin typecheck`;
  - `pnpm --dir admin build` em worktree temporario com os arquivos alterados, para evitar o `.next/lock` do dev server local ativo em `3002`;
  - smoke HTTP local `GET http://localhost:3002/financeiro` retornou `200`.
- Observacao: `pnpm --dir admin check` no checkout principal foi tentado, mas ficou bloqueado por formatacao preexistente sem diff desta task em `admin/src/app/(admin)/pacientes/client.tsx`; a validacao de build foi isolada em worktree temporario para nao interromper a sessao Admin local aberta.

## Ajuste pos-feedback 2026-07-22 - Visao Geral unificada no Financeiro

- Pedido do usuario: refinar `/financeiro` conforme as demais paginas Lectum/Admin, especialmente header e bloco de contadores + grafico da **Visao Geral**.
- O header foi simplificado para seguir o padrao de Pacientes: card superior com label, titulo, subtitulo, filtros reais (`Periodo`, `De`, `Ate`, `Agrupar`) e CTA **Exportar relatorio**, sem chips redundantes de periodo/CSV.
- Os quatro contadores financeiros foram compactados e movidos para dentro de um card unico de **Visao Geral**, junto com o periodo real retornado pelo backend e o grafico **Receita ao longo do tempo**.
- O grafico financeiro passou a usar `buildSmoothSvgPath`, plot limpo com borda sutil, labels de eixo reduzidos e barras discretas para novas assinaturas pagas, preservando a legenda e o resumo textual acessivel.
- Descricoes e indisponibilidades financeiras continuam honestas: cards indisponiveis mantem copy real e nenhum dado financeiro foi simulado.
- Nao houve alteracao de endpoint, contrato HTTP, backend, calculos de receita/MRR/ticket/cancelamento, CSV, Prisma/migrations, packages ou dados persistidos.
- Builder/Quick Copy segue sem ferramenta callable neste ambiente; a referencia auditavel permanece `_product/proto/admin/Financeiro.png`, o padrao ativo em `/pacientes` e as capturas enviadas pelo usuario.
- Validacoes executadas para este ajuste:
  - `pnpm --dir admin exec biome check --write "src/app/(admin)/financeiro/client.tsx"`;
  - `pnpm --dir admin exec biome check "src/app/(admin)/financeiro/client.tsx"`;
  - `pnpm --dir admin exec eslint "src/app/(admin)/financeiro/client.tsx"`;
  - `pnpm --dir admin typecheck`;
  - `pnpm --dir admin check`;
  - `pnpm --dir admin build`;
  - smoke HTTP local `GET http://localhost:3002/financeiro` retornou `200`.

## Ajuste pos-feedback 2026-07-22 - Filtros dentro da Visao Geral

- Pedido do usuario: mover filtros de periodo/data para o bloco **Visao Geral**, remover o filtro visual **Agrupar** e trocar os presets por **Hoje**, **Esta semana**, **Este mes**, **Este ano** e **Todo o periodo**.
- O header de `/financeiro` agora permanece limpo, com label, titulo, subtitulo e CTA **Exportar relatorio**, seguindo o padrao das demais paginas Admin.
- O card unico de **Visao Geral** concentra os filtros reais (`Periodo`, `De`, `Ate`), os quatro contadores financeiros e o grafico **Receita ao longo do tempo**.
- O filtro **Agrupar** foi removido da UI. O backend segue aceitando `groupBy=day|week|month` por compatibilidade, mas a tela passa a usar agregacao automatica conforme a janela consultada: dia para periodos curtos, semana para periodos intermediarios e mes para periodos longos.
- O contrato Financeiro agora aceita `period=today|week|month|year|all|custom`; `custom` usa `from`/`to` digitados, e `all` busca a primeira data financeira real em `payment_event` Mercado Pago ou assinatura profissional paga, com fallback honesto para os ultimos 30 dias quando nao houver dado financeiro real.
- A exportacao CSV usa os mesmos filtros aplicados pela tela, incluindo presets e periodo personalizado, sem incluir dados sensiveis de pagamento.
- Nao houve instalacao de package novo, alteracao de Prisma/migrations, mock, dado fake permanente ou endpoint simulado.
- Builder/Quick Copy segue sem ferramenta callable neste ambiente; as referencias auditaveis permanecem `_product/proto/admin/Financeiro.png`, o padrao ativo em `/pacientes` e as capturas enviadas pelo usuario.
- Validacoes executadas para este ajuste:
  - `pnpm --dir admin exec biome check --write "src/app/(admin)/financeiro/client.tsx" "src/api/req/finance/index.ts"`;
  - `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/finance/dashboard/DTOs/IAdminFinanceDashboardDTO.ts" "src/modules/api/admin/private/finance/dashboard/validator/index.ts" "src/modules/api/admin/private/finance/dashboard/use-cases/services.ts" "src/modules/api/admin/private/finance/dashboard/repositories/AdminFinanceDashboardRepository.ts"`;
  - `pnpm --dir admin exec biome check "src/app/(admin)/financeiro/client.tsx" "src/api/req/finance/index.ts"`;
  - `pnpm --dir backend exec biome check "src/modules/api/admin/private/finance/dashboard/DTOs/IAdminFinanceDashboardDTO.ts" "src/modules/api/admin/private/finance/dashboard/validator/index.ts" "src/modules/api/admin/private/finance/dashboard/use-cases/services.ts" "src/modules/api/admin/private/finance/dashboard/repositories/AdminFinanceDashboardRepository.ts"`;
  - `pnpm --dir admin exec eslint "src/app/(admin)/financeiro/client.tsx"`;
  - `pnpm --dir admin typecheck`;
  - `pnpm --dir backend check`;
  - `pnpm --dir backend build`;
  - smoke de service real: `buildAdminFinanceDashboard` retornou `200` para `today`, `week`, `month`, `year` e `all`;
  - `pnpm --dir admin build` em worktree temporario contendo somente os arquivos desta task;
  - smoke HTTP local `GET http://localhost:3002/financeiro` retornou `200`.
- Observacao: `pnpm --dir admin check` no checkout principal ficou bloqueado por alteracao fora do escopo em `admin/src/app/(admin)/psicologos/client.tsx`; em worktree temporario limpo com este patch, o mesmo comando ficou bloqueado por formatacao preexistente em `admin/src/app/(admin)/pacientes/client.tsx`. Por isso `pnpm check` nao foi concluido nesta rodada.

## Ajuste pos-feedback 2026-07-22 - Layout da Visao Geral alinhado a Pacientes

- Pedido do usuario: fazer a **Visao Geral** do painel financeiro seguir a mesma composicao da **Visao Geral** do dashboard de Pacientes enviada em captura.
- O card **Visao Geral** de `/financeiro` passou a usar a mesma estrutura visual de Pacientes: titulo e periodo a esquerda, controles **Periodo**, **De** e **Ate** a direita, contadores em grid responsivo `2 -> 4` e grafico logo abaixo dos contadores.
- Foram removidos elementos visuais extras que deixavam o Financeiro diferente de Pacientes dentro desse bloco, como legenda visual separada e resumo expansivel; o titulo/descricao do grafico e o chip de fonte foram mantidos compactos no card para preservar leitura e rastreabilidade real.
- A legenda operacional do grafico foi preservada de forma acessivel via `figcaption` somente para leitores de tela; as notas honestas de cobertura financeira continuam no bloco proprio de cobertura, sem simular receita, assinatura ou cancelamento.
- A exportacao CSV, presets reais, calculos financeiros, endpoints, Prisma/migrations e packages permaneceram inalterados neste refinamento visual.
- Builder/Quick Copy segue sem ferramenta callable neste ambiente; as referencias auditaveis foram `_product/proto/admin/Financeiro.png`, `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` e as capturas de `/pacientes` enviadas pelo usuario.
- Validacoes executadas para este refinamento:
  - `pnpm --dir admin exec biome check --write "src/app/(admin)/financeiro/client.tsx"`;
  - `pnpm --dir admin exec biome check "src/app/(admin)/financeiro/client.tsx"`;
  - `pnpm --dir admin exec eslint "src/app/(admin)/financeiro/client.tsx"`;
  - `pnpm --dir admin check` (primeira tentativa estourou o timeout local de 240s sem erro reportado; segunda tentativa com timeout maior passou);
  - `pnpm --dir admin build`;
  - `pnpm --dir backend check`;
  - `pnpm --dir backend build`;
  - smoke de service real: `buildAdminFinanceDashboard` retornou `200` para `today`, `week`, `month`, `year` e `all`;
  - `pnpm check`;
  - smoke HTTP local `GET http://localhost:3002/financeiro` retornou `200`;
  - Chrome headless local abriu `/financeiro` e confirmou protecao por sessao real ao redirecionar para login em perfil temporario sem token Admin; a inspecao visual autenticada ficou limitada ao codigo compilado, prototipos locais e capturas autenticadas enviadas pelo usuario.


## Ajuste pós-feedback 2026-07-22 - Contadores controlam curvas do gráfico

- Pedido do usuário: o clique nos blocos contadores de `/financeiro` deve exibir/esconder a curva correspondente no gráfico, igual ao comportamento já aplicado nos dashboards Admin de Psicólogos e Pacientes.
- Os quatro contadores financeiros (**Receita total**, **Novas assinaturas**, **Assinaturas ativas** e **Cancelamentos**) foram convertidos em botões acessíveis com `aria-pressed`, estado ativo/inativo e alternância da série visível, mantendo pelo menos uma curva ativa no gráfico.
- A série temporal real do endpoint financeiro passou a expor também `active_subscriptions` e `cancellations` por bucket, além de `revenue_cents`, `confirmed_payments` e `new_subscriptions`, usando somente `payment_event` e `professional_subscription` reais.
- O gráfico deixou de depender de barras para novas assinaturas e passou a renderizar curvas SVG para as métricas selecionadas; receita usa eixo em reais e as demais métricas usam eixo em quantidade para evitar misturar unidades sem indicação.
- O CSV manteve o mesmo endpoint real e passou a incluir as novas colunas agregadas `active_subscriptions` e `cancellations`, sem exportar dados sensíveis de pagamento.
- Não houve alteração de Prisma/migrations, instalação de package, seed, mock, dado artificial ou endpoint simulado.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; as referências auditáveis foram `_product/proto/admin/Financeiro.png`, `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` e a captura autenticada enviada pelo usuário em 2026-07-22.
- ADR atualizado: `adrs/0242-admin-financeiro-receita-mrr-exportacao.md`.

### Critérios de aceite do ajuste

- [x] Todos os blocos contadores da **Visão Geral** de `/financeiro` são clicáveis e alternam a curva correspondente no gráfico.
- [x] Pelo menos uma curva permanece ativa após os cliques, evitando gráfico vazio por interação acidental.
- [x] As curvas usam dados reais do contrato financeiro; assinaturas ativas e cancelamentos foram adicionados à série sem mock/backfill artificial.
- [x] Layout mobile-first e acessibilidade do padrão de Psicólogos/Pacientes foram preservados com botões `aria-pressed` e legenda sr-only.
- [x] Nenhum `<img>` cru, package novo, schema Prisma, migration ou endpoint simulado foi adicionado.

### Validação complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/financeiro/client.tsx" "src/api/req/finance/index.ts"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/finance/dashboard/DTOs/IAdminFinanceDashboardDTO.ts" "src/modules/api/admin/private/finance/dashboard/use-cases/services.ts"`
- `pnpm --dir admin check`
- `pnpm --dir backend check`
- `pnpm --dir admin build`
- `pnpm --dir backend build`
- `pnpm check`
- Smoke de serviço real: `buildAdminFinanceDashboard({ period: "all" })` retornou `status=200`, `points=30` e primeiro ponto com `active_subscriptions`, `cancellations`, `new_subscriptions`, `confirmed_payments` e `revenue_cents` reais da base local.
- Smoke HTTP local: `GET http://localhost:3002/financeiro` retornou `200` no servidor Admin local.
- Smoke HTTP local protegido: `GET http://localhost:3001/api/admin/private/finance/dashboard?period=all` sem token Admin retornou `401`.


## Ajuste pós-feedback 2026-07-22 - LTV médio e remoção da cobertura visual

- Pedido do usuário: remover o bloco visual **Cobertura dos dados financeiros** de `/financeiro` e trocar **Ticket médio mensal por assinatura** por **LTV médio dos psicólogos**.
- A UI removeu apenas o bloco visível de cobertura; `coverage_notes` e métricas indisponíveis permanecem no contrato/CSV para rastreabilidade operacional sem ocupar a tela.
- O contrato financeiro substitui `average_ticket` por `average_ltv`, calculado com receita lifetime confirmada em `payment_event` vinculada ao `professional_subscription.id` ou `gateway_subscription_id`, dividida por psicólogos com assinatura paga Mercado Pago até o fim do período.
- O LTV fica indisponível quando existir pagamento confirmado vinculado sem valor monetário extraível; não há projeção por preço de plano, mock, seed ou dado artificial.
- Plano gratuito e `source="admin_grant"` permanecem fora do denominador e da receita do LTV.
- Não houve alteração de Prisma/migrations, instalação de package ou endpoint simulado.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; as referências auditáveis foram `_product/proto/admin/Financeiro.png` e a captura autenticada enviada pelo usuário em 2026-07-22.
- ADR atualizado: `adrs/0242-admin-financeiro-receita-mrr-exportacao.md`.

### Critérios de aceite do ajuste

- [x] O bloco **Cobertura dos dados financeiros** não é mais renderizado em `/financeiro`.
- [x] O bloco **LTV médio dos psicólogos** substitui **Ticket médio mensal por assinatura**.
- [x] `average_ltv` usa somente pagamentos confirmados reais vinculados às assinaturas pagas, sem projeção por plano.
- [x] Pagamento confirmado vinculado sem valor monetário extraível deixa o LTV indisponível com motivo explícito.
- [x] O CSV exporta o resumo de LTV sem token, PAN, CVV ou dado sensível de cartão.

### Validação complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/financeiro/client.tsx" "src/api/req/finance/index.ts"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/finance/dashboard/DTOs/IAdminFinanceDashboardDTO.ts" "src/modules/api/admin/private/finance/dashboard/repositories/AdminFinanceDashboardRepository.ts" "src/modules/api/admin/private/finance/dashboard/use-cases/services.ts"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke de serviço real em `backend/dist` com `.env` local: `buildAdminFinanceDashboard({ period: "all" })` retornou `status=200`, `average_ltv` presente, cards `revenue_total`, `active_subscriptions`, `new_subscriptions_revenue`, `new_subscriptions`, `cancellations` e `points=30`.
- Smoke CSV real: `exportAdminFinanceDashboardCsv({ period: "all" })` retornou `status=200`, CSV com `average_ltv` e sem `average_ticket`.
- Smoke HTTP local: `GET http://localhost:3002/financeiro` retornou `200`.
- Smoke HTTP local protegido: `GET http://localhost:3001/api/admin/private/finance/dashboard?period=all` sem token Admin retornou `401`.
- Browser/Quick Copy: Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; validação visual ficou baseada no build Admin, smoke HTTP local, protótipo local `_product/proto/admin/Financeiro.png` e captura autenticada enviada pelo usuário.

## Ajuste pós-feedback 2026-07-22 - Receita de novas assinaturas e Churn

- Pedido do usuário: remover o título **Receita ao longo do tempo**, o texto de apoio **Curvas controladas pelos contadores, com receita em reais e demais métricas em quantidade.** e a tag visual `payment_event+professional_subscription` do bloco de gráfico.
- Os contadores da **Visão Geral** agora seguem a ordem solicitada: **Receita total**, **Assinaturas ativas**, **Receita de novas assinaturas**, **Novas assinaturas** e **Churn**.
- O novo contador **Receita de novas assinaturas** soma `subscription_plan.price_cents` das assinaturas profissionais pagas iniciadas no período, excluindo plano gratuito e cortesia/admin grant; a métrica também foi adicionada em `series.points` e no CSV como `new_subscriptions_revenue_cents`.
- **Cancelamentos** foi renomeado para **Churn** e exibe a taxa em texto menor ao lado da quantidade. A taxa usa `cancellations / base paga no início do período`; quando há churn sem base confiável, o frontend mostra `sem base` entre parênteses.
- Os cards continuam sendo botões acessíveis com `aria-pressed` e controlam as curvas reais do gráfico, mantendo pelo menos uma série ativa.
- Não houve alteração de Prisma/migrations, instalação de package, seed, mock, dado artificial ou endpoint simulado.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; as referências auditáveis foram `_product/proto/admin/Financeiro.png` e a captura autenticada enviada pelo usuário em 2026-07-22.
- ADR atualizado: `adrs/0242-admin-financeiro-receita-mrr-exportacao.md`.

### Critérios de aceite do ajuste

- [x] O título, subtítulo e chip de fonte visível do gráfico foram removidos de `/financeiro`.
- [x] Os contadores aparecem na ordem **Receita total**, **Assinaturas ativas**, **Receita de novas assinaturas**, **Novas assinaturas**, **Churn**.
- [x] **Receita de novas assinaturas** usa dados reais de `professional_subscription` + `subscription_plan.price_cents`, sem mock ou projeção visual.
- [x] **Churn** substitui **Cancelamentos** e exibe a taxa textual entre parênteses após a quantidade.
- [x] O contrato financeiro, série temporal e CSV incluem `new_subscriptions_revenue`/`new_subscriptions_revenue_cents` e `rate_percent`.

### Validação complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/financeiro/client.tsx" "src/api/req/finance/index.ts"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/finance/dashboard/DTOs/IAdminFinanceDashboardDTO.ts" "src/modules/api/admin/private/finance/dashboard/repositories/AdminFinanceDashboardRepository.ts" "src/modules/api/admin/private/finance/dashboard/use-cases/services.ts"`
- `pnpm --dir admin check`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke de serviço real com `.env` local: `buildAdminFinanceDashboard` para `today`, `week`, `month`, `year` e `all` retornou `status=200`, cards `revenue_total,active_subscriptions,new_subscriptions_revenue,new_subscriptions,cancellations`, `new_subscriptions_revenue` e `rate_percent` de churn.
- Smoke HTTP local: `GET http://localhost:3002/financeiro` retornou `200`.

## Ajuste pós-feedback 2026-07-22 - Remoção de textos técnicos no Financeiro

- Pedido do usuário: remover da UI de `/financeiro` as descrições longas dos cards **Receita recorrente mensal (MRR)** e **LTV médio dos psicólogos**, além das tags visuais `active_paid_subscriptions`, `payment_event_linked_to_paid_psychologists` e `professional_subscription+subscription_plan+psychologist_profile+user`.
- A alteração foi limitada ao frontend Admin: os campos `description` e `source` permanecem no contrato financeiro para rastreabilidade, exportação e depuração operacional, mas deixam de ser renderizados nesses blocos visuais.
- Não houve alteração de endpoint, contrato HTTP, cálculo financeiro, Prisma/migrations, packages, dados persistidos, mock ou endpoint simulado.
- Builder/Quick Copy segue sem ferramenta callable neste ambiente; a referência auditável permanece `_product/proto/admin/Financeiro.png` e a captura autenticada enviada pelo usuário em 2026-07-22.

### Critérios de aceite do ajuste

- [x] O texto de apoio do card **Receita recorrente mensal (MRR)** não é mais renderizado.
- [x] O texto de apoio do card **LTV médio dos psicólogos** não é mais renderizado.
- [x] As tags visuais `active_paid_subscriptions`, `payment_event_linked_to_paid_psychologists` e `professional_subscription+subscription_plan+psychologist_profile+user` não aparecem mais em `/financeiro`.
- [x] Os cálculos e fontes reais permanecem preservados no backend/contrato, sem simulação.

### Validação complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/financeiro/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `GET http://localhost:3002/financeiro` retornou `200`.
- Chrome headless local abriu `http://localhost:3002/financeiro` e `Select-String` confirmou ausência das descrições/tags removidas no DOM carregado sem sessão; a validação autenticada visual completa permanece baseada na captura enviada pelo usuário e no build Admin porque o backend local não estava ouvindo em `3001` durante a checagem.

## Ajuste pós-feedback 2026-07-22 - Cobranças e relação completa de assinaturas

- Pedido do usuário: substituir a tabela **Novas assinaturas de psicólogos** por **Últimas cobranças realizadas**, adicionar uma tabela de **Relação de assinaturas** e incluir em ambas a opção **Ver todas** levando a páginas com relação completa de detalhes.
- O dashboard `/financeiro` agora renderiza duas tabelas mobile-first abaixo dos cards MRR/LTV:
  - **Últimas cobranças realizadas**, derivada somente de `payment_event` real do Mercado Pago com status confirmado e valor extraível quando disponível;
  - **Relação de assinaturas**, derivada de `professional_subscription` paga Mercado Pago + `subscription_plan` + `psychologist_profile` + `user`, excluindo plano gratuito e cortesia/admin grant.
- O contrato do dashboard passou a expor `latest_charges` e `subscription_relation`; `new_subscriptions` permanece no contrato financeiro para cards/séries legados, mas não é mais a tabela visual principal.
- Foram adicionados endpoints Admin paginados reais:
  - `GET /api/admin/private/finance/charges`;
  - `GET /api/admin/private/finance/subscriptions`.
- Os links **Ver todas** apontam para `/financeiro/cobrancas` e `/financeiro/assinaturas`, preservando o período exibido no dashboard via query `period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD`.
- As páginas completas exibem paginação, detalhes de evento/assinatura, psicólogo, plano, status e valores seguros, sem payload bruto, token, PAN, CVV ou dados sensíveis de cartão.
- O CSV passou a incluir seções de **Últimas cobranças realizadas** e **Relação de assinaturas** com os mesmos dados seguros do contrato.
- Não houve alteração de Prisma/migrations, instalação de package, seed, mock, dado artificial ou endpoint simulado.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; as referências auditáveis foram `_product/proto/admin/Financeiro.png` e a captura autenticada enviada pelo usuário em 2026-07-22.
- ADR atualizado: `adrs/0242-admin-financeiro-receita-mrr-exportacao.md`.

### Critérios de aceite do ajuste

- [x] A tabela visual **Novas assinaturas de psicólogos** foi substituída por **Últimas cobranças realizadas** em `/financeiro`.
- [x] A tabela **Últimas cobranças realizadas** usa somente eventos `payment_event` reais confirmados do Mercado Pago, sem simulação.
- [x] A tabela **Relação de assinaturas** usa somente assinaturas pagas Mercado Pago reais e exclui plano gratuito/cortesia.
- [x] Ambas as tabelas possuem ação **Ver todas** para páginas completas de detalhe.
- [x] `/financeiro/cobrancas` lista cobranças com paginação e detalhes seguros.
- [x] `/financeiro/assinaturas` lista assinaturas com paginação e detalhes seguros.
- [x] As rotas novas consomem endpoints Admin privados protegidos por autenticação Admin real.
- [x] Nenhum payload bruto, token, PAN, CVV ou dado sensível de cartão é exibido ou exportado.
- [x] UI mobile-first preservada e nenhum `<img>` cru foi usado.
- [x] Nenhum package, schema Prisma, migration, mock ou endpoint simulado foi adicionado.

### Validação complementar executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/finance/dashboard/DTOs/IAdminFinanceDashboardDTO.ts" "src/modules/api/admin/private/finance/dashboard/repositories/AdminFinanceDashboardRepository.ts" "src/modules/api/admin/private/finance/dashboard/use-cases/services.ts" "src/modules/api/admin/private/finance/lists/DTOs/IAdminFinanceListsDTO.ts" "src/modules/api/admin/private/finance/lists/use-cases/controller.ts" "src/modules/api/admin/private/finance/lists/validator/index.ts" "src/modules/api/admin/private/finance/lists/index.ts" "src/main/server/imports/write.ts"`
- `pnpm --dir admin exec biome check --write "src/app/(admin)/financeiro/client.tsx" "src/app/(admin)/financeiro/cobrancas/client.tsx" "src/app/(admin)/financeiro/cobrancas/page.tsx" "src/app/(admin)/financeiro/assinaturas/client.tsx" "src/app/(admin)/financeiro/assinaturas/page.tsx" "src/api/req/finance/index.ts" "src/api/callers/finance/index.ts" "src/api/cache/keys.ts"`
- `pnpm --dir admin typecheck`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke de service real com `.env` local: `buildAdminFinanceDashboard({ period: "all" })`, `listAdminFinanceCharges({ period: "all", limit: 2 })` e `listAdminFinanceSubscriptions({ period: "all", limit: 2 })` retornaram `status=200`; o dashboard expôs `latest_charges` e `subscription_relation`.
- Smoke HTTP local protegido: `GET http://localhost:3001/api/admin/private/finance/charges?period=all` e `GET http://localhost:3001/api/admin/private/finance/subscriptions?period=all` sem token Admin retornaram `401`.
- Smoke HTTP local Admin: `GET http://localhost:3002/financeiro`, `/financeiro/cobrancas` e `/financeiro/assinaturas` retornaram `200`.

## Ajuste pós-feedback 2026-07-22 - Submenu lateral de Financeiro

- Pedido do usuário: no menu lateral, a opção **Financeiro** deve exibir as opções **Visão geral**, **Cobranças** e **Assinaturas**.
- O item **Financeiro** em `adminNavItems` foi convertido em grupo expansível usando o mesmo padrão já aplicado em Comunidades, Psicólogos e Pacientes.
- As opções criadas apontam para rotas reais existentes do Admin Financeiro:
  - **Visão geral**: `/financeiro`;
  - **Cobranças**: `/financeiro/cobrancas`;
  - **Assinaturas**: `/financeiro/assinaturas`.
- O comportamento mobile-first do drawer e da sidebar recolhida foi preservado pelo componente compartilhado `AdminShell`; rotas filhas sob `/financeiro` continuam mantendo o grupo aberto/ativo.
- Não houve alteração de endpoint, backend, contrato financeiro, Prisma/migrations, packages, dados persistidos, mock ou endpoint simulado.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; as referências auditáveis foram `_product/proto/admin/Financeiro.png` e a captura autenticada enviada pelo usuário em 2026-07-22.
- ADR criado: `adrs/0308-admin-financeiro-submenu.md`.

### Critérios de aceite do ajuste

- [x] **Financeiro** no menu lateral exibe submenu com **Visão geral**, **Cobranças** e **Assinaturas**.
- [x] **Visão geral** aponta para `/financeiro`.
- [x] **Cobranças** aponta para `/financeiro/cobrancas`.
- [x] **Assinaturas** aponta para `/financeiro/assinaturas`.
- [x] O submenu reutiliza o padrão existente do shell Admin, sem criar navegação paralela.
- [x] Nenhum `<img>` cru, package novo, schema Prisma, migration, mock ou endpoint simulado foi adicionado.

### Validação complementar executada

- `pnpm --dir admin exec biome check --write "src/components/admin-shell/nav.ts"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/financeiro`, `/financeiro/cobrancas` e `/financeiro/assinaturas` retornaram `200`.
- Validação visual autenticada: limitada à captura fornecida pelo usuário, ao protótipo local `_product/proto/admin/Financeiro.png` e ao build Admin, pois a ferramenta Builder/Quick Copy não está disponível como callable neste ambiente e não há acesso automatizado à sessão Admin autenticada do navegador aberto.

## Ajuste pós-feedback 2026-07-22 - Lifetime médio dos psicólogos

- Pedido do usuário: adicionar um bloco **Lifetime médio dos psicólogos** após o bloco **LTV médio dos psicólogos** em `/financeiro`.
- O dashboard financeiro passou a expor `average_subscription_lifetime`, calculado com assinaturas pagas reais do Mercado Pago já canceladas em todo o histórico financeiro real.
- A duração média usa a diferença entre `professional_subscription.createdAt` e `professional_subscription.updatedAt` das assinaturas com `status="cancelada"`, reaproveitando a mesma evidência real usada pelo churn financeiro enquanto não existe campo dedicado `cancelled_at`.
- A UI mobile-first renderiza os blocos inferiores em ordem: **Receita recorrente mensal (MRR)**, **LTV médio dos psicólogos** e **Lifetime médio dos psicólogos**; no mobile ficam empilhados e no desktop usam grid de 3 colunas.
- Os três blocos exibem **Período de análise** sem tags técnicas: MRR usa o filtro vigente da Visão Geral; LTV e Lifetime indicam **Todo o período**.
- Quando não há assinatura paga cancelada real, o card mostra **Indisponível** sem estimativa por churn, plano, seed, backfill ou dado artificial.
- O CSV financeiro passou a incluir `average_subscription_lifetime` no resumo, sem token, PAN, CVV, payload bruto ou dado sensível de cartão.
- Não houve alteração de Prisma/migrations, instalação de package, mock, dado fake permanente ou endpoint simulado.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; as referências auditáveis foram `_product/proto/admin/Financeiro.png` e a captura autenticada enviada pelo usuário em 2026-07-22.
- ADR atualizado: `adrs/0242-admin-financeiro-receita-mrr-exportacao.md`.

### Critérios de aceite do ajuste

- [x] O bloco **Lifetime médio dos psicólogos** aparece após **LTV médio dos psicólogos** em `/financeiro`.
- [x] A métrica usa somente assinaturas pagas Mercado Pago reais canceladas, sem plano gratuito ou cortesia/admin grant.
- [x] Sem cancelamentos reais, o card fica indisponível em vez de projetar lifetime artificial.
- [x] O contrato financeiro e o CSV incluem `average_subscription_lifetime`.
- [x] Os blocos inferiores exibem **Período de análise** coerente com o filtro de MRR e o histórico global de LTV/Lifetime.
- [x] UI mobile-first preservada e nenhum `<img>` cru foi usado.
- [x] Nenhum package, schema Prisma, migration, mock ou endpoint simulado foi adicionado.

### Validação complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/financeiro/client.tsx" "src/api/req/finance/index.ts"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/finance/dashboard/DTOs/IAdminFinanceDashboardDTO.ts" "src/modules/api/admin/private/finance/dashboard/repositories/AdminFinanceDashboardRepository.ts" "src/modules/api/admin/private/finance/dashboard/use-cases/services.ts"`
- `pnpm --dir admin exec biome check "src/app/(admin)/financeiro/client.tsx" "src/api/req/finance/index.ts"`
- `pnpm --dir backend exec biome check "src/modules/api/admin/private/finance/dashboard/DTOs/IAdminFinanceDashboardDTO.ts" "src/modules/api/admin/private/finance/dashboard/repositories/AdminFinanceDashboardRepository.ts" "src/modules/api/admin/private/finance/dashboard/use-cases/services.ts"`
- `pnpm --dir admin check`
- `pnpm --dir backend check`
- `pnpm --dir admin build`
- `pnpm --dir backend build`
- `pnpm check`
- Smoke de serviço real com `.env` local: `buildAdminFinanceDashboard({ period: "all" })` retornou `status=200`, `average_subscription_lifetime.available=true`, `cancelled_subscription_count=1`, `value_days=21.6`, `value_months=0.7`; `exportAdminFinanceDashboardCsv({ period: "all" })` retornou `status=200` e CSV contendo `average_subscription_lifetime`.
- Smoke HTTP local: `GET http://localhost:3002/financeiro` retornou `200`.
- Smoke HTTP local protegido: `GET http://localhost:3001/api/admin/private/finance/dashboard?period=all` sem token Admin retornou `401`.
- Browser local autenticado em `http://localhost:3002/financeiro` com sessão Admin real temporária confirmou no DOM os blocos **Receita recorrente mensal (MRR)**, **LTV médio dos psicólogos** e **Lifetime médio dos psicólogos**; a sessão temporária de validação foi removida ao final.

## Ajuste pós-feedback 2026-07-22 - Relação de assinaturas com busca e filtros Lectum

- Pedido do usuário: ajustar `/financeiro/assinaturas` removendo as colunas **CRP**, **Período atual**, **Gateway** e **Plano**; adicionar **Última** e **Próxima** após **Início**; ocultar hora nas datas; e adicionar barra de pesquisa e filtros no mesmo layout Lectum, sem filtro de plano e com filtro de data de início da assinatura.
- A tabela completa de assinaturas agora exibe, no desktop, apenas **Psicólogo**, **Início**, **Última**, **Próxima**, **Valor** e **Status**; no mobile, os cards seguem os mesmos dados principais sem mostrar plano, CRP, gateway ou período técnico.
- As datas de **Início**, **Última** e **Próxima** usam formatação apenas de data, sem hora.
- **Última** é derivada de `payment_event` real confirmado vinculado ao `professional_subscription.id` ou ao `gateway_subscription_id`; quando não há cobrança confirmada vinculada, a UI exibe `—`.
- **Próxima** é derivada de `professional_subscription.current_period_end`, mantendo a origem real já persistida da assinatura.
- A busca aceita nome, e-mail, CRP ou identificador real da assinatura/gateway; o CRP permanece pesquisável para operação, mas não é exibido como coluna.
- Os filtros da tabela seguem o padrão visual Lectum usado nas listagens Admin: campo de busca pill com ícone, filtros arredondados e responsivos, e botão **Limpar** somente quando houver filtro ativo.
- O filtro de plano foi removido; os filtros ativos são busca, **Início de**, **Início até** e **Status**.
- O filtro de data de início reutiliza o contrato real `period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD` e filtra `professional_subscription.createdAt`, sem endpoint paralelo.
- O dashboard `/financeiro` também teve a prévia de **Relação de assinaturas** alinhada às colunas **Início**, **Última**, **Próxima**, **Valor** e **Status**.
- Não houve alteração de Prisma/migrations, instalação de package, seed, mock, dado artificial ou endpoint simulado.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; as referências auditáveis foram `_product/proto/admin/Financeiro.png` e a captura autenticada enviada pelo usuário em 2026-07-22.
- ADR atualizado: `adrs/0242-admin-financeiro-receita-mrr-exportacao.md`.

### Critérios de aceite do ajuste

- [x] `/financeiro/assinaturas` não exibe as colunas **CRP**, **Período atual**, **Gateway** ou **Plano**.
- [x] A tabela exibe **Última** e **Próxima** após **Início**.
- [x] As datas exibidas na relação de assinaturas não mostram hora.
- [x] A busca e os filtros usam o mesmo padrão visual Lectum das listagens Admin.
- [x] O filtro de plano foi removido.
- [x] Existe filtro por data de início da assinatura com intervalo **Início de**/**Início até**.
- [x] A busca, o filtro de status e o filtro de data usam endpoint real e contrato Admin privado existente, sem mock.
- [x] A prévia de **Relação de assinaturas** em `/financeiro` foi alinhada às mesmas colunas principais.
- [x] UI mobile-first preservada e nenhum `<img>` cru foi usado.
- [x] Nenhum package, schema Prisma, migration, mock ou endpoint simulado foi adicionado.

### Validação complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/financeiro/assinaturas/client.tsx" "src/app/(admin)/financeiro/client.tsx" "src/api/req/finance/index.ts" "src/api/cache/keys.ts"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/finance/dashboard/DTOs/IAdminFinanceDashboardDTO.ts" "src/modules/api/admin/private/finance/dashboard/repositories/AdminFinanceDashboardRepository.ts" "src/modules/api/admin/private/finance/dashboard/use-cases/services.ts" "src/modules/api/admin/private/finance/lists/validator/index.ts"`
- `pnpm --dir admin check`
- `pnpm --dir backend check`
- `pnpm --dir admin build`
- `pnpm --dir backend build`
- `pnpm check`
- Smoke de serviço real com `.env` local: `listAdminFinanceSubscriptions({ period: "all", limit: 2 })` retornou `status=200`, `count=6`, `items=2` e todos os itens continham `last_charge_at`/`next_charge_at`; `listAdminFinanceSubscriptions({ period: "all", limit: 2, q: "ana", status: "ativa" })` retornou `status=200`, `count=1`, `items=1`.
- Smoke de filtro de início real: `listAdminFinanceSubscriptions({ period: "custom", from: "2026-07-15", to: "2026-07-22", limit: 10 })` retornou `status=200`, `count=3`, `items=3` e datas de início dentro do intervalo.
- Smoke HTTP local protegido: `GET http://localhost:3001/api/admin/private/finance/subscriptions?period=all&q=ana&status=ativa` sem token Admin retornou `401`.
- Smoke HTTP/Admin local: `GET http://localhost:3002/financeiro/assinaturas` retornou `200`; o bundle da rota contém os controles de busca/status e não contém as colunas removidas **CRP**, **Plano** ou **Período atual**.
- Chrome headless local em `http://localhost:3002/financeiro/assinaturas` confirmou o guard de autenticação Admin; a validação visual autenticada completa permanece limitada à captura enviada pelo usuário porque a ferramenta Builder/Quick Copy não está disponível como callable e não há acesso automatizado à sessão Admin autenticada do navegador aberto.

## Ajuste pós-feedback 2026-07-23 - Cobranças sem retorno/período/evento/referência

- Pedido do usuário: em `/financeiro/cobrancas`, remover do header o botão **Voltar ao Financeiro** e a linha **Todo o período · 2026-06-28 a 2026-07-23**; remover da tabela as colunas **Evento** e **Referência**.
- O header da página mantém apenas o contexto **Financeiro**, o título **Últimas cobranças realizadas** e a descrição da relação completa.
- A tabela desktop agora exibe apenas **Data**, **Psicólogo**, **Plano**, **Valor** e **Status**, reduzindo a largura mínima da relação para acompanhar as colunas remanescentes.
- Os cards mobile também deixam de exibir a referência operacional, mantendo somente data, valor e plano além do psicólogo/status.
- A alteração é somente visual em `admin/src/app/(admin)/financeiro/cobrancas/client.tsx`; o endpoint Admin privado, a paginação e o consumo de eventos reais do Mercado Pago não foram alterados.
- Nenhum package, schema Prisma, migration, mock, dado artificial ou endpoint simulado foi adicionado.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência auditável foi a captura autenticada enviada pelo usuário em 2026-07-23.
- ADR não criado: não houve decisão arquitetural, integração nova, regra de domínio nova ou trade-off persistente além da remoção visual solicitada.

### Critérios de aceite do ajuste

- [x] O header de `/financeiro/cobrancas` não exibe o botão **Voltar ao Financeiro**.
- [x] O header de `/financeiro/cobrancas` não exibe o resumo **Todo o período · 2026-06-28 a 2026-07-23**.
- [x] A tabela desktop de cobranças não exibe as colunas **Evento** e **Referência**.
- [x] Os cards mobile não exibem a referência operacional removida da relação principal.
- [x] A lista continua consumindo o endpoint real de cobranças, sem mock ou endpoint paralelo.
- [x] Nenhum `<img>` cru, package novo, schema Prisma, migration, mock ou endpoint simulado foi adicionado.

### Validação complementar executada

- `pnpm --dir admin biome:check`
- `pnpm --dir admin lint`
- `pnpm --dir admin typecheck`
- `pnpm --dir admin build`
- `rg -n "Voltar ao Financeiro|Todo o período|Evento|Referência|shortReference|periodSummary" "admin/src/app/(admin)/financeiro/cobrancas/client.tsx"` não retornou ocorrências.
- Smoke HTTP local: `GET http://localhost:3002/financeiro/cobrancas` retornou `200` e o HTML inicial não continha os textos removidos.

## Ajuste pós-feedback 2026-07-23 - Busca e filtros em Cobranças

- Pedido do usuário: trocar o título **Últimas cobranças realizadas** por **Cobranças**, adicionar barra de pesquisa, filtros de data e filtro de status na tabela, e manter a quantidade de cobranças encontradas abaixo da barra de busca.
- A página `/financeiro/cobrancas` agora exibe o título **Cobranças** no header e mantém a descrição da relação completa de cobranças confirmadas por eventos reais do Mercado Pago.
- A tabela ganhou busca em pill com ícone, filtros mobile-first **Data de**, **Data até** e **Status**, além de botão **Limpar** contextual quando há filtro ativo.
- A contagem **cobranças encontradas** foi deslocada para imediatamente abaixo da barra de pesquisa, seguindo o padrão visual Lectum já usado na relação de assinaturas.
- A busca envia `q` para o endpoint Admin privado real `GET /api/admin/private/finance/charges` e filtra cobranças por nome/e-mail do psicólogo, plano, CRP, ids/referências do evento ou assinatura e status exibido.
- O filtro de data reutiliza o contrato real `period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD`, filtrando `payment_event.createdAt` no período resolvido pelo serviço financeiro.
- O filtro de status usa o status real atual das cobranças retornadas (`confirmed`/Confirmada), sem criar endpoint paralelo ou status artificial.
- Não houve alteração de Prisma/migrations, instalação de package, seed, mock, dado artificial ou endpoint simulado.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; as referências auditáveis foram `_product/proto/admin/Financeiro.png`, a captura autenticada enviada pelo usuário em 2026-07-23 e o padrão visual já aplicado em `/financeiro/assinaturas`.
- ADR atualizado: `adrs/0242-admin-financeiro-receita-mrr-exportacao.md`.

### Critérios de aceite do ajuste

- [x] O header de `/financeiro/cobrancas` exibe **Cobranças** em vez de **Últimas cobranças realizadas**.
- [x] A tabela possui barra de pesquisa no padrão Lectum Admin.
- [x] A tabela possui filtros de data **Data de**/**Data até**.
- [x] A tabela possui filtro visual de **Status**.
- [x] A quantidade de cobranças encontradas fica abaixo da barra de busca.
- [x] Busca, status, paginação e contagem usam o endpoint Admin privado real de cobranças, sem mock ou filtro apenas visual.
- [x] O filtro de data reaproveita o contrato real de período customizado do Financeiro.
- [x] UI mobile-first preservada e nenhum `<img>` cru foi usado.
- [x] Nenhum package, schema Prisma, migration, mock ou endpoint simulado foi adicionado.

### Validação complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/financeiro/cobrancas/client.tsx"`.
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/finance/dashboard/use-cases/services.ts"`.
- `pnpm --dir admin exec biome check "src/app/(admin)/financeiro/cobrancas/client.tsx"`.
- `pnpm --dir admin exec eslint "src/app/(admin)/financeiro/cobrancas/client.tsx"`.
- `pnpm --dir backend exec biome check "src/modules/api/admin/private/finance/dashboard/use-cases/services.ts"`.
- `pnpm --dir admin check`.
- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm check`.
- `pnpm --dir admin build` no checkout principal ficou bloqueado pelo `.next/lock` do dev server Admin ativo em `localhost:3002`; o mesmo build foi executado com sucesso em worktree temporário com `admin/node_modules` em junction e o arquivo alterado desta task.
- Smoke de serviço real com `.env` local: `listAdminFinanceCharges({ period: "all", limit: 2 })` retornou `status=200`, `count=8`, `items=2`; `listAdminFinanceCharges({ period: "all", limit: 2, status: "confirmed" })` retornou `status=200`, `count=8`, `items=2`; `listAdminFinanceCharges({ period: "all", limit: 2, q: "ana" })` retornou `status=200`, `count=2`, `items=2`.
- Smoke de data real: `listAdminFinanceCharges({ period: "custom", from: "2026-07-20", to: "2026-07-23", limit: 50 })` retornou `status=200`, `count=3`, `items=3`.
- Smoke HTTP local protegido: `GET http://localhost:3001/api/admin/private/finance/charges?period=all&q=ana&status=confirmed` sem token Admin retornou `401`.
- Smoke HTTP/Admin local: `GET http://localhost:3002/financeiro/cobrancas` retornou `200`.
- Chrome headless local abriu `/financeiro/cobrancas` sem sessão Admin e confirmou redirecionamento/guard para o login administrativo; a validação visual autenticada completa permanece limitada à captura enviada pelo usuário porque não há acesso automatizado à sessão Admin autenticada já aberta.

## Ajuste pós-feedback 2026-07-23 - Datas dos filtros sem pesquisa prematura

- Pedido do usuário: ajustar os campos de seleção de data porque, ao digitar a data manualmente, a lista começava a pesquisar antes da data completa ser informada.
- Em `/financeiro/cobrancas`, os campos **Data de** e **Data até** agora usam rascunho local e só aplicam o filtro real ao sair do grupo de datas ou pressionar Enter, evitando enviar `period=custom&from&to` durante a digitação parcial.
- O mesmo padrão foi aplicado em `/financeiro/assinaturas` para evitar a mesma regressão nos campos **Início de** e **Início até**.
- Datas incompletas ou implausíveis geradas pelo input nativo durante a digitação, como `0002-07-23`, não são enviadas para as queries; `parseQuery` ignora intervalos incompletos/anos anteriores a 1900 quando vierem pela URL, e a atualização de filtros também limpa `from`/`to` inválidos antes de trocar a rota.
- A aplicação de datas completas continua usando o endpoint Admin privado real e o contrato existente `period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD`, sem filtro apenas visual.
- Não houve alteração de backend, contrato HTTP, Prisma/migrations, packages, seed, mock, dado artificial ou endpoint simulado.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; as referências auditáveis foram a captura autenticada enviada pelo usuário em 2026-07-23 e o padrão visual já aplicado nas listas financeiras.
- ADR atualizado: `adrs/0242-admin-financeiro-receita-mrr-exportacao.md`.

### Critérios de aceite do ajuste

- [x] Digitar uma data parcial em `/financeiro/cobrancas` não dispara pesquisa nem atualiza a URL antes de a data completa ser confirmada.
- [x] Digitar uma data parcial em `/financeiro/assinaturas` não dispara pesquisa nem atualiza a URL antes de a data completa ser confirmada.
- [x] URLs já existentes com datas incompletas/implausíveis, como `from=0002-07-23`, não chegam às chamadas de listagem como filtro customizado válido.
- [x] Datas completas continuam aplicando `period=custom&from&to` nos endpoints reais ao sair do grupo de datas ou pressionar Enter.
- [x] UI mobile-first preservada e nenhum `<img>` cru foi usado.
- [x] Nenhum package, schema Prisma, migration, mock ou endpoint simulado foi adicionado.

### Validação complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/financeiro/cobrancas/client.tsx" "src/app/(admin)/financeiro/assinaturas/client.tsx"`.
- `pnpm --dir admin exec eslint "src/app/(admin)/financeiro/cobrancas/client.tsx" "src/app/(admin)/financeiro/assinaturas/client.tsx"`.
- `pnpm --dir admin typecheck`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- Smoke HTTP local: `GET http://localhost:3002/financeiro/cobrancas?from=0002-07-23&period=custom&to=2026-07-23` retornou `200`, sem quebrar a rota com a URL problemática enviada na captura.
- Scan estático: `rg -n "handleChargeDateFilterChange|handleStartDateFilterChange|from=0002|onChange=\{\(value\) => handle.*DateFilterChange" "admin/src/app/(admin)/financeiro/cobrancas/client.tsx" "admin/src/app/(admin)/financeiro/assinaturas/client.tsx"` não retornou ocorrências.
- Chrome headless local abriu a URL problemática de /financeiro/cobrancas; sem sessão Admin no perfil temporário, a validação autenticada completa permaneceu limitada à captura enviada pelo usuário e aos checks/builds.

## Ajuste pós-feedback 2026-07-23 - Subtítulos dos contadores MRR, LTV e Lifetime

- Pedido do usuário: nos contadores **MRR**, **LTV** e **Lifetime** em `/financeiro`, trocar o texto abaixo do título para somente **Todo o período** em peso menor.
- Os três cards inferiores do Financeiro agora reutilizam o mesmo subtítulo simples **Todo o período**, sem o prefixo **Período de análise:** e sem intervalo de datas no MRR.
- O peso visual do subtítulo foi reduzido para `font-medium`, mantendo a leitura discreta em `text-muted` e preservando a hierarquia dos títulos/valores.
- A alteração é somente visual em `admin/src/app/(admin)/financeiro/client.tsx`; cálculos, filtros, endpoints, CSV, Prisma/migrations e packages permaneceram inalterados.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; as referências auditáveis foram `_product/proto/admin/Financeiro.png` e a captura autenticada enviada pelo usuário em 2026-07-23.
- ADR não criado: não houve decisão arquitetural, integração nova, regra de domínio nova ou trade-off persistente além da copy/estilo visual solicitado.

### Critérios de aceite do ajuste

- [x] O card **Receita recorrente mensal (MRR)** exibe abaixo do título somente **Todo o período**.
- [x] O card **LTV médio dos psicólogos** exibe abaixo do título somente **Todo o período**.
- [x] O card **Lifetime médio dos psicólogos** exibe abaixo do título somente **Todo o período**.
- [x] O subtítulo dos três cards usa peso menor que o texto anterior.
- [x] UI mobile-first preservada e nenhum `<img>` cru foi usado.
- [x] Nenhum package, schema Prisma, migration, mock ou endpoint simulado foi adicionado.

### Validação complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/financeiro/client.tsx"`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- Scan estático: `rg -n "Período de análise|PerÃ­odo de anÃ¡lise|formatFilteredAnalysisPeriod|formatAnalysisRange" "admin/src/app/(admin)/financeiro/client.tsx"` não retornou ocorrências.
- Smoke HTTP local: `GET http://localhost:3002/financeiro` retornou `200`.

## Ajuste pós-feedback 2026-07-23 - Preview de cobranças sem coluna Evento

- Pedido do usuário: na tabela **Últimas cobranças realizadas** exibida em `/financeiro`, remover a coluna **Evento** e trocar o cabeçalho **Assinatura** por **Plano**.
- A prévia desktop de cobranças do dashboard financeiro agora exibe apenas **Data**, **Psicólogo**, **Plano**, **Valor** e **Status**.
- O valor do plano e a referência curta da assinatura permanecem na coluna **Plano**; o tipo/id do evento de pagamento deixa de ser exibido nessa prévia, sem alterar o endpoint real ou a página completa de cobranças.
- A largura mínima da tabela foi reduzida para acompanhar as cinco colunas remanescentes, preservando o comportamento responsivo/mobile-first existente.
- A alteração é somente visual em `admin/src/app/(admin)/financeiro/client.tsx`; contratos HTTP, cálculos financeiros, CSV, Prisma/migrations e packages permaneceram inalterados.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; as referências auditáveis foram `_product/proto/admin/Financeiro.png` e a captura autenticada enviada pelo usuário em 2026-07-23.
- ADR não criado: não houve decisão arquitetural, integração nova, regra de domínio nova ou trade-off persistente além da remoção/copy visual solicitada.

### Critérios de aceite do ajuste

- [x] A tabela **Últimas cobranças realizadas** em `/financeiro` não exibe a coluna **Evento**.
- [x] O cabeçalho **Assinatura** foi alterado para **Plano**.
- [x] A tabela continua exibindo dados reais de cobranças já retornados pelo endpoint Admin financeiro, sem mock ou endpoint paralelo.
- [x] UI mobile-first preservada e nenhum `<img>` cru foi adicionado.
- [x] Nenhum package, schema Prisma, migration, mock ou endpoint simulado foi adicionado.

### Validação complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/financeiro/client.tsx"`.
- `pnpm --dir admin exec eslint "src/app/(admin)/financeiro/client.tsx"`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- Scan estático: `rg -n "<th[^\\n]*Evento|<th[^\\n]*Assinatura|item\\.event_type|shortReference\\(item\\.external_id\\)" "admin/src/app/(admin)/financeiro/client.tsx"` não retornou ocorrências.
- Smoke HTTP local: `GET http://localhost:3002/financeiro` retornou `200`.
- Chrome headless local abriu `/financeiro` sem sessão Admin e confirmou o guard/redirect para login; a validação visual autenticada completa permaneceu limitada à captura enviada pelo usuário e à inspeção estática/build da tela.


## Ajuste p?s-feedback 2026-07-23 - Colunas da pr?via de assinaturas no Financeiro

- Pedido do usu?rio: em `/financeiro`, alterar as colunas da tabela **Assinaturas** para **Psic?logo**, **In?cio**, **Pr?xima**, **Valor**, **Status** e **Confiabilidade Pgto**.
- A pr?via desktop de assinaturas no dashboard financeiro removeu a coluna **?ltima** e passou a exibir **Confiabilidade Pgto** como ?ltima coluna, reutilizando o `payment_health` real j? retornado pelo contrato financeiro.
- Os cards mobile da mesma se??o tamb?m deixaram de mostrar **?ltima** e exibem o badge de confiabilidade de pagamento antes das datas principais, preservando o layout mobile-first.
- A p?gina completa `/financeiro/assinaturas` j? seguia essa composi??o e n?o precisou de altera??o de contrato, endpoint, c?lculo financeiro, Prisma/migration, package, mock ou dado artificial.
- Builder/Quick Copy n?o est? exposto como ferramenta callable neste ambiente; as refer?ncias audit?veis foram `_product/proto/admin/Financeiro.png`, a captura autenticada enviada pelo usu?rio em 2026-07-23 e o padr?o j? aplicado em `/financeiro/assinaturas`.
- ADR atualizado: `adrs/0242-admin-financeiro-receita-mrr-exportacao.md`.

### Crit?rios de aceite do ajuste

- [x] A tabela **Assinaturas** em `/financeiro` exibe as colunas **Psic?logo**, **In?cio**, **Pr?xima**, **Valor**, **Status** e **Confiabilidade Pgto**.
- [x] A coluna **?ltima** n?o ? exibida na pr?via de assinaturas em `/financeiro`.
- [x] A coluna **Confiabilidade Pgto** usa o `payment_health` real retornado pelo backend financeiro, sem c?lculo visual paralelo ou mock.
- [x] Os cards mobile da pr?via de assinaturas removem **?ltima** e exibem a confiabilidade de pagamento.
- [x] Nenhum endpoint, c?lculo financeiro, schema Prisma, migration, package, mock ou dado artificial foi adicionado.
- [x] UI mobile-first preservada e nenhum `<img>` cru foi usado.

### Valida??o complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/financeiro/client.tsx"`.
- `pnpm --dir admin exec biome check "src/app/(admin)/financeiro/client.tsx"`.
- `pnpm --dir admin exec eslint "src/app/(admin)/financeiro/client.tsx"`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check` foi executado, mas ficou bloqueado por formata??o preexistente fora do escopo em `backend/src/modules/api/admin/private/patients/profile-edit/use-cases/services.ts`; os checks/builds relevantes do Admin passaram.
- Smoke HTTP local: `GET http://localhost:3002/financeiro` retornou `200`.
- Scan est?tico/build: `admin/src/app/(admin)/financeiro/client.tsx` e o build em `admin/.next` cont?m **Confiabilidade Pgto** na rota de Financeiro, enquanto a pr?via de assinaturas n?o cont?m mais a coluna **?ltima**.


## Ajuste p?s-feedback 2026-07-23 - Estado ativo na coluna Plano de cobran?as

- Pedido do usu?rio: na coluna **Plano**, abaixo de **Plano Profissional**, adicionar o texto **Ativo**.
- A pr?via **?ltimas cobran?as realizadas** em `/financeiro` deixou de exibir a refer?ncia curta abaixo do plano e passou a exibir o estado operacional da assinatura; para assinaturas com `status="ativa"`, o texto exibido ? **Ativo**.
- A rela??o completa `/financeiro/cobrancas` tamb?m usa a mesma regra na coluna **Plano**, trocando a forma feminina **Ativa** por **Ativo** quando a assinatura est? ativa e preservando status n?o ativos reais, como **Inadimplente**.
- Os cards mobile de cobran?as exibem o mesmo texto abaixo do plano, mantendo a hierarquia mobile-first.
- A altera??o ? somente visual e reutiliza `professional_subscription.status`/`status_label` j? retornados pelo contrato financeiro; n?o houve endpoint, c?lculo financeiro, schema Prisma, migration, package, mock ou dado artificial novo.
- Builder/Quick Copy n?o est? exposto como ferramenta callable neste ambiente; as refer?ncias audit?veis foram as capturas autenticadas enviadas pelo usu?rio em 2026-07-23 e `_product/proto/admin/Financeiro.png`.
- ADR n?o criado: n?o houve decis?o arquitetural, integra??o nova, regra de dom?nio nova ou trade-off persistente al?m da copy visual solicitada.

### Crit?rios de aceite do ajuste

- [x] Em `/financeiro`, a coluna **Plano** da pr?via de cobran?as exibe **Ativo** abaixo de **Plano Profissional** para assinatura ativa.
- [x] Em `/financeiro/cobrancas`, a coluna **Plano** exibe **Ativo** abaixo de **Plano Profissional** para assinatura ativa.
- [x] Status n?o ativos continuam exibindo o status real retornado pelo backend financeiro, sem mascarar inadimpl?ncia ou cancelamento.
- [x] Os cards mobile de cobran?as exibem o mesmo estado abaixo do plano.
- [x] Nenhum endpoint, c?lculo financeiro, schema Prisma, migration, package, mock ou dado artificial foi adicionado.
- [x] UI mobile-first preservada e nenhum `<img>` cru foi usado.

### Valida??o complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/financeiro/client.tsx" "src/app/(admin)/financeiro/cobrancas/client.tsx"`.
- `pnpm --dir admin exec biome check "src/app/(admin)/financeiro/client.tsx" "src/app/(admin)/financeiro/cobrancas/client.tsx"`.
- `pnpm --dir admin exec eslint "src/app/(admin)/financeiro/client.tsx" "src/app/(admin)/financeiro/cobrancas/client.tsx"`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build` no checkout principal foi tentado, mas ficou bloqueado pelo `.next/lock` de outro build/servidor Next ativo.
- `pnpm --dir ".tmp/admin-build-plan-active-20260723191907/admin" build` passou em worktree tempor?rio contendo os arquivos alterados.
- Smoke HTTP local: `GET http://localhost:3002/financeiro` e `GET http://localhost:3002/financeiro/cobrancas?period=all` retornaram `200`.

## Ajuste pós-feedback 2026-08-04 - IDs de assinatura e cobrança nas listas financeiras

- Pedido do usuário: em `/financeiro/assinaturas`, exibir o ID da assinatura na tabela principal e o ID de cada cobrança no histórico de pagamentos; em `/financeiro/cobrancas`, exibir o ID da cobrança, substituir a coluna **Plano** por **Assinatura** e informar o ID da assinatura.
- A tabela principal de `/financeiro/assinaturas` agora exibe **ID assinatura** em coluna própria no desktop e nos cards mobile, usando `professional_subscription.id` já retornado pelo endpoint financeiro real.
- O histórico de pagamentos expandido de cada assinatura agora exibe **ID cobrança** (`payment_event.id`) e **ID Mercado Pago** (`payment_event.external_id`) em cada item de cobrança, sem expor payload bruto do gateway.
- A tabela completa de `/financeiro/cobrancas` agora exibe a coluna **ID cobrança** e trocou **Plano** por **Assinatura**; a coluna mantém nome do plano/estado operacional e acrescenta o ID local da assinatura, além do ID Mercado Pago da assinatura quando disponível.
- Eventos confirmados sem vínculo local continuam visíveis com indicação honesta de ausência de ID de assinatura local.
- A alteração reutiliza somente campos já existentes no contrato financeiro; não houve backend, endpoint, cálculo financeiro, CSV, Prisma/migration, package, mock, seed ou dado artificial novo.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; as referências auditáveis foram `_product/proto/admin/Financeiro.png`, o inventário `_product/tasks/PROTO-INVENTORY.md` e as capturas autenticadas enviadas pelo usuário em 2026-08-04.
- ADR atualizado: `adrs/0242-admin-financeiro-receita-mrr-exportacao.md`.

### Critérios de aceite do ajuste

- [x] `/financeiro/assinaturas` exibe `professional_subscription.id` na tabela principal desktop.
- [x] `/financeiro/assinaturas` exibe `professional_subscription.id` nos cards mobile da lista principal.
- [x] O histórico de pagamentos de assinaturas exibe o ID local de cada cobrança (`payment_event.id`).
- [x] O histórico de pagamentos de assinaturas exibe também o ID externo Mercado Pago (`payment_event.external_id`) sem payload bruto.
- [x] `/financeiro/cobrancas` exibe uma coluna **ID cobrança** com os identificadores da cobrança.
- [x] `/financeiro/cobrancas` não exibe mais a coluna **Plano**; a coluna foi substituída por **Assinatura**.
- [x] A coluna **Assinatura** em `/financeiro/cobrancas` informa o ID local da assinatura quando há vínculo real.
- [x] Eventos confirmados sem assinatura vinculada não recebem ID artificial e indicam ausência de vínculo local.
- [x] UI mobile-first preservada e nenhum `<img>` cru foi usado.
- [x] Nenhum package, schema Prisma, migration, mock, seed ou endpoint simulado foi adicionado.

### Validação complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/financeiro/assinaturas/client.tsx" "src/app/(admin)/financeiro/cobrancas/client.tsx"`.
- `pnpm --dir admin exec biome check "src/app/(admin)/financeiro/assinaturas/client.tsx" "src/app/(admin)/financeiro/cobrancas/client.tsx"`.
- `pnpm --dir admin exec eslint "src/app/(admin)/financeiro/assinaturas/client.tsx" "src/app/(admin)/financeiro/cobrancas/client.tsx"`.
- `pnpm --dir admin typecheck`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- Smoke HTTP local: `GET http://localhost:3002/financeiro/assinaturas` retornou `200`.
- Smoke HTTP local: `GET http://localhost:3002/financeiro/cobrancas` retornou `200`.
- Scan estático: `rg -n "ID assinatura|ID cobrança|Assinatura|Plano" "admin/src/app/(admin)/financeiro/assinaturas/client.tsx" "admin/src/app/(admin)/financeiro/cobrancas/client.tsx"` confirmou os novos rótulos e a substituição visual na página de cobranças.

## Ajuste pós-feedback 2026-08-04 - IDs internos com rótulo simples

- Pedido do usuário: manter somente IDs internos e simplificar a cópia visível para **ID**, sem rótulos específicos como **ID cobrança** ou **ID assinatura**.
- Em `/financeiro/assinaturas`, a tabela principal e os cards mobile agora rotulam o identificador da assinatura apenas como **ID**, exibindo somente `professional_subscription.id`.
- No histórico de pagamentos de `/financeiro/assinaturas`, cada item exibe apenas **ID** com `payment_event.id`; o `payment_event.external_id` do Mercado Pago deixou de aparecer na UI.
- Em `/financeiro/cobrancas`, a coluna de identificador passou a chamar apenas **ID** e exibe somente `payment_event.id`; o `external_id` do Mercado Pago foi removido da lista visual.
- Na coluna **Assinatura** de `/financeiro/cobrancas`, o identificador exibido também passou a ser apenas **ID** com `professional_subscription.id`; `gateway_subscription_id` deixou de aparecer na UI.
- Eventos confirmados sem assinatura vinculada continuam sem ID artificial e exibem **ID: —** na área da assinatura.
- A alteração é somente de apresentação e reutiliza campos internos já existentes; não houve contrato HTTP, backend, Prisma/migration, package, mock, seed ou endpoint simulado novo.

### Critérios de aceite do ajuste

- [x] Nenhuma lista financeira completa exibe `payment_event.external_id` ou `gateway_subscription_id` como ID Mercado Pago.
- [x] Os rótulos visíveis de identificadores nas duas páginas usam somente **ID**.
- [x] `/financeiro/assinaturas` preserva o ID interno da assinatura na tabela/card principal.
- [x] O histórico de pagamentos preserva apenas o ID interno da cobrança (`payment_event.id`).
- [x] `/financeiro/cobrancas` preserva apenas o ID interno da cobrança e o ID interno da assinatura vinculada.
- [x] Eventos sem assinatura vinculada não recebem identificador artificial.
- [x] UI mobile-first preservada e nenhum `<img>` cru foi usado.
- [x] Nenhum package, schema Prisma, migration, mock, seed ou endpoint simulado foi adicionado.

### Validação complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/financeiro/assinaturas/client.tsx" "src/app/(admin)/financeiro/cobrancas/client.tsx"`.
- `pnpm --dir admin exec biome check "src/app/(admin)/financeiro/assinaturas/client.tsx" "src/app/(admin)/financeiro/cobrancas/client.tsx"`.
- `pnpm --dir admin exec eslint "src/app/(admin)/financeiro/assinaturas/client.tsx" "src/app/(admin)/financeiro/cobrancas/client.tsx"`.
- `pnpm --dir admin typecheck`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- Smoke HTTP local: `GET http://localhost:3002/financeiro/assinaturas` retornou `200`.
- Smoke HTTP local: `GET http://localhost:3002/financeiro/cobrancas` retornou `200`.
- Scan estático: `rg -n "ID cobrança|ID assinatura|ID Mercado Pago|gateway_subscription_id|external_id" "admin/src/app/(admin)/financeiro/assinaturas/client.tsx" "admin/src/app/(admin)/financeiro/cobrancas/client.tsx"` não retornou ocorrências.

## Ajuste pós-feedback 2026-08-04 - IDs financeiros internos numéricos

- Pedido do usuário: fazer o ID interno exibido no Financeiro ser um número.
- Decisão arquitetural: não trocar as chaves primárias string (`id`) de `professional_subscription` e `payment_event`, porque elas já são referenciadas por relações, payloads de gateway, histórico e integrações. Em vez disso, foram adicionados identificadores internos numéricos, reais e persistidos: `internal_id Int @unique @default(autoincrement())` em `professional_subscription` e `payment_event`.
- A migration `20260804150500_add_finance_numeric_internal_ids` adiciona `internal_id` numérico e único em `professional_subscriptions` e `payment_events`, com valores gerados por sequência para linhas existentes e futuras.
- O contrato financeiro Admin passou a retornar `internal_id` para assinaturas, cobranças e itens do histórico de pagamento, mantendo os IDs string técnicos no contrato para compatibilidade interna.
- `/financeiro/assinaturas` agora exibe somente o `internal_id` numérico da assinatura na coluna/card **ID**.
- O histórico de pagamentos em `/financeiro/assinaturas` agora exibe somente o `internal_id` numérico da cobrança na linha **ID**.
- `/financeiro/cobrancas` agora exibe somente o `internal_id` numérico da cobrança na coluna **ID** e o `internal_id` numérico da assinatura na coluna **Assinatura**.
- A busca por ID em `/financeiro/assinaturas` também aceita o `internal_id` numérico real; a busca em `/financeiro/cobrancas` passa a considerar o `internal_id` da cobrança e da assinatura após o mapeamento seguro.
- Eventos confirmados sem assinatura vinculada continuam sem ID artificial de assinatura e exibem **ID: —** na área de assinatura.
- Não houve package novo, mock, seed ou endpoint simulado.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; as referências auditáveis foram `_product/proto/admin/Financeiro.png`, `_product/tasks/PROTO-INVENTORY.md` e as capturas autenticadas enviadas pelo usuário em 2026-08-04.
- ADR atualizado: `adrs/0242-admin-financeiro-receita-mrr-exportacao.md`.

### Critérios de aceite do ajuste

- [x] `professional_subscription` possui ID interno numérico real e único em `internal_id`.
- [x] `payment_event` possui ID interno numérico real e único em `internal_id`.
- [x] IDs string existentes permanecem como chaves técnicas para compatibilidade e não são exibidos como ID operacional nas listas solicitadas.
- [x] `/financeiro/assinaturas` exibe número na coluna/card **ID** da assinatura.
- [x] O histórico de pagamentos exibe número na linha **ID** de cada cobrança.
- [x] `/financeiro/cobrancas` exibe número na coluna **ID** da cobrança.
- [x] `/financeiro/cobrancas` exibe número como **ID** da assinatura vinculada.
- [x] Eventos sem assinatura vinculada não recebem ID numérico artificial de assinatura.
- [x] `pnpm --dir backend db:migrate` foi executado nesta task para aplicar a migration.
- [x] UI mobile-first preservada e nenhum `<img>` cru foi usado.
- [x] Nenhum package, mock, seed ou endpoint simulado foi adicionado.

### Validação complementar executada

- `pnpm --dir backend db:migrate --name add_finance_numeric_internal_ids` foi tentado após alterar o schema e falhou por limitação não interativa do Prisma com aviso de unique constraint; a migration foi então criada de forma explícita e validada sem reset/destruição.
- `pnpm --dir backend db:migrate` foi executado novamente e retornou banco/schema em sincronia com a migration `20260804150500_add_finance_numeric_internal_ids`.
- `pnpm --dir backend exec prisma migrate status` confirmou **Database schema is up to date**.
- `pnpm --dir backend exec prisma format`.
- `pnpm --dir backend exec biome check --write prisma/schema.prisma prisma/migrations/20260804150500_add_finance_numeric_internal_ids/migration.sql src/interfaces/objects/index.ts src/modules/api/admin/private/finance/dashboard/DTOs/IAdminFinanceDashboardDTO.ts src/modules/api/admin/private/finance/dashboard/repositories/AdminFinanceDashboardRepository.ts src/modules/api/admin/private/finance/dashboard/use-cases/services.ts`.
- `pnpm --dir admin exec biome check --write src/api/req/finance/index.ts "src/app/(admin)/financeiro/assinaturas/client.tsx" "src/app/(admin)/financeiro/cobrancas/client.tsx"`.
- `pnpm --dir backend check`.
- `pnpm --dir admin check`.
- `pnpm --dir backend build`.
- `pnpm --dir admin build`.
- `pnpm check`.
- Smoke de service real: `listAdminFinanceSubscriptions({ period: "all", limit: 2 })` retornou `status=200`, `count=6` e `internal_id` numérico nas assinaturas.
- Smoke de service real: `listAdminFinanceCharges({ period: "all", limit: 2 })` retornou `status=200`, `count=8`, `internal_id` numérico nas cobranças e `subscription.internal_id` numérico quando havia vínculo.
- Smoke HTTP local: `GET http://localhost:3002/financeiro/assinaturas` retornou `200`.
- Smoke HTTP local: `GET http://localhost:3002/financeiro/cobrancas` retornou `200`.

## Ajuste pós-feedback 2026-08-04 - IDs financeiros sem prefixo visual

- Pedido do usuário: remover o prefixo visual **ID:** das colunas **ID** em `/financeiro/assinaturas` e `/financeiro/cobrancas`, manter somente o número na coluna **Assinatura** de cobranças e usar a mesma fonte textual das demais colunas.
- As colunas **ID** das relações completas de assinaturas e cobranças agora renderizam apenas o `internal_id` numérico, sem prefixo visível **ID:**, sem `<code>` e sem fonte monoespaçada.
- A coluna **Assinatura** em `/financeiro/cobrancas` agora renderiza somente o `internal_id` numérico da assinatura vinculada; eventos sem vínculo real continuam exibindo `—`, sem ID artificial.
- Os cards mobile das mesmas listas seguem a mesma apresentação mobile-first: número puro para IDs e fonte textual padrão.
- A alteração é somente de UI e reutiliza dados reais já retornados pelo contrato financeiro; não houve backend, endpoint, cálculo financeiro, CSV, schema Prisma, migration, package, mock, seed ou dado artificial novo.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; as referências auditáveis foram `_product/proto/admin/Financeiro.png`, `_product/tasks/PROTO-INVENTORY.md` e as capturas autenticadas enviadas pelo usuário em 2026-08-04.
- ADR não criado/alterado: não houve nova decisão arquitetural, integração, regra de domínio ou trade-off persistente além do refinamento visual solicitado.

### Critérios de aceite do ajuste

- [x] `/financeiro/assinaturas` exibe somente o número na coluna/card **ID**, sem prefixo visual **ID:**.
- [x] `/financeiro/cobrancas` exibe somente o número na coluna/card **ID**, sem prefixo visual **ID:**.
- [x] A coluna/card **Assinatura** em `/financeiro/cobrancas` exibe somente o número do ID interno da assinatura vinculada.
- [x] Eventos de cobrança sem assinatura vinculada continuam sem identificador artificial de assinatura e exibem `—`.
- [x] IDs financeiros usam a fonte textual padrão das demais colunas, sem `<code>` e sem `font-mono`.
- [x] UI mobile-first preservada e nenhum `<img>` cru foi usado.
- [x] Nenhum backend, endpoint, schema Prisma, migration, package, mock, seed ou dado artificial foi adicionado.

### Validação complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/financeiro/assinaturas/client.tsx" "src/app/(admin)/financeiro/cobrancas/client.tsx"`.
- `pnpm --dir admin exec biome check "src/app/(admin)/financeiro/assinaturas/client.tsx" "src/app/(admin)/financeiro/cobrancas/client.tsx"`.
- `pnpm --dir admin exec eslint "src/app/(admin)/financeiro/assinaturas/client.tsx" "src/app/(admin)/financeiro/cobrancas/client.tsx"`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- Scan estático: `ID:`, `font-mono`, `<code>`, `formatChargeSubscriptionPlanState`, `subscription?.plan.name` e `Não identificado` não aparecem nos arquivos financeiros alterados.
- Smoke HTTP local: `GET http://localhost:3002/financeiro/assinaturas` retornou `200`.
- Smoke HTTP local: `GET http://localhost:3002/financeiro/cobrancas` retornou `200`.
- Chrome headless local abriu `/financeiro/cobrancas`; sem sessão Admin no perfil temporário, a validação visual autenticada ficou limitada às capturas enviadas pelo usuário, ao build e à inspeção estática da UI.
