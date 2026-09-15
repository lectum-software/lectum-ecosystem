# ADR-0029: Cortesia profissional como experiência de assinante

## Status

Accepted

## Task relacionada

TASK-31B

## Contexto

Após a criação da concessão administrativa (`source="admin_grant"`), psicólogos em cortesia aparecem como assinantes no entitlement, mas a tela de edição de perfil ainda exibia CTA de upgrade e bloqueava recursos do Plano Profissional. A tela "Minha Assinatura" também apontava para a listagem de planos, sem explicar a cortesia e sua expiração.

O checkout e a coleta real de cartão continuam condicionados à TASK-32 e ao Mercado Pago. Pelas ADRs anteriores, a Lectum não deve coletar PAN/CVV fora do gateway real nem simular cobrança.

## Decisão

Tratar qualquer assinatura ativa não gratuita, inclusive `admin_grant`, como experiência profissional na edição do perfil gratuito expandido da TASK-18A.

O backend passa a retornar no contrato de perfil:

- `plan.source`;
- `plan.current_period_end`;
- `plan.is_courtesy`;
- `plan.can_upload_video`;
- limites calculados por plano.

Para plano gratuito, os limites permanecem 3 especialidades, 1 serviço e 1 abordagem. Para Plano Profissional/cortesia, a edição permite 10 especialidades e todos os serviços/abordagens ativos retornados pelos catálogos reais.

O upload de vídeo foi liberado apenas quando `plan.can_upload_video=true`, usando o storage público existente em `psychologist/video/*`, com limite de 50MB e tipos MP4, WebM e QuickTime/MOV. A rota pública de arquivos foi ampliada para servir `psychologist/video/*`, pois o vídeo de apresentação é parte do perfil público do profissional assinante.

Em 2026-06-09, o mesmo entitlement passou a cobrir a imagem de capa do vídeo de apresentação. A capa é enviada para `psychologist/video-cover/*`, persistida em `psychologist_profile.video_cover_url`, servida publicamente apenas por esse prefixo e limpa quando o vídeo é trocado/removido.

A opção "Minha Assinatura" no menu do perfil agora abre `/app/professional/billing/subscription`. Para cortesia, a tela mostra Plano Profissional de cortesia, data de expiração e CTA "Inserir dados do cartão". Esse CTA aponta para o checkout real (`/app/professional/billing/checkout?intent=courtesy-renewal`), que continua bloqueado de forma honesta até a TASK-32 configurar Mercado Pago.

## Consequências

- Psicólogos em cortesia têm a mesma experiência de configuração de perfil de um assinante.
- O plano gratuito mantém limitações e CTA de upgrade.
- A UI informa o caminho para cartão após a cortesia sem coletar cartão fora do gateway real.
- O vídeo de apresentação fica publicamente acessível quando o profissional assinante o publica, alinhado ao card/perfil público.
- A capa do vídeo fica publicamente acessível apenas para profissionais com recurso de vídeo, alinhada ao mesmo modelo de exposição do preview do card/perfil público.
- Legendas/captions de vídeos enviados por usuários ficam pendentes para uma task futura de acessibilidade de mídia; o recorte atual apenas disponibiliza upload e preview.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local sem sessão em `/app/profile`, `/app/professional/profile/setup` e `/app/professional/billing/subscription` respondeu `307`.
- 2026-06-09 capa de vídeo: `pnpm --dir backend db:migrate --name add_profile_video_cover_experience_tag`
- 2026-06-09 capa de vídeo: `pnpm --dir backend check`
- 2026-06-09 capa de vídeo: `pnpm --dir backend build`
- 2026-06-09 capa de vídeo: `pnpm --dir frontend check`
- 2026-06-09 capa de vídeo: `pnpm --dir frontend build`
- 2026-06-09 capa de vídeo: `pnpm check`

## Pendências

- TASK-32: implementar checkout/cartão real Mercado Pago.
- Futuro: suporte a legenda/transcrição para vídeos enviados por profissionais.

## Atualizacao em 2026-08-13: default do selo de tempo de experiencia

Psicologos que chegam a uma assinatura profissional ou cortesia administrativa a partir do Plano Gratuito podiam carregar `psychologist_profile.show_experience_tag=false`, pois o plano gratuito bloqueia e persiste o controle desligado. A partir deste ajuste, o selo "Exibir tempo de experiencia" e ligado por default na entrada da camada profissional.

A regra nao deve apagar opt-outs reais feitos por assinantes. Por isso, o backend compara `psychologist_profile.updatedAt` com o inicio do entitlement ativo (`professional_subscription.grant_started_at` quando existir, senao `createdAt`):

- se `show_experience_tag=false` foi salvo antes da assinatura/cortesia ativa, a exibicao publica resolve para `true`;
- se o profissional desligou o selo depois de ja estar na camada profissional, o valor `false` e preservado;
- para perfis gratuitos, o bloqueio anterior permanece.

Uma migration de dados aplica o mesmo criterio aos registros ja existentes para manter cards, perfil publico e filtros que dependem do campo persistido. Novas concessoes administrativas e ativacoes Mercado Pago tambem passam a ativar o default na transicao para assinatura profissional.

Validacao: `pnpm --dir backend db:migrate` foi executado; depois da correcao de encoding do SQL, o Prisma bloqueou a aplicacao local por drift historico em migrations antigas ja aplicadas e sugeriu reset do schema, que nao foi executado. `pnpm --dir backend check`, `pnpm --dir backend build` e `pnpm check` passaram.

## Atualizacao em 2026-06-21: bloqueio de CPF/CRP em cortesia verificada

Perfis em cortesia administrativa podem carregar CPF/CRP ja preenchidos antes de existir o painel administrativo definitivo. Para evitar que o proprio psicologo sobrescreva dados sensiveis vinculados a uma cortesia ativa, a edicao de `CPF`, `Regional do CRP` e `No. Registro CRP` fica bloqueada quando:

- a assinatura ativa vem de `professional_subscription.source="admin_grant"`;
- o plano ativo nao e gratuito;
- os campos persistidos de CPF, regional e numero CRP estao completos.

A UI desabilita os campos e exibe aviso contextual. O backend nao confia apenas na UI: antes de salvar, recalcula a regra a partir do perfil atual e preserva `psychologist_profile.cpf`/`crp`, ignorando alteracoes enviadas no payload. Se uma cortesia administrativa ainda estiver sem CPF/CRP completo, os campos permanecem editaveis para permitir saneamento operacional.

Decisao de produto para o futuro painel administrativo: a concessao de cortesia deve partir do CPF informado pelo administrador, chamar a API CFP/InfoSimples no backend, apresentar o resultado para conferencia e, ao confirmar, gravar CPF, CRP, status/data de verificacao e data de inscricao CRP antes de criar/renovar `professional_subscription.source="admin_grant"`. Esse fluxo futuro nao foi implementado neste ajuste porque o painel admin ainda nao existe no escopo atual.

### Validacao adicional

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- Validacao de servico backend com psicologo temporario real removido ao final confirmou que tentativa de alterar CPF/CRP em cortesia com CPF/CRP completos preserva resposta e banco mesmo com `crp_status="pendente"`.
- Chrome/CDP headless local em 390x844 com `<CONTA_DE_TESTE_AUTORIZADA>` confirmou campos disabled, valores visiveis, aviso de bloqueio e ausencia de overflow horizontal.
