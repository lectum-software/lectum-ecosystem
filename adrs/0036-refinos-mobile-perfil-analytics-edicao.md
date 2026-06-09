# ADR-0036: Refinos mobile de perfil público, analytics e edição profissional

## Status

Accepted

## Task relacionada

TASK-36

## Contexto

A validação mobile após a TASK-35 mostrou pontos ainda desalinhados com o protótipo/anexo: o perfil público precisava de mais área branca e hierarquia textual, analytics ainda sofria overflow em viewports estreitos e a edição profissional mantinha rótulos grandes em controles que deveriam ser compactos.

As regras do produto impedem simular métricas ou dados de perfil. O ajuste deveria ser puramente visual/comportamental no frontend, preservando os contratos e dados reais já existentes.

## Decisão

- O perfil profissional público mantém o conteúdo de `Atendimento` para baixo sobre `bg-surface`, com formação em duas linhas e uma área de respiro antes do CTA fixo de WhatsApp.
- A avaliação é sempre mostrada acima do nome no hero; quando não há avaliações persistidas, a UI exibe `0.0 (0)` em vez de omitir o bloco.
- A bio pública abaixo do vídeo é colapsada em 4 linhas e expande com `Ver mais`, evitando que textos longos dominem o primeiro scroll mobile.
- A tela de analytics usa o viewport disponível dentro do `PageShell` no mobile, compacta cards/filtros e reduz padding para evitar overflow horizontal.
- A edição profissional mantém o seletor de país existente, mas troca a opção brasileira para exibir apenas `+55` naquele formulário. Controles auxiliares de formação e vídeo viram botões iconográficos para ganhar densidade.
- O cabeçalho de favoritos fica direto em `Favoritos`, sem seta e sem rótulo secundário `Minha lista`.

## Consequências

- As telas ficam mais próximas da densidade mobile do protótipo sem criar componentes paralelos ou instalar pacote.
- O analytics continua honesto: métrica sem evento real permanece sem valor simulado, apenas em layout que cabe na tela.
- A escolha `0.0 (0)` no hero explicita ausência de avaliações sem ocultar a posição visual esperada.
- A opção `+55` é limitada ao formulário profissional; a lista global de países permanece disponível para outros fluxos.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser/HTTP local nas rotas afetadas; rotas privadas sem sessão real preservaram redirecionamento/gate de autenticação.

## Pendências

- Validação visual autenticada completa ainda depende de sessão real no browser do ambiente.
- Métricas de busca, visualizações de perfil, vídeo views e favoritos continuam pendentes de eventos persistidos antes de exibirem números reais.
