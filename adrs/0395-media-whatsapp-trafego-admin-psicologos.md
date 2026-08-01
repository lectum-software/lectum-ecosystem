# ADR-0395: Media secundaria de WhatsApp por linha no trafego Admin

## Status

Accepted

## Task relacionada

TASK-131

## Contexto

A tabela **Origem do trafego para psicologos** no Admin ja exibe o total de cliques de WhatsApp por origem. O total bruto, sozinho, dificulta comparar origens com bases muito diferentes, como dezenas de conteudos de comunidade versus uma base de psicologos.

## Decisao

- Manter o total e o percentual de WhatsApp como metricas principais da coluna.
- Adicionar uma linha secundaria visual com a media de cliques por base da linha.
- Reusar `considered_count` ja retornado pelo contrato do dashboard quando houver base especifica de conteudo ou video.
- Derivar denominadores de grupos somente no frontend:
  - Comunidades soma os filhos com `considered_count` numerico;
  - Video de apresentacao usa o maior `considered_count` entre filhos para evitar contar a mesma base de videos duas vezes.
- Usar `psychologists_count` do segmento de plano como fallback para origens por psicologo sem `considered_count` especifico, como Favoritos e Ranking Top Mentores.
- Nao alterar backend, schema, migrations, tracking ou contrato de API.

## Consequencias

- O Admin consegue comparar produtividade por base sem perder a leitura de volume total.
- A solucao evita backfill e nao inventa dados: se nao houver denominador positivo, a media nao aparece.
- A regra do grupo Video de apresentacao evita inflar o denominador ao somar Explorar e Busca/filtros, pois ambas as linhas compartilham a mesma base de videos publicados.
- A media e apenas uma apresentacao derivada; a ordenacao da tabela continua por total de cliques WhatsApp.

## Validacao

- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local em desktop e mobile 390px validando medias `por conteudo`, `por video` e `por psicologo`.

## Pendencias

- Nenhuma pendencia externa.
