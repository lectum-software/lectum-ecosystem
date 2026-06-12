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