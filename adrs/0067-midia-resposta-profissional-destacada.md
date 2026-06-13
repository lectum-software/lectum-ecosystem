# ADR-0067: Mídia em resposta profissional destacada

## Status

Accepted

## Contexto

O usuário solicitou um post de exemplo na comunidade "Ansiedade em equilíbrio" com uma resposta de psicólogo verificado contendo título, texto e vídeo anexado. O schema existente de `post_reply` tinha apenas `content` e `upvotes_count`; o feed já selecionava a resposta de psicólogo verificado mais votada, mas não havia contrato para título ou mídia na resposta destacada.

## Decisão

- Adicionar campos opcionais em `post_reply`: `title`, `media_url` e `media_type`.
- Expor esses campos em `highlighted_professional_reply` nos DTOs do backend e tipos do frontend.
- Renderizar título e mídia da resposta profissional destacada nos cards do Feed/Detalhe de Comunidade.
- Usar arquivo estático em `backend/public/community/replies/ansiedade-resposta-psi-thaisbruni.mp4` para o vídeo anexado solicitado, servido pelo `express.static` já existente.
- Criar o post de exemplo diretamente no banco de desenvolvimento usando IDs determinísticos para permitir reexecução idempotente, sem endpoint fake.

## Consequências

- Respostas profissionais podem ganhar material audiovisual no feed sem alterar a regra de destaque: apenas psicólogos verificados continuam elegíveis para a prévia.
- O schema agora suporta mídia em respostas, mas upload/gestão de mídia de posts ainda precisa de fluxo próprio futuro caso vire funcionalidade de produto.
- O vídeo anexado é um asset local de demonstração e deve ser substituído por storage público definitivo quando houver fluxo de upload para posts/respostas.

## Validação

- `pnpm --dir backend db:migrate --name add_post_reply_media`
- `pnpm --dir backend db:generate`
- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- `HEAD http://localhost:3001/community/replies/ansiedade-resposta-psi-thaisbruni.mp4` retornou 200 com `video/mp4`.
- `GET http://localhost:3000/app/community/ansiedade-em-equilibrio` retornou 200.

## Pendências

- Definir fluxo real de upload/moderação para mídia em posts e respostas antes de expor criação de mídia para usuários finais.
