# ADR-0264: Abas contextuais no detalhe administrativo de comunidade e ranking completo

## Status

Accepted

## Contexto

O Admin precisava acessar posts e comentários para remoção quando necessário. Havia três pontos de entrada possíveis: publicações de psicólogo, publicações de paciente e tela de comunidades, além das abas de denúncias. Criar uma guia global com todas as árvores de conteúdo reduziria contexto operacional e aumentaria risco de moderação fora da comunidade correta.

O produto decidiu que o contexto principal de comunidade deve viver dentro da própria página administrativa da comunidade, seguindo o padrão de abas já adotado no detalhe de psicólogos.

Também foi definido que o ranking de mentores da comunidade, no Admin, precisa incluir todos os psicólogos participantes. O ranking público pode continuar mostrando uma lista resumida/top, mas o Admin precisa ver posição para todos, inclusive participantes com score zero.

## Decisão

- O detalhe administrativo de comunidade passa a ser um shell com abas: **Geral**, **Dados**, **Conteúdo**, **Ranking**, **Denúncias** e **Atividades**.
- Não será criada, nesta etapa, uma tela global única com todos os conteúdos de todas as comunidades.
- A aba **Conteúdo** lista posts e comentários reais da comunidade e permite remoção administrativa com motivo obrigatório, confirmação forte e auditoria.
- Remoções administrativas são soft delete/status, nunca hard delete.
- Remover post também remove comentários vinculados; remover comentário remove a árvore descendente de comentários.
- Denúncias pendentes/em análise do conteúdo removido são marcadas como resolvidas.
- A auditoria usa `admin_activity_log` existente, com `target_type="community"`, domínio `communities`, área `conteudo`, origem `admin_panel`, motivo e metadados seguros.
- A aba **Ranking** usa todos os `community_member` ativos cujo usuário é psicólogo ativo. Todos são inicializados com métricas zeradas antes da ordenação.
- A tendência do ranking é derivada comparando a posição atual com o período anterior equivalente de 30 dias.

## Consequências

- A moderação ganha contexto de comunidade, reduzindo risco de ação no conteúdo errado.
- O Admin pode acessar conteúdo por comunidade, por psicólogo/paciente ou por denúncias, sem duplicar uma árvore global complexa.
- O ranking administrativo pode mostrar milhares de participantes via paginação, preservando posição absoluta de cada psicólogo.
- A fórmula de ranking continua alinhada ao Top Mentores, mas a visão administrativa não filtra participantes sem sinal.
- Como não houve alteração de schema Prisma, não há migration.

## Alternativas consideradas

1. **Guia global de Conteúdos no Admin**: rejeitada por misturar comunidades e reduzir contexto. Pode ser reavaliada futuramente para busca operacional global, mas não substitui a visão contextual.
2. **Abrir posts apenas no site público com botão de excluir**: rejeitada como fluxo principal porque mistura experiência pública com ação administrativa sensível.
3. **Listar apenas top mentores com atividade**: rejeitada para o Admin porque o produto exige posição para todos os psicólogos participantes.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `pnpm --dir frontend build`

## Atualização 2026-07-15: contexto operacional do conteúdo

O card da aba **Conteúdo** passa a priorizar o tipo operacional do item em vez do status publicado. A tag verde
`Publicado` foi removida; somente itens removidos mantêm marcação de status, enquanto conteúdos ativos exibem a
classificação de autoria/forma:

- post de paciente;
- comentário de paciente;
- post de psicólogo verificado;
- resposta de psicólogo verificado;
- post de psicólogo não verificado;
- resposta de psicólogo não verificado.

A classificação é derivada no backend a partir de `user.role`, do tipo de entidade real (`community_post` ou
`post_reply`) e do mesmo critério de verificação profissional usado no produto público
(`isVerifiedProfessionalEntitlement`). O contrato também expõe a primeira mídia publicada do conteúdo, quando existir,
e uma prévia segura do conteúdo de origem para comentários/respostas, sem armazenar dado novo nem criar mock.

Consequência: a moderação contextual consegue diferenciar rapidamente autoria e natureza do conteúdo, ver mídia
publicada e entender a origem de comentários/respostas sem abrir a página pública em outra aba.

## Atualização 2026-07-15: miniplayer vertical e contexto antes da resposta

Na aba **Conteúdo**, vídeos publicados devem ser interativos no próprio card administrativo, não apenas uma imagem com
ícone de play. A miniatura de vídeo passa a ser um miniplayer com controles nativos do navegador e proporção 9:16,
alinhada ao formato vertical usado nas publicações com vídeo-resposta.

A prévia do conteúdo de origem para comentários/respostas também passa a ser renderizada antes do texto da
resposta/comentário. A decisão favorece leitura "contexto primeiro" durante a moderação: o Admin vê o post/comentário
respondido antes de analisar o conteúdo derivado.

Consequências:

- vídeos usam `<video controls>` no Admin, sem overlay que impeça o play;
- imagens continuam sendo renderizadas com `next/image`;
- a mudança é apenas de apresentação e não altera contrato persistido, schema Prisma, endpoint ou dados de produção.

## Atualização 2026-07-15: ações icon-only e métricas no rodapé do card

O card administrativo da aba **Conteúdo** passa a separar ações de moderação/visualização das métricas de engajamento.
As ações de abrir no site e excluir/remover ficam em uma coluna lateral à direita no desktop, exibindo somente ícones
visíveis e preservando acessibilidade por `aria-label`, `title` e texto oculto para leitores de tela.

As métricas de upvotes, downvotes, comentários, salvos e denúncias passam para o rodapé do card, abaixo de uma linha
horizontal. A decisão alinha a leitura ao padrão do site público, reduz competição visual com título, mídia e prévia de
origem e mantém as métricas como informação secundária de suporte à moderação.

Consequência: a mudança é somente de apresentação no Admin; não altera contrato, persistência, schema Prisma nem regra
de remoção auditada.

## Atualização 2026-07-15: miniplayer com play explícito e resposta sem título de origem

O miniplayer de vídeo da aba **Conteúdo** passa a exibir um botão central de play além dos controles nativos do
navegador. O botão aciona o próprio elemento `<video>`, mantendo a reprodução no card administrativo.

Para comentários/respostas, o card separa a prévia de origem do conteúdo próprio: a prévia continua acima como contexto
do post/comentário respondido, mas o corpo da resposta não repete mais o título do post de origem. A resposta exibe
apenas seu texto, quando existir, e a mídia publicada. O grid de mídia/texto passa a ser renderizado abaixo da prévia de
origem, alinhando o miniplayer à altura da resposta.

Consequência: a moderação vê origem e resposta como blocos distintos, sem duplicar título do post original e sem
deslocar a mídia para a altura do contexto. A mudança permanece apenas visual e não altera contrato de API nem
persistência.

## Atualização 2026-07-15: linha de autor com nome e selo

A linha de autoria dos cards da aba **Conteúdo** deixa de exibir o papel do usuário entre parênteses. Para reduzir ruído
visual, o card mostra somente o nome do autor e, quando `author.verified` for verdadeiro, um selo `verificado` com
ícone.

Consequência: a natureza do conteúdo continua explícita na badge operacional do card, enquanto a autoria fica focada em
identificação nominal e verificação profissional, sem repetir `paciente`/`psicologo` em parênteses.

## Atualização 2026-07-15: selo azul compartilhado visualmente

