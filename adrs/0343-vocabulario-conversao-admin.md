# ADR-0343: Vocabulário Conversão no Admin de psicólogos

## Status

Accepted

## Data

2026-07-29

## Contexto

O produto decidiu padronizar a leitura administrativa de resultado do perfil como **Conversão**, porque os sinais agregados de WhatsApp, visualizações de perfil e favoritos representam melhor avanço do paciente em direção ao contato com o psicólogo.

O dashboard de psicólogos também já possui uma trilha de **Conversão do cadastro até assinatura**. Para evitar colisão semântica e técnica, a métrica operacional do perfil usa contrato interno qualificado como `profile_conversion` e `profile_conversion_engagement`, enquanto a trilha de assinatura permanece em `conversion` e `pre_signup_conversion`.

O bloco **Comparativo de oferta e demanda** permanece com o vocabulário de demanda, pois ali o termo representa buscas reais do mercado por filtros do diretório público, não resultado do perfil do psicólogo.

## Decisão

- Renomear a leitura de resultado dos psicólogos para **Conversão** na UI Admin.
- Padronizar o contrato da leitura de resultado do perfil em `profile_conversion` e `profile_conversion_engagement`.
- Renomear categorias derivadas para `strong_conversion` e `low_conversion`, preservando `unconverted_interest`, `unconverted_traffic` e `insufficient_data`.
- Atualizar lista, detalhe do psicólogo, dashboard, filtros de URL/cache e alertas operacionais que usavam o termo anterior.
- Manter **Oferta x Demanda** sem alteração por representar outra métrica de produto.

## Consequências

- Links profundos da lista passam a usar `profile_conversion` e `profile_conversion_engagement`.
- O Admin evita a ambiguidade entre conversão de assinatura e conversão do perfil.
- Não houve package novo, mock, seed, endpoint paralelo, migration ou alteração em `backend/prisma/schema.prisma`.

## Atualização 2026-07-29 - Alta Conversão

A categoria de maior resultado passa a ser exibida no Admin como **Alta Conversão**, substituindo a copy anterior da categoria `strong_conversion` em badges, filtros, matriz **Conversão x Engajamento**, dashboard, detalhe do psicólogo e descrições operacionais.

O identificador interno `strong_conversion` permanece inalterado para manter compatibilidade de contratos, URLs e agregações já publicados; a mudança é de vocabulário de produto, não de regra de cálculo.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Browser/HTTP local em `/psicologos` e `/psicologos/lista?profile_conversion_engagement=strong_conversion_very_engaged`.
