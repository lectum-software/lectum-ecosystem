# TASK-144: Upload de imagem Open Graph no Admin

Status: Completed  
Data: 2026-08-03  
Dependencias: TASK-141, TASK-143  
ADR: `adrs/0410-upload-imagem-open-graph-admin.md`

## Contexto

A TASK-143 adicionou preview da Imagem Open Graph, mas a tela ainda expunha `og_image_url` como campo editavel. A regra correta de produto e operacional e: o Admin edita a **imagem**, nao o link. O link publico deve ser gerado internamente depois de um upload real e salvo tecnicamente em `site_seo_setting.og_image_url`.

Builder/Quick Copy nao ficou acessivel como ferramenta neste ambiente; a validacao visual usou a tela local do Admin e o inventario `_product/tasks/PROTO-INVENTORY.md`.

## Objetivo

Substituir a edicao manual do link da Imagem Open Graph por upload de arquivo no Admin SEO/Metadados, mantendo preview, URL gerada internamente e persistencia pelo fluxo real de metadados.

## Escopo

- Backend Admin: endpoint autenticado de upload para imagem Open Graph por `page_key`.
- Admin frontend: controle de upload/preview/remocao da imagem, sem input textual de URL.
- Contratos: `og_image_url` permanece o campo tecnico persistido, mas nao deve ser editado manualmente pela UI.
- Documentacao/ADR: registrar a decisao de produto e o contrato do upload.

## Fora de escopo

- Crop/edicao visual/corte da imagem.
- CDN dedicada ou transformacao server-side de imagem.
- Migration de banco, pois `og_image_url` ja existe.

## Criterios de aceite

- [x] A tela Admin SEO/Metadados nao exibe `Imagem Open Graph` como campo textual editavel.
- [x] O operador consegue enviar JPG, PNG ou WebP por upload real autenticado.
- [x] O backend gera caminho publico interno em `seo/og-image/` e retorna `og_image_url` para o formulario.
- [x] O preview continua usando `next/image` e nunca `<img>` cru.
- [x] O usuario ve a URL apenas como link tecnico/gerado, nao como campo editavel.
- [x] A remocao da imagem limpa o valor no formulario e exige salvar metadados para publicar.
- [x] O update de metadados continua auditando alteracao de `og_image_url` em `admin_activity_log`.
- [x] Nao foram usados mocks, dados fake permanentes nem package novo.
- [x] Validacoes Admin/backend e browser local foram executadas.
- [x] ADR criado/atualizado.
- [x] Commit e push realizados ao final da task.

## Execucao

- Criado endpoint `POST /api/admin/private/settings/seo/:page_key/og-image` com `multer`, `adminAuth`, validator de `page_key`, limite de 5MB e tipos `image/jpeg`, `image/png`, `image/webp`.
- O upload grava no storage publico com feature `seo` e campo `og-image`, resultando em chave `seo/og-image/<arquivo>`.
- O backend retorna caminho publico relativo `/public/files/seo/og-image/<arquivo>` para manter o valor portavel entre ambientes.
- O Admin substituiu o input textual por um card mobile-first com preview, botao de upload, botao de remocao e link tecnico da URL atual.
- O formulario continua enviando `og_image_url` no payload de `PUT /api/admin/private/settings/seo/:page_key` apenas quando o operador salvar os metadados.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local/headless mobile-first da rota Admin SEO/Metadados em 390x844.

## Observacoes

O upload persiste o arquivo no storage real imediatamente; a troca do metadado publico da pagina so acontece ao clicar em **Salvar metadados**, para preservar o comportamento de formulario e a auditoria consolidada do `PUT`.
