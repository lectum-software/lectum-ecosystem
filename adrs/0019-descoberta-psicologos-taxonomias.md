# ADR-0019: Descoberta real de psicólogos com filtros por taxonomia

## Status

Accepted

## Task relacionada

TASK-13: Psicólogos: listagem e filtros.

## Contexto

A tela `/app/psychologists` é a entrada principal de descoberta para pacientes e deve consultar o backend real, sem cards hardcoded, mocks ou seeds artificiais. O `DATA-MODEL.md` define que a descoberta de psicólogos é leitura caller-neutra sob `/api/private/directory/*`, protegida apenas por `_auth`, enquanto `/api/private/psychologist/*` fica reservado para autogestão do psicólogo com `requireRole("psicologo")`.

As referências visuais consultadas foram as imagens locais:

- `_product/proto/Psicólogos.jpg`;
- `_product/proto/Filtros de Psicólogos - Serviços Expandidos.jpg`.

Builder/Quick Copy não está exposto como ferramenta direta nesta sessão; por isso a validação visual usou o fallback auditável das imagens exportadas.

Em 2026-06-06 a tela precisou deixar de ficar limitada ao frame mobile quando aberta em desktop. A referência mobile continua sendo a fonte visual ativa, mas o layout de desktop deve ampliar o conteúdo de descoberta sem criar uma arquitetura paralela de shell ou instalar um pacote de modal.

Em 2026-06-08 o card de descoberta foi reorientado pela referência anexada `Psicólogos (1).jpg`: a Lectum não deve
oferecer seguir psicólogos, porque o relacionamento de "seguir" será aplicado a comunidades em tasks futuras. O card
também precisa abrir WhatsApp via `wa.me`, exibir benefícios comerciais reais e diferenciar assinantes de perfis
gratuitos.

Ainda em 2026-06-08, o card precisou receber ajuste visual fino do CTA de WhatsApp a partir do SVG anexado pelo
usuário e, depois, ajustar a ação de favorito para funcionar como favorito de usuário autenticado, não apenas de
paciente.


Em 2026-06-14 a modal de filtros foi refinada a partir do PDF local fornecido pelo usuario (`C:\Users\tulio\Downloads\Filtros de Psicologos.pdf`). O ajuste precisava preservar a fundacao de formularios da TASK-02, cobrir visualmente toda a aplicacao, inclusive a sidebar, e melhorar a hierarquia de header, busca, selects, selos/facilidades e CTA de aplicacao sem instalar pacote novo.

Ainda em 2026-06-14, a busca por nome/CRP dentro da modal precisava responder em tempo real enquanto o usuário digita, e o bloco de selos/facilidades precisava ficar mais leve, evitando a aparência de caixas cinzas pesadas.

Ainda em 2026-06-14, os filtros da modal precisaram remover a alternativa `Prefiro não informar` dos recortes de
religião, raça e gênero do psicólogo, garantir `Terapia Individual` como primeiro serviço real do catálogo e adicionar
o filtro combinável `Disponível hoje`.

Em 2026-06-26, o usuário pediu para mover as três chips comerciais do card imersivo de psicólogos para baixo da bio,
inspirado em tags posicionadas na região inferior do vídeo. O objetivo era reduzir competição visual com o rosto e com
o header interno `Explorar / Minha Busca`, mantendo as chips em uma única linha no mobile.

## Decisão

- Criar `GET /api/private/directory/psychologists` como endpoint real de listagem paginada (`page`/`limit`, default 20 e máximo 50), busca e filtros.
- Montar a rota com apenas `_auth` dentro do próprio módulo, sem `requireRole`, preservando a separação definida na ADR-0002.
- Retornar somente psicólogos com `psychologist_profile.published = true`, `psychologist_profile.deleted = false`, `user.active = true` e `user.deleted = false`.
- Criar as tabelas de catálogo e joins previstas no `DATA-MODEL.md`:
  - `specialty`, `service`, `approach`;
  - `psychologist_specialty`, `psychologist_service`, `psychologist_approach`.
