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
