# ADR-0060: Imagem de capa independente do perfil do psicólogo

## Status

Accepted

## Task relacionada

TASK-15 e TASK-18A (ajuste complementar solicitado para perfil público e edição de perfil profissional)

## Contexto

O perfil público do psicólogo passou a usar uma mídia superior inspirada no PDF de referência. A interpretação anterior reaproveitava capa/thumbnail do vídeo de apresentação para preencher essa área, mas a decisão de produto mais recente separa três mídias distintas: foto de perfil, imagem de capa do perfil e vídeos do psicólogo.

A capa deve ser uma imagem de identidade visual do profissional, como consultório, ambiente de atendimento, paisagem, arte institucional ou fotografia profissional. Vídeos continuam independentes e não podem preencher a área superior do perfil.

## Decisão

- Adicionar `psychologist_profile.cover_image_url` como campo persistente e public-safe para imagem de capa independente.
- Criar upload real em `/api/private/psychologist/free-profile/cover-image`, usando `multer` e bucket público existente, com chave `psychologist/cover-image/*`.
- Criar remoção real em `DELETE /api/private/psychologist/free-profile/cover-image`, limpando o objeto público quando a URL pertence ao namespace controlado do perfil.
- Expor `cover_image_url` no contrato do perfil privado de edição e no detalhe público do diretório.
- Renderizar a mídia superior de `/app/psychologist/[id]` apenas com `cover_image_url`; se não existir ou se a imagem não carregar, exibir placeholder elegante da plataforma.
- Manter `video_url` e `video_cover_url` exclusivamente para vídeos de apresentação/feed/publicações, sem fallback para a capa do perfil.
- Não criar novo package; o fluxo reutiliza `multer`, R2 público, TanStack Query e `next/image` já existentes.

## Consequências

- O conceito visual do PDF fica correto: capa no topo, avatar sobreposto, informações principais, abas e conteúdo.
- A edição de perfil passa a ter seção própria de `Imagem de capa`, com upload, troca, remoção e pré-visualização.
- Perfis sem capa, ou com arquivo ausente no bucket, têm fallback visual honesto sem usar frame de vídeo.
- A coluna nova exige migration de banco e atualização dos contratos frontend/backend.
- A capa não é condicionada ao Plano Profissional; ela faz parte da identidade visual básica do perfil.

## Validação

- `pnpm --dir backend db:migrate --name add_psychologist_profile_cover_image` foi executado, mas o Prisma recusou `migrate dev` por checksum divergente em uma migration antiga já aplicada (`20260611140000_add_specialty_catalog_options`) e solicitou reset. Nenhum reset/destruição foi executado.
- `pnpm --dir backend db:migrate-prod` aplicou de forma não destrutiva a migration pendente `20260612112000_add_psychologist_profile_cover_image`.
- `pnpm --dir backend exec prisma migrate status` confirmou `Database schema is up to date!`.
- `pnpm --dir backend db:generate`.
- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir frontend biome:fix`.
- `pnpm --dir frontend check`.
- `pnpm --dir frontend build`.
- `pnpm check`.
- HTTP local `/app/psychologist/cmq5m0vse000ftkuhybmagcn6` respondeu 200.
- HTTP local `/app/professional/profile/setup` respondeu 307 sem sessão, preservando a proteção da rota privada.
- Chrome headless mobile 390px validou a tela pública com placeholder de capa quando o arquivo público configurado não estava disponível, sem reutilizar vídeo.

## Pendências

- Existe drift de checksum em uma migration antiga já aplicada no banco de desenvolvimento. Não foi executado reset porque isso apagaria dados. A migration nova foi aplicada por `migrate deploy` e o status final do schema ficou atualizado.

## Ajuste complementar em 2026-06-12 - capa no bloco de identidade visual

A imagem de capa continua sendo uma midia independente do perfil, mas sua edicao deve ficar visualmente associada a foto de perfil. A tela `/app/professional/profile/setup` passou a renderizar a capa no card superior, imediatamente abaixo da foto de perfil, antes de `Informacoes basicas`.

A secao `Apresentacao` nao abriga mais a capa do perfil; ela permanece dedicada a headline, bio e video de apresentacao. O copy da capa foi reduzido para orientar apenas o uso de foto horizontal de consultorio, ambiente de atendimento ou arte institucional, com formatos `JPG, PNG ou WebP`.

Validacao complementar:

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local `/app/professional/profile/setup` respondeu 307 sem sessao, preservando a protecao da rota privada.

## Ajuste complementar em 2026-06-12 - secao unica de midias no setup

A edicao de `/app/professional/profile/setup` passou a agrupar imagem de capa e foto de perfil em uma unica secao `Imagens do perfil`. A ordem da secao prioriza a capa, depois a foto de perfil, para reforcar que a capa e a primeira midia visual do perfil publico.

A decisao foi manter os endpoints e validacoes existentes, alterando apenas apresentacao, ordem e feedback visual. A capa salva em `cover_image_url` continua sendo exibida com `next/image`; ao selecionar uma nova imagem, o frontend cria um `ObjectURL` temporario para preview imediato e o remove apos sucesso do upload ou descarte/remocao.

Validacao complementar:

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local `/app/professional/profile/setup` respondeu 307 sem sessao, preservando a protecao da rota privada.

## Ajuste complementar em 2026-06-12 - preview visual premium no setup

A secao `Imagens do perfil` da tela `/app/professional/profile/setup` passou a ser tratada como um editor visual de identidade do perfil. A decisao foi substituir a aparencia de campos tecnicos separados por um unico card de pre-visualizacao: capa horizontal como banner, avatar circular sobreposto e acoes discretas por icones.

A mudanca e apenas de composicao visual. Os contratos de upload/remocao, validacoes de arquivo, persistencia em `cover_image_url`/`user.avatar`, preview local com `ObjectURL` e modal de enquadramento do avatar permanecem os mesmos. Nenhum endpoint, schema Prisma ou package foi alterado.

Validacoes executadas:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local em `/app/professional/profile/setup` respondeu `307` sem sessao, preservando protecao da rota privada.
