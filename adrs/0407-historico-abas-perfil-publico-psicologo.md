# ADR-0407: Histórico interno das abas do perfil público do psicólogo

## Status

Accepted

## Task relacionada

TASK-15

## Contexto

No perfil público do psicólogo (`/psychologists/[id]`), as abas internas `Publicações` e `Avaliações`
eram refletidas por `?tab=publicacoes` e `?tab=avaliacoes`, mas a navegação usava `router.replace`.
Isso mantinha a URL correta para compartilhamento, porém substituía a entrada da aba `Geral` no
histórico do navegador. Na prática, ao usar o botão voltar do browser/dispositivo depois de abrir uma
aba, o usuário saía do perfil e retornava à origem externa, em vez de voltar para a visão geral do
mesmo profissional.

## Decisão

- Mudanças de aba acionadas pelo usuário passam a usar `router.push`, criando uma entrada real no
  histórico para a aba anterior.
- Ações com semântica explícita de "voltar para Geral" dentro do próprio perfil usam `router.replace`,
  evitando empilhar estados duplicados quando o usuário toca na seta da seção.
- O botão principal de voltar do hero, quando a URL atual estiver em `Publicações` ou `Avaliações`,
  volta primeiro para `Geral` e só sai do perfil quando a aba atual já for a geral.

## Consequências

- O botão voltar do navegador/dispositivo respeita o fluxo mental interno do perfil.
- Links diretos para abas continuam funcionando via query string.
- A navegação interna continua sem scroll automático indesejado (`scroll: false`) e mantém os
  parâmetros úteis já presentes na URL.
- Não houve mudança de backend, banco, contrato de API, packages ou dados persistidos.

## Validação

- `pnpm --dir frontend exec biome check --write -- "src/app/app/psychologist/[id]/logic.tsx"`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser local mobile-first via Chrome headless/CDP em `390x844`, usando backend real local e
  servidor frontend local em `http://localhost:3010`:
  - abrir `/psychologists/cmrgztri7000tn0uh1q4n8vxf`;
  - clicar em `Ver todas` da seção `Avaliações`;
  - chamar `history.back()` e confirmar retorno para `/psychologists/cmrgztri7000tn0uh1q4n8vxf`
    sem `tab`;
  - abrir `?tab=publicacoes`, tocar no botão `Voltar para a tela anterior` do hero e confirmar retorno
    para a aba `Geral`.

## Pendências

- Nenhuma.
