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
- HTTP local em `http://127.0.0.1:3100/app/favorites` respondeu `200` usando `next start` ap?s build.

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
