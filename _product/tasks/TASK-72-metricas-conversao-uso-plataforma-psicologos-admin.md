# TASK-72: Métricas de conversão e uso da plataforma por psicólogos no Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-72 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin / Psicólogos / Conversão e Analytics |
| Status | Completed |
| Dependências | TASK-09, TASK-31, TASK-32, TASK-33, TASK-45, TASK-46, TASK-47, TASK-49, TASK-53, TASK-55, TASK-56, TASK-57, TASK-62 |
| ADR alvo | ADR sobre métricas administrativas de conversão até assinatura paga e analytics first-party de uso da plataforma por psicólogos |

## Contexto

O Admin já possui dashboard de psicólogos, lista administrativa e detalhe individual com abas como **Geral**, **Perfil e cadastro**, **Plano e pagamentos**, **Estatísticas**, **Publicações**, **Avaliações**, **Atividades**, **Denúncias** e **Conta**. O dashboard atual mostra contadores, evolução e estatísticas agregadas, mas ainda não responde duas perguntas operacionais importantes:

- quanto tempo os psicólogos levam entre o cadastro e a primeira assinatura paga;
- como os psicólogos usam a plataforma Lectum depois de cadastrados.

Decisões de produto desta task:

- Monitorar conversão de psicólogos a partir do cadastro até a **primeira assinatura paga confirmada**.
- Exibir média, mediana, P75 e P90 do prazo até a primeira assinatura paga no dashboard de psicólogos.
- Exibir distribuição por faixas: mesmo dia, 1-3 dias, 4-7 dias, 8-30 dias, mais de 30 dias e ainda não assinou.
- Exibir percentual por modo de cadastro no dashboard: **Google** e **E-mail e senha**.
- Não existe categoria **Google + senha local**; o produto deve tratar cadastro como uma via ou outra.
- Cruzar conversão até assinatura por modo de cadastro quando houver dados reais suficientes.
- Adicionar no dashboard de psicólogos um bloco agregado de **Uso da plataforma**.
- Adicionar no detalhe individual do psicólogo, no bloco de plano/assinatura atual, uma linha com **Tempo até assinatura**.
- Adicionar na aba **Estatísticas** do detalhe individual do psicólogo um bloco de **Uso da plataforma**.
- As métricas de uso devem medir somente navegação e uso da plataforma Lectum pelo psicólogo.
- A Lectum não intermedia sessões clínicas, consultas ou mensagens entre paciente e psicólogo. Nada nesta task deve criar ou inferir métricas de consulta, sessão clínica, conversa, mensagem, atendimento ou dados trocados por WhatsApp.
- Se não houver analytics histórico real suficiente, exibir estado honesto de indisponibilidade e iniciar a coleta a partir dos eventos first-party existentes/ajustados, sem mock.

## Objetivo

Permitir que um Admin autenticado acompanhe, no dashboard de psicólogos, métricas reais de conversão até assinatura paga e visão geral de uso da plataforma por psicólogos; e permitir que, no detalhe individual de cada psicólogo, o Admin veja o tempo até assinatura no bloco de plano e métricas de uso na aba **Estatísticas**.

## Pré-requisitos e bloqueios

- TASK-09 concluída: cadastro inicial real de psicólogos com `user.createdAt` e `user.provider`.
- TASK-31, TASK-32 e TASK-33 concluídas: planos, checkout e gestão de assinatura com persistência real.
- TASK-45 e TASK-46 concluídas: autenticação Admin real e app `admin/`.
- TASK-47 concluída: captura de sessão/tipo de dispositivo para analytics.
- TASK-49 concluída: tracking first-party de pageviews, origem de tráfego, sessão e duração quando disponível.
- TASK-53 concluída: dashboard administrativo de psicólogos.
- TASK-55 concluída: detalhe administrativo do psicólogo.
- TASK-56 concluída: dados administrativos de plano/pagamentos.
- TASK-57 concluída: aba **Estatísticas** do detalhe do psicólogo.
- TASK-62 concluída: financeiro administrativo com regras reais de assinatura/receita.
- Ler `ARCHITECTURE.md`, `DATA-MODEL.md`, `PACKAGES.md` e `PROTO-INVENTORY.md`.
- Usar como referência visual local:
  - `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`;
  - `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Geral.png`;
  - `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`.
- Não existe protótipo específico para os novos blocos de conversão/uso nesta data. Usar o padrão visual dos cards, gráficos e seções existentes e registrar essa limitação.
- Se Builder/Quick Copy estiver disponível, usar como complemento; se não estiver acessível no ambiente, usar as imagens locais e registrar a limitação.
- Validar o schema atual antes de criar campo/tabela nova. Preferir dados reais existentes: `user.createdAt`, `user.provider`, `professional_subscription`, `subscription_plan`, `payment_event`, `visitor_session`, `page_view_event` e demais fontes first-party já existentes.
- Se o dado de primeira assinatura paga não puder ser derivado com confiabilidade do modelo atual, parar e registrar a decisão pendente em ADR antes de criar métrica aproximada.
- Se alterar `backend/prisma/schema.prisma` ou migrations, executar obrigatoriamente `pnpm --dir backend db:migrate`.
- Não usar mocks, endpoints simulados, seed fake, valores inventados, eventos artificiais retroativos ou dados estimados sem rótulo explícito.

## Escopo frontend

### Admin — dashboard de psicólogos

Atualizar a rota administrativa de dashboard de psicólogos (`/psicologos` ou equivalente existente) para incluir novos blocos mobile-first.

#### Conversão até assinatura

Criar um bloco **Conversão até assinatura** com:

- total de psicólogos cadastrados na coorte/período;
- total que realizou primeira assinatura paga;
- taxa de conversão para assinatura paga;
- média do prazo até primeira assinatura paga;
- mediana do prazo até primeira assinatura paga;
- P75;
- P90;
- distribuição por faixas:
  - mesmo dia;
  - 1-3 dias;
  - 4-7 dias;
  - 8-30 dias;
  - mais de 30 dias;
  - ainda não assinou.

Regras de UI:

- O período do dashboard deve ser interpretado claramente como coorte de cadastro para métricas de conversão.
- A copy deve deixar explícito que plano gratuito e cortesia não contam como assinatura paga.
- Quando não houver dados suficientes, exibir `Indisponível` ou `Sem dados no período`, nunca zero falso.
- Gráficos devem ter alternativa textual acessível.
- O layout deve ser mobile-first em ~390px, com cards empilhados e gráficos legíveis.

#### Modo de cadastro

Criar um gráfico/bloco de **Modo de cadastro** com apenas duas categorias:

- Google;
- E-mail e senha.

Regras:

- Não exibir `Google + senha local`.
- Derivar Google de `user.provider="google"` ou regra equivalente real.
- Derivar E-mail e senha de `user.provider="manual"` ou regra equivalente real.
- Se houver valor legado/desconhecido, agrupar como `Indisponível` somente se existir dado real nessa condição, sem criar terceira categoria de produto.

#### Conversão por modo de cadastro

Exibir, quando houver amostra real suficiente:

- taxa de conversão paga por modo de cadastro;
- mediana até assinatura por modo de cadastro;
- média até assinatura por modo de cadastro, se útil e sem distorcer a leitura.

Se a amostra for pequena ou ausente, mostrar copy honesta.

#### Uso da plataforma — visão geral

Adicionar bloco agregado **Uso da plataforma** no dashboard de psicólogos com dados do período selecionado:

- psicólogos ativos no período;
- percentual de psicólogos ativos vs. psicólogos cadastrados/elegíveis;
- dias médios com acesso por psicólogo;
- sessões médias por psicólogo;
- tempo médio estimado de permanência, quando `duration_seconds`/sessão permitir cálculo confiável;
- páginas mais acessadas por psicólogos;
- evolução de uso por período quando compatível com o gráfico existente.

Regras de UI:

- Explicar que estas métricas representam uso da plataforma Lectum pelo psicólogo.
- Não mencionar consultas, sessões clínicas, mensagens ou WhatsApp como se fossem mediadas pela Lectum.
- Páginas mais acessadas devem usar rótulos humanos normalizados, por exemplo `Perfil`, `Publicações`, `Plano`, `Configurações`, `Comunidades`, `Analytics`, sem exibir paths crus com IDs, tokens ou query strings.
- Se a duração não for confiável, exibir `Tempo médio: Indisponível` e manter as demais métricas reais.

### Admin — detalhe do psicólogo / Geral ou Plano

No bloco de plano/assinatura atual do detalhe administrativo do psicólogo, adicionar uma linha:

- `Tempo até assinatura`.

Valores esperados:

- `Assinou no mesmo dia`, quando a primeira assinatura paga ocorreu na mesma data do cadastro;
- `N dias`, quando houver primeira assinatura paga real;
- `Ainda não assinou plano pago`, quando não houver assinatura paga;
- `Sem assinatura paga — plano gratuito`, quando o único vínculo real for gratuito;
- `Sem assinatura paga — cortesia`, quando o vínculo atual/relevante for cortesia administrativa;
- `Indisponível`, quando a data de cadastro ou ativação paga não for confiável.

Regras:

- Não repetir modo de cadastro no bloco de plano, pois o detalhe individual já informa a via de cadastro em outro lugar.
- Não recalcular o prazo quando houver troca posterior de plano; usar sempre a primeira assinatura paga confirmada.
- Cancelamento posterior não apaga a primeira conversão paga.

### Admin — detalhe do psicólogo / Estatísticas

Adicionar na aba **Estatísticas** um bloco **Uso da plataforma** para o psicólogo individual, com:

- último acesso;
- dias distintos com acesso no período;
- sessões no período;
- tempo médio estimado de permanência, quando confiável;
- páginas mais acessadas por aquele psicólogo;
- estado honesto para dados históricos indisponíveis.

Regras:

- O bloco deve ficar na aba **Estatísticas**, não em **Plano e pagamentos**.
- Deve reutilizar os filtros/períodos já existentes da aba quando fizer sentido, sem causar reload global da aba em cada refetch.
- Deve manter a distinção entre estatísticas de negócio/comunidade já existentes e uso da plataforma.
- Não exibir dados de pacientes, conteúdo digitado, mensagens, payload bruto, referrer completo, query string sensível ou qualquer segredo.

