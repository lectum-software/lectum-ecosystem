# ADR-0306: Sessões por device no uso individual Admin

## Status

Accepted

## Task relacionada

TASK-79

## Contexto

Os dashboards administrativos de pacientes e psicólogos já medem devices por sessões em `visitor_session.device_type`, permitindo que uma mesma pessoa contribua para mais de um device quando usa a Lectum em múltiplos dispositivos. O detalhe individual tinha o bloco **Uso da plataforma**, mas ainda sem a distribuição por device.

O produto decidiu não medir "device principal por usuário" nesta etapa. A pergunta operacional é quais dispositivos geraram sessões no período para aquele psicólogo ou paciente específico.

## Decisão

Adicionar `platform_usage.device_usage` nos contratos individuais de psicólogo e paciente, calculado por sessões reais em `visitor_session`:

- filtro por `user_id` do detalhe aberto;
- filtro por `user.role` correspondente;
- sessão incluída quando intercepta o período (`first_seen_at <= to` e `last_seen_at >= from`);
- normalização para `desktop`, `mobile`, `tablet` e `unknown`;
- percentual calculado por `count / total_sessions`.

Quando houver `visitor_session` no período, `sessions_count` do bloco **Uso da plataforma** passa a usar o mesmo total para manter coerência visual com a distribuição por device. Pageviews continuam sendo a fonte de páginas mais acessadas e duração média.

Na interface individual, **Páginas mais acessadas** e **Devices** ficam em duas colunas a partir de telas maiores e continuam empilhados no mobile. **Devices** usa gráfico de pizza com a mesma unidade de medida dos dashboards: sessões por device no período, e não device principal por usuário.

## Consequências

- A mesma pessoa pode aparecer em múltiplos devices ao longo do período, porque a unidade da métrica é sessão.
- A soma dos devices corresponde ao total de sessões por device no período, não a uma contagem única de usuários.
- Não há backfill, mock ou estimativa para períodos sem `visitor_session`; a UI exibe estado vazio honesto.
- Não foi necessário alterar schema Prisma, migrations ou instalar package novo.

## Validação

- `pnpm --dir backend check` executado com sucesso em 2026-07-22 (uma tentativa anterior expirou por timeout local; a repetição concluiu sem erros).
- `pnpm --dir backend build` executado com sucesso em 2026-07-22.
- `pnpm --dir admin check` executado com sucesso em 2026-07-22.
- `pnpm --dir admin build` executado com sucesso em 2026-07-22.
- `pnpm check` executado com sucesso em 2026-07-22.
- Browser local validado em 2026-07-22 via Chrome headless/CDP nas abas **Estatísticas** de psicólogo e paciente, confirmando **Páginas mais acessadas** e **Devices** lado a lado no desktop, empilhados no mobile, e **Devices** renderizado como SVG de pizza.
- Validação direta dos use-cases confirmou psicólogo com 30 sessões por device (28 Desktop, 2 Não identificado) e paciente com estado vazio honesto por ausência de `visitor_session` autenticada no período.

## Pendências

- Nenhuma pendência externa. Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; validação visual usa screenshots do usuário e PNGs locais de `_product/proto/admin`.
