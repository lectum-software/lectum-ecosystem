# ADR-0078 - Transição segura para WhatsApp do psicólogo

Status: Accepted

## Contexto

CTAs diretos de WhatsApp em listagens, feed da comunidade e perfil público abriam o `wa.me`
imediatamente. Isso reduzia a clareza sobre qual profissional havia sido escolhido e, em alguns
pontos, não passava pelo registro persistido de intenção/clique de contato.

## Decisão

- Centralizar CTAs de WhatsApp de psicólogos em um componente client-side reutilizável.
- Exibir uma transição com foto, nome, profissão e CRP antes de sair da Lectum.
- Registrar o clique em `contact_request` por um endpoint privado leve:
  `POST /api/private/directory/psychologists/:id/contact-click`.
- Usar o link retornado pelo backend quando disponível e manter fallback para o `whatsapp_url`
  já recebido no DTO, para não bloquear o usuário se o tracking demorar ou falhar.
- Expor `crp` nos autores psicólogos de comunidade/posts para a transição não depender de mock.
- Reutilizar a mesma modal também no fluxo dedicado `/app/psychologist/:id/contact`, mantendo o
  registro completo de contato antes do redirecionamento e removendo links diretos de fallback.
- Renderizar a transição de redirecionamento via portal em `document.body`, com camada `fixed`
  global, para que a modal cubra sidebar, feed, botões flutuantes e navegação em qualquer rota que
  use o CTA.

## Consequências

- A experiência fica mais segura e consistente entre feed, perfil público, listagem, respostas e
  tela dedicada de contato do psicólogo.
- Métricas de contato passam a capturar CTAs diretos além do fluxo com formulário.
- Não houve alteração de schema/migration; a persistência usa `contact_request` existente.
- O fallback manual continua disponível se o navegador não redirecionar automaticamente.
- A camada visual da transição deixa de depender do container em que o CTA foi acionado; isso evita
  deslocamento lateral em `/app/psychologists` e mantém o mesmo comportamento em comunidade/feed.

## Validações

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local em `/app/community/feed`, `/app/psychologists` e `/app/favorites`

## Atualizacao em 2026-06-14: CRP sem prefixo duplicado

### Contexto

A modal de transicao para WhatsApp exibia `Psicologa • CRP CRP DEMO/00005` quando o campo `crp` ja vinha persistido com o prefixo `CRP`.

### Decisao

- Centralizar a exibicao completa em `formatCrpLabel`, sempre no padrao `CRP XX/00000` ou `CRP DEMO/00005`.
- Fazer `formatCrpNumber` remover prefixos `CRP` repetidos antes de normalizar o registro.
- Usar o formatter compartilhado na modal de WhatsApp, perfil publico, perfil privado e ranking de mentores.
- Manter cards/listagens enviando o valor bruto para o componente compartilhado, para que a correcao aconteca em um unico ponto.

### Consequencias

- A modal deixa de duplicar o prefixo.
- Outras telas que exibem CRP usando o formatter passam a seguir o mesmo padrao.
- Nao ha alteracao de backend, Prisma, migration, endpoint, contrato de API ou pacote.

### Validacoes

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
- Smoke do formatter: `CRP DEMO/00005` e `CRP CRP DEMO/00005` renderizam como `CRP DEMO/00005`.
- HTTP local com cookie de sessao de desenvolvimento em `/app/psychologists`, `/app/favorites`, `/app/community/feed`, `/app/community/top-mentors`, `/app/profile` e `/app/psychologist/demo` respondeu `200`.
