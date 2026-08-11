# ADR-0450: Permissão nativa direta de notificações

## Status

Accepted

## Task relacionada

TASK-153

## Contexto

A TASK-38 introduziu uma modal contextual da Lectum antes do prompt nativo de notificações do
navegador. O feedback de produto em 2026-08-11 foi que a sequência de duas confirmações, primeiro a
modal Lectum e depois a modal nativa, cria fricção e sensação de duplicidade.

A Lectum ainda precisa solicitar a permissão no mesmo momento em que o prompt contextual automático
apareceria, mantendo a experiência app-like e a coordenação com o prompt de instalação PWA. A decisão
é trocar o consentimento contextual automático pela chamada direta à permissão nativa, sem alterar
preferências, eventos, payloads, service worker, VAPID ou endpoints.

Builder/Quick Copy não ficou exposto como ferramenta direta neste ambiente. As referências
auditáveis usadas foram o inventário visual ativo e as imagens locais
`_product/proto/Notificações.jpg` e `_product/proto/Configurações de Notificações.jpg`.

## Decisão

- Remover a renderização da modal própria **"Ative notificações da Lectum"** no fluxo automático do
  `NotificationManager`.
- Preservar o delay `SHOW_DELAY_MS` de 3200 ms como o momento de disparo.
- Preservar os mesmos gates antes de solicitar a permissão:
  - rota privada em `/app`;
  - usuário confirmado e com cadastro concluído;
  - browser com `Notification`, service worker e `PushManager`;
  - VAPID público carregado;
  - `Notification.permission === "default"`;
  - ausência de cooldown local;
  - fora de `/app/configuracoes/notificacoes`.
- Reservar `lectum.activePrompt=notification-permission` antes de chamar
  `requestPermissionAndSubscribe()`, mantendo a coordenação com o prompt de instalação PWA.
- Chamar diretamente `requestPermissionAndSubscribe()` no timer, sem modal intermediária da Lectum.
- Aplicar o mesmo cooldown/backoff local quando a permissão não for concedida, for fechada ou a
  operação falhar.
- Manter a limpeza do cooldown apenas quando a permissão for concedida e a subscription técnica for
  persistida com sucesso.
- Manter a revalidação automática da subscription quando a permissão já estiver `granted`.
- Manter as ações manuais de `/app/configuracoes/notificacoes` acionadas por clique/toque.

## Consequências

- A experiência automática deixa de apresentar duas modais em sequência.
- A comunicação de valor deixa de aparecer imediatamente antes do prompt nativo; essa explicação fica
  concentrada nas telas e CTAs manuais de configurações.
- A aparência e o comportamento da permissão passam a depender mais diretamente das políticas do
  navegador. Alguns navegadores podem silenciar, bloquear ou degradar prompts chamados sem gesto
  explícito do usuário.
- O cooldown local evita repetição agressiva quando o navegador retorna `default`, `denied` ou falha
  operacional.
- Não há mudança em dados, preferências de produto, subscription técnica, eventos de domínio, digest
  ou payloads push.

## Produção e rollout

- Compatibilidade com dados existentes: frontend-only, sem alteração de schema ou persistência.
- Banco/migrations: sem alteração; não há estratégia expandir/backfill/contrair aplicável.
- Envs: nenhuma env nova e nenhum **ALERTA DE DEPLOY**.
- Compatibilidade entre versões: o frontend novo continua usando os endpoints já existentes de VAPID
  e subscription; backend e admin podem permanecer em versões diferentes durante o rollout.
- Ordem de deploy: publicar o frontend em homologação via push em `homolog`; backend/admin não
  exigem alteração funcional.
- Rollback: reverter o commit restaura a modal contextual automática anterior.

## Validação

- `pnpm --dir frontend exec biome check --write src/hooks/notification/index.tsx`
- `pnpm --dir frontend exec tsc --noEmit --pretty false`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local/CDP mobile `390x844`:
  - fluxo automático elegível não renderiza a modal Lectum;
  - `Notification.requestPermission()` é chamado diretamente depois do delay;
  - `lectum.activePrompt` é reservado e liberado;
  - fechamento/retorno não concedido aplica cooldown local;
  - estado `granted` revalida subscription sem chamada automática de `requestPermission`;
  - `/app/configuracoes/notificacoes` mantém a ação manual por clique/toque.

## Pendências

- Revalidar em dispositivos físicos Android/iOS, porque o prompt nativo e suas restrições variam por
  navegador e sistema operacional.
