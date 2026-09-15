# ADR-0486: Restauração instantânea do feed de vídeos de psicólogos

## Status

Accepted

## Task relacionada

TASK-170 — Retorno instantâneo ao vídeo anterior de psicólogos

## Contexto

A ADR-0484 definiu uma memória efêmera em `sessionStorage` para restaurar o slide ativo do feed de
vídeos de psicólogos ao voltar de um perfil público. O snapshot funcionava, mas a aplicação da
posição acontecia em `useEffect`, após o paint, com duplo `requestAnimationFrame`. Além disso, o
container `.psychologists-video-feed` usa `scroll-behavior: smooth` para interações normais. Na
prática, `scrollTo({ behavior: "auto" })` podia herdar a rolagem suave do CSS e exibir os vídeos
anteriores sendo percorridos até chegar ao slide de origem.

O feedback de produto exige que o retorno pareça uma preservação real de scroll: a tela deve abrir
diretamente no vídeo anterior, sem animação intermediária.

## Decisão

- Manter a estratégia de memória efêmera da ADR-0484, sem persistência no backend e sem alterar a
  URL pública.
- Aplicar a restauração automática no hook de navegação do feed com `useLayoutEffect`, para
  posicionar o container antes do primeiro paint do feed restaurado.
- Criar um helper local de feed que:
  - encontra o slide alvo por `data-psychologists-slide-index`;
  - calcula `scrollTop` pelo `offsetTop` do slide ou pelo fallback salvo;
  - define temporariamente `scroll-behavior: auto`;
  - define temporariamente `scroll-snap-type: none`;
  - atribui `scrollTop`/`scrollLeft` diretamente;
  - restaura os estilos originais no próximo frame ou no cleanup.
- Adicionar um atributo `data-psychologists-feed-instant-restore` ao container apenas durante a
  restauração para documentar e reforçar a neutralização temporária por CSS.
- Preservar `scroll-behavior: smooth` e snap para gestos/interações normais do usuário.

## Alternativas consideradas

### Remover `scroll-behavior: smooth` do feed inteiro

Rejeitada. Resolveria o retorno, mas também tiraria a suavidade de botões/ações de navegação
controladas do feed, mudando uma experiência desejada fora da restauração automática.

### Manter `useEffect` e trocar `behavior` para outro valor

Rejeitada. `ScrollBehavior` padronizado não garante um valor universal de "instant" em todos os
ambientes, e continuar depois do paint ainda permitiria flash/jump perceptível.

### Persistir scroll real do navegador

Rejeitada para esta correção. O scroll principal da tela é um container interno, não `window`; usar
somente restauração nativa do browser não cobre a composição atual do feed.

## Consequências

- O retorno do perfil para o feed abre diretamente no vídeo memorizado, sem atravessar visualmente os
  slides anteriores.
- A mudança fica isolada no frontend e na experiência de psicólogos; não cria schema, endpoint, env,
  pacote novo ou efeito em dados publicados.
- O comportamento depende de `sessionStorage`; sem storage, permanece o fallback seguro anterior.
- Rollback simples reverte o commit, voltando à restauração pós-paint da ADR-0484 e ao risco de
  rolagem visível.

## Validação

- Teste automatizado do helper de restauração instantânea, cobrindo estilos temporários e fallback de
  posição.
- Testes existentes de snapshot, URL divergente, expiração e reconciliação por `psychologistId`.
- `frontend check`, `frontend build`, `pnpm check`, browser local mobile e smoke de homologação em
  `/psicologos`.
