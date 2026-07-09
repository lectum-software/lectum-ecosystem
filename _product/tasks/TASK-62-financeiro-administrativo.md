# TASK-62: Financeiro administrativo

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-62 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin / Financeiro |
| Status | Pending |
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

- [ ] Rota Financeiro só abre para admin autenticado.
- [ ] `_product/proto/admin/Financeiro.png` foi citada como referência visual.
- [ ] A lista inferior se chama **Novas assinaturas de psicólogos**.
- [ ] Novas assinaturas excluem plano gratuito e cortesia/admin grant.
- [ ] Receita total usa pagamento confirmado real ou aparece indisponível com copy honesta.
- [ ] MRR exclui gratuito e cortesia.
- [ ] Ticket médio usa `subscription_plan.price_cents`/MRR real, sem hardcode.
- [ ] Cancelamentos só aparecem como número real se houver fonte confiável.
- [ ] Nenhum dado financeiro é simulado.
- [ ] Nenhuma referência a Stripe foi criada.
- [ ] Exportar relatório gera CSV real com os filtros atuais.
- [ ] CSV não contém token, PAN, CVV ou dado sensível de cartão.
- [ ] UI mobile-first validada.
- [ ] Nenhum `<img>` cru foi usado.
- [ ] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [ ] Checks/builds relevantes executados sem erros.
- [ ] ADR criado/atualizado se houver decisão sobre métrica financeira, cancelamento, MRR ou exportação.
- [ ] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local com admin real e assinaturas reais.
- Teste manual do download CSV e conferência de conteúdo.
