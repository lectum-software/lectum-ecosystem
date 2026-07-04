# ADR-0109 - Dicas de onboarding persistidas por usuário

## Status

Accepted

## Contexto

As dicas de descoberta de psicólogos e de publicação na comunidade eram controladas por `sessionStorage`/`localStorage`.
Esse controle era frágil: podia reaparecer após login/refresh/nova sessão, não era fonte de verdade persistida e podia vazar comportamento entre usuários no mesmo navegador.

## Decisão

- Persistir o estado das dicas diretamente em `user`:
  - `has_seen_discover_psychologists_tip Boolean @default(false)`.
  - `has_seen_community_post_tip Boolean @default(false)`.
- Expor contrato compartilhado de conta em `GET/PUT /api/private/account/tips`, protegido por `_auth`, sem `requireRole`, porque as dicas são por usuário autenticado e independem de papel.
- No frontend, consultar a preferência antes de renderizar a dica e marcar a respectiva flag como `true` quando a dica for exibida ou dispensada.
- Escopar a query key de tips por `user.id`, evitando reaproveitamento de cache React Query entre contas diferentes.
- Remover `sessionStorage`/`localStorage` como fonte de verdade dessas duas dicas.

## Consequências

- Cada dica passa a aparecer no máximo uma vez por usuário, mesmo após logout/login, refresh ou nova sessão.
- O estado fica separado por dica, permitindo que o usuário veja uma orientação sem afetar a outra.
- A tabela `users` recebe duas flags booleanas simples; uma tabela de preferências genérica pode ser considerada no futuro se o volume de flags crescer.
- A mutation é idempotente para o comportamento atual: o cliente envia apenas `true` quando a dica foi vista.

## Task relacionada

- Ajuste complementar da TASK-21 — perfil privado/preferências do usuário.

## Validações

- `pnpm --dir backend db:migrate --name add_user_onboarding_tips`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Validação HTTP local de `GET/PUT /api/private/account/tips` com token temporário, restaurando o usuário usado na validação.
- Renderização local via Chrome headless em `/app/psychologists`.

## Complemento 2026-06-29 - Coach marks acionaveis e fila de dicas

A descoberta de psicologos passou a precisar de duas orientacoes adicionais sem exibir varias dicas ao mesmo tempo: `Minha Busca` e `WhatsApp`.

Decisoes:

- Adicionar em `user` as flags `has_seen_psychologists_my_search_tip` e `has_seen_psychologist_whatsapp_tip`.
- Manter as dicas apenas para usuarios autenticados; usuario anonimo nao consulta nem grava `/api/private/account/tips`.
- Na pagina `/app/psychologists`, usar uma fila de prioridade: descoberta de psicologos, `Minha Busca`, depois `WhatsApp`.
- Mostrar no maximo uma dica por visita/montagem da pagina; usar estado local apenas como throttle de sessao, mantendo o backend como fonte de verdade.
- Marcar `Minha Busca` e `WhatsApp` como vistas tanto quando a dica aparece quanto quando o usuario clica no alvo antes da dica.
- Transformar a dica de criar post na comunidade em coach mark acionavel: o alvo `+` abre a criacao de post; nao ha CTA separado `Entendi`.

Consequencias:

- O onboarding fica contextual e menos intrusivo, evitando uma sequencia de pop-ups na mesma sessao.
- A persistencia continua por usuario e sincronizada entre dispositivos apos login.
- Se o usuario descobre a acao sozinho, a dica correspondente nao reaparece.

## Complemento 2026-06-29 - Dicas contextuais para psicólogos

O produto passou a exigir dicas específicas para psicólogos, sem repetir a dica de perfil completo porque a publicação pública já depende de perfil apto. A prioridade definida foi: reforçar o vídeo de apresentação no perfil profissional, depois orientar respostas a pacientes na comunidade como principal conversor, e só então incentivar conteúdo original.

Decisões:

