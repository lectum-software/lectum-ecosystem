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
