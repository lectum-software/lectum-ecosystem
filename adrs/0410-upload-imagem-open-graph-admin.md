# ADR-0410: Upload gerenciado para Imagem Open Graph no Admin

Status: Accepted  
Data: 2026-08-03

## Contexto

O campo **Imagem Open Graph** estava exposto como URL textual no Admin. Isso exigia que o operador soubesse ou colasse links publicos manualmente, apesar de o comportamento desejado ser editar a imagem em si. Para Open Graph, o valor persistido continua sendo uma URL/caminho publico, mas essa URL deve ser um artefato tecnico gerado pelo upload real da plataforma.

## Decisao

1. A UI Admin deixa de exibir `og_image_url` como input textual editavel.
2. O operador passa a usar upload de arquivo para JPG, PNG ou WebP.
3. O backend recebe o arquivo em `POST /api/admin/private/settings/seo/:page_key/og-image` com `adminAuth`, validator de `page_key`, `multer`, limite de 5MB e storage publico existente.
4. O arquivo e salvo no prefixo `seo/og-image/` e o backend retorna caminho publico relativo `/public/files/seo/og-image/...`.
5. O formulario Admin guarda esse caminho tecnico em `og_image_url` e so publica a troca quando o operador clicar em **Salvar metadados**, mantendo a auditoria existente do `PUT /api/admin/private/settings/seo/:page_key`.
6. O link gerado pode ser exibido como referencia tecnica clicavel, mas nao como campo editavel.

## Consequencias

- O fluxo fica alinhado ao modelo mental do operador: trocar imagem, nao manipular URL.
- A URL persistida em `site_seo_setting.og_image_url` continua existindo por ser o contrato necessario para metatags, mas passa a ser derivada do upload.
- Arquivos enviados e nao salvos no formulario podem ficar no storage como orfaos, igual a outros fluxos de midia que fazem upload antes do submit final.
- Nao houve migration nem package novo.
- O update central de metadados continua sendo o ponto auditado para alteracao efetiva da configuracao publica.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local/headless mobile-first na tela Admin SEO/Metadados.
