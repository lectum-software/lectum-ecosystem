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
- Complemento de segurança operacional em 2026-07-04: a busca de CPF no CFP para ativação do selo verificado passa a aceitar no máximo 3 tentativas persistidas por psicólogo. Cada chamada real ao provedor com CPF válido cria um `professional_registry_check`, inclusive quando o provedor retorna erro, indisponibilidade ou vazio; ao atingir o limite, o backend responde `cfp_search_attempts_exceeded` e orienta o suporte/manual, sem nova chamada à API automática.
- Complemento de fluxo em 2026-07-11: no Plano Profissional pago, o WhatsApp passa a vir antes da verificação profissional para reduzir fricção quando a API automática estiver instável. A ordem fica: checkout/pagamento real → endereço de faturamento → WhatsApp → verificação profissional → perfil. O cadastro do WhatsApp não libera edição/publicação completa do perfil enquanto a verificação profissional estiver pendente.

## Consequências

- Psicólogos pagos pendentes de CFP não ficam em limbo e retomam a etapa correta.
- Psicólogos gratuitos não são bloqueados indevidamente por regra do fluxo pago.
- O selo de verificado deixa de ser concedido apenas por pagamento confirmado.
- A proteção de perfil passa a existir no backend, não apenas por navegação de tela.
- O limite de 3 buscas reduz repetição de consultas sensíveis por CPF e evita insistência contra o provedor/CFP quando a ativação automática não conclui.
- Como não há nova tabela, tentativas anteriores já registradas em `professional_registry_check` com CPF também contam para o limite.
- Psicólogos pagos conseguem deixar o WhatsApp pronto antes de depender da consulta externa, mas continuam sem perfil profissional editável/publicável até a aprovação profissional.
- Não há migration nem pacote novo.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Validação local de interface/rota conforme disponibilidade de sessão autenticada.
- Smoke local com `next start --port 3100` e `curl -I /app/professional/cfp`, retornando `307` sem sessão autenticada. Redirecionamento autenticado do gate depende de uma sessão real de psicólogo pago com CFP pendente; a limitação foi registrada na task.
- Complemento 2026-07-04: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend build`, `pnpm --dir frontend check` e `pnpm check` confirmaram a correção do limite de tentativas; detalhes de tentativas iniciais bloqueadas por `.next` stale/build concorrente ficam registrados na TASK-44.
