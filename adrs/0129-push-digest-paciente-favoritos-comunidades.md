# ADR-0129: Digests push para pacientes por favoritos e comunidades

## Status

Accepted

## Task relacionada

TASK-29B

## Contexto

O fluxo anterior de `novo_post` poderia gerar push imediato para pacientes sempre que psicólogos postassem em comunidades. Isso aumenta risco de excesso de notificações, baixa relevância e possível bloqueio do navegador.

O produto definiu uma estratégia de demonstração de valor e engajamento com baixa frequência:

- pacientes podem escolher `Todos`, `Favoritos` ou `Desativado` em novas postagens;
- o padrão para pacientes passa a ser `Todos`, mas `Todos` significa curadoria de psicólogos relevantes, não envio para todos os eventos;
- psicólogos favoritos têm prioridade sobre Top Mentors, porque o favorito representa confiança e familiaridade explícitas;
- conteúdos de psicólogos e comunidades não devem ser misturados no mesmo push;
- horários estratégicos devem privilegiar almoço e noite.

## Decisão

Implementar digests push reais, sem mock e sem novo schema Prisma:

1. `novo_post` continua gerando notificação in-app e realtime pelo dispatcher existente, mas o push imediato de `novo_post` para pacientes é suprimido.
2. Um scheduler backend em processo executa periodicamente e só atua quando há VAPID configurado.
3. A janela do almoço (`12:15` a `13:15`, horário `America/Sao_Paulo`) envia no máximo um push diário de atividade de psicólogos:
   - se a preferência do paciente for `Favoritos`, considera apenas psicólogos favoritos;
   - se for `Todos`, considera psicólogos da plataforma com prioridade: favoritos, comunidades seguidas, Top Mentors e relevância/engajamento real;
   - se for `Desativado`, não envia digest de conteúdo.
4. A janela noturna (`19:30` a `21:00`) envia no máximo um push diário de comunidades:
   - primeiro comunidades seguidas;
   - depois comunidades de categorias relacionadas às comunidades seguidas;
   - por fim conteúdo geral relevante, quando não há conteúdo nas preferências explícitas.
5. O estado anti-duplicidade usa `user_background.type = "notification_digest_state"`, com:
   - `favorites_lunch_digest.last_checked_at`;
   - `favorites_lunch_digest.last_sent_at`;
   - `favorites_lunch_digest.last_sent_date`;
   - `community_evening_digest.last_checked_at`;
   - `community_evening_digest.last_sent_at`;
   - `community_evening_digest.last_sent_date`.
6. A janela de busca de conteúdo começa no último envio daquela categoria. Se não existir envio recente, usa lookback padrão de 24h e limite máximo de 48h.
7. Quando não há conteúdo, atualiza `last_checked_at`, mas não atualiza `last_sent_at`.
8. A UI de preferências do paciente passa a mostrar `Todos`, `Favoritos` e `Desativado`, com `Todos` como default.

## Consequências

- Reduz spam e evita explosão de notificações quando muitos psicólogos publicam.
- Mantém push com valor percebido em horários mais propícios ao uso no celular.
- Preserva favoritos como sinal mais forte que Top Mentor no ranking do digest.
- Evita novo modelo/migration ao reutilizar `user_background`, adequado para estado operacional de scheduler.
- O scheduler em processo é simples para MVP; em produção com múltiplas réplicas, deve ser substituído ou protegido por job/lock externo para evitar execuções concorrentes.
- `Desativado` em novas postagens desliga também os digests de conteúdo por cautela de consentimento.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke via `pnpm --dir backend exec tsx` validou default `Todos`, normalização legada `professionals_only -> all` para pacientes e filtro `Favoritos`.

## Pendências

- Não há fonte persistida de "conteúdo já visto pelo paciente"; por isso o digest ainda não remove posts já lidos/visualizados.
- Não há perfil explícito de interesses do paciente além de comunidades seguidas; o fallback relacionado usa categorias das comunidades seguidas e depois conteúdo geral relevante.
- Para operação com múltiplas instâncias, adicionar fila/cron dedicado ou lock distribuído.