## Escopo backend

Criar ou estender endpoints Admin privados reais, protegidos por autenticação Admin.

Preferência arquitetural:

- Estender o endpoint existente do dashboard de psicólogos quando compatível:
  - `GET /api/admin/private/psychologists/dashboard`;
- Estender o endpoint de detalhe/billing existente quando compatível para o campo individual de tempo até assinatura:
  - `GET /api/admin/private/psychologists/:id` ou endpoint equivalente de detalhe;
  - `GET /api/admin/private/psychologists/:id/billing`, se o bloco de assinatura atual for alimentado por ele;
- Estender o endpoint de estatísticas existente:
  - `GET /api/admin/private/psychologists/:id/statistics`;
- Criar endpoint novo somente se a arquitetura existente exigir separação clara, registrando a decisão no ADR.

### Conversão até primeira assinatura paga

Regras de domínio:

- Data inicial: `user.createdAt` do usuário com `role="psicologo"`.
- Data final: primeira assinatura paga confirmada do psicólogo.
- Plano gratuito não conta como assinatura paga.
- Cortesia/admin grant não conta como assinatura paga.
- Assinatura paga deve ser derivada de fonte real, preferencialmente `professional_subscription` com:
  - plano pago (`subscription_plan.price_cents > 0`);
  - origem/gateway real de pagamento, como `source="mercadopago"` ou `gateway="mercadopago"`, conforme regra vigente;
  - status pago/ativo/confirmado real;
  - `deleted=false`.
- Se a confirmação de pagamento depender de `payment_event`, usar apenas eventos persistidos reais e sem expor payload bruto.
- A data da assinatura deve usar o campo real mais confiável existente. Se hoje só houver `professional_subscription.createdAt`, documentar a escolha no service/ADR. Se isso for insuficiente para histórico confiável, registrar bloqueio/decisão antes de criar aproximação.
- Considerar apenas a primeira assinatura paga do psicólogo; upgrades, renovações e reativações posteriores não alteram o prazo.
- Cancelamento posterior não remove a conversão histórica.

### Estatísticas agregadas

O backend deve retornar dados seguros equivalentes a:

- `conversion`:
  - `cohort_from`;
  - `cohort_to`;
  - `registered_count`;
  - `converted_paid_count`;
  - `conversion_rate`;
  - `average_days`;
  - `median_days`;
  - `p75_days`;
  - `p90_days`;
  - `buckets`;
  - `unavailable_reason?`;
- `signup_method`:
  - contagem e percentual para `google`;
  - contagem e percentual para `email_password`;
  - `unknown_count` apenas quando houver dados legados reais;
- `conversion_by_signup_method`:
  - conversão e prazos por `google`;
  - conversão e prazos por `email_password`;
  - estados honestos para amostra insuficiente;
- `platform_usage`:
  - `active_psychologists_count`;
  - `active_psychologists_rate`;
  - `average_access_days`;
  - `average_sessions`;
  - `average_duration_seconds?`;
  - `top_pages`;
  - `series?`;
  - `unavailable_reason?`.

### Estatísticas individuais

O backend deve retornar dados seguros equivalentes a:

- `time_to_first_paid_subscription` no contrato de detalhe/billing:
  - `status`: `converted`, `not_converted`, `free_only`, `courtesy_only`, `unavailable`;
  - `days`;
  - `label`;
  - `registered_at`;
  - `first_paid_subscription_at?`;
- `platform_usage` no contrato individual de estatísticas:
  - `last_access_at`;
  - `access_days_count`;
  - `sessions_count`;
  - `average_duration_seconds?`;
  - `top_pages`;
  - `period_from`;
  - `period_to`;
  - `unavailable_reason?`.

### Uso da plataforma

Regras de domínio:

- Usar somente eventos first-party reais, principalmente `page_view_event` e `visitor_session`.
- Considerar apenas usuários autenticados com `role="psicologo"` para uso agregado de psicólogos.
- Não contar navegação do Admin como uso do psicólogo.
- Não contar pageviews anônimos como uso individual de psicólogo.
- Dias de acesso devem ser derivados de datas distintas de eventos reais no fuso definido pela aplicação.
- Sessões devem ser derivadas de `session_id`/`visitor_session` real.
- Tempo médio de permanência deve ser calculado apenas quando `duration_seconds` ou duração de sessão for confiável. Se houver muitas durações nulas, retornar indisponibilidade honesta para essa métrica.
- Páginas mais acessadas devem ser normalizadas por `page_kind`, `normalized_path` ou helper de rotas seguro, nunca por path bruto com identificadores sensíveis.
- Não registrar nem retornar conteúdo de mensagens, campos digitados, payloads de formulário, query strings sensíveis, token, JWT, recovery code, confirm code, IP bruto ou user-agent bruto.

### Percentis

Regras de cálculo:

- Média: soma dos dias até assinatura paga dividida pelo número de psicólogos convertidos.
- Mediana: percentil 50 dos convertidos.
- P75: prazo em que 75% dos convertidos assinaram até aquele valor.
- P90: prazo em que 90% dos convertidos assinaram até aquele valor.
- Percentis devem considerar apenas psicólogos que converteram para assinatura paga.
- A faixa `Ainda não assinou` entra na distribuição de coorte, mas não entra no cálculo de média/mediana/P75/P90.

## Fora do escopo

- Contas de pacientes.
- Contas de administradores.
- Métricas de consultas clínicas.
- Métricas de sessões terapêuticas.
- Métricas de mensagens trocadas.
- Ler, inferir ou armazenar conteúdo de conversas via WhatsApp.
- Intermediar atendimento entre paciente e psicólogo.
- Criar categoria `Google + senha local`.
- Criar tracking de terceiros como Google Analytics, Meta Pixel, Mixpanel, PostHog ou similares.
- Criar evento fake para dados históricos.
- Estimar assinatura paga sem fonte real.
- Contar plano gratuito ou cortesia como assinatura paga.
- Expor payload bruto de `payment_event`.
- Expor paths crus com dados sensíveis.
- Instalar pacote novo sem validar `PACKAGES.md` e registrar ADR.

## Contrato técnico detalhado

### Referências obrigatórias

- `ARCHITECTURE.md`: módulos backend com controller/service/repository/validator, rotas privadas, autenticação Admin, Prisma, regras de UI e formulários.
- `DATA-MODEL.md`: usuário, assinatura profissional, eventos de pagamento, pageviews, sessões e analytics existentes.
- `PACKAGES.md`: usar packages já instalados; não instalar dependência nova por padrão.
- `PROTO-INVENTORY.md`: referência visual ativa e fallback de imagens.
- `TASK-09`: cadastro de psicólogo e origem de autenticação.
- `TASK-31`, `TASK-32`, `TASK-33` e `TASK-62`: regras de plano, assinatura paga, cortesia e financeiro.
- `TASK-47` e `TASK-49`: sessões/pageviews first-party e privacidade de analytics.
- `TASK-53`, `TASK-56` e `TASK-57`: dashboard, bloco de assinatura e aba Estatísticas existentes.

### Backend esperado

- Reutilizar módulos existentes em `backend/src/modules/api/admin/private/psychologists/*`.
- Não criar um segundo dashboard paralelo.
- Criar repositories/services/helpers compartilháveis para:
  - cálculo de primeira assinatura paga;
  - média/mediana/percentis;
  - buckets de conversão;
  - normalização de páginas acessadas.
- Validators para período/filtros seguindo o padrão atual:
  - `period=week|month|year|all|custom`, se este for o contrato vigente;
  - `from`/`to` quando custom;
  - limite de janela compatível com o dashboard atual.
- Retornar contratos normalizados, seguros e em snake_case/camelCase conforme padrão real do módulo.
- Traduções PT-BR em `backend/locales/pt/translation.json` para erros/mensagens user-facing.
- Sanitização explícita de campos sensíveis em respostas/logs.
- Se houver alteração em schema/migration, executar `pnpm --dir backend db:migrate`.

### Frontend esperado

- Atualizar `admin/src/app/(admin)/psicologos/client.tsx` ou composição equivalente do dashboard sem criar rota paralela.
- Atualizar `admin/src/app/(admin)/psicologos/[id]/client.tsx` ou componentes equivalentes do detalhe.
- Adicionar/ajustar types em `admin/src/api/req/psychologists` ou módulo equivalente.
- Adicionar/ajustar hooks em `admin/src/api/callers/psychologists`.
- Adicionar/ajustar query keys, por exemplo:
  - `dashboard(period)`;
  - `detail(id)`;
  - `billing(id)`;
  - `statistics(id, period, ...)`.
- Invalidar caches apenas quando houver mutação real; esta task é majoritariamente leitura.
- Gráficos simples com alternativa textual acessível.
- UI mobile-first:
  - base ~390px;
  - cards empilhados no mobile;
  - gráficos responsivos;
  - desktop com layout em colunas sem prejudicar leitura.
- Tema claro/escuro via tokens existentes; sem cores hardcoded fora do padrão.
- Nenhum `<img>` cru.

### Packages

- Não instalar pacote novo por padrão.
- Se for necessário usar biblioteca de gráficos já instalada, validar em `PACKAGES.md`.
- Se não houver biblioteca adequada, preferir componentes SVG/HTML simples já usados no Admin.
- Qualquer dependência nova exige validação de `PACKAGES.md` e ADR.

### Segurança e privacidade

- Métricas devem ser agregadas e minimizadas.
- Não expor IP bruto, user-agent bruto, query string sensível, token, JWT, payment payload, dados de paciente ou conteúdo privado.
- Não transformar analytics de navegação em vigilância de conteúdo.
- Dados individuais de uso são restritos ao Admin autenticado e ao detalhe do psicólogo selecionado.
- Se houver dúvida LGPD sobre retenção/duração, registrar no ADR e limitar a exibição ao que já é persistido de forma segura.

## Critérios de aceite