A autoria verificada na aba **Conteúdo** passa a usar o selo azul de perfil verificado já adotado no app principal,
em vez de uma tag textual `verificado`. Como o Admin e o frontend devem permanecer aplicações separadas, o SVG do selo
foi reproduzido localmente no card administrativo, mantendo equivalência visual sem criar importação entre apps.

Consequência: o Admin fica visualmente alinhado à experiência pública da Lectum e evita duplicar texto de status na
linha de autor; a regra continua derivada de `author.verified`.

## Atualiza��o 2026-07-15: identidade de autor antes da m�dia e papel por g�nero

O card administrativo da aba **Conte�do** passa a apresentar a identidade do autor como bloco pr�prio antes do conte�do publicado. O bloco re�ne avatar, nome, selo azul de verificado quando aplic�vel e o papel do autor em uma segunda linha, antes do grid que cont�m m�dia e texto.

Para psic�logos, o backend agora inclui `author.gender` no contrato de conte�do administrativo, derivado de `psychologist_profile.gender` no mesmo select real usado para nome profissional e verifica��o. O Admin usa esse campo para exibir `Psic�loga` quando o g�nero cadastrado � `feminino` e `Psic�logo` nos demais casos de autor psic�logo. Pacientes e autores an�nimos continuam sem g�nero exposto nesse contrato e exibem `Paciente`.

Consequ�ncia: a autoria fica visualmente mais pr�xima do padr�o do feed p�blico, evita repetir o papel em par�nteses e remove o r�tulo amb�guo `Psic�logo/Psic�loga`, sem inferir g�nero por nome, sem alterar schema Prisma e sem criar endpoint paralelo.

Valida��o desta atualiza��o: `pnpm --dir backend check`, `pnpm --dir admin check`, `pnpm --dir backend build`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/tdah?tab=conteudo` retornando 200.


Valida��o desta atualiza��o: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm --dir frontend check`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/tdah?tab=conteudo` retornando 200.

## Atualiza��o 2026-07-15: identidade administrativa em post an�nimo

A aba **Conte�do** do Admin passa a tratar anonimato como uma propriedade expl�cita do autor no contrato administrativo (`author.anonymous`), sem mascarar o nome nem trocar o papel real do autor. Para posts an�nimos de pacientes, o backend privado retorna o nome real do paciente ao Admin e mant�m `author.role` como `paciente`; a UI sinaliza o contexto p�blico com o marcador `Post feito anonimamente` abaixo do nome.

A decis�o separa privacidade p�blica de necessidade operacional administrativa: pacientes continuam an�nimos no site p�blico, enquanto administradores conseguem identificar o autor real para modera��o e auditoria. O snapshot usado na remo��o administrativa tamb�m registra `author_anonymous` para preservar o estado de anonimato do conte�do removido.

Consequ�ncia: n�o h� novo endpoint, mock, schema Prisma ou altera��o de persist�ncia; a mudan�a fica restrita ao DTO derivado de dados reais e � apresenta��o no Admin.

Valida��o desta atualiza��o: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/tdah?tab=conteudo` retornando 200.


## Atualização 2026-07-15: filtros operacionais acima da listagem de conteúdo

A aba **Conteúdo** do detalhe administrativo de comunidade passa a separar os controles de busca/filtro da listagem. O bloco **Buscar / Tipo / Período** fica em um card próprio acima do card de resultados, preservando a leitura mobile-first.

O filtro de status foi removido da interface porque a operação precisa principalmente segmentar a natureza/autoria do conteúdo. O status continua vindo do contrato para marcar itens removidos e proteger a ação de exclusão.

O filtro **Tipo** passa a usar classificações derivadas de dados reais do item: posts de psicólogo verificado, posts de psicólogo não verificado, respostas de psicólogo verificado, respostas de psicólogo não verificado, comentários de pacientes e posts anônimos.

Para sustentar Posts anônimos, o backend classifica community_post.anonymous=true como nonymous_post, sem coluna nova e sem alterar a regra de autoria persistida. O filtro de **Período** usa presets simples sobre created_at (ll, 7d, 30d, 90d).

Validação desta atualização: pnpm --dir backend check, pnpm --dir backend build, pnpm --dir admin check, pnpm --dir admin build, pnpm check e smoke local GET http://localhost:3002/comunidades/tdah?tab=conteudo retornando 200.

## Atualizacao 2026-07-15: fullscreen vertical no miniplayer administrativo

O miniplayer de video da aba **Conteudo** passa a ter regra explicita para o modo fullscreen nativo do navegador. O elemento `<video>` recebe uma classe dedicada e, ao entrar em `:fullscreen` ou `:-webkit-full-screen`, fica centralizado em fundo preto com dimensoes calculadas para caber na viewport sem sair da proporcao 9:16.

A decisao preserva a mesma leitura vertical do card ampliado, evitando que videos-resposta sejam esticados ou apresentados em paisagem na tela cheia. Foi mantido `object-fit: cover` para que videos com metadados paisagem ainda sigam a composicao vertical usada no miniplayer.

Tambem foi removido `period="all"` da query inicial da aba **Denuncias**, porque esse filtro pertence ao contrato de **Conteudo**. A remocao evita regressao de typecheck sem alterar API ou comportamento visual da aba de denuncias.

Consequencia: a mudanca e apenas visual/CSS no Admin, com correcao local de tipo; nao altera API, persistencia, schema Prisma, dependencias ou fluxo de upload/reproducao.

Validacao desta atualizacao: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/autocuidado-em-pratica?tab=conteudo` retornando 200.

## Atualizacao 2026-07-15: contagem da listagem e chevrons dos filtros de conteudo

A aba **Conteudo** do detalhe de comunidade passa a apresentar a contagem operacional como texto de listagem: `Mostrando X de X registros.`, com `X` visivel derivado do tamanho da pagina retornada pela API e o total derivado de `count`.

O badge separado de total foi removido para evitar duplicidade visual no cabecalho da listagem. Os dropdowns **Tipo** e **Periodo** passam a esconder a seta nativa e renderizar `ChevronDown` com espacamento explicito a direita, mantendo o select nativo e sem dependencia nova.

Consequencia: a mudanca e apenas visual no Admin; nao altera API, persistencia, schema Prisma, dependencias, paginacao nem filtros reais.

Validacao desta atualizacao: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/autocuidado-em-pratica?tab=conteudo` retornando 200.


## Atualizacao 2026-07-15: metricas de compartilhamento, visualizacao e WhatsApp por conteudo

A aba **Conteudo** do detalhe administrativo de comunidade passa a mostrar, no rodape de cada card, tres metricas adicionais de alcance: compartilhamentos, visualizacoes e cliques no WhatsApp.

A decisao e manter as metricas no mesmo contrato real do endpoint de conteudo, sem agregador materializado novo: compartilhamentos usam `post_share`, visualizacoes usam `page_view_event` e cliques de WhatsApp usam `important_action_event` quando o evento possui `action_type="whatsapp_click"` e alvo explicito de post ou resposta.

Consequencias:

- views de posts ja podem refletir pageviews existentes em `community_post`/`post`;
- views e WhatsApp de respostas dependem de eventos com alvo explicito e podem iniciar em zero ate que novos eventos sejam capturados;
- clicks historicos de WhatsApp sem origem de conteudo nao sao redistribuidos por inferencia;
- a remocao administrativa continua auditada pelo fluxo existente e nao ha alteracao de schema Prisma, migration ou package.


## Atualizacao 2026-07-15: filtro de periodo com datas fixas no Conteudo

