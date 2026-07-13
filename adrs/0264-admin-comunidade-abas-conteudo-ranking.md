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
