# ADR-0126: Origem do trafego em Analytics sem atribuicao persistida

## Status

Aceito em 2026-06-18.

## Contexto

A tela `/app/professional/analytics` deve exibir uma nova secao `Origem do trafego` para que o psicologo entenda quais canais levam pacientes ao perfil e ao WhatsApp.

As origens definidas pelo produto sao:

- Explorar;
- Busca e filtros;
- Comunidades;
- Link direto;
- Favoritos.

A metrica desejada por origem e:

`taxa de conversao = cliques no WhatsApp / visualizacoes de perfil * 100`.

No schema atual, ainda nao existem eventos persistidos de visualizacao de perfil com origem, nem campo de origem em `contact_request`. A TASK-20 ja documentava que `profile_view_event` e opcional e que metricas sem evento persistido nao devem ser simuladas.

## Decisao

O contrato de `GET /api/private/psychologist/analytics` passa a incluir `traffic_sources` com as cinco origens oficiais e valores zerados enquanto a fonte persistida real nao existir.

A decisao evita distribuir cliques reais de WhatsApp em canais sem origem confiavel e evita criar numeros ficticios. Portanto, mesmo que existam cliques totais de WhatsApp nos indicadores principais, a secao de origem permanece com:

- `0` visualizacoes de perfil;
- `0` cliques no WhatsApp;
- `0%` conversao.

A UI foi preparada para consumir dados reais futuros sem alterar a experiencia:

- desktop: layout tabular premium, ordenado por maior quantidade de visualizacoes de perfil;
- mobile: lista com barras de progresso e acordeao por origem;
- destaque discreto de melhor conversao/principal origem apenas quando houver dados reais positivos.

A secao `Busca por especialidades` foi removida porque nao havia fonte persistida especifica e ficou redundante diante da nova organizacao.

## Consequencias

- A tela comunica a estrutura futura de atribuicao de trafego sem inventar dados.
- O backend mantem um unico contrato de Analytics para Plano Profissional e modo preview.
- A atribuicao real de origem ainda exige uma evolucao futura de schema/eventos, provavelmente adicionando fonte/canal em `profile_view_event` e origem em `contact_request` ou em um evento de conversao separado.
- Nenhum schema Prisma, migration, pacote novo, seed, dado fake ou endpoint simulado foi criado nesta etapa.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