A aba **Conteudo** do detalhe administrativo de comunidade passa a usar os mesmos presets operacionais da aba **Publicacoes** do detalhe de psicologo: **Esta semana**, **Este mes**, **Este ano**, **Todo o periodo** e **Personalizado**.

A decisao e manter os campos **De** e **Ate** sempre visiveis para dar previsibilidade ao recorte ativo. Presets atualizam o rascunho das datas no frontend, mas somente `period=custom` envia `from`/`to` como filtro efetivo. `period=all` permanece sem limite de data no backend para preservar o significado de todo o historico da comunidade.

Consequencias:

- a UI fica consistente com filtros de publicacoes do psicologo;
- datas editadas mudam automaticamente o periodo para **Personalizado**;
- o endpoint real passa a validar intervalo customizado antes de filtrar `created_at`;
- nao ha nova tabela, migration, dependencia ou dado artificial.


## Atualizacao 2026-07-15: metricas ordenadas por alcance e WhatsApp contextual

A aba **Conteudo** do detalhe administrativo de comunidade passa a priorizar **Visualizacoes** como primeira metrica do card, porque ela representa alcance bruto antes das interacoes derivadas como votos, comentarios, salvos e compartilhamentos.

A metrica de cliques no WhatsApp continua usando `whatsapp_clicks_count` do contrato real, mas agora e renderizada somente para conteudos de psicologos (`author.role === "psicologo"`). Conteudos de paciente, incluindo comentarios e posts anonimos, nao possuem CTA de WhatsApp no produto e portanto nao devem expor essa metrica na UI administrativa.

Para manter consistencia visual com a Lectum sem acoplar apps separadas, o Admin reproduz localmente o SVG de WhatsApp ja usado no app principal em vez de importar codigo do frontend.

Consequencia: a mudanca e apenas de apresentacao; nao altera API, schema Prisma, persistencia, eventos first-party, dependencias ou regras de captura das metricas.

Validacao desta atualizacao: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/autocuidado-em-pratica?tab=conteudo` retornando 200.

## Atualizacao 2026-07-15: fullscreen custom para video 9:16

A regra CSS aplicada diretamente ao `video:fullscreen` nao foi suficiente no Chrome: ao usar o fullscreen nativo dos controles, o navegador continuava expandindo o elemento para a viewport em paisagem e esticando a composicao visual.

A decisao agora e tratar a ampliacao do miniplayer administrativo como fluxo proprio da UI: o card exibe um botao de ampliar e abre um container fullscreen/fixed com fundo preto. O elemento de video fica dentro desse container, centralizado e dimensionado por `aspect-ratio: 9 / 16`, com largura e altura limitadas pela viewport. O fullscreen nativo do video foi ocultado via `controlsList="nofullscreen"` para evitar o caminho que estica a midia.

O tempo atual do video e preservado entre o miniplayer e o overlay ampliado. Se a API de fullscreen do navegador falhar, o overlay fixed ainda apresenta a mesma experiencia 9:16 dentro da pagina.

Consequencia: a correcao fica isolada na apresentacao do Admin, sem novo endpoint, dependencia, schema Prisma, migration ou alteracao de persistencia. O trade-off e substituir o botao nativo de fullscreen por uma acao visual propria, mais controlavel e consistente para videos verticais.

Validacao desta atualizacao: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/autocuidado-em-pratica?tab=conteudo` retornando 200.

## Atualizacao 2026-07-16: paginacao padrao no conteudo administrativo de comunidade

A navegacao de paginas usada no detalhe administrativo de comunidade passa a seguir o mesmo padrao visual da aba **Publicacoes** do detalhe administrativo de psicologo: controles centralizados, setas icon-only e pagina atual destacada como botao primario.

A decisao remove a leitura antiga `Pagina X de Y` com botoes textuais grandes `Anterior`/`Proxima`, que destoava do restante do painel. O componente preserva a fonte real de paginacao retornada pelos endpoints e limita a janela visual a ate 5 paginas para manter a barra compacta em mobile e desktop.

Consequencia: a mudanca e exclusivamente visual no Admin, sem novo endpoint, schema Prisma, migration, dependencia, mock ou alteracao de persistencia.

Validacao desta atualizacao: `pnpm --dir admin exec biome check "src/app/(admin)/comunidades/[slug]/client.tsx"`, `pnpm --dir admin build` e smoke local `GET http://localhost:3002/comunidades/autocuidado-em-pratica?tab=conteudo` retornando 200. O `pnpm --dir admin check` completo ficou bloqueado por pendencias preexistentes em `admin/src/app/(admin)/psicologos/[id]/client.tsx`, fora do escopo desta decisao.


## Atualização 2026-07-16: atividades administrativas em tabela

A aba **Atividades** do detalhe administrativo de comunidade passa a seguir o mesmo padrão visual da aba **Atividades** do detalhe administrativo de psicólogos: controles em card próprio e listagem em tabela responsiva com cabeçalho, linhas separadas e paginação no rodapé.

A decisão é manter a fonte real `admin_activity_log` e apenas reorganizar sua apresentação. A coluna **Descrição** concentra motivo, área e origem administrativa; a coluna **Usuário** apresenta o ator real do log e identifica o papel como Admin.

Consequência: a leitura operacional fica consistente entre comunidades e psicólogos, sem alterar endpoint, contrato, schema Prisma, persistência, dependências ou regras de auditoria.

Validação desta atualização: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=atividades` retornando 200.

## Atualizacao 2026-07-16: metricas e filtros nas denuncias da comunidade

A aba **Denuncias** do detalhe administrativo de comunidade passa a usar o mesmo modelo operacional da aba **Denuncias** do detalhe administrativo de psicologos para triagem: cards superiores de total, pendentes, procedentes e improcedentes, seguidos de filtros por tipo de conteudo, status e periodo.

A decisao e derivar a classificacao no backend privado a partir das entidades reais: `post_report`, `community_post`, `post_reply`, `user.role` e verificacao profissional via regra existente de entitlement. O status bruto continua preservado no item, mas a UI usa `status_group` e `status_label`: `pendente`/`em_analise` como **Pendente**, `resolvida` como **Procedente** e `rejeitada` como **Improcedente**.

O filtro de tipo usa categorias operacionais para denuncia: post/resposta de psicologo verificado, post/resposta de psicologo nao verificado, post de paciente e comentario de paciente. Neste contexto, posts anonimos de paciente sao tratados como **Post de paciente**, pois a aba de denuncias precisa segmentar autoria/forma sem criar uma categoria paralela de anonimato.

Consequencia: a tela ganha leitura agregada e filtros consistentes sem nova tabela, migration, package, mock ou endpoint paralelo. O contrato de reports da comunidade foi expandido com `cards`, `filters`, `period`, `content_kind`, `status_group` e labels de apresentacao, mantendo `source="post_report+community_post+post_reply"`.

Validacao desta atualizacao: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=denuncias` retornando 200 e smoke sem sessao Admin do endpoint de reports retornando 401. A validacao visual autenticada por browser ficou limitada pela ausencia de sessao Admin no Chrome headless local.

## Atualizacao 2026-07-16: denuncias agrupadas por conteudo

A aba **Denuncias** do detalhe administrativo de comunidade passa a agrupar `post_report` por alvo canonico (`target_type`/`target_id`, com fallback para `post_id`/`reply_id`). Assim, quando mais de um usuario denuncia o mesmo post ou comentario, a UI exibe o conteudo denunciado uma unica vez e lista todos os denunciantes relacionados.

