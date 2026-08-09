# ADR-0440: Bloqueio da publicação das páginas legais

## Status

Blocked

## Data

2026-08-08

## Contexto

A auditoria confirmou que os cadastros mencionam Termos e Privacidade, mas as páginas públicas e
links ainda não existem. As minutas locais continuam com placeholders e as versões enviadas pela
aplicação ainda indicam cópia jurídica pendente.

Publicar texto inventado ou incompleto em homologação/produção criaria risco jurídico e violaria a
regra do produto de não mascarar requisito externo ausente.

## Decisão

- Alterar a TASK-41 para `Blocked` enquanto os requisitos externos não forem aprovados.
- Não publicar placeholders, inventar identidade do responsável ou criar aceite jurídico falso.
- Manter a implementação técnica da TASK-41 sem banco, migration, endpoint ou package novo.
- Atualizar este ADR quando a versão final for aprovada e então executar a task normalmente em
  `homolog`, com validação visual e smoke antes de promoção.

## Para desbloquear

O responsável pelo produto e a revisão jurídica precisam fornecer/aprovar:

1. identidade e documento do responsável/controlador;
2. canais de suporte e privacidade;
3. datas de atualização e vigência;
4. política de idade mínima/adolescentes;
5. política de assinatura, cancelamento e reembolso;
6. fornecedores relevantes e versão final dos textos curtos de aceite.

## Impacto de deploy

Nenhum nesta auditoria. Não há código, banco, dados, env ou package associado a este bloqueio.
