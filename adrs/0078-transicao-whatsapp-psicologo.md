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

## Consequências

- A experiência fica mais segura e consistente entre feed, perfil público, listagem, respostas e
  tela dedicada de contato do psicólogo.
- Métricas de contato passam a capturar CTAs diretos além do fluxo com formulário.
- Não houve alteração de schema/migration; a persistência usa `contact_request` existente.
- O fallback manual continua disponível se o navegador não redirecionar automaticamente.

## Validações

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local em `/app/community/feed`, `/app/psychologists` e `/app/favorites`