- [x] Dashboard de psicólogos possui bloco **Conversão até assinatura** com coorte, taxa de conversão paga, média, mediana, P75, P90 e buckets.
- [x] Média/mediana/P75/P90 consideram somente psicólogos convertidos para assinatura paga.
- [x] Distribuição inclui `Ainda não assinou` sem contaminar percentis.
- [x] Plano gratuito e cortesia não contam como assinatura paga.
- [x] Dashboard possui gráfico/bloco de modo de cadastro com apenas **Google** e **E-mail e senha**.
- [x] Não há categoria `Google + senha local`.
- [x] Dashboard mostra conversão por modo de cadastro quando houver dados reais suficientes.
- [x] Dashboard possui bloco agregado **Uso da plataforma** com psicólogos ativos, dias de acesso, sessões, tempo médio quando confiável e páginas mais acessadas.
- [x] Métricas de uso contam somente uso real da plataforma por usuários `role="psicologo"` autenticados.
- [x] Métricas de uso não incluem consultas, sessões clínicas, mensagens, WhatsApp ou conteúdo de pacientes.
- [x] Detalhe do psicólogo mostra `Tempo até assinatura` no bloco de plano/assinatura atual.
- [x] `Tempo até assinatura` usa a primeira assinatura paga real e não muda por upgrade, renovação ou cancelamento posterior.
- [x] Aba **Estatísticas** do detalhe do psicólogo possui bloco individual **Uso da plataforma**.
- [x] Páginas mais acessadas usam rótulos normalizados e não expõem paths crus sensíveis.
- [x] Estados sem dados históricos aparecem como `Indisponível`/copy honesta, sem mock ou zero falso.
- [x] Endpoints Admin privados exigem autenticação Admin real.
- [x] Respostas não expõem payload de pagamento, token, JWT, IP bruto, user-agent bruto, query string sensível ou segredo.
- [x] Se houve alteração de Prisma/migrations, `pnpm --dir backend db:migrate` foi executado sem reset destrutivo não autorizado.
- [x] Traduções PT-BR foram criadas/atualizadas para mensagens e erros necessários.
- [x] UI mobile-first validada em ~390px e desktop.
- [x] Nenhum `<img>` cru foi usado.
- [x] Nenhum mock, dado fake permanente, endpoint simulado ou evento artificial retroativo foi usado.
- [x] Builder/Quick Copy foi usado quando disponível, ou as imagens locais/protótipo inexistente dos novos blocos foram registrados na execução/ADR.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir frontend check`, se houver alteração no tracking first-party do frontend público.
- `pnpm --dir frontend build`, se houver alteração no tracking first-party do frontend público.
- `pnpm check`
- `pnpm --dir backend db:migrate` se houver alteração em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`.
- Browser local:
  - Admin `/psicologos` em ~390px e desktop com os novos blocos;
  - período com coorte real e período sem dados para validar estados honestos;
  - dashboard com psicólogos Google e e-mail/senha quando houver dados reais;
  - Admin `/psicologos/[id]` validando linha `Tempo até assinatura`;
  - Admin `/psicologos/[id]?tab=estatisticas` validando bloco **Uso da plataforma**;
  - validar que páginas mais acessadas não exibem IDs sensíveis, query strings, tokens ou payloads.

## Notas de execução

- Antes de implementar, procurar usos existentes de `professional_subscription`, `subscription_plan`, `payment_event`, `page_view_event`, `visitor_session`, `duration_seconds`, `user.provider`, `user.createdAt`, dashboard de psicólogos, billing do detalhe e estatísticas do detalhe.
- O dashboard deve deixar claro que conversão é calculada por coorte de cadastro, enquanto uso da plataforma é calculado por eventos no período selecionado.
- Se a assinatura paga histórica não tiver data confiável além de `professional_subscription.createdAt`, documentar a escolha e suas limitações no ADR.
- Se o tracking de duração ainda não for confiável, não inventar tempo médio de permanência; exibir indisponível e, se necessário, ajustar coleta first-party real.
- O dado de uso da plataforma só deve começar a partir dos eventos reais existentes; não criar backfill artificial.
- A Lectum não intermedia a relação clínica. Não criar nenhuma métrica que sugira volume de atendimentos, mensagens ou sessões terapêuticas.
- Se `prisma migrate dev` falhar por conflito com dados/estado do banco de desenvolvimento, perguntar ao usuário antes de resetar o banco ou rodar qualquer comando destrutivo.


## Execução TASK-72

- Implementados cálculos compartilhados para primeira assinatura paga, média, mediana, P75, P90, buckets de conversão, modo de cadastro e normalização segura de páginas em `backend/src/utils/admin-psychologist-analytics.ts`.
- O dashboard de psicólogos passa a retornar e exibir **Conversão até assinatura**, **Modo de cadastro**, **Conversão por modo de cadastro** e **Uso da plataforma** usando dados reais de `user.createdAt`, `user.provider`, `professional_subscription`, `subscription_plan` e `page_view_event`.
- O detalhe administrativo do psicólogo passa a exibir `Tempo até assinatura` no card **Dados da assinatura**, sempre com base na primeira assinatura paga real e sem contar plano gratuito ou cortesia.
- A aba **Estatísticas** do detalhe recebeu o bloco individual **Uso da plataforma**, com último acesso no período, dias distintos de acesso, sessões, tempo médio quando confiável e páginas normalizadas.
- Métricas de uso contam apenas `page_view_event` autenticado de usuários `role="psicologo"`; não foram criadas métricas de consultas, sessões clínicas, mensagens, WhatsApp ou conteúdo de pacientes.
- A data de primeira assinatura paga usa `professional_subscription.createdAt`, documentado no ADR como melhor data disponível no modelo atual. Status `ativa` e `cancelada` contam como conversão histórica; cancelamento posterior não remove a conversão.
- Tempo médio de permanência só é exibido quando pelo menos 50% dos pageviews autenticados possuem `duration_seconds` positivo; caso contrário, a resposta/UI exibem indisponibilidade honesta.
- Não foram necessárias novas traduções PT-BR de erro/mensagem, pois os endpoints estendidos reaproveitam validações/filtros existentes e os novos estados user-facing são dados de contrato exibidos pelo Admin.
- Builder/Quick Copy não estava disponível no ambiente; foram usadas as imagens locais indicadas em `_product/proto/admin/Psicólogos`. Não havia protótipo específico para os novos blocos.
- Não houve alteração em Prisma schema ou migrations; `pnpm --dir backend db:migrate` não foi necessário.
- ADR criado: `adrs/0266-metricas-conversao-uso-psicologos-admin.md`.

### Validação executada

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check` (inclui `pnpm --dir frontend check` e `pnpm --dir backend check`)
- Smoke HTTP local sem sessão Admin:
  - `GET /api/admin/private/psychologists/dashboard?period=week` retornou 401, confirmando proteção Admin real;
  - `GET /api/admin/private/psychologists/test-id/statistics?period=week` retornou 401, confirmando proteção Admin real.
- Smoke HTTP local no Admin:
  - `GET http://localhost:3002/psicologos` retornou 200;
  - `GET http://localhost:3002/psicologos/test-id` retornou 200;
  - `GET http://localhost:3002/psicologos/test-id?tab=estatisticas` retornou 200.
- Verificação estática: ausência de `<img>` cru e ausência da categoria `Google + senha local` nos arquivos alterados do Admin.
- Validação autenticada com dados reais depende de sessão Admin e base local com psicólogos/assinaturas/pageviews reais; sem sessão, a guarda Admin foi validada sem mock.

## Ajuste complementar 2026-07-14 - Tempo até assinatura na aba Assinatura

- Pedido do usuário: dentro de detalhes do psicólogo, na aba **Assinatura**, o bloco **Plano atual** também deve exibir a linha `Tempo até assinatura`.
- A UI Admin passou a reutilizar o campo real `detail.general.subscription.time_to_first_paid_subscription.label`, já calculado pela TASK-72, no card `Plano atual` da aba `?tab=plano`.
- A linha foi posicionada entre `Inicio` e `Próxima renovação`/`Fim`, mantendo a leitura mobile-first do bloco e sem alterar endpoint, schema Prisma, migrations, packages ou regra de domínio.
- Builder/Quick Copy não está exposto como ferramenta no ambiente; a referência visual usada foi o PNG local `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Plano e pagamentos.png` e a captura enviada pelo usuário.

## Ajuste complementar 2026-07-14 - Estados inativos dos cards de gráfico

- Pedido do usuário: na **Visão geral** do dashboard de psicólogos e nos cards selecionáveis dos gráficos da aba **Estatísticas**, o estado desmarcado precisava ficar visualmente inativo.
- A UI Admin passou a aplicar fundo cinza via tokens (`bg-border/50`) e remover sombra dos cards desmarcados, mantendo os cards selecionados com fundo de superfície, sombra e anel primário.
- O ajuste é exclusivamente visual, mobile-first e reutiliza os componentes existentes `MetricCard` e `StatisticsMetricToggleCard`; não altera endpoints, schema Prisma, migrations, packages, dados ou regras de domínio.
- Builder/Quick Copy não está exposto como ferramenta no ambiente; a referência visual usada foi a captura enviada pelo usuário e os padrões locais em `_product/proto/admin/Psicólogos`.

## Ajuste complementar 2026-07-14 - Origem do tráfego na aba Estatísticas

- Pedido do usuário: replicar, no painel Admin em `/psicologos/[id]?tab=estatisticas`, a tabela **Origem do tráfego** existente nos analytics do psicólogo do site público.
- A aba **Estatísticas** passou a exibir o bloco entre **Análises do vídeo de apresentação** e **Uso da plataforma**, mantendo layout mobile-first e colunas `Fonte`, `Visualizações de perfil`, `WhatsApp` e `Conversão`.
- A origem usa somente eventos reais `page_view_event` do perfil público (`target_type="psychologist"` e `page_kind="psychologist_profile"`), agrupados por `traffic_source`.
- Como `contact_request` ainda não persiste origem/sessão para atribuir WhatsApp por canal, os campos `WhatsApp` e `Conversão` ficam indisponíveis por origem com copy honesta; não foram criados mocks, zeros falsos ou inferências não rastreáveis.
- Não houve alteração em Prisma schema, migrations ou packages.

## Ajuste complementar 2026-07-14 - Remoção da faixa sem assinatura paga

