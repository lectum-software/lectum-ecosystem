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
