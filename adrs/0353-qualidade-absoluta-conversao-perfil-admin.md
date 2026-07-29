# ADR-0353: Qualidade absoluta da conversão no perfil Admin do psicólogo

## Status

Accepted

## Data

2026-07-29

## Contexto

O dashboard Admin de psicólogos já classifica **Conversão** de forma agregada por percentis da
plataforma, mantendo a leitura simples para acompanhar a base inteira. No perfil individual do
psicólogo, essa leitura relativa não basta: um profissional pode estar abaixo da mediana da
plataforma e ainda assim ter um volume saudável de contatos, ou pode estar acima de uma base ainda
fraca e continuar com pouco resultado real.

O produto decidiu separar duas dimensões no detalhe individual:

1. qualidade absoluta da conversão;
2. posição relativa contra a referência da plataforma.

## Decisão

- Manter o dashboard `/psicologos` com as categorias agregadas atuais de Conversão.
- Adicionar ao contrato `business.profile_conversion` do detalhe Admin do psicólogo:
  - `quality`, com ritmo mensal estimado normalizado para 30 dias;
  - `platform_position`, comparando o volume bruto do período contra a mediana/P50 da plataforma;
  - `headline`, combinando as duas dimensões em uma frase diagnóstica.
- Definir os cortes absolutos da qualidade individual:
  - **Sem Conversão**: 0 cliques WhatsApp reais no período;
  - **Conversão Baixa**: mais de 0 e menos de 5 cliques equivalentes em 30 dias;
  - **Conversão Boa**: pelo menos 5 e menos de 10 cliques equivalentes em 30 dias;
  - **Conversão Excelente**: 10 ou mais cliques equivalentes em 30 dias.
- Preservar o período de adaptação de 30 dias antes de avaliar qualidade ou posição relativa.
- Usar a mediana/P50 como referência textual individual, enquanto P25/P75 continuam sustentando a
  classificação agregada/faixa padrão já existente.

## Consequências

- O Admin consegue exibir frases como **"Conversão Boa, mas abaixo da referência da plataforma."**
  apenas no perfil individual, sem granularizar o dashboard.
- O ritmo absoluto fica comparável entre filtros de 7, 30, 90 dias, ano e períodos customizados.
- O dashboard permanece estável, executivo e sem novas categorias agregadas.
- Não há alteração de schema Prisma, migration, endpoint paralelo, mock, seed ou package novo.

## Validação

- Validar backend com Biome/TypeScript/build.
- Validar Admin com Biome/ESLint/TypeScript/build.
- Validar browser local no detalhe Admin do psicólogo em desktop e base mobile ~390px.