- Pedido do usuário: remover do dashboard Admin de psicólogos a faixa `Nenhum psicólogo da coorte realizou assinatura paga real.` exibida no bloco **Conversão do cadastro até assinatura**.
- A UI Admin deixou de renderizar `conversion.unavailable_reason` nesse card, mantendo os KPIs e buckets com seus estados `Indisponível`/0 reais e preservando o contrato backend para usos futuros.
- O ajuste é exclusivamente visual, mobile-first, sem mocks, sem endpoint novo, sem alteração de Prisma/migrations e sem mudança nas regras de cálculo da TASK-72.

## Ajuste complementar 2026-07-14 - Origem do tráfego sem coluna de conversão

- Pedido do usuário: ocultar a coluna **Conversão** na tabela **Origem do tráfego**.
- A coluna foi ocultada tanto no analytics público do psicólogo quanto na aba **Estatísticas** do painel Admin, mantendo `Fonte`, `Visualizações de perfil` e `WhatsApp` como métricas independentes.
- Decisão de produto: o clique no WhatsApp pode ocorrer sem visualização do perfil, por exemplo em vídeo da página de psicólogos, publicações da comunidade, favoritos ou link direto; portanto `WhatsApp / visualizações de perfil` não é um denominador confiável e poderia ultrapassar 100%.
- O ajuste é visual/semântico, mobile-first, sem mocks, sem endpoint novo, sem alteração de Prisma/migrations e sem mudança nos dados persistidos.

## Ajuste complementar 2026-07-14 - Origem do tráfego agregada no dashboard

- Pedido do usuário: inserir, no dashboard Admin de psicólogos, logo após o gráfico de **Visão geral**, uma tabela **Origem do tráfego** agregada para todos os psicólogos da plataforma.
- O backend passa a retornar `traffic_sources` no endpoint `GET /api/admin/private/psychologists/dashboard`, somando `page_view_event` reais de perfis públicos (`page_kind="psychologist_profile"`, `target_type="psychologist"`) dos psicólogos da base no período selecionado.
- A UI Admin renderiza a mesma taxonomia do analytics público do psicólogo: `Explorar`, `Busca e filtros`, `Comunidades`, `Link direto` e `Favoritos`, com colunas `Fonte`, `Visualizações de perfil` e `WhatsApp`, sem coluna de conversão.
- `WhatsApp` por origem permanece `—` enquanto `contact_request` não persistir origem/sessão do CTA; não houve inferência artificial nem mock.
- Não houve alteração em Prisma schema, migrations ou packages.
- Validação executada: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build` e `pnpm check`.

## Ajuste complementar 2026-07-14 - Ordem dos blocos no dashboard de psicólogos

- Pedido do usuário: ajustar a ordem do dashboard Admin de psicólogos para exibir primeiro o gráfico de **Visão geral**, depois a tabela **Origem do tráfego**, depois o **Comparativo oferta e demanda** e, por fim, os demais gráficos/blocos.
- A UI Admin foi reordenada sem alterar endpoints, contratos, cálculos, schema Prisma, migrations, packages ou dados persistidos.
- O ajuste é exclusivamente visual e preserva a leitura mobile-first dos blocos existentes.
- Validação executada: `pnpm --dir admin check` e `pnpm --dir admin build`.

## Ajuste complementar 2026-07-14 - Instalação PWA no uso da plataforma

- Pedido do usuário: no dashboard Admin de psicólogos, junto aos gráficos/blocos de **Uso da plataforma**, exibir o percentual de psicólogos que instalaram o PWA.
- O backend passa a somar eventos reais `important_action_event` com `action_type="pwa_installed"` no período selecionado, somente para usuários autenticados `role="psicologo"`, e calcula o percentual sobre os psicólogos elegíveis do dashboard.
- A UI Admin adiciona o KPI `PWA instalado` dentro do card **Uso da plataforma**, preservando a leitura mobile-first e sem criar gráfico, endpoint paralelo ou dados de exemplo.
- A métrica mede instalação registrada por evento first-party no período; não representa estado atual instalado nem desinstalação.
- Não houve alteração em Prisma schema, migrations ou packages.
- Validação executada: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, validação do snapshot staged do Admin e `pnpm check`.

## Ajuste complementar 2026-07-14 - PWA instalado no uso individual

- Pedido do usuário: dentro do detalhe administrativo do psicólogo, na aba **Estatísticas**, o bloco **Uso da plataforma** deve informar se o psicólogo instalou o PWA.
- O backend de `GET /api/admin/private/psychologists/:id/statistics` passa a consultar o primeiro evento real `important_action_event` com `action_type="pwa_installed"` do psicólogo, independentemente do período selecionado, por se tratar de uma adoção registrada e não de navegação recorrente.
- A UI Admin adiciona o KPI `PWA instalado` ao bloco **Uso da plataforma**, exibindo `Sim` quando há instalação registrada e `Não registrado` quando não há evento first-party persistido.
- A métrica não representa estado atual instalado nem desinstalação; ela indica somente existência de evento real registrado, sem mock, backfill ou inferência.
- Não houve alteração em Prisma schema, migrations ou packages.
- Validação executada: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build` e validação do snapshot staged do Admin.
- Validação adicional executada: `pnpm check`.

## Ajuste complementar 2026-07-14 - Espaçamento da coluna Rank na lista

- Pedido do usuário: adicionar uma pequena margem à esquerda da coluna de ranking na lista administrativa de psicólogos, pois os números estavam muito colados na borda.
- A tabela desktop de `/psicologos/lista` passou a usar `pl-3 pr-2` no cabeçalho e nas células da coluna `Rank`, mantendo o layout mobile-first sem alterar dados, endpoints, schema Prisma, migrations ou packages.
- O ajuste é exclusivamente visual e segue os tokens/componentes existentes do Admin.
- Não houve decisão arquitetural nova; ADR não foi necessário.
- Validação executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/psicologos/lista` retornando 200.

## Ajuste complementar 2026-07-14 - Origem do tráfego sem faixa e WhatsApp zerado

- Pedido do usuário: remover a faixa `Nenhuma visita a perfil público de psicólogo com origem de tráfego foi registrada no período.` e exibir `0` na coluna **WhatsApp** quando não houver número atribuído.
- A UI Admin deixou de renderizar `traffic_sources.unavailable_reason` nos blocos **Origem do tráfego** do dashboard agregado e do detalhe do psicólogo, mantendo a tabela mobile-first sempre visível com a taxonomia fixa de fontes.
- `whatsapp_clicks=null` continua preservado no contrato backend, mas a apresentação Admin agora formata a coluna **WhatsApp** como `0` para leitura numérica; não houve mock, inferência de origem, endpoint novo, alteração de Prisma/migrations, packages ou dados persistidos.
- ADR atualizado: `adrs/0267-origem-trafego-psicologo-admin.md`.
- Validação executada: `pnpm --dir admin check`, `pnpm --dir admin build` e `next start` local com `GET http://localhost:3002/psicologos` retornando 200.

## Ajuste complementar 2026-07-14 - Admin no orquestrador local

- Pedido do usuário: corrigir `localhost:3002/dashboard` com conexão recusada no ambiente local.
- O orquestrador raiz `pnpm dev` passou a iniciar o Admin como aplicação separada em `ADMIN_PORT` (padrão `3002`), além de backend e frontend; `DEV_ADMIN_ENABLED=0` desativa o Admin quando necessário.
- O `pnpm check` raiz passou a validar também `pnpm --dir admin check`, evitando concluir alterações administrativas sem Biome, ESLint e TypeScript do Admin.
- Não houve alteração em Prisma schema, migrations, endpoints, dados persistidos ou packages.
- ADR criado: `adrs/0268-orquestracao-local-admin-pnpm-dev.md`.
- Validação executada: `node --check scripts/dev.mjs`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/dashboard` retornando 200.

## Ajuste complementar 2026-07-14 - Responsável do registro profissional sem e-mail/id

- Pedido do usuário: no card **Situação atual** do registro profissional, o campo **Responsável** deve exibir somente `Admin Lectum`.
- A UI Admin passou a reaproveitar a sanitização já usada em **Concedida por**, removendo e-mail e identificador entre parênteses do ator manual/cortesia antes de renderizar o responsável.
- O ajuste é exclusivamente visual, mobile-first, sem endpoint novo, sem alteração de Prisma/migrations, packages, dados persistidos ou regra de domínio.
- Validação executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/psicologos/cmrqztri7000tn0uh1q4n8vxf` retornando 200.

## Ajuste complementar 2026-07-15 - Submenus de Psicólogos e Comunidades no Admin

- Pedido do usuário: no menu lateral do Admin, renomear o submenu de **Psicólogos** de `Dashboard` para `Visão geral` e transformar **Comunidades** em grupo expansível com `Visão geral` e `Lista de Comunidades`.
- O menu lateral passou a renderizar **Comunidades** com a mesma estrutura visual de submenus usada em **Psicólogos**.
- O item `Lista de Comunidades` aponta para a seção real de comunidades já exibida na visão geral (`/comunidades#lista-de-comunidades`), evitando criar rota, endpoint ou dados paralelos fora do escopo do pedido.
- O ajuste é exclusivamente visual/navegacional, mobile-first, sem mocks, sem endpoint novo, sem alteração de Prisma/migrations, packages, dados persistidos ou regra de domínio.
- Não houve decisão arquitetural nova; ADR não foi necessário.
- Builder/Quick Copy não está exposto como ferramenta no ambiente; a referência visual usada foi a captura enviada pelo usuário e o padrão local do menu Admin.
- Validação executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades`/`GET http://localhost:3002/comunidades#lista-de-comunidades` retornando 200.
- Atualizacao posterior em 2026-07-15: a lista de comunidades deixou de apontar para a ancora do dashboard e passou a usar a rota real /comunidades/lista, registrada na execucao complementar da TASK-51 e no ADR adrs/0271-lista-admin-comunidades-rota-real.md.

## Ajuste complementar 2026-07-15 - Margem nas setas dos dropdowns do detalhe

