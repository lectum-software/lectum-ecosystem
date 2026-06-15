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