- Manter `psychologist_id` dos joins apontando para `user.id`, pois o perfil público usa o usuário como identificador canônico nas rotas `/app/psychologist/[id]`.
- Não criar seed de categorias nesta task. Sem dados reais persistidos, filtros e lista retornam vazios de forma honesta.
- Retornar `filters` junto da resposta paginada para que a tela use apenas o endpoint esperado da task e liste opções reais de catálogo, sem endpoint paralelo nem dados estáticos.
- Expor apenas campos public-safe para descoberta e cards: `user.id`, `user.name`, `user.avatar`, `headline`, `bio`, `crp`, `gender`, `modality`, `languages`, `rating_avg`, `rating_count`, `verified`, `available_today`, `video_url`, benefícios comerciais, `formation_years`, `whatsapp_url` e taxonomias. `cpf`, e-mail, dados de conta e o campo bruto `whatsapp` não são retornados; `whatsapp_url` é gerado pelo backend como URL de CTA para `wa.me` por pedido explícito de produto.
- Implementar a tela mobile-first em `/app/psychologists` dentro do `PrivateTemplate`, usando React Query, query keys dedicadas e a fundação da TASK-02 (`useFormList` + controllers) para busca e filtros avançados.
- Evoluir a mesma tela para desktop com largura máxima de conteúdo ampliada, barra de busca/filtros em card responsivo e grid de resultados em duas colunas a partir de `lg`, preservando a base mobile-first dos protótipos.
- Abrir filtros avançados em modal própria da tela, sem instalar `@radix-ui/react-dialog` nesta etapa. A modal usa `role="dialog"`, `aria-modal`, fechamento por `Escape`, backdrop e foco inicial no botão de fechar; os campos seguem a fundação da TASK-02.
- Remover a opção de seguir psicólogos da interface: os cards não têm botão de seguir, `/app/following` redireciona para `/app/community` e o menu de perfil usa a linguagem de comunidades seguidas.
- Restringir as tags do card a benefícios reais: tempo de formação somente para assinantes, desconto de 1ª sessão, valor social e aceita convênios.
- Exibir selo verificado, prefixo `Dr.`/`Dra.` e miniatura de vídeo no card apenas para assinantes. Perfis gratuitos publicados não recebem selo nem prefixo.
- Usar o ícone vetorial de WhatsApp fornecido pelo usuário como componente React (`WhatsAppIcon`), preservando a regra
  de não usar `<img>`, e padronizar o verde dos CTAs de WhatsApp em `#22C55E`.
- Permitir ações de favorito na descoberta e no perfil público para qualquer usuário autenticado, usando a rota
  canônica `/api/private/user/favorites`. O coração favoritado passa a ficar vermelho e a tela `/app/favorites` lista
  os psicólogos favoritados pelo usuário atual.
- Tornar o selo `Disponível hoje` branco com texto verde e sombra, para manter leitura quando sobreposto à miniatura
  de vídeo.

- Em 2026-06-14, renderizar a modal de filtros em `document.body` via portal para garantir cobertura acima do shell privado, sidebar, acoes flutuantes e navegacao mobile/desktop.
- Manter os campos da modal dentro de `useFormList`/controllers da TASK-02, adicionando o campo de busca por nome/CRP como uso do parametro real `search` e escondendo os checkboxes booleanos para renderiza-los como cards customizados sem duplicar estado.
- Adotar cards de selos/facilidades proprios da tela para `verified`, `more_experienced`, `discount_first_session`, `accepts_insurance` e `social_value`, todos conectados ao mesmo React Hook Form e aos mesmos query params reais.
- Usar o padrao de dropdown pesquisavel para os selects da modal, com seta interna padronizada, mantendo opcoes reais de catalogo e dependencia Estado/Cidade existente.
- Manter `Limpar filtros` como acao de reset no topo da modal e `Aplicar filtros` como CTA sticky no rodape da area rolavel, sem novo pacote de dialog e sem criar componente global fora de escopo.
- Enquanto a modal estiver aberta, aplicar o campo `search` como consulta viva da listagem por meio do mesmo hook `useDirectoryPsychologists`, sem alterar a URL nem aplicar os demais filtros antes do CTA. Ao clicar em `Aplicar filtros`, a busca continua sendo persistida nos query params como antes.
- Refinar os cards/toggles de selos e facilidades sobre os mesmos campos booleanos do React Hook Form, com superfície `bg-surface`, borda delicada e controle tipo switch, sem criar estado paralelo nem remover opções.
- Remover `Prefiro não informar` apenas da interface de filtros públicos de religião, raça e gênero, preservando os
  valores existentes nos formulários de perfil onde o profissional ainda pode optar por não informar.