- Pedido do usuário: adicionar margem à direita nas setas de dropdown dos filtros das abas **Denúncias** e **Atividades** em `/psicologos/[id]`.
- A UI Admin passou a usar um seletor visual compartilhado com `appearance-none`, `pr-14` e `ChevronDown` posicionado em `right-5`, afastando a seta da borda sem alterar os valores, filtros, endpoints ou dados persistidos.
- O ajuste é exclusivamente visual, mobile-first, sem endpoint novo, sem alteração de Prisma/migrations, packages, dados persistidos ou regra de domínio.
- Não houve decisão arquitetural nova; ADR não foi necessário.
- Validação executada: `pnpm --dir admin check`, `pnpm --dir admin build` e smoke local `GET http://localhost:3002/psicologos/cmrqztri7000tn0uh1q4n8vxf?tab=denuncias`/`?tab=atividades` retornando 200.

## Ajuste complementar 2026-07-15 - Fechamento exclusivo dos submenus do Admin

- Pedido do usuário: no menu lateral do painel Admin, ao selecionar uma opção, fechar automaticamente o dropdown/submenu de outra opção que estivesse aberta anteriormente.
- O menu lateral passou a controlar os grupos expansíveis como accordion exclusivo: ao abrir **Comunidades**, **Psicólogos** fecha; ao abrir **Psicólogos**, **Comunidades** fecha; ao selecionar item sem submenu, nenhum submenu permanece aberto.
- A rota ativa continua abrindo o grupo correspondente por padrão, e a navegação mobile mantém o fechamento do drawer existente.
- O ajuste é exclusivamente visual/navegacional, mobile-first, sem endpoint novo, sem alteração de Prisma/migrations, packages, dados persistidos ou regra de domínio.
- Não houve decisão arquitetural nova; ADR não foi necessário.
- Builder/Quick Copy não está exposto como ferramenta no ambiente; a referência visual usada foi a captura enviada pelo usuário e o padrão local do menu Admin.
- Validação executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/lista` retornando 200.

## Ajuste complementar 2026-07-15 - Detalhe de comunidades alinhado ao detalhe de psicólogos

- Pedido do usuário: no detalhe Admin de comunidades, alinhar o menu de opções ao modelo do detalhe de psicólogos, corrigir textos corrompidos, remover linhas/blocos redundantes e simplificar a edição do avatar.
- A UI Admin de `/comunidades/[slug]` passou a usar abas sem ícones com indicador inferior arredondado, seguindo o padrão visual do detalhe de psicólogos.
- O cabeçalho removeu a ação `Editar comunidade` e passou a exibir somente `Ver comunidade`, apontando para a rota pública real `/community/[slug]`.
- A linha superior `Voltar para comunidades`/`Ver no site`, o texto `Nome, descrição, avatar e cores editáveis...` e o bloco **Informações da comunidade** foram removidos da aba **Dados**.
- A edição do avatar foi simplificada para exibir apenas o avatar acima do campo de nome, com ícone de edição sobreposto e mantendo o upload real existente.
- Textos corrompidos em `community.description` foram reparados por migration condicional, sem sobrescrever dados corretos ou edições administrativas sem sinais de encoding quebrado.
- Não houve package novo, endpoint novo, mock ou alteração de contrato de API.
- ADR criado: `adrs/0272-detalhe-admin-comunidade-identidade-textos.md`.
- `pnpm --dir backend db:migrate` foi executado; a chamada CLI excedeu o limite de 120s do executor, mas a migration foi aplicada e registrada em `_prisma_migrations`. `pnpm --dir backend exec prisma migrate status` confirmou o banco atualizado.
- Validação executada: consulta real sem descrições `�`/`??` em `community`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/ansiedade-em-equilibrio?tab=dados`/`GET http://localhost:3002/comunidades/ansiedade-em-equilibrio` retornando 200.

## Ajuste complementar 2026-07-15 - Cor unica da comunidade

- Pedido do usuario: simplificar a configuracao visual da comunidade para uma unica cor, usando a cor principal do avatar em uma versao mais suave no header publico.
- O Admin passou a exibir apenas o campo `Cor da comunidade` nas telas de criacao e edicao, com previa do header suave derivado automaticamente.
- O backend continua preservando os campos existentes de tons derivados por compatibilidade, mas agora calcula `visual_primary_dark_color`, `visual_soft_color`, `visual_text_color` e `visual_gradient_color` a partir de `visual_primary_color`; eles deixam de ser configuracoes independentes.
- A tela publica de comunidade ignora overrides antigos de tons derivados e passa a montar o header sempre com tons suaves derivados de uma unica cor principal, incluindo fallback por avatar quando nao houver cor persistida.
- Nao houve package novo, schema Prisma/migration, mock, endpoint paralelo ou alteracao em dados persistidos alem do proximo salvamento real da comunidade.
- ADR criado: `adrs/0273-cor-unica-identidade-visual-comunidades.md`.
- Validacao executada: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/ansiedade-em-equilibrio?tab=dados`/`GET http://localhost:3002/comunidades/nova`/`GET http://localhost:3000/community/ansiedade-em-equilibrio` retornando 200.

## Ajuste complementar 2026-07-15 - Regras da comunidade descritivas e arrastaveis

- Pedido do usuario: remover titulo/status/acoes de ativacao e formulario inline das regras, exibir apenas a descricao, permitir reordenacao por arrastar, criar nova regra via modal e refletir o mesmo modelo sem titulo no site publico.
- O Admin passou a exibir `N regras exibidas na comunidade.` no texto auxiliar, sem a tag de contagem, com o botao `Criar nova regra` alinhado a direita do cabecalho.
- A criacao/edicao de regra usa um unico campo de texto com React Hook Form/Zod/controllers; o `title` continua sendo gerado internamente a partir da descricao apenas para compatibilidade com o contrato real do backend.
- A ordenacao dos cards usa HTML Drag and Drop e persiste `position` pelos endpoints reais existentes; editar/remover usam botoes icon-only com rotulos acessiveis.
- O site publico de comunidade renderiza somente a descricao das regras, ordenada por `position`, sem titulo no texto visivel.
- Nao houve package novo, mock, schema Prisma/migration ou endpoint paralelo.
- Builder/Quick Copy nao esta exposto como ferramenta no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local do Admin.
- ADR criado: `adrs/0274-regras-comunidade-descritivas-arrastaveis.md`.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, `pnpm --dir backend build` e smoke local `GET http://localhost:3002/comunidades/ansiedade-em-equilibrio?tab=dados`/`GET http://localhost:3000/community/ansiedade-em-equilibrio` retornando 200.

## Ajuste complementar 2026-07-15 - Correcao do arraste das regras

- Pedido do usuario: corrigir o arraste de posicao das regras na aba **Dados** de `/comunidades/[slug]`.
- O Admin passou a manter a regra de origem do drag tambem em `useRef` e em um MIME proprio no `dataTransfer`, evitando depender apenas da atualizacao assincrona de estado do React antes de `dragenter`/`dragover` liberar o drop.
- O handler de destino agora e compartilhado por `dragenter` e `dragover`, mantendo `preventDefault` consistente para permitir soltar sobre outro card.
- O schema do formulario visual de regra foi alinhado ao modelo com um unico campo exibido (`description`); o `title` segue derivado internamente apenas no payload real por compatibilidade com o backend.
- Nao houve package novo, mock, schema Prisma/migration, endpoint paralelo ou alteracao de dados persistidos.
- Builder/Quick Copy nao esta exposto como ferramenta no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local do Admin.
- ADR atualizado: `adrs/0274-regras-comunidade-descritivas-arrastaveis.md`.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/depressao?tab=dados` retornando 200.

## Ajuste complementar 2026-07-15 - Arraste animado das regras

- Pedido do usuario: o arraste das regras continuava sem funcionar e deveria exibir animacao dos demais blocos se movendo para cima ou para baixo conforme o posicionamento do bloco arrastado.
- O Admin substituiu o HTML Drag and Drop nativo por Pointer Events no card da regra, mantendo inicio por mouse no card e por toque no icone de arraste para nao bloquear scroll mobile.
- Durante o arraste, o card ativo acompanha o ponteiro com `transform` e `z-index`, enquanto os cards intermediarios recebem `translateY` com transicao para mostrar a reorganizacao antes de soltar.
- Ao soltar, a ordem final e aplicada de forma otimista na UI e persistida pelos endpoints reais existentes de atualizacao de regra, normalizando `position` para a sequencia visual atual.
- Nao houve package novo, mock, schema Prisma/migration, endpoint paralelo ou alteracao de contrato.
- ADR atualizado: `adrs/0274-regras-comunidade-descritivas-arrastaveis.md`.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/tdah?tab=dados` retornando 200.

## Ajuste complementar 2026-07-15 - Arraste sequencial das regras

