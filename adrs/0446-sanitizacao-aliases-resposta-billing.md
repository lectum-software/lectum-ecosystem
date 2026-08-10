# ADR-0446: Sanitizacao preserva aliases em respostas de billing

Data: 2026-08-10
Status: Aceita

## Contexto

Na tela `/app/profissional/assinatura`, um psicologo com cortesia administrativa ativa aparecia como
`Plano nao encontrado` e status `Pendente`, apesar do Admin listar o mesmo perfil como `Cortesia`.

O endpoint privado de assinatura retorna, por compatibilidade, os campos `current` e `subscription`.
No caso analisado, ambos apontavam para a mesma instancia de assinatura em memoria. A camada
padronizada de resposta sanitizava dados sensiveis e proveniencia publica com `WeakSet` global. Isso
protegia contra ciclos, mas tambem tratava o segundo alias legitimo como repeticao circular,
substituindo `subscription` por `[REDACTED]`.

Como o frontend prioriza `data.subscription ?? data.current`, a UI recebia uma string no lugar da
assinatura e, por isso, nao encontrava `status`, `plan.name`, `plan.slug` nem `current_period_end`.

## Decisao

- A sanitizacao de dados sensiveis e de proveniencia publica passa a controlar apenas a pilha de
  recursao atual.
- Um objeto reaproveitado em outro ramo da resposta deixa de ser redigido quando nao e ciclo real.
- Ciclos verdadeiros continuam redigidos como `[REDACTED]`.
- O contrato de billing permanece com `current` e `subscription`, sem remover campo e sem exigir
  rollout coordenado de frontend/backend.

## Consequencias

- A resposta de `GET /api/private/psychologist/billing/subscription` preserva tanto `current` quanto
  `subscription` como objetos completos, permitindo que cortesias `admin_grant` ativas renderizem o
  plano correto.
- A mudanca e transversal, mas mantem a remocao de segredos/PII por chave e por padrao de valor.
- Nao houve package novo, env nova, migration ou alteracao de schema.
- Rollback: reverter este commit restaura a redacao de aliases, mas reabre a regressao visual em
  respostas com objetos compartilhados.

## Validacao

- Testes unitarios adicionados para aliases reaproveitados em `sanitizeSensitiveData` e
  `sanitizePublicResponseData`.
- Validacao local do pipeline de sanitizacao confirmou `current` e `subscription` completos para uma
  assinatura `admin_grant/ativa/profissional`.
- `pnpm --dir backend exec node --import tsx --test src/utils/sanitize-sensitive.test.ts src/utils/public-response.test.ts`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check:version`
- `pnpm check`