- Inserir `Terapia Individual` como opção real do catálogo `services` por migration idempotente e mantê-la como primeiro
  item da ordenação exibida em `toServiceOptions`.
- Adicionar `available_today` ao contrato de query da descoberta, validando o parâmetro no backend e filtrando por
  `psychologist_profile.available_days` com o mesmo cálculo de dia atual em `America/Sao_Paulo` já usado no card.
- Reposicionar as chips `Desconto 1ª sessão`, `Valor social` e `Aceita convênios` para baixo da bio no feed imersivo
  `/app/psychologists`, renderizando-as como uma linha única `flex-nowrap`, sem ícones, e exibindo apenas benefícios
  verdadeiros do perfil. A ancoragem da coluna de ações passa a considerar o fim do bloco de chips quando elas existem.

## Consequências

- A descoberta fica pronta para dados reais assim que perfis forem publicados por tasks futuras, sem precisar substituir mocks.
- A ausência atual de psicólogos publicados ou catálogos aparece como estado vazio, não como falha de produto.
- A resposta paginada ganha o campo adicional `filters`; clientes devem continuar usando `data/page/pages/count` para paginação e tratar `filters` como metadado de UI.
- A TASK-15 pode reutilizar o mesmo identificador público (`user.id`) para abrir `/app/psychologist/[id]`.
- A curadoria/seed real de especialidades, serviços e abordagens permanece fora desta task e deve ser decidida sem inventar categorias permanentes.
- O desktop deixa de parecer um frame mobile centralizado, mas a navegação inferior do `PrivateTemplate` permanece como decisão da TASK-12 até haver uma task específica de shell desktop.
- A ausência de pacote de dialog reduz dependência nova agora, mas uma task futura pode trocar para Radix Dialog se houver necessidade de foco preso completo e padrões compartilhados de modal.
- O follow de psicólogos fica depreciado na UI. Modelos/endpoints legados de follow não foram removidos nesta mudança para evitar migração destrutiva fora de escopo, mas não há opção visível para o usuário seguir outro usuário.
- O CTA de WhatsApp passa a expor uma URL `wa.me` gerada no backend; isso atende o pedido explícito de produto, mas deve ser revisitado quando houver política final de privacidade/contato.
- Vídeos de apresentação enviados por profissionais são renderizados no card como mídia nativa quando o profissional é assinante. Como ainda não há recurso de legendas no upload, o componente registra exceção pontual de lint para `useMediaCaption`.
- O botão de favorito continua visível para manter consistência visual com a referência e agora é acionável por
  qualquer usuário autenticado. A relação persistida continua por `user_id`, sem criar tabela nova.
- A opção `Prefiro não informar` deixa de aparecer na busca pública para evitar filtros pouco acionáveis, mas o dado
  declaratório continua existindo no perfil profissional.
- `Terapia Individual` passa a existir como taxonomia persistida e pode ser selecionada por profissionais e filtrada por
  pacientes sem opção sintética no banco.
- O filtro `Disponível hoje` usa disponibilidade real cadastrada no perfil; se o profissional não tiver o dia atual em
  `available_days`, ele não entra no resultado desse recorte.
- As chips deixam de ocupar a área superior do vídeo, liberando o rosto e o header interno. Em telas próximas de
  `390px`, as três chips cabem na mesma linha abaixo da bio; se algum benefício não for verdadeiro, a linha usa somente
  as chips reais restantes, sem inventar selo comercial.

## Validação

