# ADR-0065: Criação real de posts da comunidade

## Status

Accepted

## Task relacionada

TASK-24

## Contexto

A TASK-24 substitui o destino preparado de criação de post por um fluxo real para pacientes e psicólogos. As referências visuais ativas são os PDFs anexados pelo usuário e as imagens locais listadas em `_product/tasks/PROTO-INVENTORY.md`: `Criar Nova Postagem - Pacientes.jpg`, `Criar Nova Postagem - Psicólogo.jpg` e `Confirmação de Postagem.jpg`.

O `DATA-MODEL.md` já prevê `community_post` com `author_id`, `community_id`, `title`, `content`, `anonymous` e `status`. A tarefa não exige novo schema para mídia. Anexos dependem de Cloudflare R2/S3-compatible conforme ADR-0006/TASK-03; sem credenciais e bucket no ambiente, o fluxo deve publicar texto sem upload e registrar a pendência.

## Decisão

- Criar o endpoint privado `POST /api/private/community/:slug/posts`, mantendo validação no validator local e persistência via Prisma no módulo `backend/src/modules/api/private/community`.
- Reutilizar o modelo existente `community_post`, sem nova migration, e gravar `status = "publicado"` no momento da criação.
- Adotar moderação reativa: posts publicados podem ser removidos depois com `status = "removido"`; `status = "pendente"` fica reservado para uma futura decisão de pré-moderação/IA.
- Validar a comunidade pelo `slug` da rota e derivar o tipo de autor de `req.auth.role`; não criar coluna nova para perfil do autor.
- Permitir criação apenas para `role = "paciente"` ou `role = "psicologo"`.
- Permitir `anonymous` somente para pacientes; posts criados por psicólogos são sempre identificados, mesmo que o cliente envie `anonymous=true`.
- Retornar o `CommunityPost` recém-criado no mesmo formato usado pelo feed, permitindo invalidar o cache e navegar para a tela de sucesso.
- Implementar as rotas canônicas `/app/community/[slug]/post/new` e `/app/community/[slug]/post/success` no frontend.
- Manter `/app/community/post/new` como compatibilidade, redirecionando para o fluxo global `/app/community/feed/post/new` usado pelo CTA central do feed.
- Usar React Hook Form, Zod, `frontend/src/hooks/form` e controllers existentes para comunidade, título e texto; o toggle anônimo usa `Controller` do React Hook Form para respeitar a base de formulário e reproduzir o layout do protótipo.
- Diferenciar a UI por perfil: pacientes veem a opção “Postar como anônimo”; psicólogos veem a seção visual de mídia, desabilitada como pendência de R2.

## Consequências

- O feed passa a receber posts reais, sem mock ou endpoint simulado.
- O fluxo global exige seleção explícita de comunidade quando acessado por `/app/community/feed/post/new`; quando acessado por `/app/community/[slug]/post/new`, a comunidade é pré-selecionada.
- A publicação já aparece para o feed imediatamente porque a moderação é reativa.
- A UI de mídia para psicólogos fica preparada visualmente, mas não envia arquivos até existir storage R2 configurado e schema/endpoint de anexos aprovado.
- A rota antiga do CTA central não quebra navegações existentes, mas o destino canônico passa a ser a rota com slug.

## Validação

- `pnpm --dir backend check`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir backend build`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- Validação HTTP local das rotas Next:
  - `GET http://localhost:3000/app/community/feed/post/new`: sucesso (`200`).
  - `GET http://localhost:3000/app/community/ansiedade-em-equilibrio/post/new`: sucesso (`200`).
  - `GET http://localhost:3000/app/community/ansiedade-em-equilibrio/post/success`: sucesso (`200`).
- `pnpm check`: sucesso.
- Validação HTTP local do endpoint: `POST /api/private/community/:slug/posts` sem autenticação retornou `401`, confirmando rota privada registrada.

## Pendências

- Implementar upload real de imagens/vídeos quando houver credenciais/bucket R2 e schema de anexos aprovado.
- Criar detalhe real de comunidade e detalhe real do post nas tasks posteriores.
- Adicionar pré-moderação/IA somente após nova ADR aprovar a regra de negócio e infraestrutura.