- Pedido do usuario: apos um arraste bem-sucedido, tentar arrastar outro bloco logo em seguida ainda ficava bloqueado.
- O inicio de um novo drag deixou de depender de `updateMutation.isPending`; a ordem otimista ja aplicada na UI passa a ser a fonte do proximo arraste.
- A persistencia dos drops foi serializada em uma fila local de promises, mantendo chamadas reais aos endpoints existentes sem bloquear interacoes sequenciais rapidas.
- Em caso de erro na persistencia, a ordem otimista e revertida e o erro real da API continua sendo exibido em toast.
- Nao houve package novo, mock, schema Prisma/migration, endpoint paralelo ou alteracao de contrato.
- ADR atualizado: `adrs/0274-regras-comunidade-descritivas-arrastaveis.md`.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/tdah?tab=dados` retornando 200.


## Ajuste complementar 2026-07-15 - Atribuicao first-party de WhatsApp em conteudo de comunidade

- Para atender as metricas de conteudo publicado no Admin de comunidades, os CTAs de WhatsApp em posts/respostas agora emitem `important_action_event.action_type="whatsapp_click"` com `target_type` e `target_id` explicitos.
- A decisao preserva a regra da TASK-72: `contact_request` continua sendo a fonte de contato por psicologo, mas nao e usado para atribuir click a um conteudo especifico porque nao guarda origem/post/resposta.
- Eventos historicos sem alvo continuam nao atribuidos; nao houve backfill, inferencia por URL ou mock.
- Nao ha captura de conversa, mensagem, agenda ou dado clinico: o evento registra somente o click first-party, sessao/visitante e alvo de conteudo.
- Validacao complementar: `pnpm --dir backend check`, `pnpm --dir frontend check`, `pnpm --dir admin check`, `pnpm --dir backend build`, `pnpm --dir frontend build`, `pnpm --dir admin build` e `pnpm check`.

## Ajuste complementar 2026-07-16 - Ações atribuídas ao vídeo de apresentação

- Pedido do usuário: na aba **Estatísticas** do detalhe Admin do psicólogo, dentro de **Análises do vídeo de apresentação**, adicionar as quantidades de favoritados, acessos ao perfil, cliques no WhatsApp e compartilhamentos originados no vídeo.
- O frontend público da listagem de psicólogos passou a emitir eventos first-party reais em `important_action_event` para ações do rail/área do vídeo: `psychologist_video_profile_access`, `psychologist_video_favorite`, `psychologist_video_whatsapp_click` e `psychologist_video_share`, sempre com `target_type="psychologist"` e `target_id` do psicólogo.
- O backend de `GET /api/admin/private/psychologists/:id/statistics` passou a somar esses eventos no período selecionado e adicioná-los ao contrato `video.metrics` com comparativos reais do período anterior.
- A UI Admin exibe os novos cards no bloco de vídeo, mantendo layout mobile-first e sem inferir histórico anterior ao tracking.
- Não houve package novo, mock, schema Prisma/migration, backfill artificial ou captura de conversa/mensagem do WhatsApp; os números começam a refletir somente eventos persistidos após a implantação.
- Builder/Quick Copy nao esta exposto como ferramenta no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local do Admin.
- Validacao executada: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornando 200.


## Ajuste complementar 2026-07-16 - Layout de publicacoes do psicologo por comunidade

- Pedido do usuario: na aba **Publicacoes** do detalhe administrativo do psicologo, renderizar os posts no mesmo modelo visual da lista de conteudo da comunidade.
- A lista passou a usar cards mobile-first com cabecalho de tipo/data, midia em miniatura, corpo textual, acao de visualizacao e barra inferior de metricas.
- Como todos os itens da aba pertencem ao mesmo psicologo, a identidade do autor foi substituida pela identidade da comunidade, com avatar real quando disponivel, nome e fallback por iniciais/cor da comunidade.
- O contrato de `GET /api/admin/private/psychologists/:id/publications` passou a expor `community.avatar_url`, usando campo ja selecionado da comunidade, sem alterar schema Prisma, migrations, endpoints ou packages.
- Builder/Quick Copy nao esta exposto como ferramenta no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local da aba **Conteudo** em comunidades.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm check` e smoke local `GET http://localhost:3002/psicologos/cmrqztri7000tn0uh1q4n8vxf?tab=publicacoes` retornando 200.
- Validacao visual via browser local nao foi concluida por falta de ferramenta de controle de navegador neste ambiente; a referencia visual usada foi a captura enviada pelo usuario.


## Ajuste complementar 2026-07-16 - Layout compacto das acoes do video de apresentacao

- Pedido do usuario: melhorar a formatacao dos novos indicadores do bloco **Analises do video de apresentacao**, que ficaram empilhados na lateral e aumentaram demais a altura do card.
- A coluna lateral voltou a concentrar apenas as metricas de consumo do video: visualizacoes, taxa de replays e retencao media.
- As acoes geradas pelo video agora ficam em uma secao propria abaixo do video/grafico, com grid mobile-first 2x2 em telas medias e 4 colunas no desktop.
- A decisao separa leitura de performance do video de conversoes/interacoes originadas pelo video, reduzindo vazio visual e preservando os mesmos dados reais ja retornados pela API.
- Nao houve package novo, mock, schema Prisma/migration ou alteracao de contrato de API.
- Builder/Quick Copy nao esta exposto como ferramenta no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local do Admin.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornando 200.

## Ajuste complementar 2026-07-16 - Acoes e metricas completas nas publicacoes do psicologo

- Pedido do usuario: na aba **Publicacoes** do detalhe administrativo do psicologo, adicionar exclusao de post, igualar a barra de metricas ao modelo de posts da comunidade, remover a tag `Somente leitura` e remover o texto `Comunidade` abaixo do nome da comunidade.
- O Admin agora exibe botao de exclusao em cada card e reutiliza o endpoint real de remocao de conteudo de comunidade, mapeando posts para `post` e respostas para `comment`, com formulario auditado usando React Hook Form, Zod e controllers existentes.
- A barra inferior passou a seguir o mesmo conjunto e ordem da aba **Conteudo** da comunidade: visualizacoes, upvotes, downvotes, comentarios, salvos, compartilhamentos, cliques WhatsApp e denuncias.
- O contrato de `GET /api/admin/private/psychologists/:id/publications` passou a expor metricas por item de `post_report`, `important_action_event.action_type="whatsapp_click"` e `page_view_event` tambem para respostas quando houver tracking first-party, sem backfill, inferencia por URL ou mock.
- A identidade renderizada no card permanece sendo a comunidade, com avatar e nome, mas sem subtitulo redundante `Comunidade`; a tag `Somente leitura` foi removida do cabecalho da lista.
- Nao houve alteracao de schema Prisma, migrations, packages ou endpoints paralelos.
- Builder/Quick Copy nao esta exposto como ferramenta no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local da aba **Conteudo** em comunidades.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/psicologos/cmrqztri7000tn0uh1q4n8vxf?tab=publicacoes` retornando 200.

## Ajuste complementar 2026-07-16 - Respostas sem titulo de post na aba Publicacoes

- Pedido do usuario: quando a publicacao listada for uma resposta, remover a linha `Resposta em...` do card.
- A UI Admin da aba **Publicacoes** agora renderiza titulo apenas para itens do tipo `post`; respostas exibem somente o conteudo da resposta abaixo da identidade da comunidade.
- O ajuste e exclusivamente visual, mobile-first, sem endpoint novo, mock, package, schema Prisma/migration ou alteracao de contrato.
- Builder/Quick Copy nao esta exposto como ferramenta no ambiente; a referencia visual usada foi a captura enviada pelo usuario.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir admin build` e smoke HTTP local `GET http://localhost:3002/psicologos/cmrqztri7000tn0uh1q4n8vxf?tab=publicacoes` retornando 200.

## Ajuste complementar 2026-07-16 - Controles de video nas publicacoes do psicologo

- Pedido do usuario: nos videos da lista de posts do psicologo, adicionar botao de play e expandir igual aos posts da comunidade.
- A UI Admin da aba **Publicacoes** agora usa um miniplayer para midias de video com botao central de reproducao e acao de ampliar em 9:16, preservando o tempo do video entre inline e expandido, no mesmo modelo visual usado em **Conteudo da comunidade**.
- O ajuste e exclusivamente visual, mobile-first, sem endpoint novo, mock, package, schema Prisma/migration ou alteracao de contrato.
- Builder/Quick Copy nao esta exposto como ferramenta no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local da aba **Conteudo** em comunidades.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir admin build` e smoke HTTP local `GET http://localhost:3002/psicologos/cmrqztri7000tn0uh1q4n8vxf?tab=publicacoes` retornando 200.

## Ajuste complementar 2026-07-16 - Analytics do psicologo com eixo em minutos e acoes do video

- Pedido do usuario: em `/app/professional/analytics`, adicionar o minuto do video no eixo X do grafico de retencao e exibir abaixo do video as acoes geradas por ele: Acesso ao perfil, Favoritado, Cliques no WhatsApp e Compartilhamento.
- O endpoint real `GET /api/private/psychologist/analytics` passou a somar `important_action_event` com `target_type="psychologist"`, `target_id` do psicologo e action types do video (`psychologist_video_profile_access`, `psychologist_video_favorite`, `psychologist_video_whatsapp_click`, `psychologist_video_share`), excluindo autoacoes do proprio psicologo quando autenticadas.
- O frontend mantem visualizacoes/replays/retencao como metricas de consumo do video e separa as acoes atribuidas em uma secao 2x2 mobile-first abaixo do player/grafico.
- O grafico de retencao passou a exibir ticks de tempo em `0:00`, meio do video e fim do video quando a duracao real esta disponivel pelo player/API; sem duracao, mantem estado honesto.
- Nao houve package novo, mock, schema Prisma/migration, backfill artificial ou captura de conversa/mensagem do WhatsApp.
- Builder/Quick Copy nao esta exposto como ferramenta no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local de `Meus Analytics - Psicologo`.

## Ajuste complementar 2026-07-16 - Ranking administrativo de comunidade compacto

- Pedido do usuario: na aba **Ranking** do detalhe Admin de comunidade, remover a formula inferior, trocar a tag textual `verificado` pelo selo visual Lectum, normalizar o CRP abaixo do nome no formato compacto `00/0000`, exibir somente o score nas metricas e aproximar `Novo no ranking` do score.
- A UI Admin de `/comunidades/[slug]?tab=ranking` passou a reutilizar o `VerifiedBadgeIcon`, removeu posts/respostas/upvotes da area de metricas e moveu a tendencia do ranking para o bloco do score.
- A formatacao visual do CRP e feita somente no frontend do Admin, sem alterar contrato de API ou dados persistidos; valores sem CRP continuam exibindo estado honesto.
- O ajuste e exclusivamente visual, mobile-first, sem endpoint novo, mock, package, schema Prisma/migration ou alteracao de contrato.
- Builder/Quick Copy nao esta exposto como ferramenta no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local do Admin.
- ADR novo nao foi necessario por nao haver decisao arquitetural, integracao ou regra de dominio nova.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir admin build` e smoke HTTP local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=ranking` retornando 200.
- `pnpm check` foi executado, mas falhou por alteracoes paralelas nao relacionadas em `backend/src/modules/api/private/psychologist/analytics/*` e `frontend/src/app/app/professional/analytics/logic.tsx`, fora deste ajuste.

## Ajuste complementar 2026-07-16 - Consumo, acoes e diagnostico do video no analytics do psicologo

