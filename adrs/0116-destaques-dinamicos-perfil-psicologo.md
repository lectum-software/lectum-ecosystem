# ADR 0116 — Destaques dinamicos na aba Geral do perfil do psicologo

## Status

Aceita

## Task relacionada

TASK-15 — Perfil profissional publico

## Contexto

A aba `Geral` do perfil do psicologo exibia a primeira avaliacao e a primeira publicacao retornadas pelas listas paginadas. Como essas listas sao ordenadas por recencia, o destaque podia privilegiar o item mais recente em vez do item mais relevante para a reputacao do profissional.

O produto passou a exigir que:

- a avaliacao em destaque seja sempre a maior nota recebida pelo profissional;
- a publicacao em destaque seja sempre o post original ou resposta com maior engajamento real;
- empates usem recencia como criterio secundario;
- os destaques sejam recalculados quando novas avaliacoes, publicacoes, respostas ou interacoes ocorrerem.

## Decisao

O calculo de destaque fica no backend, dentro do repositorio publico do perfil, para nao depender da pagina carregada no frontend nem de dados parciais da lista.

Foram adicionados campos aos contratos existentes:

- `highlighted_review` em `GET /api/private/directory/psychologists/:id/reviews`.
- `highlighted_publication` em `GET /api/private/directory/psychologists/:id/posts`.

`highlighted_review` usa ordenacao por `rating desc`, depois `createdAt desc`, depois `id desc`.

`highlighted_publication` compara posts originais e respostas do psicologo com uma pontuacao de engajamento alinhada aos pesos ja usados para relevancia de comunidades:

- upvotes;
- comentarios/respostas;
- respostas de psicologos verificados;
- respostas Top Mentor;
- salvamentos;
- compartilhamentos, mantendo campo de peso preparado para quando houver fonte persistida real de share.

Em caso de empate de pontuacao, vence o item mais recente e, depois, o maior `id` como desempate estavel.

No frontend, a aba `Geral` usa explicitamente `highlighted_review` e `highlighted_publication`. As abas completas continuam usando a ordenacao e paginacao ja existentes.

As mutacoes de posts/respostas/votos/salvos invalidam as queries `directory_psychologist` para que o perfil ativo refaça a busca e recalcule os destaques apos interacoes. A criacao de avaliacao ja invalidava o perfil do psicologo avaliado.

## Consequencias

- O destaque da aba `Geral` comunica reputacao e contribuicao real, nao apenas recencia.
- O frontend nao precisa carregar todas as paginas para encontrar o destaque correto.
- Perfis com muitas contribuicoes podem ter custo maior no endpoint de publicacoes, pois o destaque precisa considerar todos os candidatos reais do profissional. Se o volume crescer, uma task futura pode materializar sinais de engajamento em snapshot sem alterar o contrato da UI.
- Nao houve mudanca de Prisma, migrations ou packages.
- Compartilhamentos continuam sem produtor persistido real no escopo atual; o peso foi preservado na formula para compatibilidade com o algoritmo de comunidades quando essa fonte existir.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Script real via `ProfileRepository` para `demo-psychologist-camila-rocha`, confirmando `highlighted_review` igual a avaliacao publicada de maior nota e `highlighted_publication` diferente do primeiro item cronologico quando o maior engajamento pertence a outro item.
- Chrome headless local mobile 390px em `/app/psychologist/demo-psychologist-camila-rocha`, confirmando a aba `Geral` com a publicacao destacada por engajamento.

## Pendencias

Nenhuma pendencia externa para avaliacao, posts, respostas, votos ou salvos. O sinal de compartilhamento permanece limitado pela ausencia ja documentada de evento/modelo persistido de share; quando existir, deve alimentar a mesma formula sem criar layout paralelo.
