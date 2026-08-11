# ADR-0061: Favoritos com cards premium e filtros reais

## Status

Accepted

## Task relacionada

Ajuste complementar solicitado para a tela `/app/favorites`.

## Contexto

A tela de Favoritos precisava deixar de usar a listagem simples herdada de relações de psicólogos e passar a seguir a mesma família visual da nova descoberta/listagem de psicólogos apresentada no PDF de referência `Nova tela favoritos.pdf`.

A implementação precisava manter dados reais, navegação inferior no mobile, compatibilidade responsiva e comportamentos já existentes de perfil, WhatsApp e remoção de favorito. Busca e filtros não poderiam ser apenas client-side sobre uma amostra local, pois a lista é paginada e depende da API autenticada.

O Builder/Quick Copy não estava acessível neste ambiente. A referência visual foi tratada a partir do PDF/local e do briefing do produto, preservando a limitação de não depender de Figma como fonte ativa.

## Decisão

- Substituir a tela de Favoritos por uma experiência própria baseada em cards visuais premium, mantendo `PrivateTemplate` e a navegação inferior existente no mobile.
- Renderizar cada favorito em card vertical com mídia dominante, badge de disponibilidade, coração de remoção, mini avatar, overlay inferior com glass/liquid feel, nome, selo verificado, metadados, avaliação, selos comerciais e CTA real de WhatsApp.
- Manter o clique no card/nome apontando para o perfil público do psicólogo (`/app/psychologist/[id]`) e o clique no WhatsApp abrindo a URL `wa.me` já exposta pela API.
- Criar header mobile-first com título, busca, botão de filtros com contador e chips de filtros.
- Levar busca e filtros principais para o endpoint real de favoritos, incluindo `search`, `available_today`, `verified`, `accepts_insurance`, `social_value` e `discount_first_session`.
- Corrigir as chamadas de favoritos/seguindo para enviarem query string pelo `callEndpoint`, em vez de depender de `config.params` em requisições GET.
- Não instalar packages novos e não criar dados mockados.

## Consequências

- A tela passa a comunicar uma curadoria premium de psicólogos salvos, com percepção visual consistente com a descoberta/listagem atual.
- A filtragem permanece correta com paginação, porque acontece no backend antes de retornar os favoritos.
- O endpoint de favoritos assume mais responsabilidade de busca, mas sem alterar schema Prisma ou criar novas migrations.
- O componente de relações permanece com escopo efetivo em `favorites`; caso a tela de seguindo volte a usar o mesmo componente, deve ser reavaliado para não acoplar visualmente os dois contextos.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir backend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend build`
- `pnpm check`
- HTTP local em `http://127.0.0.1:3100/app/favorites` respondeu `200` usando `next start` após build.

## Pendências

- A renderização headless direta do PDF local não produziu uma captura útil neste ambiente. A implementação seguiu o briefing visual anexado e os padrões já ativos da listagem/descoberta de psicólogos.

## Complemento 2026-06-15 - header amplo e cards marketplace

### Contexto

A tela de Favoritos precisava melhorar a hierarquia visual do header e fazer os cards parecerem menos simples, mantendo integralmente dados, filtros, navegacao para perfil, remocao de favorito e acao de WhatsApp.

### Decisao

- Manter o componente e a logica existente de `PsychologistRelationList`, alterando apenas classes/layout.
- Posicionar o coracao azul como elemento decorativo absoluto no topo direito do header, visivel em mobile e desktop, sem disputar largura com a descricao.
- Remover a limitacao estreita da descricao no desktop, permitindo que o texto use a largura util antes de quebrar linha.
- Refinar os cards com moldura arredondada, midia em inset, placeholder com gradiente e iniciais menores, chips com menor peso visual e CTA de WhatsApp discreto.

### Consequencias

- A tela comunica melhor curadoria/marketplace premium sem alterar contratos de API ou comportamento de favoritos.
- O grid continua mobile-first com duas colunas quando legivel e passa a usar colunas responsivas por largura minima em telas maiores.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local em `/app/favorites` respondeu `200`.

## Complemento 2026-06-16 - cards de favoritos inspirados em sugestões do Instagram

### Contexto

O pedido de produto solicitou refazer completamente os cards de `/app/favorites` com referência visual na seção “Sugestões para você” do Instagram, priorizando foto, proximidade humana e conversão para WhatsApp.

A referência externa anexada pelo usuário foi `c:/Users/tulio/Downloads/WhatsApp Image 2026-06-16 at 09.37.03.jpeg`. A referência visual ativa do produto continua `_product/proto/Favoritos.jpg`; Builder/Quick Copy não está exposto como ferramenta direta nesta sessão.

### Decisão

- Manter dados reais, filtros, paginação, remoção de favorito, navegação para perfil e fluxo seguro de WhatsApp existentes.
- Redesenhar apenas o card de favorito como card vertical branco, com borda/sombra suaves, largura fixa e `snap` para carrossel horizontal.
- Tornar o avatar circular o elemento principal do card, usando apenas `avatar` real do psicólogo e fallback de iniciais quando não houver imagem.
- Exibir coração preenchido ativo no canto superior direito como controle de remoção, sem usar o “X” da referência.
- Usar o campo real `available_today` para renderizar a bolinha verde pulsante sobre o avatar; não foi criado estado online artificial.
- Reduzir as informações do card para nome + selo verificado, tipo profissional fixo `Psicólogo` e CTA “Chamar no WhatsApp”.
- Remover do card especialidades, abordagens, área, experiência, avaliação, tags comerciais e demais metadados.
- Transformar o CTA em botão preenchido verde WhatsApp, com ícone à esquerda, largura total, hover suave e press state discreto.

### Consequências

- A tela favorece descoberta, confiança e ação de contato com menor poluição visual.
- O carrossel horizontal aproxima a interação da referência de Instagram sem alterar contratos de API.
- A ausência de estado online real fica protegida pela decisão de usar apenas disponibilidade persistida (`available_today`) para o indicador verde.

### Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local em `/app/favorites` respondeu `200`.

## Complemento 2026-06-16 - header nativo mobile e grid de favoritos

### Contexto

Após a versão em carrossel inspirada no Instagram, o produto pediu que `/app/favorites` aproveitasse melhor a largura mobile com grid de dois cards por linha e que o topo parecesse um header nativo, sem faixa cinza acima ou margens laterais.

### Decisão

- Manter a tela no `PrivateTemplate`, mas remover o padding superior/lateral do conteúdo apenas para esta rota no mobile.
- Renderizar o header mobile como superfície branca full-width, começando no topo da página, com apenas os cantos inferiores arredondados; em breakpoints maiores o header retorna ao comportamento de card arredondado completo.
- Remover o bloco decorativo azul do coração do header, preservando somente o ícone.
- Compactar chips de filtro para reduzir peso visual sem alterar query real nem comportamento dos filtros.
- Substituir o carrossel horizontal por grid responsivo: duas colunas no mobile e progressão para mais colunas no desktop.
- Manter os cards como sugestões humanas e limpas, mas reduzir proporções para caber em duas colunas; o CTA usa texto curto `WhatsApp`.

### Consequências

- A tela passa a ter sensação mais nativa no mobile e usa melhor a largura disponível sem alterar dados, paginação ou contrato de API.
- O grid reduz a necessidade de scroll horizontal e torna a comparação entre favoritos mais imediata.
- A identidade de card estilo Instagram permanece, mas adaptada à densidade mobile pedida.

### Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local em `/app/favorites` respondeu `200` com cookie de sessão local.
- Browser local Chrome headless autenticado em `/app/favorites` validou header no topo, chips compactos e grid mobile com 2 cards por linha.

## Complemento 2026-06-16 - hero full-bleed e densidade dos cards

### Contexto

O produto pediu uma nova rodada de refinamento visual em `/app/favorites`: o header não deveria continuar preso à aparência de card branco comum e os cards de psicólogos ainda tinham espaço vertical excessivo entre nome, papel profissional e CTA.

### Decisão

- Manter o `PrivateTemplate` e todos os contratos reais de favoritos, filtros, paginação, remoção e WhatsApp.
- Remover o limite visual do header como card encaixado e transformá-lo em hero full-bleed, ocupando o topo da tela e a largura útil sem faixas cinzas laterais/superiores.
- Usar gradientes suaves, blur decorativo e coração azul da identidade Lectum para dar personalidade premium sem introduzir nova biblioteca ou imagem decorativa.
- Preservar os filtros como ações reais, mas com chips compactos translúcidos dentro do hero.
- Compactar os cards removendo o espaçador automático antes do CTA, reduzindo altura mínima e aproximando nome, `Psicólogo` e botão `WhatsApp`.
- Manter nomes com até duas linhas por `line-clamp-2`, evitando truncamento agressivo e protegendo a grade responsiva.

### Consequências

- A tela fica mais próxima de um produto premium de consumo, com topo mais expressivo e transição visual mais fluida para o conteúdo.
- Os cards preservam a hierarquia de avatar, disponibilidade, nome/selo, tipo e WhatsApp com melhor aproveitamento vertical.
- Nenhum contrato de API, schema, rota ou pacote foi alterado.

### Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local Chrome headless autenticado em `/app/favorites`.

## Complemento 2026-06-16 - header limpo alinhado a Notificacoes

### Contexto

Produto pediu nova calibragem visual em `/app/favorites`: o hero gradiente anterior ficou expressivo
demais para a tela, e o novo padrao secundario de Notificacoes deveria orientar um topo mais limpo,
integrado ao fundo e com texto em escala mais discreta.

### Decisao

- Remover o hero gradiente, blurs decorativos e bloco grande colorido do topo de Favoritos.
- Manter o header integrado ao layout da pagina, sem fundo, sombra, borda ou container destacado.
- Reduzir a escala do titulo para o mesmo campo visual de headers nativos (`text-2xl` no mobile e
  `text-3xl` em telas maiores), com subtitulo menor e chip `Sua curadoria` mais sutil.
- Preservar os filtros reais, mas com chips neutros e compactos fora de uma superficie colorida.
- Aumentar o respiro interno dos cards de psicologo: mais padding, avatar ligeiramente mais solto,
  maior separacao entre avatar, nome, papel profissional e CTA.
- Reduzir a tipografia do CTA `WhatsApp` via estilo inline controlado no proprio botao, mantendo o
  verde preenchido e o icone proporcional.
- Aumentar a area clicavel e o icone de coracao no card, mantendo o controle elegante e sem impacto
  na logica de remocao do favorito.

### Consequencias

- Favoritos volta a pertencer visualmente a familia de telas limpas/secondarias, sem perder a sensacao
  premium.
- Os cards deixam de parecer apertados na grade de duas colunas, mantendo legibilidade em mobile e
  desktop.
- Nenhum contrato de API, rota, ordenacao, filtro, schema, migration, package ou tracking de WhatsApp
  foi alterado.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome/CDP autenticado em `/app/favorites` validou mobile 390px e desktop 1280px: header sem gradiente
  ou sombra, titulo em escala controlada, filtros presentes, cards reais renderizados, coracao maior e
  CTA WhatsApp com fonte de 11px no desktop.

## Complemento 2026-06-17 - header surface e filtros sem glow

### Contexto

Produto pediu uma calibragem fina em `/app/favorites`: manter o topo limpo, mas com fundo branco/surface
envolvendo badge, titulo, descricao e filtros; refinar os chips de filtro para parecerem mais premium; e
alongar os cards de psicologos favoritos para reduzir a sensacao de compressao visual.

### Decisao

- Manter o componente compartilhado `PsychologistRelationList` e todos os contratos reais de favoritos,
  filtros, paginação, remoção de favorito e WhatsApp.
- Adicionar uma superficie `bg-surface` ao header, com borda discreta e cantos arredondados, sem voltar a
  usar hero colorido ou glow.
