# ADR-0024 - Bloqueio da TASK-18 por dependência de validação CRP

## Status

Accepted

## Contexto

A TASK-18 cria a área privada do psicólogo para visualizar e editar o perfil profissional. A própria task declara dependência de TASK-11 e inclui a seção `Documentos / CRP`, envolvendo `professional_document`, `crp`, `crp_status` e `cfp_verified_at`.

A TASK-11 permanece `Blocked` porque o upload de documentos CRP exige storage privado real em Cloudflare R2. A ADR-0017 registrou que o ambiente atual não deve criar `professional_document`, endpoints de documento ou fluxo de upload enquanto não houver bucket privado confirmado para documentos profissionais.

As referências visuais da TASK-18 foram consultadas pelas imagens locais:

- `_product/proto/Perfil - Psicólogo.jpg`;
- `_product/proto/Editar Perfil - Psicólogo.jpg`;
- `_product/proto/Modal de Atualização de Perfil do Psicólogo.jpg`.

Builder/Quick Copy não foi usado nesta sessão; as imagens locais foram usadas como fallback auditável.

## Decisão

Não implementar a TASK-18 nesta execução enquanto TASK-11 estiver bloqueada.

Não criar implementação parcial de edição de perfil que omita documentos/CRP, porque isso quebraria a decomposição obrigatória da TASK-18 e poderia liberar publicação ou alteração de campos sensíveis sem o fluxo de validação profissional.

Também fica decidido que, até o desbloqueio:

- não criar endpoints `/api/private/psychologist/profile` e `/api/private/psychologist/profile/public-profile`;
- não criar UI final em `/app/professional/profile` e `/app/professional/profile/edit`;
- não alterar `crp`, `crp_status`, `cfp_verified_at` ou `professional_document` por atalhos;
- não usar mocks, URLs temporárias, bucket público ou dados fake para representar documento profissional.

## Consequências

- A TASK-18 passa para `Blocked` por dependência obrigatória ainda bloqueada.
- As opções privadas de perfil do psicólogo continuam indisponíveis até existir fluxo seguro de documento/CRP.
- Após provisionar o bucket privado R2 e concluir TASK-11, a TASK-18 deve ser retomada de ponta a ponta, incluindo backend, frontend, validações, ADR de edição e commit próprio.

## Task relacionada

- TASK-18: Perfil privado do psicólogo

## Validação

- Revisão de `_product/tasks/README.md`, `_product/tasks/TASK-11-envio-confirmacao-crp.md`, `_product/tasks/TASK-18-perfil-privado-psicologo.md` e `adrs/0017-bloqueio-storage-privado-crp.md`.
- Revisão visual local das três imagens obrigatórias da TASK-18.

## Revalidacao em 2026-06-07

A execucao da configuracao do perfil do psicologo foi solicitada novamente. A TASK-11 segue bloqueada por ausencia de bucket privado R2 para documentos CRP, e a TASK-18 ainda inclui formalmente a secao Documentos / CRP e `professional_document`.

A decisao de produto de nao exigir validacao CRP via API no plano gratuito nao equivale a concluir ou remover a dependencia de documentos CRP da TASK-18. Portanto, permanece proibido implementar parcialmente os endpoints/telas finais de perfil privado omitindo a parte sensivel sem nova task/ADR de recorte.

Opcao segura para retomar antes da TASK-11: abrir uma nova task especifica para "perfil gratuito sem documentos CRP", com escopo, criterios e regras de publicacao separados da TASK-18 completa.
