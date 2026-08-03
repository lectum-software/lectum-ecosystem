# ADR-0126: Origem do trafego em Analytics do psicologo

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

## Atualizacao 2026-08-02 - Detalhamento do Video de apresentacao

A origem `Video de apresentacao` ganhou uma atribuicao parcial e auditavel porque ja existe um evento first-party
especifico para esse CTA: `important_action_event.action_type="psychologist_video_whatsapp_click"`, com
`target_type="psychologist"` e `target_id` do psicologo. Esse evento nao substitui `contact_request` como total geral
de conversoes WhatsApp, mas pode detalhar a origem do clique dentro do dropdown do video sem estimativa.

Decidimos preencher `traffic_sources.sources[].breakdown` apenas para `presentation_video`, com:

- `Explorar`: cliques do video sem parametros de busca/filtro no path;
- `Resultados de busca`: cliques do video com parametros permitidos do diretorio no path;
- `top_search_terms`: principais termos geradores de clique, derivados exclusivamente de `search` ou `q`.

Para viabilizar a leitura daqui em diante, novos eventos de acao importante passam a preservar somente parametros
permitidos de busca/filtro no campo `important_action_event.path`. A allowlist evita armazenar queries sensiveis
arbitrarias e limita a leitura ao que a feature precisa. Eventos historicos gravados antes dessa preservacao de query
nao recebem backfill e continuam classificados pela informacao real disponivel.

Consequencias:

- O psicologo passa a ver quantos cliques de WhatsApp vieram do video em `Explorar` e em `Resultados de busca`.
- Termos de busca so aparecem quando `search` ou `q` existe no evento real; filtros sem texto livre exibem estado
  honesto sem inventar termo.
- As demais origens (`Comunidades`, `Perfil` e `Favoritos`) continuam sem distribuicao por `contact_request`, salvo
  quando houver evento first-party com alvo rastreavel em complemento especifico.
