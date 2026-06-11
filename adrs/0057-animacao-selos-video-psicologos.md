# ADR-0057: Animacao lateral de selos comerciais no video de psicologos

## Status

Accepted

## Task relacionada

Ajustes de UX na tela `/app/psychologists` (continuidade da refatoracao imersiva da listagem).

## Contexto

O usuario pediu uma animacao lateral para os selos reais do video do psicologo: `desconto 1a sessao`,
`valor social` e `aceita convenios`. A direcao visual foi refinada para um layout compacto,
sem gamificacao excessiva, seguindo a referencia visual local `image (6).png`: pills empilhadas,
translucidas, com icone de premio em cada selo.

Esses selos ja existem no contrato real da descoberta de psicologos por meio dos campos
`discount_first_session`, `social_value` e `accepts_insurance`. A implementacao nao deve criar
mock, seed, texto inventado persistente ou novo contrato de API.

## Decisao

Definimos para a tela `/app/psychologists`:

- renderizar uma animacao lateral esquerda sobre a midia apenas quando houver selos reais ativos;
- usar pills compactas, empilhadas no lado esquerdo, com icone `Award`/premio em cada item;
- aplicar entrada em cascata e flutuacao suave, sem efeito de curtidas ou explosao social;
- manter a animacao como camada visual, sem alterar navbar, botoes laterais, dados do psicologo ou fluxo de video;
- usar `prefers-reduced-motion` para desativar o movimento quando o usuario preferir menos animacao;
- nao instalar pacote novo e nao alterar backend/Prisma, pois os campos ja estao disponiveis na API.

## Consequencias

- Psicologos com beneficios comerciais ganham destaque visual no video sem hardcode de dados falsos.
- O tratamento visual fica mais discreto e adequado para profissionais de saude divulgando seu trabalho.
- A tela preserva a experiencia imersiva e evita sobrepor a navbar ou a coluna lateral de acoes.
- Selos inexistentes nao sao exibidos, mantendo fidelidade ao cadastro real do psicologo.

## Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Validacao local da rota `/app/psychologists` via HTTP.

## Pendencias

- O MP4 anexado foi usado como referencia de intencao visual descrita pelo usuario; o ambiente local do agente nao expos `ffmpeg`/decoder para extracao confiavel de frames.
