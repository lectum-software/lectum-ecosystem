# ADR-0201: Verificação CFP retomável no fluxo pago antes do perfil

## Status

Accepted

## Task relacionada

TASK-44 - Verificação de registro retomável no fluxo pago

## Contexto

O Plano Profissional pago usa pagamento recorrente real e, depois do endereço de faturamento, exige a verificação do registro profissional via CFP/InfoSimples. O problema identificado foi que assinatura paga ativa e identidade profissional verificada estavam sendo tratados como o mesmo sinal em partes do produto. Assim, um psicólogo que saísse de `/app/professional/cfp` podia acessar a edição do perfil ou aparecer com selo de verificado apenas por ter assinatura ativa.

O Plano Gratuito precisa continuar separado: ele não deve ser forçado ao fluxo CFP pago. Cortesias administrativas continuam sendo uma equivalência operacional controlada (`source="admin_grant"`).

## Decisão

- Separar entitlement pago de verificação pública:
  - assinatura profissional ativa paga libera a próxima etapa do onboarding;
  - selo/`verified` exige assinatura profissional ativa **e** `cfp_verified_at`, ou cortesia administrativa ativa.
- O onboarding pago passa a ser retomável pelo frontend: se houver Plano Profissional ativo, endereço preenchido e CFP pendente, rotas privadas não permitidas redirecionam para `/app/professional/cfp`.
- A edição de perfil profissional (`free-profile`) fica bloqueada no backend para assinaturas pagas não gratuitas com `cfp_verified_at=null` e `source` diferente de `admin_grant`.
- O Plano Gratuito mantém a jornada sem gate CFP: gratuito → WhatsApp → perfil.
- A hidratação da sessão passa a retornar até 5 assinaturas ativas para permitir que o frontend encontre um Plano Profissional ativo mesmo quando existir também uma assinatura gratuita ativa.

## Consequências

- Psicólogos pagos pendentes de CFP não ficam em limbo e retomam a etapa correta.
- Psicólogos gratuitos não são bloqueados indevidamente por regra do fluxo pago.
- O selo de verificado deixa de ser concedido apenas por pagamento confirmado.
- A proteção de perfil passa a existir no backend, não apenas por navegação de tela.
- Não há migration nem pacote novo.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Validação local de interface/rota conforme disponibilidade de sessão autenticada.
- Smoke local com `next start --port 3100` e `curl -I /app/professional/cfp`, retornando `307` sem sessão autenticada. Redirecionamento autenticado do gate depende de uma sessão real de psicólogo pago com CFP pendente; a limitação foi registrada na task.