O contrato de reports agora retorna o conteudo completo necessario para moderacao: texto integral, titulo quando existir, midia principal de post ou resposta, URL publica quando o conteudo ainda esta disponivel, contagem total de denuncias do alvo, contadores por status e lista de denunciantes com motivo, descricao, data e status individual.

A ordenacao padrao dos grupos e `report_count desc` e, em empate, ultima denuncia mais recente primeiro. Os cards superiores continuam contando denuncias reais, enquanto a listagem pagina grupos de conteudo denunciado.

A decisao de moderacao na aba de comunidade adiciona duas acoes terminalmente auditadas para grupos com pendencias: **Marcar improcedente** atualiza denuncias pendentes/em_analise do mesmo conteudo para `rejeitada`; **Marcar procedente** atualiza para `resolvida`. Essas acoes nao removem o conteudo; remocao continua pertencendo a aba **Conteudo**. A auditoria usa `admin_activity_log` com area `denuncias`, acoes `community_report_dismissed`/`community_report_upheld`, motivo obrigatorio e snapshots seguros sem payload bruto.

Consequencia: a triagem comunitaria fica consistente com a resolucao de denuncias de psicologos, sem criar tabela nova, migration, dependencia, mock ou endpoint paralelo. O trade-off e que um mesmo grupo pode aparecer em filtros diferentes se possuir denuncias terminais e pendentes no mesmo periodo; isso preserva a relacao completa dos denunciantes do alvo.

Validacao desta atualizacao: `pnpm --dir backend check`, `pnpm --dir admin check`, `pnpm --dir backend build`, `pnpm --dir admin build`, `pnpm check`, smoke local da rota Admin de denuncias retornando 200 e smoke sem sessao Admin do endpoint de resolucao retornando 401.

## Atualizacao 2026-07-16: denuncias da comunidade em cards compactos

A lista de conteudos denunciados da aba **Denuncias** deixa de usar um bloco introdutorio separado de "Fila de triagem" e remove o painel lateral de status/contadores por item. O card de cada conteudo passa a concentrar somente a informacao operacional necessaria para triagem:

- tipo/autoria do conteudo denunciado;
- quantidade de denuncias recebidas;
- data da ultima denuncia;
- conteudo denunciado;
- historico de denunciantes com nome, data e motivo;
- acoes diretas **Improcedente** e **Procedente** quando ainda houver pendencias.

A decisao preserva as mesmas fontes reais (`post_report`, `community_post`, `post_reply`) e o mesmo endpoint de resolucao auditada. A mudanca e exclusivamente visual, mobile-first, sem novo contrato, endpoint, schema Prisma, migration, package, mock ou backfill.

Validacao desta atualizacao: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=denuncias` retornando 200.

## Atualizacao 2026-07-16: filtros operacionais nas atividades da comunidade

A aba **Atividades** do detalhe administrativo de comunidade passa a compartilhar o mesmo modelo operacional da aba **Atividades** do detalhe administrativo de psicologos: card de filtros por periodo, area, tipo de atividade e busca textual, seguido pela tabela auditavel.

A decisao e calcular opcoes de **Area** e **Tipo de atividade** a partir do proprio `admin_activity_log` retornado para a comunidade, apos o recorte de periodo. O backend aceita `from`/`to` somente quando ambos sao enviados e limita o intervalo customizado a 365 dias, evitando consultas amplas acidentais sem remover a opcao **Todo historico registrado**.

Consequencia: comunidades e psicologos usam o mesmo padrao visual e mental para auditoria de atividades. O contrato de activities da comunidade foi expandido com `filters`, `period` e `active_filters_count`, mantendo `source="admin_activity_log"` e sem nova tabela, migration, package, mock ou endpoint paralelo.

Validacao desta atualizacao: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://127.0.0.1:3012/comunidades/relacionamentos-com-proposito?tab=atividades` retornando 200 em worktree isolada por alteracoes concorrentes na arvore principal.

## Atualizacao 2026-07-16: desativacao administrativa de comunidade

A aba **Dados** do detalhe administrativo de comunidade passa a concentrar tambem o controle de disponibilidade da comunidade, logo apos **Regras da comunidade**. A decisao e tratar desativacao como status operacional (`community.active=false` e `deactivated_at`) em vez de soft delete, preservando posts, comentarios, seguidores, regras e historico administrativo.

A acao exige motivo interno e confirmacao forte (`DESATIVAR COMUNIDADE` ou `REATIVAR COMUNIDADE`) e grava auditoria em `admin_activity_log` com dominio `communities`, area `dados`, origem `admin_panel`, acoes `community_deactivated`/`community_reactivated` e snapshots seguros de `active`/`deactivated_at`.

Consultas publicas de comunidades, feed/posts, posts salvos, publicacoes no perfil de psicologos e ranking publico passam a filtrar `community.active=true`. O Admin continua encontrando comunidades inativas para revisao e reativacao.

Consequencia: ha migration Prisma para adicionar `active`, `deactivated_at` e indices de leitura publica; a operacao fica reversivel e auditavel, sem apagar dados nem criar endpoint simulado.

Validacao desta atualizacao: `pnpm --dir backend db:migrate --name community_active_status`, `pnpm --dir backend check`, `pnpm --dir admin check`, `pnpm --dir backend build`, `pnpm --dir admin build`, `pnpm check`, smoke local da aba Dados retornando 200 e smoke sem sessao Admin do endpoint de status retornando 401.

## Atualizacao 2026-07-16: acentuacao dos filtros de atividades

Os textos adicionados nos filtros e na tabela de **Atividades** da comunidade devem permanecer em UTF-8 correto. A correcao restaura acentos de labels e placeholders no Admin e nas labels retornadas pelo endpoint de activities, sem alterar a regra de filtros ou o contrato semantico.

Consequencia: a experiencia visual volta a ficar consistente em portugues brasileiro e o contrato continua usando os mesmos campos `filters`, `period` e `active_filters_count`.

Validacao desta atualizacao: `pnpm --dir admin check`, `pnpm --dir backend check`, `pnpm --dir admin build`, `pnpm --dir backend build`, `pnpm check` e smoke local `GET http://127.0.0.1:3012/comunidades/relacionamentos-com-proposito?tab=atividades` retornando 200.

## Atualizacao 2026-07-16: descricao limpa na tabela de atividades

A coluna **Descricao** da aba **Atividades** do detalhe administrativo de comunidade passa a exibir somente o texto descritivo do evento administrativo. Os prefixos visuais **Motivo**, **Area** e **Origem** foram removidos da celula para reduzir ruido e alinhar a leitura ao pedido operacional.

A decisao preserva a auditoria real em `admin_activity_log`: area e origem continuam disponiveis no contrato e nos filtros, mas deixam de ser repetidas em cada linha da descricao. Quando o log nao tiver motivo, a UI mostra **Sem descricao registrada.**

Consequencia: a mudanca e exclusivamente visual no Admin, sem novo endpoint, contrato semantico, schema Prisma, migration, dependencia, mock ou alteracao de persistencia.

Validacao desta atualizacao: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://127.0.0.1:3012/comunidades/relacionamentos-com-proposito?tab=atividades` retornando 200.

## Atualizacao 2026-07-16: aba Estatisticas da comunidade

O detalhe administrativo de comunidade passa a ter a aba **Estatisticas** entre **Geral** e **Dados**, com leitura agregada e graficos simples baseados em fontes first-party reais da propria comunidade.

