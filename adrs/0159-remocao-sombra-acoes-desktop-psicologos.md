# ADR-0159: Remocao de sombra nas acoes desktop da descoberta de psicologos

## Status

Accepted

## Task relacionada

TASK-26

## Contexto

Na experiencia desktop da pagina de descoberta de psicologos, a coluna lateral de acoes do card ativo exibe as opcoes `Favoritar`, `Compartilhar`, `WhatsApp` e `Perfil`.
O visual anterior aplicava uma sombra forte nos botoes circulares, criando um halo atras das opcoes e deixando a area direita mais pesada do que o conteudo principal.

## Decisao

Remover a sombra dos botoes de acao desktop e manter apenas fundo branco, borda sutil, icone, label e estados de hover/active.
O ajuste fica restrito a rail desktop da pagina `/app/psychologists`, sem alterar botoes de busca/filtro, controles mobile, regras de navegacao, tracking de WhatsApp ou disponibilidade das acoes.

## Consequencias

- A coluna de acoes fica visualmente mais limpa e menos chamativa no desktop.
- A borda preserva a legibilidade dos botoes mesmo sobre fundos claros.
- O CTA de WhatsApp continua presente e funcional, apenas sem sombra.
- Se uma futura revisao visual exigir maior destaque para essa rail, o destaque deve ser feito por hierarquia, cor ou posicionamento, nao por sombra pesada.

## Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`

## Pendencias

- Validacao visual manual no navegador local quando o ambiente com browser estiver disponivel.
