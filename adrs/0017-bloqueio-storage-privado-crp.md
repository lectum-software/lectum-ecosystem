# ADR-0017: Bloqueio de storage privado para documentos CRP

## Status

Accepted

## Task relacionada

TASK-11: Envio e confirmação de CRP.

## Contexto

A TASK-11 exige upload real de documento CRP, persistindo apenas `file_key` em
`professional_document` e mantendo documentos profissionais privados por padrão. A
TASK-03/ADR-0006 decidiu Cloudflare R2 via API S3-compatible como storage, mas também
registrou que documentos CRP não podem ser expostos por URL pública.

As referências visuais da task foram consultadas pelas imagens locais:

- `_product/proto/Confirmação de Envio de CRP - Layout Ajustado.jpg`;
- `_product/proto/Confirmação de Envio de CRP - Layout Ajustado-1.jpg`;
- `_product/proto/Confirmação de Envio de CRP - Layout Ajustado-2.jpg`;
- `_product/proto/Confirmação de Envio de CRP - Layout Ajustado-3.jpg`.

Builder/Quick Copy não está exposto como ferramenta direta nesta sessão, então foi usado
o fallback auditável das imagens locais.

## Decisão

- Não implementar o upload/submissão/status de CRP nesta execução.
- Não criar `professional_document` nem migration relacionada enquanto não houver storage
  privado confirmado para documentos profissionais.
- Não criar `POST /api/private/psychologist/documents`.
- Não criar `GET /api/private/psychologist/documents/status`.
- Não criar `POST /api/private/psychologist/documents/resubmit`.
- Não reutilizar o `PUBLIC_BUCKET` existente para documento CRP.
- Não persistir URL temporária, URL pública, mock de arquivo ou dado inventado para
  representar CRP.
- Manter `psychologist_profile.crp_status` no estado atual, normalmente `"pendente"`, e
  `psychologist_profile.published=false` até validação profissional real.

## Motivo

O ambiente atual possui credenciais R2 e somente `CLOUDFLARE_R2_PUBLIC_BUCKET_NAME=public`.
A implementação existente em `backend/src/config/multer/storage.ts` usa o `PUBLIC_BUCKET`
para gravar uploads. Isso é incompatível com a exigência de documentos CRP privados e
com a regra de persistir apenas a chave privada do bucket.

## Consequências

- A TASK-11 fica com status `Blocked`, não `Completed`.
- Os critérios de aceite de implementação permanecem sem marcação completa.
- Nenhum endpoint, schema, migration ou UI de upload foi criado para evitar falsa
  conclusão.
- Para retomar, o produto/operação precisa fornecer bucket privado Cloudflare R2,
  credenciais/política adequadas e variável de ambiente específica, por exemplo
  `CLOUDFLARE_R2_PRIVATE_BUCKET_NAME`.
- Após o desbloqueio, a implementação deve separar bucket público e bucket privado,
  aceitar somente PDF/JPEG/PNG até 10 MB, persistir `professional_document.file_key` e
  refletir status em `psychologist_profile.crp_status`.

## Validação

- Revisão manual de `_product/tasks/TASK-11-envio-confirmacao-crp.md`.
- Revisão manual de `_product/decisions.md`.
- Revisão manual de `DATA-MODEL.md` na seção `professional_document`.
- Revisão manual de `adrs/0006-integracoes-externas-e-decisoes-pendentes.md`.
- Revisão manual de `backend/src/config/multer/*`, confirmando uso atual de bucket
  público.
- `git diff --check`.

## Pendências

- Provisionar bucket privado R2 para documentos profissionais.
- Definir/env informar o nome do bucket privado, recomendado
  `CLOUDFLARE_R2_PRIVATE_BUCKET_NAME`.
- Confirmar se o backend deve criar o bucket automaticamente ou apenas validar existência.
- Definir rota controlada de download/visualização para operação/admin sem expor URL
  pública.

## Atualizacao em 2026-06-06

A ADR-0026 desbloqueia a consulta cadastral CFP/CRP via InfoSimples para a TASK-10, mas nao desbloqueia esta task de upload de documento. O ambiente continua sem `CLOUDFLARE_R2_PRIVATE_BUCKET_NAME`; portanto documentos CRP nao podem ser persistidos no bucket publico existente.

## Revalidacao em 2026-07-08

Nova tentativa de finalizar a TASK-11 foi solicitada com a restricao explicita de nao
alterar as regras ja definidas. O bloqueio externo permanece:

- `backend/.env` possui variaveis de endpoint/credenciais R2 e
  `CLOUDFLARE_R2_PUBLIC_BUCKET_NAME`, mas nao possui
  `CLOUDFLARE_R2_PRIVATE_BUCKET_NAME` ou equivalente para documentos profissionais.
- `backend/src/config/multer/s3.ts` exporta apenas `PUBLIC_BUCKET`.
- `backend/src/config/multer/storage.ts` grava uploads no `PUBLIC_BUCKET`.

Decisao mantida: nao implementar endpoint, schema, migration, UI ou adaptacao de upload
para CRP enquanto o bucket privado real nao estiver provisionado. Usar o bucket publico,
mock, URL temporaria ou dado inventado continuaria violando a TASK-11 e a ADR-0006.
