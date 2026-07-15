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