A decisao e usar um endpoint contextual novo, `GET /api/admin/private/communities/:id/statistics`, dentro do modulo existente de comunidades, em vez de criar uma tela global ou um dashboard paralelo. O contrato consolida:

- seguidores por perfil a partir de `community_member`;
- usuarios ativos e novos usuarios ativos a partir da primeira/atual atividade real em `community_member`, `community_post`, `post_reply` e `page_view_event` autenticado;
- postagens por psicologo verificado, psicologo nao verificado e paciente;
- posts de pacientes respondidos por psicologos verificados;
- respostas/comentarios por psicologo verificado, psicologo nao verificado e paciente;
- denuncias em `post_report`;
- posts anonimos por `community_post.anonymous`.

Psicologo verificado continua usando a regra canonica `isVerifiedProfessionalEntitlement`/entitlement profissional ativo, sem criar status paralelo. Usuarios ativos representam atividade real dentro da comunidade no periodo filtrado, nao consulta clinica, conversa, atendimento ou dado externo ao produto. Pageviews anonimos nao entram na quebra por perfil.

Consequencia: o Admin ganha estatisticas operacionais por comunidade sem schema novo, migration, dependencia de graficos ou backfill artificial. Periodos usam presets semana/mes/ano/todo historico/personalizado e os graficos tem alternativa textual acessivel.

Validacao desta atualizacao: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=estatisticas` retornando 200 e smoke sem sessao Admin de `GET /api/admin/private/communities/relacionamentos-com-proposito/statistics?period=month` retornando 401.

## Atualizacao 2026-07-16: segmentacao da aba Estatisticas da comunidade

A aba **Estatisticas** do detalhe administrativo de comunidade passa a ficar depois de **Dados** na navegacao e deixa de apresentar uma grade generica de totais. A leitura fica segmentada em dois blocos operacionais: **Estatisticas de pessoas** e **Estatisticas de conteudo**.

A decisao e seguir o padrao mental ja usado em **Estatisticas** do detalhe administrativo de psicologos: cada contador e tambem um controle de legenda, permitindo exibir ou ocultar sua curva no grafico do periodo. Para isso, o contrato de `GET /api/admin/private/communities/:id/statistics` foi expandido com pontos diarios segmentados por papel/verificacao, preservando os contadores agregados existentes para compatibilidade.

A segmentacao de pessoas considera seguidores atuais por papel, usuarios ativos reais no periodo e novos usuarios cuja primeira atividade real na comunidade ocorreu no periodo. A segmentacao de conteudo considera postagens por papel, respostas de psicologos verificados/nao verificados, comentarios de pacientes e denuncias. Fontes permanecem first-party e reais: `community_member`, `community_post`, `post_reply`, `post_report` e `page_view_event` autenticado.

Consequencia: a UI ganha comparacao visual por curva sem dependencia de biblioteca de graficos, sem schema novo, migration, backfill ou mock. Posts anonimos e pacientes respondidos por verificados continuam disponiveis no contrato anterior, mas deixam de ser cards visiveis nesta segmentacao por pedido de produto.

Validacao desta atualizacao: `pnpm --dir admin check`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin build`, `pnpm check`, smoke local da rota Admin de Estatisticas retornando 200 e smoke sem sessao Admin do endpoint de estatisticas retornando 401.

## Atualizacao 2026-07-16: filtros de periodo dentro dos blocos de Estatisticas

Os controles de periodo da aba **Estatisticas** da comunidade passam a viver no cabecalho de **Estatisticas de pessoas** e **Estatisticas de conteudo**, alinhados a direita do titulo em telas amplas e empilhados no mobile.

A decisao inicial preservava uma unica query contextual para os dois blocos. O ajuste seguinte substitui essa estrategia por estado e consultas independentes por bloco, mantendo o mesmo endpoint real e sem criar contrato paralelo.

## Atualizacao 2026-07-16: filtros de Estatisticas sem container destacado

Os filtros de periodo dos blocos **Estatisticas de pessoas** e **Estatisticas de conteudo** permanecem no cabecalho direito, mas deixam de exibir o resumo textual do periodo e deixam de ter container com fundo destacado atras dos campos.

A decisao deste ajuste e puramente visual no formato dos campos. O ajuste seguinte separa estado e query por bloco para evitar recarregamento cruzado; nao ha novo endpoint, contrato semantico, schema Prisma, migration, dependencia ou mock.

Validacao desta atualizacao: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm check`, smoke local da rota Admin de Estatisticas retornando 200 e smoke sem sessao Admin do endpoint de estatisticas retornando 401.

## Atualizacao 2026-07-16: periodo independente por bloco de Estatisticas

A aba **Estatisticas** do detalhe administrativo de comunidade passa a manter estado de periodo, intervalo customizado e consulta React Query independentes para **Estatisticas de pessoas** e **Estatisticas de conteudo**.

A decisao reutiliza o mesmo endpoint real `GET /api/admin/private/communities/:id/statistics`, protegido por Admin, mas instancia duas assinaturas de consulta no cliente com chaves de cache derivadas dos parametros de cada bloco. Assim, ao alterar **Periodo**, **De** ou **Ate** em um bloco, somente seus contadores e seu grafico entram em carregamento/atualizacao; o outro bloco preserva filtros, dados e serie temporal ate que seu proprio filtro seja alterado.

Consequencia: a interacao fica mais localizada e consistente com o modelo de estatisticas de psicologos, sem recarregar a pagina inteira, sem endpoint paralelo, sem novo contrato semantico, schema Prisma, migration, dependencia, mock ou persistencia adicional.

Validacao desta atualizacao: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke local da rota Admin de Estatisticas retornando 200 e smoke sem sessao Admin do endpoint de estatisticas retornando 401.

## Atualizacao 2026-07-16: contadores e iconografia das Estatisticas de comunidade

A aba **Estatisticas** do detalhe administrativo de comunidade passa a mostrar, no contador **Postagens de pacientes**, a quebra operacional de posts anonimos e identificados com quantidade e percentual sobre o total de posts de pacientes do periodo. A UI deriva a quebra do contrato real existente (`counters.posts.patients` e `counters.anonymous_posts.total`), sem novo endpoint, schema, migration, package, mock ou backfill.

A iconografia dos contadores tambem fica agrupada por conceito para reduzir ruido visual: psicologos usam o icone `Brain` como referencia a saude mental, pacientes usam `Users`, postagens usam `FileText` (icone de post ja usado na Lectum) e respostas de psicologos usam `Reply` (seta de resposta ja usada na Lectum). As descricoes dos blocos foram trocadas por copies de visao geral, mantendo os contadores clicaveis e as curvas existentes.

Validacao complementar 2026-07-16: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=estatisticas` retornando 200.

## Atualizacao 2026-07-16: resumo diario operacional da comunidade

O card **Resumo da comunidade** da aba Geral passa a ser **Resumo da comunidade hoje** e deixa de repetir totais historicos. A decisao de produto e usar um recorte diario operacional com os indicadores pedidos pelo Admin: novos pacientes ativos, novos psicologos ativos, novos psicologos seguidores, novos pacientes seguidores, posts de psicologos, posts de pacientes, respostas de psicologos verificados, respostas de psicologos nao verificados e comentarios de pacientes.