- `pnpm --dir backend db:migrate --name add_directory_taxonomies`
- `pnpm --dir backend db:generate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke de API real: cadastro temporário de paciente via `POST /api/public/user/store`, chamada autenticada a `GET /api/private/directory/psychologists?page=1&limit=20&verified=true`, resposta `success=true`, paginação válida, filtros reais vazios e remoção do usuário temporário.
- Browser local headless em viewport mobile `390x844`: `/app/psychologists` renderizou com cookie real, sessão hidratada, título da tela, estado vazio/lista real, bottom nav e sem erro de sessão. Usuário temporário removido ao final.
- Validação complementar desktop em 2026-06-06:
  - `npx "@builder.io/dev-tools@latest" auth status` retornou não autenticado; Quick Copy não esteve acessível e a execução manteve o fallback das imagens locais.
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - Browser local headless em viewport desktop `1440x1000`: `/app/psychologists` renderizou com `sectionWidth=1112`, botão de filtros presente e rota privada sem redirecionar para `/auth`.
  - A modal de filtros abriu no desktop com `role="dialog"`, título "Refinar busca" e largura `520px`; usuário temporário de validação removido ao final.
- Validação complementar de card em 2026-06-08:
  - `pnpm --dir backend biome:fix`
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir backend check`
  - `pnpm --dir frontend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - Smoke real de API com paciente temporário removido ao final: `GET /api/private/directory/psychologists?page=1&limit=3` retornou `success=true`, `count=1`, `page=1` e os campos do novo card (`whatsapp_url`, `video_url`, `available_today`, benefícios e `formation_years`).
  - Smoke local HTTP: backend `/health` retornou `200`; `/app/psychologists` e `/app/following` responderam `307` pelo proxy privado quando acessados sem sessão de browser reutilizável.
- Validação complementar de ajuste fino em 2026-06-08:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
- Validação complementar de favorito user-level e badge em 2026-06-08:
  - `pnpm --dir backend check`
  - `pnpm --dir frontend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend build`
  - `pnpm check`

- Validacao complementar da modal de filtros em 2026-06-14:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - `git diff --check`
  - Smoke Prisma do catálogo retornou `{"name":"Terapia Individual","slug":"terapia-individual","active":true,"deleted":false}`.
  - HTTP local em `/app/psychologists` respondeu `200`.
- Validacao complementar da busca live e selos em 2026-06-14:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP local em `/app/psychologists` respondeu `200`.
- Validacao complementar dos filtros de serviço e disponibilidade em 2026-06-14:
  - `pnpm --dir backend db:migrate`
  - `pnpm --dir backend biome:fix`
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir backend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - `git diff --check`
  - HTTP local em `/app/psychologists` respondeu `200`.
- Validação complementar das chips abaixo da bio em 2026-06-26:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - `git diff --check`
  - Browser local via Chrome/CDP em `http://localhost:3000/app/psychologists` com viewport mobile `390x844`: as chips
    `Desconto 1ª sessão`, `Valor social` e `Aceita convênios` renderizaram abaixo da bio no mesmo eixo vertical
    (`y=744.5`) e em uma única linha.
  - HTTP local em `/app/psychologists` respondeu `200`.

## Complemento 2026-06-26 - animacao de entrada da modal de filtros

### Contexto

A modal de criar post ja possuia o padrao de entrada mobile-first tipo bottom sheet, movendo de `translate-y-full` para `translate-y-0`. O produto pediu a mesma percepcao de movimento para a modal de filtros da descoberta de psicologos, que antes aparecia diretamente sem transicao de deslocamento.

### Decisao

- Manter o portal atual da modal de filtros em `document.body`, sem instalar pacote novo e sem trocar a arquitetura da tela.
- Separar estado de montagem (`isFiltersOpen`) e estado visual (`isFilterSheetOpen`) para permitir animacao de entrada e saida.
- Aplicar fade no backdrop e `transition-transform duration-300 ease-out` no painel, iniciando em `translate-y-full` e finalizando em `translate-y-0`, seguindo o mesmo principio usado na criacao de post.
- Preservar foco, fechamento por Escape/backdrop, formulario React Hook Form, filtros reais e query live da busca dentro da modal.

### Consequencias

- A modal de filtros ganha continuidade visual com a modal de criar post e passa a subir na tela em vez de surgir estaticamente.
- O fechamento fica mais suave, com desmontagem apos o tempo da transicao.
- Nenhum contrato de API, schema, endpoint, pacote ou regra de dominio foi alterado.

