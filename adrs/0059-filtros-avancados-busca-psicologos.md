# ADR-0059 - Filtros avançados na busca de psicólogos

## Status

Accepted

## Contexto

A tela `/app/psychologists` já filtrava psicólogos publicados por busca textual e taxonomias
`specialty`, `service` e `approach`. O produto passou a exigir filtros adicionais usando dados reais
do perfil profissional: público atendido, localização, gênero, raça/cor, religião, idiomas e selos de
acessibilidade/experiência.

## Decisão

- O contrato `GET /api/private/directory/psychologists` passa a aceitar novos query params opcionais:
  `target_audience`, `state`, `city`, `gender`, `race_color`, `religion`, `language`,
  `more_experienced`, `discount_first_session`, `accepts_insurance` e `social_value`.
- Os filtros são aplicados no `IndexRepository` sobre campos persistidos de
  `psychologist_profile`, sem mocks, seeds ou dados inventados.
- `more_experienced=true` exige data de inscrição CRP anterior a 10 anos e respeita
  `show_experience_tag=true`, evitando ranquear por uma informação que o profissional optou por
  ocultar.
- O frontend mantém a fundação de formulários da TASK-02 e estende os controllers existentes:
  - `input` ganhou ícone leading de busca;
  - `select` ganhou modo pesquisável e opções dinâmicas dependentes de outro campo.
- A lista de especialidades no filtro usa a mesma categorização visual da configuração do psicólogo,
  e a lista de serviços usa a ordem de produto solicitada.

## Consequências

- A busca por nome/CRP e os novos filtros compartilham URL state e React Query, mantendo paginação e
  cache previsíveis.
- A cidade é selecionada a partir do estado informado, usando a lista local já existente do setup de
  perfil profissional.
- A extensão dos controllers é reutilizável por futuras telas, sem instalar pacote novo nem criar
  design system paralelo.

## Atualização 2026-06-11: busca principal com sugestões

- O campo `Buscar profissional` foi removido da modal de filtros para separar critérios avançados da
  busca principal da tela.
- A busca principal em `/app/psychologists` passou a consultar o endpoint real de diretório enquanto
  o usuário digita e exibir sugestões de nomes de psicólogos publicados/cadastrados.
- As sugestões reutilizam `GET /api/private/directory/psychologists` com `limit=8`, filtram nomes no
  cliente e mostram o marcador `Verificado` quando há entitlement profissional ativo; caso contrário,
  o perfil publicado aparece como `Gratuito`.
- Selecionar uma sugestão aplica o nome na busca e preserva os demais filtros ativos da URL.
- Validação complementar: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`,
  HTTP 200 em `/app/psychologists` e smoke real `GET /api/private/directory/psychologists?limit=8&search=Ana`.

## Task relacionada

- TASK-13 - Psicólogos: listagem e filtros

## Validações

- `pnpm --dir frontend check`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke real do endpoint local:
  `GET /api/private/directory/psychologists?limit=1&target_audience=adultos&state=SP&city=São%20Paulo&gender=feminino&race_color=branca&religion=catolica&language=Português&more_experienced=true&discount_first_session=true&accepts_insurance=true&social_value=true`
  retornou HTTP 200 com filtros de catálogo.
- Browser local headless em `http://127.0.0.1:3005/app/psychologists` confirmou renderização da
  tela com busca atualizada; a captura autenticou a API local com `--disable-web-security` apenas
  para contornar CORS do servidor de validação em porta alternativa.