O contrato real de `GET /api/admin/private/communities/:id` foi expandido com `today_summary`, calculado no backend a partir das mesmas fontes first-party ja auditadas para estatisticas da comunidade: `community_member`, `community_post`, `post_reply` e `page_view_event` autenticado. Seguidores novos usam `community_member.createdAt` dentro do dia corrente no fuso do servidor; novos usuarios ativos continuam representando a primeira atividade real do usuario na comunidade, sem contar Admin e sem criar evento artificial.

Consequencia: a aba Geral ganha leitura diaria sem consulta paralela no cliente, sem schema Prisma/migration, sem package novo, sem mock, sem backfill e sem alterar o detalhe historico usado pelo cabecalho. A UI permanece mobile-first com cards empilhados em telas pequenas e grid progressivo em telas maiores.

Validacao complementar 2026-07-16: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito` retornando 200.

## Atualizacao 2026-07-16: urgencias na aba Geral da comunidade

A aba Geral do detalhe administrativo de comunidade deixa de priorizar o grafico historico de **Desempenho** e passa a destacar **Coisas mais urgentes**. A decisao e transformar o espaco lateral em uma fila operacional de triagem, com links diretos para **Denuncias** e **Conteudo**, porque o resumo diario ja atende a leitura de volume do dia.

O contrato real de `GET /api/admin/private/communities/:id` foi expandido com `urgent_summary`, derivado de `post_report` agrupado por conteudo e filtrado para itens pendentes. A UI combina esse resumo com o `today_summary` existente para sinalizar respostas de psicologos nao verificados, posts de pacientes e comentarios de pacientes do dia corrente.

Consequencia: a decisao preserva fontes first-party reais, nao cria dashboard paralelo, nao cria endpoint adicional, nao altera schema Prisma/migration e nao usa mocks. A leitura da aba Geral fica mais acionavel para moderacao e acompanhamento sem remover as estatisticas historicas da aba **Estatisticas**.

Validacao complementar 2026-07-16: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito` retornando 200.

## Atualizacao 2026-07-16: comparativo de periodo nos contadores de Estatisticas da comunidade

Os contadores dos blocos **Estatisticas de pessoas** e **Estatisticas de conteudo** passam a exibir comparativo contra o periodo imediatamente anterior, seguindo o padrao visual ja usado nos contadores do detalhe administrativo do psicologo.

A decisao e manter o endpoint existente `GET /api/admin/private/communities/:id/statistics` como fonte unica de dados e fazer, no cliente Admin, uma segunda consulta React Query por bloco com `period=custom`, `from` e `to` calculados a partir da duracao do filtro atual. Assim, o comparativo reutiliza o contrato real de estatisticas, sem endpoint paralelo, sem schema novo, sem migration, sem package novo e sem mock.

A regra de variacao segue a semantica do detalhe de psicologo: quando existe base anterior, mostra a variacao percentual e a direcao; quando o valor anterior e zero e o atual e maior que zero, mostra **sem base anterior** em vez de criar um percentual artificial. O preset **Todo o periodo** nao exibe comparativo porque nao ha recorte anterior equivalente confiavel.

Consequencia: cada bloco de estatisticas passa a usar uma consulta adicional apenas quando ha periodo comparavel. A interacao permanece localizada por bloco, preservando filtros independentes, a quebra de posts anonimos/identificados e as curvas existentes.

Validacao complementar 2026-07-16: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=estatisticas` retornando 200.

## Atualizacao 2026-07-17: contadores de destaque na aba Geral da comunidade

A aba **Geral** do detalhe administrativo de comunidade passa a iniciar com uma grade de cinco contadores de destaque,
seguindo o mesmo padrao visual dos cards principais da aba **Geral** do detalhe administrativo de psicologos.

Os contadores exibidos sao:

- posts de pacientes;
- posts de psicologos;
- respostas de psicologos;
- comentarios de pacientes;
- denuncias.

A decisao e expor estes contadores como leitura historica da comunidade, calculada pelo mesmo endpoint real
`GET /api/admin/private/communities/:id`. O contrato foi expandido com `highlight_counters`, derivado do dataset
first-party ja usado pela aba de estatisticas (`community_post`, `post_reply` e `post_report`) e sem criar endpoint
paralelo, schema Prisma, migration, dependencia, mock ou backfill.

Consequencia: o Admin ganha uma leitura imediata dos principais volumes de conteudo/moderacao antes do resumo diario e
das urgencias, preservando a aba **Estatisticas** para analises por periodo e graficos.

Validacao complementar 2026-07-17: `pnpm --dir backend check`, `pnpm --dir admin check`,
`pnpm --dir backend build`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local
`GET http://localhost:3002/comunidades/relacionamentos-com-proposito` retornando 200.

## Atualizacao 2026-07-17: carrossel apenas em Estatisticas de conteudo

Os contadores de **Estatisticas de pessoas** devem ocupar a largura util em grade responsiva, sem rolagem horizontal. A
decisao e reservar o carrossel horizontal somente para **Estatisticas de conteudo**, porque esse bloco tem mais
contadores e pode precisar de navegacao progressiva.

O carrossel de conteudo passa a ocultar a barra horizontal nativa e a posicionar as setas em colunas laterais, junto ao
primeiro e ao ultimo card visiveis, sem encobrir os contadores selecionaveis e sem rotulo visual redundante acima dos
cards. Os cards do carrossel usam as mesmas larguras responsivas dos cards de pessoas: 1 coluna no mobile, 2 em `sm`, 3
em `lg` e 6 em `2xl`, preservando tamanho visual consistente entre os dois blocos.

Consequencia: pessoas ficam inteiras na tela e conteudo mantem navegacao horizontal sem poluir a interface com barra de
rolagem visivel.

Validacao complementar 2026-07-17: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local
`GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=estatisticas` retornando 200.



## Atualizacao 2026-07-16: engajamento geral e carrossel nos contadores de conteudo

As **Estatisticas de conteudo** do detalhe administrativo de comunidade passam a expor tambem metricas gerais de engajamento: upvotes, downvotes, salvamentos, cliques WhatsApp e acesso ao perfil.

A decisao e manter o endpoint existente `GET /api/admin/private/communities/:id/statistics` como fonte unica e expandir o contrato com `counters.content_engagement` e os pontos diarios correspondentes. Upvotes/downvotes usam `post_vote` em posts e respostas da comunidade; salvamentos usam `post_save` e `post_reply_save`; cliques WhatsApp usam `important_action_event` associado a posts/respostas; acesso ao perfil usa `page_view_event` de perfis de psicologos vinculados a comunidade por membro ou autoria, sem inferir origem quando o evento nao traz atribuicao direta de comunidade.

Como o bloco passa a ter mais opcoes do que cabem confortavelmente no grid, os cards de conteudo foram movidos para um carrossel horizontal mobile-first, com rolagem nativa, snap e botoes de seta. A interacao preserva os toggles existentes das curvas do grafico e evita esconder metricas por quebra de layout.

Consequencia: o Admin ganha leitura unificada de producao, moderacao e engajamento geral da comunidade sem endpoint paralelo, schema Prisma/migration, dependencia nova, mock, seed ou backfill. O custo adicional fica restrito a consultas agregaveis sobre tabelas first-party ja existentes dentro do dataset de estatisticas.

