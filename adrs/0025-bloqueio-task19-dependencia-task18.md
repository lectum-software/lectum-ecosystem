# ADR-0025 - Bloqueio da TASK-19 por dependencia do perfil privado do psicologo

## Status

Accepted

## Contexto

A TASK-19 cria a tela privada onde o psicologo acompanha avaliacoes recebidas e responde depoimentos. A task declara dependencias obrigatorias TASK-17 e TASK-18.

A TASK-17 esta concluida e ja cria avaliacoes reais. Porem a TASK-18 esta `Blocked` por depender da validacao de documentos/CRP da TASK-11, registrada na ADR-0024. Como a TASK-19 pertence ao mesmo escopo de area privada do psicologo e depende da navegacao/estrutura privada definida pela TASK-18, nao deve ser implementada parcialmente enquanto essa base estiver bloqueada.

A referencia visual da TASK-19 foi consultada pela imagem local:

- `_product/proto/Minhas Avaliacoes - Psicologo.jpg`.

Builder/Quick Copy nao foi usado nesta sessao; a imagem local foi usada como fallback auditavel.

## Decisao

Nao implementar a TASK-19 nesta execucao enquanto TASK-18 estiver bloqueada.

A implementacao de leitura/resposta de avaliacoes do psicologo deve ser retomada depois que a area privada do psicologo estiver liberada pela TASK-18, evitando criar rota solta, navegacao paralela ou experiencia incompleta.

Tambem fica decidido que, ate o desbloqueio:

- nao criar `/app/professional/reviews` como tela final;
- nao criar endpoints `/api/private/psychologist/reviews` e `/api/private/psychologist/reviews/:id/response`;
- nao permitir resposta a avaliacao por caminho paralelo;
- nao alterar `rating` ou `comment` recebidos;
- nao usar mocks, seeds ou dados fake para preencher metricas.

## Consequencias

- A TASK-19 passa para `Blocked` por dependencia obrigatoria ainda bloqueada.
- A funcionalidade deve ser retomada depois que TASK-18 for desbloqueada/concluida.
- As avaliacoes criadas pela TASK-17 permanecem disponiveis no modelo real para futura leitura pelo psicologo.

## Task relacionada

- TASK-19: Avaliacoes do psicologo

## Validacao

- Revisao de `_product/tasks/README.md`, `_product/tasks/TASK-18-perfil-privado-psicologo.md`, `_product/tasks/TASK-19-avaliacoes-psicologo.md` e `adrs/0024-bloqueio-task18-dependencia-crp.md`.
- Revisao visual local de `_product/proto/Minhas Avaliacoes - Psicologo.jpg`.