- Pedido do usuario: aproximar os numeros de visualizacoes/replays das acoes geradas pelo video e colocar o diagnostico abaixo das metricas.
- O card de `/app/professional/analytics` deixou de exibir Visualizacoes e Taxa de replays como cards isolados no topo da secao de video.
- As metricas de consumo do video agora ficam no mesmo bloco **Consumo e acoes do video** das acoes atribuidas: Acesso ao perfil, Favoritado, Cliques no WhatsApp e Compartilhamento.
- O diagnostico de retencao (`Aguardando dados`, `Bom desempenho`, `Ponto de atencao` ou `Precisa melhorar`) passou a ficar abaixo do grid de metricas/acoes, mantendo a leitura como conclusao do bloco.
- Nao houve package novo, mock, schema Prisma/migration, endpoint novo ou alteracao de contrato de API.
- Builder/Quick Copy nao esta exposto como ferramenta no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local de `Meus Analytics - Psicologo`.
- Validacao executada: `pnpm --dir frontend check`, `pnpm --dir frontend build` e smoke HTTP local `GET http://localhost:3000/app/professional/analytics` retornando 307 pelo guard privado.

## Ajuste complementar 2026-07-16 - Contadores compactos do video no analytics do psicologo

- Pedido do usuario: colocar o titulo de cada contador abaixo do icone e remover os textos descritivos internos dos contadores.
- Os cards de **Consumo e acoes do video** agora seguem hierarquia compacta: icone, titulo e valor, sem descricao auxiliar dentro de cada contador.
- A mudanca reduz ruído visual no mobile e preserva o texto explicativo geral do bloco e o diagnostico abaixo das metricas.
- Nao houve package novo, mock, schema Prisma/migration, endpoint novo ou alteracao de contrato de API.
- Builder/Quick Copy nao esta exposto como ferramenta no ambiente; a referencia visual usada foi a captura enviada pelo usuario.
- Validacao executada: `pnpm --dir frontend check`, `pnpm --dir frontend build` e smoke HTTP local `GET http://localhost:3000/app/professional/analytics` retornando 307 pelo guard privado.

## Ajuste complementar 2026-07-16 - Aproveitamento responsivo do bloco de video

- Pedido do usuario: em telas maiores, melhorar o aproveitamento visual do bloco de consumo e retencao do video em /app/professional/analytics.
- Em telas md+, o painel **Consumo e acoes do video** passou para a coluna de contexto da retencao, abaixo do resumo **Onde seu publico permanece**, ocupando o espaco lateral que ficava vazio.
- O card de midia a direita fica focado no player e no grafico de retencao; no mobile, a ordem continua vertical com o painel de consumo/acoes abaixo do player e do grafico.
- A hierarquia acordada foi preservada: metricas e acoes ficam juntas, com o diagnostico abaixo dos contadores.
- Nao houve package novo, mock, schema Prisma/migration, endpoint novo ou alteracao de contrato de API.
- Builder/Quick Copy nao esta exposto como ferramenta no ambiente; a referencia visual usada foi a captura enviada pelo usuario.
- Validacao executada: `pnpm --dir frontend check`, `pnpm --dir frontend build` e smoke HTTP local `GET http://localhost:3000/app/professional/analytics` retornando 307 pelo guard privado.

## Ajuste complementar 2026-07-16 - Consumo e acoes abaixo do bloco de video

- Pedido do usuario: a versao com **Consumo e acoes do video** na coluna de retencao ainda nao ficou boa; o bloco deve ficar abaixo do bloco de video.
- A secao de `/app/professional/analytics` voltou a manter o topo com resumo de retencao na coluna esquerda e player/grafico no card de video a direita.
- O painel **Consumo e acoes do video** agora e renderizado abaixo desse bloco de video, ocupando a largura da secao em telas md+ e permanecendo abaixo do player/grafico no mobile.
- Em telas maiores, o grid dos contadores progride de 2 colunas para 3 e ate 6 colunas, reduzindo altura sem separar metricas, acoes e diagnostico.
- Nao houve package novo, mock, schema Prisma/migration, endpoint novo ou alteracao de contrato de API.
- Builder/Quick Copy nao esta exposto como ferramenta no ambiente; a referencia visual usada foi a captura enviada pelo usuario.
- Validacao executada: `pnpm --dir frontend check`, `pnpm --dir frontend build` e smoke HTTP local `GET http://localhost:3000/app/professional/analytics` retornando 307 pelo guard privado.

## Ajuste complementar 2026-07-16 - Video e grafico abaixo do texto de retencao

- Pedido do usuario: em telas maiores, colocar o bloco de video e grafico de retencao abaixo do texto `Em media, os visitantes assistiram...` para melhorar a visualizacao do grafico.
- A secao de `/app/professional/analytics` deixou de posicionar o resumo de retencao e o card de video lado a lado em md+; o card de video/grafico agora vem logo abaixo do texto de retencao.
- O grafico de retencao ganhou mais largura e altura em telas md+, removendo o limite visual que o deixava pequeno dentro da coluna lateral.
- O painel **Consumo e acoes do video** permanece abaixo do card de video/grafico e mantem os contadores agrupados com o diagnostico abaixo.
- Nao houve package novo, mock, schema Prisma/migration, endpoint novo ou alteracao de contrato de API.
- Builder/Quick Copy nao esta exposto como ferramenta no ambiente; a referencia visual usada foi a captura enviada pelo usuario.
- Validacao executada: `pnpm --dir frontend check`, `pnpm --dir frontend build` e smoke HTTP local `GET http://localhost:3000/app/professional/analytics` retornando 307 pelo guard privado.

## Ajuste complementar 2026-07-16 - Numeros centralizados na tabela de origem do trafego

- Pedido do usuario: centralizar os numeros nas colunas da tabela **Origem do trafego** em `/app/professional/analytics`.
- As colunas numericas de desktop (**Visualizacoes de perfil** e **WhatsApp**) agora alinham cabecalho e valores ao centro, mantendo a primeira coluna textual alinhada a esquerda.
- O ajuste e exclusivamente visual, mobile-first e nao altera dados, contrato de API, tracking first-party, schema Prisma/migration ou packages.
- Builder/Quick Copy nao esta exposto como ferramenta no ambiente; a referencia visual usada foi a captura enviada pelo usuario.
- Validacao executada: `pnpm --dir frontend check`, `pnpm --dir frontend build` e smoke HTTP local `GET http://localhost:3000/app/professional/analytics` retornando 307 pelo guard privado.

## Ajuste complementar 2026-07-16 - Copy de acesso ao perfil nos analytics

- Pedido do usuario: alterar o texto `Abertura de perfil` para `Acesso ao perfil` em `/app/professional/analytics`.
- O card de metricas principais de perfil passa a usar a copy **Acesso ao perfil**, mantendo a mesma fonte real `profile_view_event`.
- O ajuste e exclusivamente textual, sem alterar dados, contrato de API, tracking first-party, schema Prisma/migration ou packages.
- Builder/Quick Copy nao esta exposto como ferramenta no ambiente; a referencia visual usada foi a captura enviada pelo usuario.
- Validacao executada: `pnpm --dir frontend check`, `pnpm --dir frontend build` e smoke HTTP local `GET http://localhost:3000/app/professional/analytics` retornando 307 pelo guard privado.

## Ajuste complementar 2026-07-16 - Lista compacta de denuncias da comunidade

- Pedido do usuario: remover o bloco **Fila de triagem** e deixar a lista de conteudos denunciados da comunidade mais enxuta.
- A aba **Denuncias** em `/comunidades/[slug]?tab=denuncias` agora renderiza cada conteudo denunciado em um card compacto com tag do tipo/autoria, quantidade de denuncias, data da ultima denuncia, conteudo denunciado, historico de denunciantes com nome/data/motivo e acoes diretas **Improcedente** e **Procedente**.
- O painel lateral de status/contadores por item foi removido; itens ja encerrados exibem somente o status terminal no rodape.
- O ajuste e exclusivamente visual, mobile-first, sem novo endpoint, mock, package, schema Prisma/migration ou alteracao de contrato.
- Builder/Quick Copy nao esta exposto como ferramenta no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local do Admin premium.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=denuncias` retornando 200.

## Ajuste complementar 2026-07-16 - Cabecalho Perfil na tabela de trafego

- Pedido do usuario: na tabela **Origem do trafego** em `/app/professional/analytics`, alterar o cabecalho `Visualizacoes de perfil` para `PERFIL`.
- O cabecalho da coluna numerica de acessos ao perfil agora usa a copy compacta **PERFIL**, preservando os mesmos valores reais de `profile_view_event`.
- O ajuste e exclusivamente textual/visual, sem alterar dados, contrato de API, tracking first-party, schema Prisma/migration ou packages.
- Builder/Quick Copy nao esta exposto como ferramenta no ambiente; a referencia visual usada foi a captura enviada pelo usuario.
- Validacao executada: `pnpm --dir frontend check`, `pnpm --dir frontend build` e smoke HTTP local `GET http://localhost:3000/app/professional/analytics` retornando 307 pelo guard privado.

## Ajuste complementar 2026-07-16 - Layout dos blocos de estatisticas do psicologo

- Pedido do usuario: dentro de **Detalhes do psicologo > Estatisticas**, alinhar os blocos **Estatisticas de negocio** e **Estatisticas de comunidade** ao layout de **Estatisticas de pessoas** do painel de comunidade.
- A UI Admin passou a renderizar titulo, descricao, indicador **Atualizando** e filtros diretamente dentro do card de cada bloco, com filtros alinhados a direita em telas amplas e empilhados no mobile.
- Os contadores clicaveis e os graficos de serie temporal permanecem dentro do mesmo card, com grid responsivo mobile-first semelhante ao bloco de comunidade.
- **Estatisticas de comunidade** manteve o filtro real de comunidade junto dos filtros de periodo, sem alterar query, endpoint, contrato ou fontes de dados.
- Nao houve endpoint novo, mock, package, schema Prisma/migration ou alteracao de persistencia.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o layout atual de **Estatisticas de pessoas** no painel de comunidade.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornando 200.

## Ajuste complementar 2026-07-16 - Copy contextual dos blocos de estatísticas do psicólogo

- Pedido do usuário: substituir o texto genérico abaixo dos títulos dos blocos **Estatísticas de negócio** e **Estatísticas de comunidade** por descrições relacionadas ao conteúdo analisado.
- **Estatísticas de negócio** passa a exibir: `Visão do desempenho comercial do psicólogo na plataforma, incluindo descoberta, interesse e intenção de contato.`
- **Estatísticas de comunidade** passa a exibir: `Indicadores de contribuição, engajamento e posição do psicólogo nas comunidades.`
- O ajuste é exclusivamente textual/visual, mobile-first, sem endpoint novo, mock, package, schema Prisma/migration, alteração de contrato de API ou persistência.
- Builder/Quick Copy não está exposto como ferramenta callable no ambiente; a referência usada foi a solicitação textual do usuário e o layout já consolidado do Admin.
- Validação executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornando 200.