Validacao complementar 2026-07-16: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=estatisticas` retornando 200.


## Atualização 2026-07-17: conteúdo dos blocos da aba Geral

A aba **Geral** do detalhe administrativo de comunidade passa a separar claramente leitura de publicações recentes e triagem de moderação.

A decisão é trocar o antigo resumo diário por **Últimos posts na comunidade**, usando o endpoint real de conteúdo com ordenação recente e filtragem para posts publicados. A chamada permanece local ao cliente Admin e reutiliza React Query, sem endpoint paralelo, mock ou contrato novo.

O bloco de urgências passa a ser **Denúncias pendentes** e fica restrito ao `urgent_summary.pending_reports_count` e à data da última denúncia pendente, removendo sinais de atividade do dia que não representam diretamente fila de decisão.

Consequência: a aba Geral entrega conteúdo recente e pendências de moderação com fontes reais já existentes, sem schema Prisma/migration, dependência nova, seed, backfill ou dados artificiais.

Validação complementar 2026-07-17: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito` retornando 200.

## Atualizacao 2026-07-17: contencao de overflow horizontal em Estatisticas da comunidade

A barra horizontal global observada na aba **Estatisticas** vinha do overflow do carrossel de **Estatisticas de conteudo**. O scroller precisa continuar maior que a area visivel para revelar todos os contadores, mas esse excedente deve ficar contido no proprio componente, nao no documento.

A decisao e manter somente o carrossel de conteudo com overflow horizontal interno e oculto, reposicionando as setas em gutters internos absolutos dentro da largura util. Assim, as setas continuam junto ao primeiro e ao ultimo card visiveis, sem encobrir os contadores selecionaveis e sem somar largura extra ao fluxo da pagina.

A aba e os cards de estatisticas tambem passam a reforcar `min-w-0` e contencao horizontal local. Essa contencao preserva o scroller interno do carrossel e os graficos responsivos, mas impede que qualquer excedente do bloco gere rolagem horizontal no `document`.

Consequencia: **Estatisticas de pessoas** continua inteira em grade, **Estatisticas de conteudo** continua navegavel por carrossel sem barra nativa visivel, e a pagina deixa de exibir scrollbar horizontal global.

Validacao complementar 2026-07-17: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke HTTP local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=estatisticas` retornando 200 e inspecao headless autenticada em 1920px confirmando `documentElement.scrollWidth === documentElement.clientWidth`.

## Atualizacao 2026-07-17: denuncias pendentes individuais na aba Geral

O bloco **Denuncias pendentes** da aba **Geral** deixa de exibir um unico card agregado de **Conteudos denunciados**. A decisao e listar cada denuncia pendente individualmente no proprio resumo operacional da comunidade, usando dados reais de `post_report` ja carregados no endpoint de detalhe.

O contrato `urgent_summary` passa a expor `pending_reports`, uma lista compacta de denuncias pendentes com conteudo denunciado, autor do conteudo, denunciante, motivo e data de recebimento. `pending_reports_count` passa a contar denuncias individuais pendentes, nao apenas grupos de conteudo, para que o badge da secao corresponda aos itens visiveis.

Consequencia: o Admin ve imediatamente quais denuncias precisam de decisao sem abrir primeiro um bloco agregado. A triagem detalhada e as acoes continuam na aba **Denuncias**; a aba Geral apenas aponta para ela com uma lista acionavel. Nao ha endpoint paralelo, schema Prisma/migration, package novo, mock, seed ou alteracao destrutiva de dados.

## Atualizacao 2026-07-17: Ultimos posts no padrao de Posts populares

A lista **Ultimos posts** da aba **Geral** passa a usar o mesmo modelo tabular compacto de **Posts mais populares**, em
vez de cards/blocos. A decisao e manter a leitura operacional simples: coluna **Post** com titulo e previa de ate duas
linhas, coluna **Autor** com avatar/nome/selo/papel, coluna **Comentarios** e coluna **Data e hora**.

O titulo do bloco foi encurtado para **Ultimos posts**, sem subtitulo explicativo, e o botao **Ver todos** continua como
atalho para a aba **Conteudo**. As linhas da tabela abrem o `public_url` real do post em nova aba, preservando o contexto
do Admin.

Consequencia: a aba Geral fica mais enxuta e consistente com a lista de posts populares, sem endpoint novo, contrato de
API, schema Prisma/migration, dependencia, mock ou dados artificiais.

Validacao complementar 2026-07-17: `pnpm --dir admin check`, `pnpm --dir admin build`,
`pnpm --dir backend build`, `pnpm check` e smoke HTTP local
`GET http://localhost:3002/comunidades/relacionamentos-com-proposito` retornando 200.

## Atualizacao 2026-07-17: copy compacta nos cards de denuncias pendentes

A lista de denuncias pendentes na aba **Geral** passa a omitir a linha de motivo dentro de cada card. A motivacao permanece disponivel no contrato e na aba **Denuncias**, onde a triagem detalhada acontece, mas o resumo da aba Geral deve ficar mais escaneavel.

O badge superior da secao tambem passa de `N denuncias pendentes` para `N denuncias`, mantendo o contexto no titulo **Denuncias pendentes** e evitando repeticao textual.

Consequencia: a alteracao e apenas apresentacional, sem novo endpoint, schema Prisma/migration, dependencia, mock ou mudanca de persistencia.

## Atualizacao 2026-07-17: Ultimos posts sem previa de descricao

A tabela **Ultimos posts** da aba **Geral** passa a omitir a previa textual do post. A coluna **Post** mostra somente o titulo, limitado visualmente a duas linhas para manter a linha compacta sem reintroduzir bloco de descricao.

A coluna **Comentarios** passa a centralizar o valor numerico, incluindo o estado skeleton. As celulas continuam abrindo o `public_url` real do post em nova aba.

Consequencia: a alteracao e apenas visual no Admin, sem endpoint novo, contrato de API, schema Prisma/migration, dependencia, mock ou alteracao de persistencia.

## Atualizacao 2026-07-17: cards de denuncias pendentes sem metadados secundarios

A lista de denuncias pendentes na aba **Geral** passa a omitir as linhas **Denunciante**, **Autor** e **Recebida em** dentro de cada card. Esses dados continuam preservados no contrato e seguem disponiveis na aba **Denuncias**, onde a triagem detalhada ocorre.

A decisao deixa o resumo da aba Geral mais compacto: cada card mostra status, tipo do conteudo, titulo e previa do conteudo denunciado, com link para a aba operacional de denuncias.

Consequencia: a mudanca e apenas apresentacional, sem novo endpoint, schema Prisma/migration, dependencia, mock ou alteracao de persistencia.

## Atualizacao 2026-07-17: badge de denuncias pendentes sem quebra de linha

O badge de contagem do bloco **Denuncias pendentes** na aba **Geral** passa a impedir quebra de linha no texto `N denuncias`.

A decisao e tratar o badge como item compacto (`whitespace-nowrap` e `shrink-0`), preservando o contexto no titulo da secao e evitando que o numero fique visualmente separado da palavra em larguras intermediarias.

Consequencia: a mudanca e apenas visual, sem novo endpoint, schema Prisma/migration, dependencia, mock ou alteracao de persistencia.

## Atualizacao 2026-07-17: data dos ultimos posts abaixo do titulo

A lista **Ultimos posts** da aba **Geral** passa a exibir a data/hora abaixo do titulo do post, dentro da coluna **Post**, em vez de manter uma coluna separada **Data e hora**.

A decisao deixa a tabela mais enxuta e prioriza titulo, autor e comentarios como colunas principais, preservando o link real do post em cada celula e alinhando o skeleton ao novo layout.

Consequencia: a mudanca e apenas visual, sem novo endpoint, schema Prisma/migration, dependencia, mock ou alteracao de persistencia.