## Complemento 2026-06-29 - hierarquia das acoes laterais do video

### Contexto

No feed imersivo de psicologos, o produto pediu que a coluna lateral ficasse mais proxima do padrao mental de video
curto: o perfil deve ser a primeira opcao da coluna e o WhatsApp deve ser a ultima acao, mais perto da zona do polegar
no mobile. A mesma revisao identificou que os botoes estavam visualmente grandes em relacao ao restante da tela.

### Decisao

- Reordenar as acoes laterais mobile para `Perfil -> Favoritar -> Compartilhar -> WhatsApp`.
- Manter o WhatsApp como CTA principal, mas como ultima acao da coluna, ancorado ao fim do bloco de bio/chips do card.
- Separar area clicavel e escala visual: hit area de 44px no mobile base, avatar visual de 32px, icones secundarios de
  20px e circulo visual do WhatsApp de 36px.
- Usar o avatar real do psicologo como acao de perfil, preservando `next/image`; quando nao houver avatar, usar iniciais
  renderizadas em texto dentro do mesmo container.
- Aplicar a mesma ordem na rail desktop, com escala reduzida de 48px para 40px, para manter consistencia entre
  breakpoints sem criar componente paralelo.

### Consequencias

- O CTA de WhatsApp fica mais proximo da zona natural de toque no mobile sem invadir a navegacao inferior.
- Perfil ganha mais proeminencia visual e melhora a leitura "quem e este profissional?" antes das acoes sociais.
- A interface fica menos pesada, mantendo area de toque suficiente para acessibilidade basica.
- Nao ha mudanca de backend, Prisma, endpoints, filtros, ranking, dados, packages ou contratos de API.

### Validacao

- `pnpm.cmd --dir frontend exec biome check --write src/app/app/psychologists/logic.tsx`
- `pnpm.cmd --dir frontend check`
- `pnpm.cmd --dir frontend build`
- `pnpm.cmd check`
- Browser local via Chrome/CDP em `http://localhost:3000/psychologists` com viewport mobile `390x844` confirmou a ordem
  `Perfil -> Favoritar -> Compartilhar -> WhatsApp` e os tamanhos planejados: hit area 44px, avatar 32px, icones
  secundarios 20px e WhatsApp visual 36px.

## Complemento 2026-06-30 - densidade das chips de filtros

### Contexto

As chips ativas de filtros no feed imersivo de psicologos estavam visualmente grandes no desktop e tinham sombra
perceptivel tanto no mobile quanto no desktop, criando um halo/borrado sobre o video. O pedido foi reduzir apenas a
densidade desktop e remover a sombra sem alterar o tamanho mobile.

### Decisao

- Manter a variante mobile das chips ativas com a mesma altura, paddings, gap, tipografia e icone ja validados na base
  `390px`.
- Reduzir somente a variante desktop das chips ativas e do atalho `+ Filtros`, usando altura `h-7`, padding menor,
  icone de `12px`, limite de largura menor e rotulo interno de `11px`.
- Remover `box-shadow` das chips/atalho de filtros nos dois breakpoints, preservando borda e translucidez existentes
  para manter contraste sobre o video.
- Nao alterar filtros reais, URL, backend, Prisma, ranking, dados, packages, cards de beneficios ou acoes laterais.

### Consequencias

- Desktop fica menos pesado e ocupa menos area sobre o rosto/video.
- Mobile conserva a escala visual anterior, com a unica mudanca sendo a ausencia da sombra/borrado.
- A remocao de sombra reduz o halo nas chips sem criar componente paralelo ou nova regra global.

### Validacao

- `pnpm.cmd --dir frontend exec biome check src/app/app/psychologists/logic.tsx`
- `pnpm.cmd --dir frontend build` com `NODE_OPTIONS=--max-old-space-size=4096`
- `git diff --check`
- Browser local via Chrome/CDP em `http://localhost:3000/psychologists` com viewports `390x844` e `1440x1000`:
  mobile manteve chips visiveis com altura `30px`, rotulo `15px` e `boxShadow=none`; desktop renderizou chips com
  altura `28px`, rotulo `11px`, icone `12px` e `boxShadow=none`.
