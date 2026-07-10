# ADR-0246: Host de avatares Google no Admin

## Status

Aceita

## Contexto

A tela Admin `/psicologos` renderiza avatares reais de psicologos com `next/image`.
Quando a foto vem do login Google/OAuth, o backend pode retornar URLs em
`https://lh3.googleusercontent.com`. O app `frontend` ja permitia esse host,
mas o app `admin` mantinha apenas hosts locais/API na allowlist de imagens do
Next. Com isso, a rota quebrava em runtime antes de renderizar a tela.

## Decisao

Adicionar `lh3.googleusercontent.com` a `images.remotePatterns` do app `admin`,
mantendo a politica de allowlist explicita do `next/image` e sem substituir o
componente por `<img>` ou desativar otimizacao.

## Consequencias

- A tela `/psicologos` do Admin pode carregar fotos reais de contas Google sem
  erro de host nao configurado.
- Novos provedores de avatar continuam exigindo inclusao explicita no
  `next.config.ts`, evitando abertura ampla para qualquer host externo.
- Servidores Next em desenvolvimento precisam reiniciar/recarregar a config
  para aplicar a nova allowlist.

## Validacao

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `http://localhost:3002/psicologos` respondeu `200` no servidor local.
- O endpoint `/_next/image` deixou de rejeitar `lh3.googleusercontent.com` como
  host nao configurado; para a URL privada testada, passou a falhar apenas por
  resposta upstream invalida.