- Adicionar em `user` as flags `has_seen_psychologist_profile_video_tip`, `has_seen_psychologist_reply_tip` e `has_seen_psychologist_original_post_tip`.
- Reutilizar `GET/PUT /api/private/account/tips` para manter uma única fonte persistida por usuário autenticado; as novas dicas são renderizadas apenas quando `user.role === "psicologo"`.
- Exibir a dica do vídeo no alvo real do card de vídeo em `/app/professional/profile/setup`, marcando como vista quando aparece ou quando o psicólogo interage com o card antes dela.
- Exibir a dica de resposta em posts de pacientes na comunidade, marcando como vista quando aparece ou quando o psicólogo clica no alvo de comentar antes dela.
- Tratar a resposta a pacientes como orientação de maior prioridade: a dica de conteúdo original só fica elegível depois de `has_seen_psychologist_reply_tip=true`.
- Manter cada dica acionável: o clique no alvo executa a ação do produto, sem CTA separado de "Entendi".
- A tentativa obrigatória de `pnpm --dir backend db:migrate` foi executada, mas encontrou drift preexistente em migrations já aplicadas. Nenhum reset destrutivo foi executado; a migration desta decisão foi aplicada de forma não destrutiva com `prisma migrate deploy` após resolver a tentativa inicial que falhou por BOM no SQL.

Consequências:

- O onboarding do psicólogo fica contextual, por papel e por momento de uso, sem abrir várias dicas ao mesmo tempo.
- A tabela `users` recebe mais três flags booleanas; se novas famílias de dicas crescerem, a decisão de uma tabela genérica de preferências deve ser reavaliada.
- A criação de conteúdo original continua incentivada, mas não compete com a ação de maior impacto comercial para o psicólogo: responder pacientes.

Validações:

- `pnpm --dir backend db:migrate` executado e bloqueado por drift/estado de migrations aplicadas, sem reset.
- `pnpm --dir backend db:migrate-prod`
- `pnpm --dir backend exec prisma migrate status`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
- HTTP/browser local descritos na task complementar.

## Complemento 2026-06-30 - Foco de psicólogos em respostas

Produto decidiu que o foco principal da Lectum para psicólogos é responder dúvidas e relatos da
comunidade, não criar publicações originais. A dica do botão `+` de criação de post permanece útil
para pacientes, mas gera mensagem incorreta quando exibida em contas de psicólogo.

Decisões:

- Manter a dica "Publique sua dúvida ou relato" somente para usuários com papel de paciente.
- Não exibir dica de criação de novo post para psicólogos, mesmo que exista flag histórica para
  posts originais profissionais.
- Expor `has_seen_psychologist_reply_tip` em `GET/PUT /api/private/account/tips`.
- Exibir uma dica única para psicólogos em posts de pacientes, destacando a ação de comentar/responder
  como principal caminho de autoridade e conversão na Lectum.
- Marcar a dica de resposta como vista quando ela aparece ou quando o psicólogo aciona o comentário
  antes dela.

Consequências:

- Pacientes continuam orientados a publicar dúvida/relato pelo `+`.
- Psicólogos deixam de receber copy de paciente no feed/comunidade.
- O onboarding profissional fica alinhado ao comportamento esperado: entrar em conversas reais e
  responder pacientes.

## Complemento 2026-06-30 - Dicas de descoberta exclusivas para pacientes

A mesma decisão de foco profissional também se aplica às dicas acionáveis da descoberta de
psicólogos. `Minha Busca` e `WhatsApp` orientam a jornada de paciente em busca de atendimento; para
psicólogos, essas dicas competem com o objetivo principal de responder posts e podem sugerir ações
que não são prioritárias para a conta profissional.

Decisões:

- Restringir a fila das dicas `Minha Busca` e `WhatsApp` a usuários com `user.role="paciente"`.
- Não marcar as flags `has_seen_psychologists_my_search_tip` e
  `has_seen_psychologist_whatsapp_tip` quando o usuário autenticado não for paciente.
- Limpar qualquer coach mark acionável de descoberta que esteja ativo se a sessão atual não for de
  paciente.
- Manter a dica inicial de descoberta de psicólogos sem mudança nesta correção, pois a decisão de
  produto solicitada aqui trata especificamente de `Minha Busca` e `WhatsApp`.

Consequências:

- Contas de psicólogo deixam de receber dicas de `Minha Busca` e `WhatsApp` na rota
  `/app/psychologists`.
- A jornada de onboarding do psicólogo permanece concentrada na dica de responder posts de pacientes.
- Pacientes continuam recebendo a fila completa de descoberta, com persistência por usuário.