## Ajuste complementar 2026-07-16 - Filtros independentes em video, trafego e uso no Admin

- Pedido do usuario: na aba **Estatisticas** do detalhe administrativo do psicologo, adicionar minutos no eixo X do grafico de retencao do video e dar filtros de data proprios para **Analises do video de apresentacao**, **Origem do trafego** e **Uso da plataforma**.
- O grafico de retencao do Admin agora exibe marcadores de tempo no eixo X: inicio, meio e fim quando ha duracao real do video; sem duracao, exibe `0:00` e `Fim`.
- Os blocos de negocio, video, trafego, uso da plataforma e comunidade passaram a usar filtros de periodo independentes via React Query, preservando `placeholderData` para atualizar apenas o bloco alterado sem recarregar a pagina inteira.
- O endpoint real `GET /api/admin/private/psychologists/:id/statistics` continua sendo a unica fonte; nao houve endpoint paralelo, mock, dado fake, schema Prisma/migration, package novo ou alteracao de contrato.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao ja consolidado dos cards de estatisticas.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornando 200.

## Ajuste complementar 2026-07-16 - Ordenacao por engajamento em conteudo administrativo

- Pedido do usuario: nas listas **Conteudo da comunidade** e **Publicacoes** do psicologo, adicionar um filtro de ordenacao na mesma linha do titulo, mantendo **Mais engajados** como padrao.
- Os endpoints reais `GET /api/admin/private/communities/:id/content` e `GET /api/admin/private/psychologists/:id/publications` passam a aceitar `sort=engagement|recent|oldest`; o padrao e `engagement`.
- O score de engajamento usa metricas reais ja exibidas no card: visualizacoes, upvotes, downvotes, comentarios, salvos, compartilhamentos e cliques WhatsApp. Denuncias ficam fora do score por serem sinal de moderacao, nao de engajamento.
- A ordenacao e aplicada no backend antes da paginacao, evitando ordenar apenas a pagina visivel no Admin.
- A UI Admin mantem layout mobile-first: o seletor empilha no mobile e fica na linha do titulo em telas maiores.
- Nao houve package novo, mock, endpoint paralelo, schema Prisma/migration ou dado artificial.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia visual usada foi a captura enviada pelo usuario e os padroes locais do Admin.
- ADR atualizado: `adrs/0266-metricas-conversao-uso-psicologos-admin.md`.
- Validacao executada: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, validacao direta dos services com scores em ordem decrescente (`community 200 [83,17,2,2,2]`, `publications 200 [6,2,0]`) e smoke HTTP local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=conteudo` / `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=publicacoes` retornando 200.

## Ajuste complementar 2026-07-16 - Copy curta no ranking de comunidade

- Pedido do usuário: quando o filtro de comunidade estiver em **Todas**, a copy do card **Ranking do psicólogo** deve ser apenas `Selecione uma comunidade`.
- O backend Admin passou a retornar a mensagem curta no estado indisponível de ranking agregado, mantendo o mesmo endpoint real `GET /api/admin/private/psychologists/:id/statistics` e sem alterar contrato, fonte de dados, schema Prisma/migration, package ou UI estrutural.
- Validação executada: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm check` e smoke HTTP local em `/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornando 200.

## Ajuste complementar 2026-07-16 - Origem do trafego Admin sem faixa auxiliar

- Pedido do usuario: em **Origem do trafego** no Admin, remover a faixa informativa `Cliques no WhatsApp por origem...` e alterar a coluna `Visualizacoes de perfil` para `Perfil`.
- O detalhe administrativo do psicologo deixou de renderizar a faixa auxiliar de atribuicao first-party indisponivel, preservando a tabela com dados reais e estados existentes do endpoint.
- A coluna desktop de acessos ao perfil agora usa a copy compacta **Perfil** no detalhe e no dashboard administrativo de psicologos, mantendo os mesmos valores reais de `profile_view_event`.
- O ajuste e exclusivamente textual/visual, mobile-first, sem endpoint novo, mock, package, schema Prisma/migration, alteracao de contrato de API ou persistencia.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia usada foi a captura enviada pelo usuario e os padroes ja consolidados do Admin.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornando 200.

## Ajuste complementar 2026-07-16 - Contadores da aba Estatisticas de comunidade

- Pedido do usuario: exibir, no contador **Postagens de pacientes**, quantidade e taxa de posts anonimos e identificados; padronizar os icones dos contadores de pessoas/conteudo; e trocar as descricoes dos blocos por `Visao geral de psicologos e pacientes da comunidade.` e `Visao geral do conteudo e engajamento da comunidade.`
- O Admin agora calcula a quebra do card de posts de pacientes a partir de dados reais ja retornados pelo endpoint de estatisticas da comunidade, usando `counters.posts.patients` como denominador e `counters.anonymous_posts.total` para os posts anonimos.
- Os icones foram padronizados por grupo: psicologos = `Brain`, pacientes = `Users`, postagens = `FileText` e respostas de psicologos = `Reply`, sem criar asset novo nem usar imagem crua.
- O ajuste e exclusivamente visual/apresentacional, mobile-first, sem endpoint novo, mock, package, schema Prisma/migration ou alteracao de persistencia.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia usada foi a captura enviada pelo usuario e o padrao local da aba **Estatisticas** da comunidade.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=estatisticas` retornando 200.

## Ajuste complementar 2026-07-16 - Resumo diario da comunidade no Admin

- Pedido do usuario: fazer o **Resumo da comunidade** com indicadores de hoje: Novos pacientes ativos, Novos psicologos ativos, Novos psicologos seguidores, Novos pacientes seguidores, Posts de psicologos, Posts de pacientes, Respostas de psicologos verificados, Respostas de psicologos nao verificados e Comentarios de pacientes.
- O endpoint real `GET /api/admin/private/communities/:id` foi expandido com `today_summary`, calculado no backend a partir de `community_member`, `community_post`, `post_reply` e `page_view_event` autenticado, sem criar endpoint paralelo nem usar mock.
- Seguidores novos usam entrada real em `community_member.createdAt` no dia corrente; novos ativos usam a primeira atividade real do usuario na comunidade, preservando a semantica ja usada em Estatisticas.
- A aba Geral do detalhe de comunidade agora renderiza **Resumo da comunidade hoje** com nove cards mobile-first e grid progressivo em telas maiores.
- Nao houve package novo, schema Prisma/migration, dado artificial, seed, backfill ou uso de `<img>`.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local do Admin.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validacao executada: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito` retornando 200.

## Ajuste complementar 2026-07-16 - Coisas urgentes na comunidade Admin

- Pedido do usuario: remover o grafico de **Desempenho** da aba Geral do detalhe administrativo de comunidade e adicionar um bloco de coisas mais urgentes.
- A aba Geral agora troca o grafico historico de desempenho por **Coisas mais urgentes**, uma fila operacional mobile-first com links para as abas de Denuncias e Conteudo.
- O endpoint real `GET /api/admin/private/communities/:id` foi expandido com `urgent_summary`, calculado a partir de `post_report` agrupado por conteudo denunciado, sem criar endpoint paralelo.
- A fila tambem reaproveita o `today_summary` real para destacar respostas de psicologos nao verificados, posts de pacientes e comentarios de pacientes publicados hoje.
- Nao houve package novo, mock, dado artificial, schema Prisma/migration, seed ou backfill.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local do Admin.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validacao executada: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito` retornando 200.

## Ajuste complementar 2026-07-16 - Comparativo de periodo nos contadores da comunidade

- Pedido do usuario: nos contadores da aba **Estatisticas** da comunidade, adicionar comparativo com o periodo anterior, igual ao padrao dos contadores em detalhes do psicologo.
- Os cards de **Estatisticas de pessoas** e **Estatisticas de conteudo** agora calculam o intervalo anterior com a mesma duracao do filtro aplicado e consultam o endpoint real `GET /api/admin/private/communities/:id/statistics` com `period=custom` para obter a base comparativa.
- Cada contador exibe variacao percentual, direcao visual e label `vs. DD/MM - DD/MM`; quando a base anterior e zero e o periodo atual tem valor, a UI mostra `sem base anterior`, evitando percentual artificial.
- A quebra de posts anonimos/identificados permanece no card de posts de pacientes e o comparativo usa o total real do contador.
- Nao houve endpoint novo, mock, package, schema Prisma/migration, backfill ou alteracao de persistencia; a solucao reutiliza React Query e o contrato de estatisticas ja existente.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao ja consolidado dos contadores do detalhe administrativo do psicologo.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=estatisticas` retornando 200.


## Ajuste complementar 2026-07-16 - Engajamento geral no conteudo da comunidade

- Pedido do usuario: nas **Estatisticas de conteudo** da comunidade, adicionar contadores gerais de **Upvotes**, **Downvotes**, **Salvamentos**, **Cliques WhatsApp** e **Acesso ao perfil**, mantendo os demais indicadores disponiveis em um carrossel horizontal com seta.
- O endpoint real `GET /api/admin/private/communities/:id/statistics` foi expandido com `counters.content_engagement` e novos pontos diarios para essas cinco metricas, calculados a partir de `post_vote`, `post_save`, `post_reply_save`, `important_action_event` e `page_view_event`.
- **Acesso ao perfil** usa `page_view_event` de perfis publicos de psicologos vinculados a comunidade por membro, autoria de post ou autoria de resposta; a origem exata do clique dentro da comunidade nao e inferida quando o evento nao possui essa atribuicao.
- A UI Admin renderiza os contadores de conteudo em carrossel horizontal mobile-first, com snap scroll, rolagem nativa e botoes de seta para revelar as demais opcoes em telas pequenas e grandes.
- Nao houve package novo, mock, endpoint paralelo, dado artificial, schema Prisma/migration, backfill ou uso de `<img>`.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia visual usada foi a captura enviada pelo usuario e os padroes locais dos contadores da aba **Estatisticas**.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validacao executada: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=estatisticas` retornando 200.
