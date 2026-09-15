# ADR-0484: Memória efêmera de retorno no feed de vídeos de psicólogos

## Status

Accepted

## Task relacionada

TASK-168 — Preservar vídeo ao voltar do perfil do psicólogo

## Contexto

O feed público de psicólogos é uma experiência vertical de vídeos. Ao entrar em um perfil e voltar, a
remontagem do App Router reinicializava `activePsychologistIndex` e o ciclo do loop no primeiro
slide. Para o usuário, isso parecia reiniciar a lista e perder o ponto onde ele parou.

A origem do feed pode conter busca, filtros, alias PT/EN e hash. A solução precisava sobreviver à
ida para a rota de perfil, mas não deveria persistir dado sensível, criar contrato de backend ou
afetar outros feeds.

## Decisão

- Armazenar um snapshot curto em `sessionStorage`, scoped ao navegador e à aba:
  - URL interna segura de origem;
  - índice ativo renderizado;
  - ciclo atual do loop;
  - `psychologistId` alvo;
  - `scrollTop`;
  - timestamp de criação.
- Gravar o snapshot imediatamente antes da navegação do feed para `/psicologos/:id`.
- Ao montar novamente uma rota de feed de psicólogos, restaurar somente se a URL atual for
  exatamente a origem salva. Isso evita aplicar um snapshot de outra busca/filtro.
- Reusar o índice salvo quando ele ainda corresponde ao mesmo `psychologistId`; se a lista mudou,
  reconciliar pelo ID na lista atual.
- Limpar snapshots inválidos, expirados ou já consumidos. A janela máxima é de 30 minutos.
- Usar a origem salva como fallback do botão voltar do perfil quando o histórico do navegador não
  puder retornar.

## Alternativas consideradas

### Query string com índice do vídeo

Rejeitada. Exporia estado transitório de navegação na URL pública, poluiria filtros/SEO e poderia
ser compartilhado como se fosse contrato de produto.

### Estado global/Redux

Rejeitada. O estado precisa sobreviver à navegação de página e ao fallback de retorno, mas deve ser
efêmero por aba. `sessionStorage` é suficiente e evita acoplar o feed ao estado global da aplicação.

### Persistir tempo exato do vídeo

Adiada. A demanda explícita é não reiniciar a lista de vídeos. Guardar `currentTime` exigiria lidar
com autoplay, carregamento de HLS/MP4 e permissões de som; isso deve ser uma evolução separada se
necessário.

## Consequências

- Voltar do perfil preserva a continuidade visual do feed de psicólogos.
- Filtros e buscas são preservados por URL exata, sem restaurar contexto incompatível.
- A memória não sai do cliente, não cria migração, env, endpoint ou dependência.
- O retorno depende de `sessionStorage`; se storage estiver indisponível, o comportamento anterior
  continua como fallback seguro.
- Rollback simples reverte este commit e volta a iniciar o feed pelo primeiro slide.

## Validação

- Testes unitários de snapshot, URL divergente, expiração e fallback por `psychologistId`.
- `frontend check`, `frontend build`, `pnpm check`, browser local mobile e smoke de homologação em
  `/psicologos`.
- Browser local usou dados reais da API de homologação, com CORS desabilitado apenas no Chrome
  headless para permitir origem `localhost`; a restauração consumiu o snapshot e manteve o candidato
  ativo no mesmo slide.
