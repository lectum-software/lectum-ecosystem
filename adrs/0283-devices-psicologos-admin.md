# ADR-0283: Devices dos psicólogos no dashboard Admin

## Status

Accepted

## Task relacionada

TASK-53

## Contexto

O dashboard Admin de psicólogos já consolidava conversão, uso da plataforma e origem do tráfego com dados first-party. O pedido atual exige um gráfico percentual de devices usados pelos psicólogos, sem mocks e sem instalar biblioteca de charts.

O dado real disponível é `visitor_session.device_type`, criado pelo tracking first-party da TASK-49 e associado a `user_id` quando há sessão autenticada.

## Decisão

Adicionar `device_usage` ao contrato `GET /api/admin/private/psychologists/dashboard`, agregando somente `visitor_session` reais com:

- `deleted=false`;
- sessão intersectando o período selecionado (`first_seen_at <= fim` e `last_seen_at >= início`);
- `user_id` autenticado;
- usuário ativo, não deletado e `role="psicologo"`.

O percentual é calculado por quantidade de sessões, não por usuários únicos, porque a pergunta é sobre uso de devices e um mesmo psicólogo pode usar mais de um dispositivo no período. A resposta também inclui `active_psychologists_count` por device para leitura complementar.

## Consequências

- O gráfico usa dados reais first-party e respeita o filtro de período do dashboard.
- Não há migration nem package novo.
- Sessões sem tipo confiável entram como **Não identificado** em vez de serem ocultadas.
- A métrica não tenta inferir atribuição cross-device entre visitantes/dispositivos.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm --dir admin check` (a primeira execução falhou por cache `.next` stale referenciando rota antiga de pacientes; após o build regenerar os tipos do Next, a repetição passou)
- `pnpm check`
- Execução direta do service com `.env` local via `tsx -r dotenv/config`, confirmando `device_usage` real retornado com sessões por device.
- Smoke HTTP local em `http://localhost:3002/psicologos` retornando 200.

## Pendências

- Nenhuma decisão externa.

## Complemento 2026-07-19 - Faixa explicativa removida da UI

- Decisao: remover do card **Devices dos psicologos** a faixa explicativa sobre o denominador por sessoes reais.
- O calculo e o contrato `device_usage` continuam inalterados: os percentuais seguem baseados em sessoes reais autenticadas de psicologos, e um psicologo pode continuar aparecendo em mais de um device quando houver sessoes reais distintas.
- Consequencia: a leitura visual do card fica mais limpa, sem reduzir os dados exibidos na legenda ou no grafico.

## Complemento 2026-07-19 - Modo de cadastro e Devices abaixo da conversão

Decisão: no dashboard administrativo de psicólogos, o card **Conversão do cadastro até assinatura** deve ocupar uma linha própria. Os cards **Modo de cadastro** e **Devices dos psicólogos** passam a ficar abaixo dele em grid mobile-first, empilhados no mobile e em duas colunas apenas em telas largas.

O bloco **Uso da plataforma** continua no mesmo agrupamento visual, mas aparece depois de **Modo de cadastro** e **Devices dos psicólogos**, ocupando a largura completa no desktop. A mudança reorganiza apenas a hierarquia visual da dashboard, sem alterar contratos, cálculo de devices, fontes first-party, endpoints, schema Prisma, migrations, packages ou persistência.

Validação complementar 2026-07-19: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke HTTP local `GET http://localhost:3002/psicologos` retornando 200 e validação headless autenticada em 1365px confirmando `layoutOk=true` para os cards abaixo da conversão.
