# ADR-0126: Origem do trafego em Analytics sem atribuicao persistida

## Status

Aceito em 2026-06-18.

## Contexto

A tela `/app/professional/analytics` deve exibir a secao `Origem do trafego` para que o psicologo entenda quais canais levam pacientes ao WhatsApp.

As origens definidas pelo produto sao:

- Video de apresentacao;
- Comunidades;
- Perfil;
- Favoritos.

A metrica principal exibida por origem no Analytics do psicologo e:

`cliques no WhatsApp`.

O contrato ainda preserva `profile_views` e `conversion_rate` para compatibilidade e evolucao futura da atribuicao real, mas a UI do psicologo nao deve exibir a coluna `Perfil` enquanto a leitura de negocio estiver focada em WhatsApp.

No schema atual, ainda nao existem eventos persistidos de visualizacao de perfil com origem, nem campo de origem em `contact_request`. A TASK-20 ja documentava que `profile_view_event` e opcional e que metricas sem evento persistido nao devem ser simuladas.

## Decisao

O contrato de `GET /api/private/psychologist/analytics` passa a incluir `traffic_sources` com as quatro origens oficiais vigentes e valores zerados enquanto a fonte persistida real nao existir.

A decisao evita distribuir cliques reais de WhatsApp em canais sem origem confiavel e evita criar numeros ficticios. Portanto, mesmo que existam cliques totais de WhatsApp nos indicadores principais, a secao de origem permanece com:

- `0` visualizacoes de perfil no contrato;
- `0` cliques no WhatsApp;
- `0%` conversao.

A UI foi preparada para consumir dados reais futuros sem alterar a experiencia:

- desktop: layout tabular premium com as colunas `Fonte` e `WhatsApp`;
- mobile: lista com acordeao por origem exibindo somente cliques no WhatsApp;
- destaque discreto de principal origem apenas quando houver dados reais positivos de WhatsApp;
- a origem antes chamada `Link direto` passa a aparecer como `Perfil`, porque representa acessos/conversoes vindos do link do perfil profissional.
- as origens `Explorar` e `Busca e filtros` deixam de aparecer nesta secao do Analytics do psicologo; `Video de apresentacao` passa a representar o canal relacionado ao video do perfil.

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