- Remover o `box-shadow` dos chips ativos e diferenciar filtros apenas por fundo azul muito claro, borda
  sutil, texto e icone em azul.
- Ajustar padding, altura e escala dos chips para preservar legibilidade e alinhamento em mobile.
- Aumentar a altura minima e o padding dos cards, com avatar ligeiramente maior e CTA ancorado ao fim do
  card para dar mais respiro entre avatar, nome, profissao e botao `WhatsApp`.

### Consequencias

- A tela fica mais consistente com a linguagem premium atual, com hierarquia por superficie, borda,
  tipografia e espaco, evitando sombras fortes nos filtros.
- Os cards ficam menos comprimidos em duas colunas no mobile e mantem a mesma logica real de favoritos e
  contato.
- Nenhum contrato de API, rota, schema, migration, package ou tracking de WhatsApp foi alterado.

### Validacao

- `pnpm --dir frontend exec biome check src/components/psychologists/psychologist-relation-list.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome/CDP autenticado em `/app/favorites` com desktop 1280px e mobile 390px, confirmando header branco,
  chips `Disponivel hoje`, `Verificados` e `Convenios` sem `box-shadow` e cards renderizados com maior altura.

## Complemento 2026-06-18 - filtros fora do header branco

### Contexto

Produto pediu uma nova calibragem em `/app/favorites`: o header branco deveria ficar mais editorial e conter apenas `Sua curadoria`, título, descrição e ícone de coração, enquanto os filtros deveriam funcionar como uma linha independente logo abaixo.

### Decisão

- Manter `PsychologistRelationList` como componente da tela de Favoritos e preservar todos os contratos reais de filtros, paginação, remoção de favorito e WhatsApp.
- Remover a linha de filtros de dentro do header branco e renderizá-la em um container próprio imediatamente abaixo do header.
- Manter a rolagem horizontal dos filtros no mobile para evitar quebra de layout e preservar a densidade visual.
- Refinar `FilterChip` sem adicionar dependências: fundo branco/azul muito claro, borda azul-clara sutil, tipografia menor, ícones alinhados e ausência explícita de sombra/glow.

### Consequências

- O header fica menos carregado e passa a comunicar apenas o contexto da curadoria de favoritos.
- Os filtros continuam acessíveis e funcionais, mas com hierarquia de controles independentes.
- A alteração é puramente visual/estrutural no frontend, sem mudanças de API, schema, migration, package ou tracking.

### Validação

- `pnpm --dir frontend exec biome check --write src/components/psychologists/psychologist-relation-list.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome/CDP autenticado em `/app/favorites` para confirmar header sem chips internos, filtros independentes abaixo do header, ausência de `box-shadow` nos chips e sem overflow horizontal no mobile.

## Complemento 2026-06-24 - Favoritos sem filtros e header simples

### Contexto

Produto pediu que `/app/favorites` deixasse de ter curadoria/filtros/header branco e ficasse padronizado com `/app/notifications`.

### Decisão

- Remover a apresentação editorial de Favoritos: `Sua curadoria`, descrição, coração decorativo e surface branca do header.
- Remover os chips de filtro da UI da tela de Favoritos.
- Usar apenas o título `Favoritos`, com o mesmo padrão visual simples de Notificações.
- Centralizar o conteúdo em uma coluna responsiva com padding mobile seguro para eliminar overflow horizontal.
- Manter dados reais, paginação, remoção de favorito, cards e CTA WhatsApp.

### Consequências

- A tela fica mais coesa com Notificações e reduz ruído visual.
- A API de favoritos não muda; apenas a UI deixa de enviar filtros nesta tela.
- A responsividade mobile fica protegida por largura máxima e padding consistente.

### Validação

- `pnpm --dir frontend exec biome check --write src/components/psychologists/psychologist-relation-list.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`

## Complemento 2026-06-25 - chips com contagens reais no header simples

### Contexto

Produto pediu que a tela `/app/favorites`, apos ser simplificada para o padrao de Notificacoes, deixasse de exibir o contador textual solto (`1 perfil salvo`) e trouxesse chips logo abaixo do titulo com filtros relevantes e suas quantidades: `Tudo`, `Disponivel hoje`, `Convenio`, `Desconto 1ª Sessao`, `Valor social` e `Mais experientes`.

A restricao principal era nao transformar os numeros em copy fixa/mockada, porque a lista de favoritos e paginada e depende da API autenticada.

### Decisao

- Manter o `SecondaryPageHeader` simples com o titulo `Favoritos`.
- Renderizar uma linha horizontal mobile-first de chips imediatamente abaixo do titulo, com visual premium discreto da Lectum.
- Remover o contador textual acima da grade, evitando redundancia visual.
- Usar os chips como filtros reais sincronizados pela URL, resetando `page` ao trocar o filtro.
- Calcular as quantidades por consultas reais ao endpoint de favoritos com `limit=1`, aproveitando o `count` da paginacao em vez de contar apenas a pagina carregada.
- Adicionar suporte backend a `more_experienced=true` no endpoint de favoritos com a mesma regra ja usada no diretorio: CRP com 10+ anos e `show_experience_tag=true`.

### Consequencias

