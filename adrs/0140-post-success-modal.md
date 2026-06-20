# ADR 0140 - Confirmação de postagem em modal

Status: Accepted

## Contexto

Após criar um post, o fluxo exibia duas confirmações concorrentes: um toast verde com "Post publicado com sucesso." e uma tela dedicada de sucesso. Isso deixava a experiência redundante e quebrava a continuidade visual da modal de criação.

O inventário visual ativo foi consultado e contém a referência `_product/proto/Confirmação de Postagem.jpg`. O Builder/Quick Copy não está acessível como ferramenta executável neste ambiente; a decisão foi baseada no pedido do usuário, no inventário e no padrão modal já existente em `Criar Post`.

## Decisão

- Remover o toast verde automático da criação de post ao deixar `createCommunityPost` sem `showSuccess`.
- Transformar a confirmação de postagem em um card modal centralizado.
- Criar rota interceptada no slot `@modal` para `/app/community/[slug]/post/success`, mantendo a tela anterior como fundo quando a navegação acontece a partir da modal de criação.
- Manter a rota direta de sucesso funcionando, mas com apresentação modal sobre fundo neutro.
- Fazer o CTA "Ver minha publicação" apontar para o post criado quando `postId` estiver disponível.

## Consequências

- A confirmação pós-publicação fica mais limpa e sem mensagem duplicada.
- O fluxo fica consistente com a criação de post em modal.
- A rota direta de sucesso continua acessível para reload/link direto.
- A confirmação depende do `postId` na query para navegar diretamente ao post; sem esse parâmetro, o fallback continua sendo a comunidade.

## Validação

- `pnpm --dir frontend exec biome check --write "src/api/req/community/index.ts" "src/app/app/community/[slug]/post/success/logic.tsx" "src/app/app/community/[slug]/@modal/(.)post/success/page.tsx"`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke HTTP local:
  - `http://localhost:3000/app/community/relacionamentos-com-proposito/post/success?postId=cmqmnzt630000wsuhkhzlj0js` retornou 200.
  - `http://localhost:3000/app/community/relacionamentos-com-proposito/post/new` retornou 200.

## Pendências

- Push remoto pendente caso o ambiente continue sem credenciais GitHub.

## Complemento 2026-06-20 - navegação de saída da modal

O CTA "Ver minha publicação" deixou de usar navegação client-side via `Link` e passou a executar
uma navegação de documento com `window.location.replace(publicationHref)`. A rota de sucesso é
interceptada pelo slot `@modal`; em transições client-side dentro do mesmo layout, o estado do slot
paralelo pode permanecer ativo mesmo quando o fundo muda para o post ou para a comunidade. A
navegação de documento reinicializa a árvore de rotas, desmonta o slot modal e abre diretamente a
publicação criada sem manter a confirmação na pilha do histórico.

Além disso, a criação do post passou a navegar de `/post/new` para `/post/success` com
`router.replace`, não `router.push`. Assim, o histórico do navegador não mantém nem a modal de
criação nem a modal de sucesso como destino do botão voltar depois que o usuário abre a publicação.

O href da publicação também passou a ser congelado na montagem da modal, evitando que ele seja
recalculado para a comunidade caso a URL de fundo mude enquanto a modal ainda estiver aberta.

Validação adicional:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Smoke HTTP local:
  - `http://localhost:3000/app/community/autocuidado-em-pratica/post/success?postId=cmqmv53g400119ouhslp91yi6&communitySlug=autocuidado-em-pratica` retornou 200.
  - `http://localhost:3000/app/community/autocuidado-em-pratica/post/cmqmv53g400119ouhslp91yi6` retornou 200.
  - `http://localhost:3000/app/community/autocuidado-em-pratica/post/new` retornou 200.

## Complemento 2026-06-20 - redirecionamento direto apos publicar

Para deixar o fluxo ainda mais leve, a confirmacao central dentro da modal de criacao foi removida
do caminho principal. Apos o submit real concluir com sucesso, a modal de `/post/new` inicia o
fechamento visual, exibe um toast curto de confirmacao com "Post publicado!" e navega diretamente
para a publicacao criada com `router.replace(publicationHref)`.

Essa abordagem segue melhor o padrao de composers sociais: nao ha rota intermediaria de sucesso,
nao ha card adicional entre publicar e ver o conteudo, e o botao voltar do post retorna ao contexto
anterior da comunidade/feed em vez de voltar para uma confirmacao. A rota `/post/success` permanece
como fallback direto/legado, mas nao e usada pelo fluxo principal de criacao.

Validacao adicional:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Smoke HTTP local:
  - `http://localhost:3000/app/community/autocuidado-em-pratica/post/new` retornou 200.
  - `http://localhost:3000/app/community/autocuidado-em-pratica/post/cmqmv53g400119ouhslp91yi6` retornou 200.
  - `http://localhost:3000/app/community/autocuidado-em-pratica` retornou 200.
