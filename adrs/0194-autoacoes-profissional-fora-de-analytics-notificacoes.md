# ADR-0194: Autoações do psicólogo fora de Analytics e notificações

## Status

Accepted

## Task relacionada

Complemento de TASK-20 e TASK-29B

## Contexto

Psicólogos podem abrir o próprio perfil público para revisar conteúdo, testar vídeo e validar o link de WhatsApp. Essas
ações são operacionais e não representam interesse de paciente, conversão, reputação ou tráfego real.

Se persistidas/contabilizadas, essas autoações inflariam `profile_view_event`, `profile_video_watch_session` e
`contact_request`, além de poderem gerar ruído em notificações ou digests profissionais.

## Decisão

- Autoação autenticada é definida como `actor/viewer/user_id` igual ao `psychologist_id` alvo.
- Visualizações de perfil e sessões de vídeo do próprio psicólogo não devem ser persistidas; o agregado de Analytics
  também exclui registros legados com `viewer_id = psychologist_id`.
- Cliques do próprio psicólogo no próprio WhatsApp não persistem `contact_request`.
- O endpoint de clique no WhatsApp ainda pode retornar o `whatsapp_url` real para permitir teste operacional do link,
  mas retorna `contact_request_id=null` e `tracked=false`.
- `notifyWhatsappClick` recebeu guarda explícita para não emitir `clique_whatsapp` quando `actorId = psychologistId`.
- Visitantes anônimos e usuários diferentes do psicólogo alvo continuam sendo registrados como fonte real.

## Consequências

- Analytics profissionais passam a refletir tráfego/conversão de terceiros, não testes do dono do perfil.
- A central de notificações e os digests deixam de receber ruído originado por testes do próprio profissional.
- Registros legados de autoação em `contact_request` podem permanecer no banco, mas não são contados pelo endpoint de
  Analytics.
- Visitantes anônimos não podem ser associados com segurança ao dono do perfil; por isso continuam contabilizados como
  anônimos.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm check`

## Pendências

- Nenhuma.