- Nao ha schema Prisma, migration, backfill, seed, mock, endpoint paralelo ou package novo.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`

## Atualizacao 2026-08-02 - Compactacao do dropdown de Video de apresentacao

Apos validacao visual mobile-first, decidimos compactar o dropdown de `Video de apresentacao` para priorizar o detalhamento acionavel:

- o total de cliques WhatsApp da origem fica no header do acordeao, ao lado do titulo, exibindo somente o numero;
- o texto descritivo da origem e a faixa interna de total foram removidos do corpo do dropdown para evitar redundancia;
- as subcategorias `Explorar` e `Resultados de busca` continuam exibindo somente o numero de cliques, sem repetir o rotulo `WhatsApp` abaixo;
- as descricoes das subcategorias foram ajustadas para nao atribuir o clique ao video quando a leitura desejada e a navegacao de descoberta ou a pesquisa no filtro de busca.

Consequencia: o contrato preserva os mesmos campos e a mesma atribuicao real; a mudanca e apenas de copy/apresentacao, sem schema, migration, mock, seed ou package novo.

## Atualizacao 2026-08-02 - Origem do trafego como leitura principal

Por feedback de produto, `Origem do trafego` passa a ser o primeiro bloco analitico apos o seletor de periodo. A leitura principal da secao continua sendo cliques WhatsApp atribuidos por evento first-party, mas cada dropdown pode exibir uma metrica secundaria quando ela tem fonte persistida propria.

Decidimos substituir a origem privada `direct_link` por `profile`, porque `Perfil` representa o perfil publico do psicologo e nao um link direto externo. Para manter o contrato evolutivo sem criar endpoint paralelo, `traffic_sources.sources[].breakdown[]` ganhou os campos genericos `metric` e `value`, preservando `whatsapp_clicks` para itens cujo valor tambem e clique WhatsApp.

Fontes usadas:

- `Video de apresentacao`: `important_action_event.action_type="psychologist_video_whatsapp_click"`, com detalhamento Explorar/Resultados de busca.
- `Comunidades`: `important_action_event.action_type="whatsapp_click"` com alvo em post/resposta autoral rastreavel, reaproveitando o agregado real por conteudo.
- `Perfil`: cliques WhatsApp via `important_action_event.action_type="whatsapp_click"` no perfil publico e acessos via `profile_view_event.source="profile_page"`.
- `Favoritos`: cliques WhatsApp vindos da lista de favoritos por path real; favoritos por video via `psychologist_video_favorite`; favoritos sem origem de video registrada ficam no bucket `Pelo perfil` porque `psychologist_favorite` nao possui coluna de origem.

Consequencia: nao distribuimos `contact_request` por origem quando nao ha evento first-party, nao criamos schema/migration e aceitamos que favoritos historicos sem origem de video nao permitam separar outras superficies alem do bucket de perfil/legado.

## Atualizacao 2026-08-02 - Diagnostico na origem do trafego

Por feedback de produto, a secao `Origem do trafego` permanece antes de `Video de apresentacao` e ganha um bloco de `Diagnostico` logo apos a lista de origens. O diagnostico e derivado exclusivamente dos `whatsapp_clicks` ja atribuidos por evento first-party em `traffic_sources.sources[]`; quando nao ha cliques rastreaveis, a UI informa que ainda esta aguardando atribuicao real.

Consequencia: nao criamos novo contrato, endpoint, schema, migration, mock ou redistribuicao de `contact_request`. A leitura e apenas uma interpretacao frontend dos agregados reais ja retornados pelo endpoint privado.


## Atualizacao 2026-08-02 - Origem abaixo de Conversoes WhatsApp

Por novo feedback de produto, a secao `Origem do trafego` deixa de abrir a area analitica e passa a ficar logo abaixo do card largo `Conversoes WhatsApp`, mantendo-se antes de `Video de apresentacao`.

Motivo: `Conversoes WhatsApp` e a sintese numerica principal precisam aparecer antes da explicacao de origem, enquanto o diagnostico de origem continua contextualizando os cliques apos a metrica principal.

Consequencia: a mudanca e apenas de hierarquia frontend; nao altera contrato, schema, migration, endpoint, mock, seed ou package.

## Atualizacao 2026-08-02 - Cards simples em Origem do trafego

Por feedback de produto, cada card mobile da secao `Origem do trafego` passa a mostrar a descricao da origem logo abaixo do titulo e deixa de ter dropdown.

Decidimos manter a leitura da secao como lista simples de `titulo + descricao curta + total de cliques WhatsApp`, sem seta, estado expandido ou detalhamento dentro dos cards. O texto da origem `Video de apresentacao`, antes vazio no contrato privado, passa a ser preenchido para manter todos os cards com o mesmo nivel de contexto.

O bloco `Diagnostico` tambem foi removido da secao para reduzir redundancia logo apos `Conversoes WhatsApp`; diagnosticos permanecem apenas nas secoes especificas em que o produto ainda precisa dessa leitura contextual.

Consequencia: a mudanca e de copy/apresentacao e reaproveita o campo `description` existente em `traffic_sources.sources[]`; o contrato pode continuar retornando `breakdown` para usos existentes em outras secoes, mas `Origem do trafego` nao renderiza mais esses detalhes. Nao altera schema, migration, endpoint, mock, seed, dado artificial ou package.

## Atualizacao 2026-08-02 - Copy em primeira pessoa nas origens

Por feedback de produto, as descricoes dos cards de origem passam a falar diretamente sobre os canais do proprio psicologo:

- `Comunidades`: posts e respostas do psicologo nas comunidades;
- `Video de apresentacao`: video do psicologo no explorar e resultados de busca;
- `Perfil`: perfil publico do psicologo;
- `Favoritos`: pagina de favoritos.

Consequencia: a mudanca e apenas de copy no campo `description` ja existente; nao altera schema, migration, endpoint, atribuicao de metricas, mock, seed ou package.

## Atualizacao 2026-08-02 - Termos pesquisados no bloco do video

Por feedback de produto, a lista `Termos pesquisados` dentro da secao `Video de apresentacao` deve representar os termos que exibiram o video do psicologo nos resultados de busca, e nao os termos que geraram cliques para WhatsApp.

Decidimos separar as leituras:

- `traffic_sources.sources[].breakdown[].top_search_terms` permanece como detalhamento de cliques WhatsApp quando a origem de trafego do video precisar dessa leitura.
- `presentation_video.search_terms` passa a ser a fonte da UI abaixo da retencao do video, calculada a partir de `profile_view_event.source="search_result"` e `profile_view_event.search_context_path`.

Complemento do mesmo dia: produto esclareceu que essa lista deve ser lida como filtros de `Minha Busca`, nao como dependencia de texto livre. Assim, a UI passa a usar o titulo `Filtros pesquisados`, o tooltip `Filtros selecionados em Minha Busca que exibiram seu video nos resultados.` e lista ate 5 filtros internos por impressoes reais em buscas filtradas. Eventos sem filtros pertencem ao `Explorar` e nao sao persistidos nem contabilizados nessa leitura privada.

Consequencia: a secao `Origem do trafego` continua simples e sem dropdown, enquanto o detalhamento de busca fica proximo do video analisado e mede descoberta filtrada, nao conversao. A mudanca usa a coluna nullable ja adicionada para contexto sanitizado de busca, sem endpoint novo, pacote novo, mock, seed, dado artificial ou backfill.
