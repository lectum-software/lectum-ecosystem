# ADR-0280: Hierarquia e ações da lista de publicações do psicólogo no Admin

## Status

Accepted

## Task relacionada

TASK-57

## Contexto

A aba **Publicações** do detalhe administrativo do psicólogo precisava ficar consistente com o modelo visual do detalhe analítico de conteúdo, especialmente na leitura de posts com vídeo. A linha superior mostrava apenas tag e data, o título ficava junto do corpo ao lado da mídia e a ação de analytics usava ícone de documento. A lista também exibia um atalho de exclusão, embora a listagem seja leitura/analytics e a moderação de conteúdo pertença aos fluxos auditados de comunidade.

Builder/Quick Copy não está exposto como ferramenta callable neste ambiente. A referência visual usada foi o recorte enviado pelo usuário e o padrão local já implementado em `/comunidades/[slug]/conteudo/[type]/[id]`.

## Decisão

- A linha superior de cada item passa a seguir o padrão `Post/Resposta · Comunidade · data`, com tipo e comunidade em destaque.
- O título de posts fica acima do bloco de mídia + texto, preservando a hierarquia do detalhe de conteúdo.
- O atalho de exclusão foi removido da listagem de publicações do psicólogo; ações destrutivas continuam centralizadas nos fluxos auditados de comunidade/denúncias.
- O atalho para o detalhe analítico passa a usar `BarChart3`, representando analytics em vez de documento.

## Consequências

- A lista fica mais próxima do detalhe analítico de conteúdo e reduz repetição visual de comunidade.
- A remoção do botão de exclusão evita ação destrutiva contextual nessa listagem e preserva foco em análise/visualização.
- Não há alteração de contrato backend, dados, Prisma schema, migrations, package ou endpoint.

## Validação

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local em `/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=publicacoes`

## Pendências

- Nenhuma pendência externa.