- A tela ganha filtros de alta intencao sem voltar ao header editorial antigo.
- As quantidades permanecem consistentes com a API e com a paginacao real.
- A busca por `Mais experientes` fica consistente entre descoberta de psicologos e favoritos.
- A solucao aumenta o numero de queries leves de contagem na tela, mas evita endpoint novo e nao altera schema, migrations ou contratos de favoritar/desfavoritar.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir backend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend build`
- `pnpm check`
- `git diff --check`
- HTTP local `200` em `/app/favorites`.

## Complemento 2026-06-25 - calibragem visual Instagram-like dos chips

### Contexto

A primeira versao dos chips com contagem em `/app/favorites` ficou visualmente pesada, com azul preenchido e sombra. Produto pediu uma calibragem mais moderna e sofisticada, sem sombra, tomando como inspiracao os chips de notificacoes do Instagram, alem de pequenos ajustes nos cards de favoritos.

### Decisao

- Trocar os chips preenchidos/sombreados por pills planas: ativo em azul muito claro com texto azul Lectum, inativos em cinza claro com texto escuro.
- Manter as contagens e o comportamento real de filtro sem alterar contratos de API.
- Renderizar o selo verificado inline junto ao nome do psicologo para evitar que pareca desconectado do texto.
- Remover o invólucro branco, ring e sombra da bolinha verde de disponibilidade.
- Remover sombras do CTA de WhatsApp, preservando fundo verde, largura e acao real.

### Consequencias

- O topo de Favoritos fica mais proximo de um padrao mobile premium e menos chamativo.
- Os cards ficam mais limpos, com menos halos/sombras concorrendo com avatar e CTA.
- Nenhuma regra de dominio, endpoint, schema, pacote ou tracking foi alterado.

## Complemento 2026-06-25 - chips destacados e card com mais respiro

### Contexto

Produto observou que os chips inativos de `/app/favorites` ainda se misturavam ao fundo da pagina e que, no desktop, a faixa horizontal precisava de uma affordance de navegacao. Tambem foram apontados problemas de micro-hierarquia no card: selo verificado podendo ficar sozinho, card baixo, pouco respiro e avatar com sombra excessiva.

### Decisao

- Manter os chips sem sombra, mas aumentar contraste dos inativos com fundo branco e borda azul-acinzentada visivel.
- Preservar ativo em azul claro Lectum, com borda suave e sem efeito pesado.
- Adicionar setas laterais apenas em desktop para rolar a faixa horizontal de chips; no mobile a rolagem continua por gesto.
- Aumentar altura minima e espaçamento vertical dos cards de favoritos.
- Remover sombra da area de foto/avatar, substituindo por uma linha fina (`ring-1`) para separar imagem e fundo do card.
- Agrupar o ultimo termo do nome com o selo verificado em `whitespace-nowrap`, evitando selo isolado na segunda linha.

### Consequencias

- Os filtros ficam mais legiveis contra o background sem voltar a usar sombra.
- A navegacao horizontal fica mais clara em desktop, onde gestos de scroll sao menos obvios.
- O card passa a ter mais presenca e leitura mais respirada, sem alterar dados, endpoint ou fluxo de contato.

## Complemento 2026-06-25 - contenção de overflow e proporção do card

### Contexto

A versão com setas e cards mais altos apresentou regressão visual no desktop: a faixa de chips expandia a largura da página, gerando scroll horizontal global, e o card de um único favorito ficava grande demais e desproporcional.

### Decisão

- Conter a faixa de chips em `max-w-full`/`overflow-hidden`, deixando o overflow apenas no container rolável interno.
- Reduzir os botões de navegação desktop para 32px e preservar rolagem suave sem alterar filtros ou contagens reais.
- Remover `w-max min-w-full` como causa de expansão da grid/section, usando `min-w-max` dentro do scroll container.
- Limitar explicitamente a largura máxima do card e usar grid `auto-fit` centralizado para evitar stretch quando há poucos favoritos.
- Manter o avatar sem sombra, mas com tamanho mais controlado e linha fina de delimitação.

### Consequências

- A página deixa de criar scroll horizontal global no desktop.
- Um único favorito volta a parecer um card compacto, sem perder respiro interno.
- A alteração permanece visual e não muda backend, schema, pacotes ou regras de domínio.


## Complemento 2026-06-25 - grade dupla e chips equivalentes aos filtros de Comunidade

### Contexto

A tela de Favoritos tinha voltado a apresentar um card por linha no viewport mobile de referencia, o CTA de WhatsApp parecia apertado/cortando a base de `WhatsApp` e os chips estavam visualmente diferentes dos filtros compactos ja aprovados na pagina de Comunidade.

### Decisao

- Usar duas colunas fixas na grade de `/app/favorites`, preservando os cards reais e a largura maxima do card para nao esticar no desktop.
- Reaplicar em Favoritos a mesma linguagem dos chips de comunidade: pills de 30px, borda sutil, texto de 11px, ativo preenchido em azul Lectum e inativo branco com borda azul-acinzentada.
- Remover a affordance de setas da faixa de Favoritos neste refinamento para que o layout corresponda ao padrao visual dos chips `Em destaque`, `Novos` e `Mais comentados`; a rolagem horizontal segue contida no proprio trilho.
- Aumentar `min-height`, padding, fonte, icone e `line-height` do CTA de WhatsApp no card de Favoritos.
- Nao alterar a implementacao dos chips da pagina de Comunidade, usando-a apenas como referencia visual local.

### Consequencias

- O mobile volta a exibir dois cards por linha e a lista fica mais densa sem retornar ao card comprimido.
- A linguagem dos filtros fica consistente com Comunidade sem criar componente compartilhado prematuramente.
- O CTA de WhatsApp melhora a legibilidade e reduz risco de corte de descendentes em letras como `p`.
- Nao ha impacto em backend, contratos, schema, pacotes, favoritos reais ou tracking.


## Complemento 2026-06-25 - breakpoint de 3 colunas e escala menor

### Contexto

A calibragem anterior de `/app/favorites` resolveu a densidade mobile, mas no desktop a grade ainda exibia apenas duas colunas. Produto tambem apontou que a fonte dos chips e do CTA `WhatsApp` ficou grande demais.

### Decisao

- Manter duas colunas como base mobile e usar tres colunas a partir do breakpoint `sm`.
- Preservar a largura maxima dos cards para evitar stretch no desktop.
- Reduzir os chips de Favoritos para pills de 28px e texto de 10px, mantendo borda/estado ativo do padrao aprovado.
- Reduzir o CTA `WhatsApp` para texto de 0.72rem/0.76rem e icone de 14px, mantendo `min-height`, padding e `line-height` suficientes para evitar corte visual.

### Consequencias

- Desktop ganha uma grade mais eficiente com tres cards por linha.
- Mobile continua com duas colunas.
- A interface fica menos pesada visualmente sem reintroduzir o corte no texto do WhatsApp.
- Nenhuma regra de dominio, endpoint, schema ou pacote foi alterado.


## Complemento 2026-06-25 - truncamento de nome com selo preservado

### Contexto

Produto apontou que a microtipografia dos chips de Favoritos e do CTA `WhatsApp` ainda estava grande. Tambem pediu que o nome do psicologo no card ocupasse apenas uma linha, truncando com reticencias quando necessario, mas sem esconder o selo de verificado.

### Decisao

- Reduzir a fonte das chips de Favoritos para 9.5px, mantendo altura e superficie ja aprovadas.
- Reduzir o CTA `WhatsApp` para 0.68rem no mobile e 0.72rem em telas maiores, com icone de 12px.
- Trocar a composicao do nome de duas linhas por um container flex em linha unica.
- Colocar o texto do nome em `truncate` e o selo verificado em `shrink-0`, garantindo que o selo permaneça visivel mesmo quando o nome precisar de reticencias.

### Consequencias

- Cards ficam mais consistentes e menos carregados visualmente em 2 colunas mobile e 3 colunas desktop.
- O selo verificado deixa de depender do espaco restante do texto e permanece sempre visivel.
- A mudanca e estritamente visual e nao altera contratos, dados, filtros, tracking ou persistencia.


## Complemento 2026-06-25 - replica local do padrao das chips de Comunidade

### Contexto

Produto reforcou que as chips de Favoritos ainda nao estavam suficientemente alinhadas ao padrao visual das chips da Comunidade, mas pediu explicitamente para nao alterar a pagina de Comunidade.

### Decisao

- Criar em Favoritos o helper local `favoriteFilterChipClassName` replicando a composicao visual de `communityPostSortChipClassName`.
- Usar a mesma altura, padding, tipografia, bordas, foco, transicoes e estados ativo/inativo das chips de Comunidade.
- Ajustar o wrapper de Favoritos para `nav` rolavel com classes equivalentes ao trilho de ordenacao da Comunidade.
- Nao extrair componente compartilhado neste momento, pois o pedido e um ajuste visual pontual e a Comunidade nao deve ser tocada.

### Consequencias

- Favoritos passa a ter o mesmo padrao visual operacional das chips de Comunidade sem alterar a origem visual existente.
- Mantem-se baixo risco de regressao na Comunidade.
- A duplicacao e aceita neste refinamento por evitar acoplamento prematuro entre contextos com semanticas diferentes.


## Complemento 2026-06-25 - header contextual branco em Favoritos

### Contexto

Produto decidiu evoluir a tela de Favoritos para um modelo mais contextual, inspirado no bloco de regras/filtros da Comunidade: um card branco com icone, titulo e descricao, seguido pelas chips em trilho independente.

### Decisao

- Substituir o header secundario simples por um header local de Favoritos.
- Manter o titulo `Favoritos` e adicionar a descricao `Profissionais que voce salvou para comparar e conversar quando quiser.`.
- Usar um icone de coracao a esquerda, dentro de uma superficie circular azul suave.
- Manter as chips fora do header, logo abaixo, para preservar a hierarquia: contexto primeiro, filtros depois.
- Nao alterar a pagina de Comunidade nem compartilhar componente neste momento.

### Consequencias

- A tela ganha contexto e hierarquia visual mais premium sem alterar filtros, dados ou persistencia.
- O header branco aproxima Favoritos da linguagem dos blocos informativos da Comunidade.
- A decisao segue visual/local e nao impacta contratos de API, backend, schema ou pacotes.


## Complemento 2026-06-25 - CTA em portugues e paridade mobile/desktop dos cards

### Contexto

Na tela de Favoritos, o header apresentava mojibake no texto `voc?`, o CTA de WhatsApp precisava de melhor proporcao visual entre icone e label, e os cards no mobile estavam mais comprimidos que no desktop.

### Decisao

- Usar escape Unicode para garantir que `voc?` renderize corretamente no header.
- Alterar o label visivel do CTA de `WhatsApp` para `Conversar`, mantendo o icone de WhatsApp e a acao real de contato.
- Ajustar a proporcao do CTA com icone de 14px, texto de 0.72rem, altura minima de 36px, padding horizontal maior e gap equilibrado.
- Aplicar a disposicao visual do desktop como base mobile: card de 296px, padding 20px, raio 28px, avatar 112px e respiro vertical maior.

### Consequencias

- O texto fica correto em PT-BR no browser.
- O CTA continua claramente associado ao WhatsApp pelo icone, mas com copy mais natural para o usuario.
- Mobile e desktop ficam mais consistentes na hierarquia interna dos cards, com menos sensacao de elementos comprimidos.
- Nao ha alteracao em dados, contratos, backend, schema, filtros ou tracking.


## Complemento 2026-06-25 - contador das chips como badge separado

### Contexto

Produto pediu que as quantidades das chips de Favoritos deixassem o formato textual `(3)` e passassem a usar uma composicao mais moderna, similar ao contador da secao `Publicacoes` do perfil do psicologo, sem alterar o perfil. Tambem pediu que o CTA dos cards voltasse de `Conversar` para `WhatsApp`.

### Decisao

- Manter as chips de Favoritos no padrao visual alinhado a Comunidade, mas renderizar a quantidade como um badge interno independente.
- Usar no contador uma superficie clara com borda azul-clara e texto azul, inspirada no contador de Publicacoes do perfil.
- No estado ativo, usar contador branco com texto azul para preservar contraste sobre o chip azul.
- Voltar o label visivel do CTA dos cards para `WhatsApp`, sem alterar a acao real ou tracking.
- Nao alterar a tela/perfil do psicologo.

### Consequencias

- A linha de filtros fica mais refinada e legivel, removendo a aparencia tecnica de parenteses.
- O CTA volta a nomear diretamente o canal de contato, como esperado pelo usuario.
- A mudanca e visual/local em Favoritos e nao altera dados, contratos, backend, perfil do psicologo ou persistencia.

## Complemento 2026-06-25 - densidade mobile dos cards de Favoritos

### Contexto

Ao validar `/app/favorites` em largura mobile (~390px), a grade de duas colunas passou a ficar visualmente pesada porque os cards usavam a mesma escala espacada definida para desktop: avatar grande, padding alto e respiros internos amplos. Isso fazia o CTA perder area util e o label `WhatsApp` aparecer truncado.

### Decisao

- Definir uma escala mobile propria para o card de Favoritos: altura minima menor, raio menor, padding de 14px, avatar de 88px e gaps internos mais curtos.
- Manter a escala desktop via classes `sm:` para preservar a leitura mais aberta em telas maiores.
- Manter o nome do psicologo em uma linha com selo verificado fixo e truncamento apenas do nome quando necessario.
- No CTA de WhatsApp, usar fonte/icone compactos e impedir truncamento do label `WhatsApp` no contexto mobile.
- Nao alterar cards de Comunidade, perfil do psicologo, filtros reais ou contratos de API.

### Consequencias

- A grade mobile de duas colunas fica mais equilibrada, com menos vazio interno e melhor proporcao entre avatar, nome, profissao e CTA.
- O texto `WhatsApp` passa a caber inteiro no botao sem perder a associacao com o icone.
- Desktop e mobile mantem escalas diferentes por necessidade de densidade visual, sem criar novo componente ou pacote.

## Complemento 2026-06-25 - modelo de perfil salvo para Favoritos

### Contexto

Produto avaliou que o card de Favoritos ainda parecia vazio e pediu uma composicao inspirada em cards de sugestao de rede: capa, avatar sobreposto, acao de remover no canto, bio curta e CTA direto para WhatsApp.

### Decisao

- Evoluir apenas o card de `/app/favorites` para uma estrutura de perfil salvo com capa no topo.
- Usar `video_cover_url` como fonte de capa quando o endpoint de favoritos já entregar esse dado; quando ausente, usar uma superficie visual neutra da Lectum, sem inventar dados.
- Manter a imagem de perfil/iniciais como avatar principal sobreposto à capa, usando `next/image` para midia real.
- Substituir o subtitulo fixo `Psicologo` por uma bio curta derivada de dados reais na seguinte prioridade: `headline`, `bio`, especialidades e, por ultimo, tipo profissional.
- Manter o coracao preenchido como acao de remover favorito, pois comunica melhor o estado salvo que um `X`.
- Manter o CTA `WhatsApp` como acao principal do card e preservar o fluxo/tracking existente.

### Consequencias

- Favoritos passa a comunicar melhor quem e o profissional salvo antes do contato.
- A tela ganha mais densidade visual e diferenciação entre profissionais sem depender de dados mockados.
- O endpoint atual continua suficiente; nao ha mudanca de contrato, schema, migration ou pacote.
- A composicao mobile segue duas colunas compactas, enquanto desktop preserva tres cards por linha.

## Complemento 2026-06-25 - alinhamento espacial com Perfil

### Contexto

A pagina de Perfil usa um layout mais amplo e imersivo: o header branco ocupa mais largura e altura, começa mais perto do topo util e tem margens laterais menores. Favoritos ainda estava visualmente mais estreito, com header compacto e cards comprimidos no centro.

### Decisao

- Alterar apenas `/app/favorites`, sem tocar na implementacao da pagina de Perfil.
- Ampliar o container de Favoritos para `max-w-[960px]`, aproximando a largura do bloco principal visto no Perfil.
- Reduzir padding superior/lateral mobile-first do container para diminuir a sensacao de margem excessiva.
- Recriar o header de Favoritos como um bloco maior e centralizado, com icone de coracao em escala semelhante ao avatar do Perfil, mantendo a descricao existente.
- Fazer chips e grade acompanharem a nova largura: filtros continuam em trilho horizontal e os cards passam a preencher as colunas disponiveis.
- Preservar 2 colunas no mobile e 3 no desktop, sem mudar contratos, filtros, dados ou tracking.

### Consequencias

- Favoritos passa a ter hierarquia espacial mais consistente com Perfil.
- O header ganha protagonismo sem criar dependencia entre as paginas.
- Os cards ficam proporcionais ao novo container, reduzindo a sensacao de conteudo estreito/centralizado demais.
- A mudanca e visual/local e nao altera backend, schema, endpoints ou pacotes.

## Complemento 2026-06-25 - Perfil como fonte de proporcao para Favoritos

### Contexto

Produto indicou que Favoritos ainda tinha proporcoes diferentes de Perfil. A referencia deveria ser a implementacao real de `/app/profile`, especialmente o header: envelope responsivo, card com tokens globais, padding interno, avatar/icone de 112px, titulo e subtitulo.

### Decisao

- Inspecionar a implementacao de `frontend/src/app/app/profile/logic.tsx` e usar seu header como modelo direto.
- Nao alterar nenhum arquivo da pagina de Perfil.
- Atualizar `FavoritePageHeader` para usar a mesma estrutura visual do Perfil: outer card com `rounded-[var(--lectum-card-radius)]`, `border-border`, `bg-surface` e `shadow-[var(--lectum-shadow-soft)]`; inner block `bg-white px-6 py-8 text-center`; icone circular com `h-28 w-28`, borda branca e sombra suave; titulo `text-2xl font-bold leading-7`.
- Ajustar o envelope de Favoritos para o mesmo padrao responsivo do Perfil: `max-w-[430px]` e `md:max-w-3xl`.
- Manter chips e cards dentro desse envelope para que acompanhem a largura e o ritmo do header.

### Consequencias

- Favoritos fica proporcionalmente alinhado ao Perfil sem criar dependencia ou modificar Perfil.
- A diferenca visual entre as paginas passa a ser de conteudo, nao de escala/layout base.
- O ajuste permanece local e visual, sem impacto em backend, schema, endpoints, pacotes ou tracking.

## Complemento 2026-06-25 - origem real da capa e hierarquia da bio

### Contexto

Na tela de Favoritos, a area de capa dos cards estava exibindo apenas fallback visual. A investigacao mostrou que o endpoint de Favoritos retornava `video_cover_url`, mas nao retornava `cover_image_url`, que e o campo de capa do perfil profissional no modelo Prisma. Alem disso, a bio estava visualmente pesada e muito proxima do CTA de WhatsApp.

### Decisao

- Incluir `cover_image_url` na resposta do endpoint de Favoritos, selecionando o campo existente em `psychologist_profile` e adicionando-o ao DTO `PatientRelationPsychologist`.
- Atualizar o tipo correspondente no frontend.
- Na capa do card, priorizar `cover_image_url`, depois `video_cover_url`, sem usar `avatar` como fallback de capa.
- Manter fallback gradiente quando nenhum asset dedicado de capa existir.
- Reduzir o peso da bio para `font-medium` e `text-muted/90`.
- Criar respiro explicito entre bio e CTA com wrapper `pt-4 sm:pt-5`, sem perder o alinhamento inferior do botao.

### Consequencias

- Cards passam a exibir capas reais sempre que o perfil tiver `cover_image_url` ou `video_cover_url`, sem depender de mock.
- Perfis sem capa ainda mantem composicao visual consistente usando fallback Lectum, enquanto o avatar permanece somente como foto/icone do perfil.
- A hierarquia do card fica mais leve e respirada.
- Nao ha mudanca em schema, migrations, pacotes ou tracking.

## Complemento 2026-06-25 - capa dedicada sem avatar em Favoritos

### Contexto

Produto apontou que a capa dos cards de Favoritos estava repetindo a foto/icone do perfil quando nao havia capa dedicada. Isso confundia a hierarquia do card, pois a mesma imagem aparecia como capa e avatar.

### Decisao

- Manter a pagina de Perfil intacta.
- Na tela de Favoritos, limitar a capa do card aos campos dedicados `cover_image_url` e `video_cover_url`.
- Ignorar qualquer candidato de capa que seja igual ao `avatar` do profissional.
- Quando nao houver capa dedicada, usar apenas o fallback visual neutro da Lectum, sem promover a foto do perfil a capa.

### Consequencias

- A area de capa passa a representar somente midia de capa real ou fallback neutro.
- O avatar continua sendo a unica representacao da foto/icone do perfil no card.
- Evita duplicidade visual e preserva a diferenca semantica entre capa e foto do psicologo.
- A mudanca e local ao frontend de Favoritos e nao altera backend, schema, endpoints, pacotes ou tracking.

## Complemento 2026-06-26 - escala dos filtros e CTA em Favoritos

### Contexto

A tela de Favoritos ja usava o card com capa/avatar e os filtros com contagem real, mas a captura do usuario mostrou tres desalinhamentos visuais: chips pequenos demais para a escala atual da tela, indicador verde de disponibilidade praticamente fora da borda do avatar e texto do CTA `WhatsApp` grande em relacao ao icone.

### Decisao

- Aumentar somente as chips de `/app/favorites` para 38px no mobile e 40px a partir de `sm`, com label de 12px/13px e contador maior.
- Renomear o label visual do filtro `all` de `Tudo` para `Todos`, mantendo a mesma chave de filtro e contrato de URL/API.
- Reposicionar o indicador `available_today` para dentro da foto/avatar, com offsets internos, sem adicionar borda branca nem simular estado online.
- No CTA `WhatsApp`, aplicar tamanho do texto no `span` interno do label e tamanhos de icone em pixels, evitando que resets/base de `button` aumentem a tipografia.

### Consequencias

- Os filtros ganham peso proporcional ao header e aos cards sem alterar dados, contagens ou comportamento de rolagem horizontal.
- O status verde passa a parecer sobreposto ao avatar em vez de pendurado fora da foto.
- O CTA continua legivel e acionando o mesmo fluxo real de WhatsApp, mas com melhor relacao visual entre icone e texto.
- A mudanca e local ao frontend de Favoritos e nao altera backend, schema, endpoints, packages, favoritos persistidos, filtros reais ou tracking.

## Complemento 2026-06-26 - chips alinhados à Comunidade e CTA proporcional

### Contexto

Depois de aumentar os filtros e ajustar a tela de Favoritos, o produto decidiu aproximar as chips de `/app/favorites` do padrão visual já aprovado nos filtros da Comunidade (`Em destaque`, `Novos`, `Mais comentados`). A captura também mostrou que o ponto verde de disponibilidade ainda parecia deslocado em relação ao avatar e que o CTA de WhatsApp precisava de uma relação mais equilibrada entre ícone, texto e altura.

### Decisão

- Reaplicar em Favoritos a mesma base visual das chips de Comunidade: altura `h-8`, texto `text-xs`, padding `px-3`, borda sutil, estado ativo preenchido em azul Lectum, inativo branco e transições/foco equivalentes.
- Preservar o badge de contagem em Favoritos, pois os números vêm de queries reais do endpoint de favoritos; apenas reduzir o badge para caber na nova escala de chip.
- Reposicionar o indicador `available_today` com offsets internos no avatar, para que o ponto verde fique sobreposto ao círculo da imagem em vez de parecer fora da borda.
- Ajustar somente o CTA de WhatsApp do card de Favoritos, reduzindo o ícone e controlando peso/altura do label sem alterar o componente de redirect, tracking ou contrato de contato.

### Consequências

- Favoritos fica visualmente consistente com Comunidade nos controles de filtro sem extrair componente compartilhado prematuramente.
- As contagens reais continuam visíveis, mas em escala compatível com o padrão compacto dos filtros.
- O status verde comunica disponibilidade com melhor encaixe visual no avatar.
- O CTA mantém a mesma função e rastreamento real, com proporção mais discreta dentro do card.

## Complemento 2026-06-26 - correção de escala após feedback visual

### Contexto

A rodada anterior ainda deixou as chips de Favoritos com volume maior que o esperado para a comparação com Comunidade. O indicador verde também foi levado para dentro da imagem, quando a intenção era posicioná-lo sobre a moldura do avatar. No mobile, o texto do CTA `WhatsApp` continuava desalinhado em relação ao ícone.

### Decisão

- Reduzir as chips de Favoritos abaixo da composição anterior: `h-7`, `text-[11px]`, `px-2.5` e `gap-1`, mantendo o mesmo estado ativo/inativo e a mesma semântica de botão dos filtros.
- Reduzir o badge de contagem para 20px, preservando a contagem real do endpoint sem aumentar a altura da chip.
- Posicionar o indicador verde com offsets próximos da borda (`right/bottom` externos ao centro interno), adicionando ring de superfície no ponto para comunicar encaixe na moldura.
- Ajustar o conteúdo do CTA de WhatsApp no mobile com ícone de 12px e label `inline-flex` com altura fixa, evitando desalinhamento óptico entre texto e ícone.

### Consequências

- As chips ficam mais próximas da escala compacta dos filtros da Comunidade, mesmo mantendo badge de contagem próprio de Favoritos.
- O status verde passa a ocupar a borda/moldura do avatar, sem parecer um elemento solto nem totalmente dentro da foto.
- O CTA preserva a ação e tracking reais, com alinhamento mais estável em cards de duas colunas no mobile.
## Complemento 2026-06-26 - replicação literal das chips da Comunidade

### Contexto

O produto apontou corretamente que os ajustes anteriores continuaram criando variações locais nas chips de Favoritos em vez de copiar a configuração existente da Comunidade. A referência operacional passou a ser o helper `communityPostSortChipClassName`, não uma interpretação visual aproximada.

### Decisão

- Usar em `favoriteFilterChipClassName` a mesma classe-base de `communityPostSortChipClassName`: `h-8`, `min-h-8`, `gap-1.5`, `px-3`, `text-xs`, `font-bold`, `leading-none`, `tracking-[-0.01em]`, ausência de sombra, foco e estados ativo/inativo equivalentes.
- Não extrair componente compartilhado nesta rodada para evitar tocar na página de Comunidade; a replicação permanece local e explícita em Favoritos.
- Manter o contador real de Favoritos por requisito já aprovado, mas reduzi-lo para 16px para que ele não altere a escala da chip copiada da Comunidade.
- Manter o indicador verde ancorado na moldura do avatar e simplificar o alinhamento interno do CTA `WhatsApp` sem alterar o redirect/tracking real.

### Consequências

- Favoritos passa a usar a mesma configuração operacional das chips da Comunidade, com a única diferença visual necessária sendo o badge de contagem real.
- A duplicação local reduz risco de regressão na Comunidade e deixa explícito o vínculo visual pedido pelo produto.
- Nenhum contrato de API, schema, endpoint, pacote ou regra de domínio foi alterado.
## Complemento 2026-06-26 - contador sem badge nas chips de Favoritos

### Contexto

O produto pediu que as chips de Favoritos replicassem as configuracoes de layout das chips da Comunidade, alterando somente a largura necessaria para comportar os contadores. A presenca de badge proprio nos contadores alterava a leitura de tamanho/fonte mesmo quando a classe-base da chip era equivalente.

### Decisao

- Manter `favoriteFilterChipClassName` com a mesma classe-base de `communityPostSortChipClassName`.
- Remover o badge proprio de contador em Favoritos.
- Renderizar o contador real como texto simples com `whitespace-nowrap text-xs font-bold leading-none`, igual ao label da chip.
- Preservar a contagem real do endpoint e a rolagem horizontal existente.

### Consequencias

- A chip de Favoritos passa a diferir da Comunidade apenas pela largura natural necessaria para exibir o numero.
- A altura, fonte, peso, gap, padding e estados visuais permanecem equivalentes ao padrao da Comunidade.
## Complemento 2026-06-26 - superficie suave nos contadores das chips

### Contexto

Apos a replica das configuracoes de layout da Comunidade, o produto pediu uma bolinha azul suave atras dos contadores das chips de Favoritos para melhorar a leitura dos numeros sem voltar a aumentar a escala das chips.

### Decisao

- Preservar a classe-base de `favoriteFilterChipClassName` equivalente ao helper da Comunidade (`h-8`, `text-xs`, `px-3`, `gap-1.5`, estados ativo/inativo e foco).
- Adicionar somente ao contador um `span` circular com `h-5`, `min-w-5`, `rounded-full` e `bg-primary-soft`, mantendo `text-xs font-bold leading-none`.
- Nao extrair componente compartilhado nesta rodada para limitar o escopo a `/app/favorites` e evitar regressao na Comunidade.

### Consequencias

- Os contadores reais ficam mais legiveis com uma superficie azul suave, sem alterar o tamanho, a fonte ou o comportamento das chips.
- A diferenca de Favoritos em relacao a Comunidade continua restrita a necessidade de exibir contadores reais.
- Nenhum contrato de API, schema, endpoint, pacote ou regra de dominio foi alterado.

## Complemento 2026-08-11 - compactacao do estado vazio

### Contexto

O estado vazio autenticado de `/app/favoritos` estava com distribuicao vertical excessiva entre icone, titulo, descricao e CTA no mobile, porque o container mantinha altura minima alta sem compactar o conteudo no eixo vertical.

### Decisao

- Manter o `EmptyState` compartilhado sem alterar outros estados vazios do produto.
- Aplicar a compactacao somente no uso de Favoritos, adicionando `content-center`, reduzindo `gap`, `py` e `min-height` via `className` local.
- Preservar os textos, CTA `Explorar psicologos`, borda tracejada, filtros reais e comportamento autenticado existente.

### Consequencias

- O estado vazio fica mais denso e legivel na largura mobile de referencia, sem criar componente paralelo nem afetar outras telas.
- Nao ha mudanca de contrato de API, schema, endpoint, pacote, favoritos persistidos ou tracking.
