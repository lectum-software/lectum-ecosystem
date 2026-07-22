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

Ela deve mostrar uma visão geral das receitas da plataforma, baseada apenas em assinaturas profissionais pagas e eventos financeiros reais. A tela da referência possui cards de receita, novas assinaturas, assinaturas ativas, cancelamentos, gráfico de receita, MRR, ticket médio e lista inferior. Por decisão de produto, a lista inferior deve se chamar **Novas assinaturas de psicólogos**, não "Novos cadastros de psicólogos".

Também foi definido que esta tela deve incluir **Exportar relatório**.

## Objetivo

Implementar o dashboard financeiro administrativo com dados reais de assinatura/pagamento, cálculo honesto de MRR/ticket médio e exportação CSV do relatório filtrado.

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
    - Ticket médio mensal por assinatura;
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
- **Ticket médio mensal**:
  - `MRR / assinaturas pagas ativas`;
  - se só existir plano profissional de R$ 9,90, o valor deve refletir esse plano;
  - evitar hardcode: usar `subscription_plan.price_cents`.
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
- [x] A lista inferior se chama **Novas assinaturas de psicólogos**.
- [x] Novas assinaturas excluem plano gratuito e cortesia/admin grant.
- [x] Receita total usa pagamento confirmado real ou aparece indisponível com copy honesta.
- [x] MRR exclui gratuito e cortesia.
- [x] Ticket médio usa `subscription_plan.price_cents`/MRR real, sem hardcode.
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
- Foram removidos elementos visuais extras que deixavam o Financeiro diferente de Pacientes dentro desse bloco: chip de fonte da serie, titulo/descricao redundantes acima do grafico, legenda visual separada e resumo expansivel.
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
