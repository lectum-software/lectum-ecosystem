# ADR 0130 — Política de push para psicólogos: prioridade e digest diário

## Status

Accepted — 2026-06-18

## Contexto

A TASK-29B já conecta eventos reais de domínio ao dispatcher de notificações. Para psicólogos, porém, nem toda interação deve interromper o profissional com push imediato: upvotes, salvamentos e sinais menores podem gerar ruído, enquanto cliques no WhatsApp, avaliações e respostas diretas têm maior relação com oportunidade de atendimento e reputação.

Também existe a preocupação de responder rapidamente posts de pacientes nas comunidades, mas sem transformar cada interação da plataforma em uma notificação push individual.

## Decisão

Adotamos uma política em camadas para psicólogos:

1. **Push imediato para sinais de alta intenção**
   - `clique_whatsapp`
   - `nova_avaliacao`
   - `nova_resposta`
   - `novo_post` de paciente conforme a regra real de preferências/segmentação já existente

2. **Agrupamento anti-spam para sinais importantes, mas repetíveis**
   - `novo_favorito`: mantém notificação in-app, mas evita push repetido dentro de 1 hora.
   - `clique_whatsapp`: passa a incluir `actor_id` em `message_props` e evita push repetido do mesmo paciente dentro de 1 hora quando o ator é conhecido.

3. **Sem push imediato para sinais de menor urgência**
   - `upvote`
   - `downvote`
   - `salvamento`

4. **Digest profissional diário**
   - Janela: `18:30` a `19:30` em `America/Sao_Paulo`.
   - No máximo 1 push por dia.
   - Usa apenas notificações reais já persistidas em `notification`.
   - Conta somente eventos cujo canal `push` está permitido em `notification_preference`.
   - Consolida `clique_whatsapp`, `nova_avaliacao`, `novo_favorito`, `nova_resposta`, `upvote` e `salvamento`.
   - Não inclui `downvote`, pois esse sinal não é público e não deve ser reforçado como mensagem de valor ao psicólogo.
   - Redireciona para `/app/professional/analytics`.

5. **Sem nova tabela**
   - Reutilizamos `user_background.type = "notification_digest_state"` com a chave `professional_daily_digest`, preservando `last_checked_at`, `last_sent_at` e `last_sent_date`.

## Consequências

- Psicólogos continuam recebendo push para sinais com maior potencial de conversão ou reputação.
- Interações de baixo valor interruptivo continuam existindo na central/in-app, mas não geram interrupções imediatas.
- O digest cria uma leitura diária de desempenho sem depender de mock ou de dados simulados.
- Como o digest usa `notification`, eventos só entram se já tiverem origem real e persistida.
- Não foi necessária migration.

## Pendências conhecidas

- A aba/filtro **Oportunidades** em comunidades para psicólogos foi decidida em produto, mas ainda será implementada em tarefa própria.
- A estratégia futura de ondas para posts de pacientes poderá evoluir a partir da aba Oportunidades; nesta decisão mantemos a regra real vigente de `novo_post` para psicólogos.
- Notificações de marcos de ranking, assinatura e perfil incompleto dependem de produtores/eventos específicos que ainda não existem.