- `pnpm.cmd check`

## Complemento 2026-06-30 - scroll desktop das chips de filtros

### Contexto

Depois da reducao visual das chips, o desktop ainda tinha um problema de interacao: quando havia muitos filtros ativos,
o usuario nao conseguia navegar confortavelmente pelo carrossel horizontal de chips, porque a area do feed tambem usa
wheel/trackpad para navegacao vertical entre videos.

### Decisao

- Tratar o carrossel desktop de chips como ilha interativa com `data-psychologists-scroll-lock` ja existente no header do
  card, impedindo que eventos dentro dele sejam encaminhados para troca de video.
- Converter `wheel`/trackpad sobre a area das chips em scroll horizontal (`scrollLeft`), usando o maior delta entre
  `deltaX` e `deltaY` para suportar mouse e trackpad.
- Exibir fades laterais e setas discretas somente no desktop e somente quando a medicao real indicar overflow
  horizontal.
- Atualizar a medicao de overflow quando os filtros ativos mudam e quando os psicologos carregam, porque o header
  desktop das chips e montado apenas depois que o feed tem slides renderizados.
- Preservar o mobile sem setas, mantendo swipe horizontal nativo, tamanho das chips e comportamento anterior.

### Consequencias

- O usuario consegue rolar os filtros selecionados no desktop sem mudar acidentalmente de psicologo.
- A existencia de mais chips fica perceptivel por fade/seta, mesmo com a scrollbar visual escondida.
- Nao ha novo pacote, componente global ou contrato de API; o ajuste fica restrito a interacao da tela de descoberta.

### Validacao

- `pnpm.cmd --dir frontend exec biome check src/app/app/psychologists/logic.tsx`
- `pnpm.cmd --dir frontend check`
- `pnpm.cmd --dir frontend build` com `NODE_OPTIONS=--max-old-space-size=4096`
- Browser local via Chrome/CDP em `http://localhost:3000/psychologists` com filtros ativos e viewport desktop `1440x1000`:
  sete chips renderizadas, scroller com `clientWidth=466`, `scrollWidth=820`, seta direita visivel e wheel sobre o scroller
  mudou `scrollLeft` de `0` para `180`.
- Browser local via Chrome/CDP em viewport mobile `390x844`: sete chips renderizadas, altura da primeira chip `30px` e
  nenhuma seta visivel.
- `pnpm.cmd check` foi executado e bloqueado por erros TypeScript de backend fora deste ajuste, em arquivos ja modificados no working tree como `backend/src/modules/api/private/directory/psychologists/repositories/IndexRepository.ts`.

## Complemento 2026-06-30 - servico Psicologia Organizacional e do Trabalho

### Contexto

O produto passou a precisar que psicologos que atendem empresas, RH e demandas corporativas possam declarar esse
servico no perfil profissional. A nomenclatura escolhida foi `Psicologia Organizacional e do Trabalho`, alinhada ao
uso profissional da area e ao escopo V1 de psicologia da Lectum.

### Decisao

- Adicionar o servico como item real do catalogo `services`, com slug estavel
  `psicologia-organizacional-e-do-trabalho`.
- Manter a taxonomia como `service`, e nao como especialidade ou abordagem, porque o usuario escolhe esse item na secao
  "Servicos" do perfil e ele representa uma oferta de atendimento/consultoria.
- Aplicar a inclusao por migration idempotente com `ON CONFLICT (slug)`, sem seed fake e sem depender de fallback
  hardcoded do frontend.
- Posicionar o slug nas ordenacoes de perfil e descoberta junto dos servicos relacionados a carreira/trabalho, depois
  de `Orientacao Profissional`, mantendo as listas consumindo o catalogo real do backend.

### Consequencias

- Psicologos podem selecionar `Psicologia Organizacional e do Trabalho` no perfil e o item fica disponivel para filtros
  de descoberta quando houver profissionais associados a ele.
- O catalogo continua centralizado no banco, preservando a arquitetura de taxonomias `service`/joins existente.
- Nao ha mudanca de schema Prisma, contratos de API, packages ou regra de plano; o plano gratuito segue limitado a um
  servico selecionado e planos profissionais/cortesias seguem com todos os servicos ativos.