## Atualizacao 2026-07-17: cards de denuncias pendentes sem tag Pendente

Os cards vermelhos do bloco **Denuncias pendentes** na aba **Geral** deixam de exibir a tag **Pendente**. O status ja esta implicito pelo titulo da secao e pelo fato de a lista usar apenas denuncias ainda sem decisao.

A decisao reduz repeticao visual e mantém somente a tag de tipo do conteudo denunciado no card compacto. A aba **Denuncias** continua exibindo status detalhado para triagem operacional.

Consequencia: a mudanca e apenas apresentacional, sem novo endpoint, schema Prisma/migration, dependencia, mock ou alteracao de persistencia.

## Atualizacao 2026-07-17: visualizacoes nos ultimos posts

A tabela **Ultimos posts** da aba **Geral** passa a incluir a coluna **Visualizacoes** antes de **Comentarios**, usando `metrics.views_count` do contrato real de conteudo ja consumido no Admin.

O botao **Ver todos** do bloco passa a ter fundo transparente no estado padrao, mantendo borda e texto de acao para preservar hierarquia visual sem competir com a lista.

Consequencia: a mudanca e apenas apresentacional, sem novo endpoint, schema Prisma/migration, dependencia, mock ou alteracao de persistencia.

## Atualizacao 2026-07-17: cards de denuncias pendentes com conteudo direto

Os cards vermelhos do bloco **Denuncias pendentes** na aba **Geral** deixam de exibir a copy auxiliar da secao e passam a priorizar diretamente o conteudo denunciado.

A decisao diferencia a apresentacao por tipo de alvo: denuncias de post exibem somente o titulo do post; denuncias de comentario exibem somente o texto do comentario, truncado em ate duas linhas e com peso visual de descricao, nao de titulo. A tag de tipo de conteudo permanece como contexto minimo e a aba **Denuncias** continua concentrando a triagem completa.

Consequencia: a mudanca e apenas apresentacional, sem novo endpoint, schema Prisma/migration, dependencia, mock ou alteracao de persistencia.

## Atualizacao 2026-07-17: posts populares alinhados a ultimos posts

O bloco **Posts mais populares** da aba **Geral** passa a usar o mesmo padrao visual de **Ultimos posts**: header com botao **Ver todos**, tabela com post, autor e metricas centralizadas, e data/hora abaixo do titulo do post.

A diferenca entre os blocos fica restrita a metrica principal: **Ultimos posts** exibe **Visualizacoes** enquanto **Posts mais populares** exibe **Upvotes**. As linhas de posts populares passam a abrir o post publico real por `/community/{slug}/post/{id}`, usando os dados reais de `popular_posts`.

Consequencia: a mudanca e apenas apresentacional, sem novo endpoint, schema Prisma/migration, dependencia, mock ou alteracao de persistencia.

## Atualizacao 2026-07-17: Top 3 mentores no resumo da aba Geral

O bloco lateral da aba **Geral** passa a se chamar **Top mentores** e a exibir os tres primeiros itens do ranking real da comunidade.

A decisao e reutilizar o endpoint de ranking ja existente (`GET /api/admin/private/communities/:id/ranking`) com `limit=3`, mantendo a mesma formula de score e a mesma base da aba **Ranking**. Isso evita que o resumo fique vazio quando nao houver respostas elegiveis no recorte antigo, mas ainda houver psicologos participantes ranqueados pela regra oficial da comunidade.

Visualmente, o bloco passa a listar posicao, avatar, nome, verificacao, CRP, score, respostas e upvotes dos tres primeiros mentores. O grid da segunda linha da aba **Geral** adota a mesma proporcao da linha **Ultimos posts**/**Denuncias pendentes** (`2xl:grid-cols-[1.15fr_1fr]`), garantindo que **Top mentores** tenha a mesma largura de **Denuncias pendentes**.

Consequencia: a mudanca reutiliza contrato real e React Query, sem endpoint novo, schema Prisma/migration, dependencia, mock, seed, backfill ou alteracao de persistencia.

## Atualizacao 2026-07-17: Top mentores sem metricas laterais

O bloco **Top mentores** continua usando o ranking real com `limit=3`, mas deixa de exibir as metricas laterais **Score**, **Respostas** e **Upvotes** no resumo da aba **Geral**.

A decisao e manter o bloco lateral como lista de identidade e posicao dos mentores, exibindo somente posicao, avatar, nome, verificacao e CRP. As metricas detalhadas permanecem na aba **Ranking**, que e o local apropriado para leitura analitica.

Consequencia: a mudanca reduz ruido visual e evita sobreposicao em larguras laterais, sem endpoint novo, schema Prisma/migration, dependencia, mock ou alteracao de persistencia.

## Atualizacao 2026-07-17: Top mentores com largura contida

O bloco **Top mentores** deve manter a largura da coluna lateral mesmo quando nomes profissionais forem longos.

A decisao e combinar tracks de grid com `minmax(0, ...)`, `min-w-0` nos containers flex/grid e `truncate` no nome do mentor. Assim, o nome recebe ellipsis dentro do card, o selo de verificacao e o CRP permanecem visiveis e o bloco nao aumenta a largura da pagina nem gera barra horizontal global.

Depois do refinamento visual, as linhas da aba **Geral** usam a proporcao `minmax(0,1.1fr) minmax(0,0.9fr)`, mantendo **Denuncias pendentes** e **Top mentores** mais estreitos para devolver area util a **Ultimos posts** e **Posts mais populares**.

Consequencia: a mudanca e apenas apresentacional, sem endpoint novo, schema Prisma/migration, dependencia, mock ou alteracao de persistencia.

## Atualizacao 2026-07-17: identidade de autor normalizada em posts populares

A tabela **Posts mais populares** da aba **Geral** passa a receber e renderizar o mesmo objeto de autor normalizado usado pela lista **Ultimos posts**.

A decisao e expandir `popular_posts` com `author` contendo avatar, nome profissional, genero, papel, anonimato e verificacao calculados a partir de `community_post.author` e `psychologist_profile`. Assim, psicologas verificadas aparecem nas duas tabelas como `Thais Bruni` + selo + `Psicologa` + iniciais `TB`, sem prefixar `Psicologa` no nome e sem perder o genero do papel.

Os campos `author_name` e `author_role` permanecem no contrato para compatibilidade, mas agora sao derivados do autor normalizado. A UI reutiliza o mesmo componente de identidade de autor para as duas tabelas.

Consequencia: a mudanca usa dados reais ja relacionados ao post popular, sem endpoint novo, schema Prisma/migration, dependencia, mock, seed, backfill ou persistencia adicional.

## Atualizacao 2026-07-17: CTA Ver todos dos ultimos posts preserva filtro operacional

O botao **Ver todos** do bloco **Ultimos posts** da aba **Geral** passa a abrir a aba **Conteudo** ja filtrada para a listagem equivalente: tipo `posts`, ordenacao `recent` e periodo `all`.

A decisao e usar parametros de URL especificos do conteudo (`contentType`, `contentSort`, `contentPeriod`) como estado inicial da aba, sem criar endpoint ou estado global paralelo. A navegacao continua no detalhe da comunidade e a listagem segue consumindo `GET /api/admin/private/communities/:id/content` com os filtros reais.

Consequencia: o CTA leva o Admin diretamente para a listagem de posts mais recentes, mantendo possibilidade de alterar filtros manualmente depois, sem mock, dependencia, schema Prisma/migration ou persistencia adicional.