### Validacao

- `pnpm --dir backend db:migrate`
- `pnpm --dir backend exec prisma migrate status`
- Smoke Prisma somente leitura confirmou o item ativo no slug `psicologia-organizacional-e-do-trabalho`.
- `pnpm --dir frontend exec biome check src/app/app/professional/profile/setup/logic.tsx src/app/app/psychologists/filter-options.ts`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build` com `NODE_OPTIONS=--max-old-space-size=4096`
- `pnpm check`
- Browser local via Chrome/CDP em `/app/professional/profile/setup`, viewport `390x844`, confirmou o botao
  `Psicologia Organizacional e do Trabalho` em Servicos com usuario temporario real removido ao final.

## Complemento 2026-06-30 - semantica de modalidade compativel

### Contexto

O valor `psychologist_profile.modality = "hibrido"` representa um psicologo que atende tanto presencialmente quanto
online. Como filtro de intencao do paciente, porem, `Online` e `Presencial` devem responder a compatibilidade de
atendimento, nao a igualdade exata de string. O produto tambem decidiu que a opcao composta `Presencial e Online` deve
permanecer como atributo do psicologo, mas nao como uma escolha principal no filtro publico/paciente.

### Decisao

- No backend da descoberta, `modality=online` passa a filtrar por `modality in ["online", "hibrido"]`.
- No backend da descoberta, `modality=presencial` passa a filtrar por `modality in ["presencial", "hibrido"]`.
- A query `modality=hibrido` segue suportada como correspondencia exata apenas por compatibilidade com URLs/clientes
  antigos; a UI publica nao expoe essa opcao.
- No formulario de filtros do paciente, a lista de modalidades passa a ser propria da descoberta: `Online` e
  `Presencial`. A lista completa (`Online`, `Presencial`, `Presencial e Online`) continua no formulario de configuracao
  do perfil profissional.
- Valores de URL nao suportados pela UI publica, incluindo `hibrido`, sao normalizados para `null` antes de hidratar o
  React Hook Form, evitando uma opcao invisivel selecionada no filtro.

### Consequencias

- Psicologos hibridos aparecem quando o paciente filtra por atendimento online ou presencial.
- A interface do paciente fica alinhada a intencao de busca ("quero online" ou "quero presencial") em vez de expor uma
  busca menos comum por profissionais que oferecam ambas as modalidades.
- A compatibilidade com clientes que ainda enviem `modality=hibrido` fica preservada no backend, mas novas interacoes da
  UI publica tendem a remover esse valor.
- Nao ha mudanca de schema, migrations, seed, dados persistidos, rotas ou packages.

### Validacao

- `pnpm.cmd --dir backend exec biome check src/modules/api/private/directory/psychologists/repositories/IndexRepository.ts`
- `pnpm.cmd --dir frontend exec biome check src/app/app/psychologists/use-form.tsx src/app/app/psychologists/logic.tsx`
- `pnpm.cmd --dir backend check`
- `pnpm.cmd --dir frontend check`
- `pnpm.cmd --dir backend build`
- `pnpm.cmd --dir frontend build` com `NODE_OPTIONS=--max-old-space-size=4096`
- `pnpm.cmd check`
- Smoke Prisma somente leitura: `hibridoExact=1`, `onlineCompatible=1`, `presencialCompatible=1`.
- Smoke API local: `modality=online`, `modality=presencial` e `modality=hibrido` retornaram HTTP 200, `success=true`,
  `count=1` e item `hibrido`.
- Browser local via Chrome/CDP em `/psychologists?modality=online`, viewport `390x844`: dropdown de modalidades exibiu
  apenas `Todas as modalidades`, `Online` e `Presencial`.

## Pendências

- Curadoria ou ingestão real dos catálogos `specialty`, `service` e `approach`.
- Publicação/edição de perfis profissionais com taxonomias nas tasks de perfil do psicólogo.
- Detalhe do perfil público em `/app/psychologist/[id]` será implementado na TASK-15.
- Definir política final de privacidade para exposição de `wa.me` e futura trilha de legendas para vídeos de apresentação.
