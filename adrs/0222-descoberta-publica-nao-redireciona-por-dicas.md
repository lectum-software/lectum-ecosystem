# ADR-0222: Descoberta pública não redireciona por dicas de onboarding

## Status

Accepted

## Task relacionada

Correção avulsa de regressão em `/psychologists`, relacionada à TASK-40.

## Contexto

A rota pública `/psychologists` reutiliza a lógica mobile-first da descoberta de psicólogos. Essa tela pode ser acessada sem sessão, mas também contém chamadas não críticas de dicas de onboarding (`/api/private/account/tips`) e telemetria de visualização/vídeo.

Ao rolar os vídeos sem token válido, uma persistência de dica podia chamar o endpoint privado de conta, receber `401 Token não fornecido`, acionar o fluxo global de logout e redirecionar para `/auth/login?callbackUrl=/psychologists`. Isso contrariava a regra de produto da TASK-40: descoberta e leitura pública devem permanecer livres; somente interações que dependem de identidade devem pedir autenticação.

## Decisão

- Dicas de onboarding de conta passam a ser tratadas como estado não crítico:
  - só buscam o endpoint privado quando existe usuário e token local;
  - em visitantes anônimos, a atualização de dica vira no-op local;
  - falhas do endpoint de dicas não redirecionam para login.
- Chamadas públicas não críticas de telemetria em `directory` (`view` e `video-watch`) não acionam logout em respostas `401`.

## Consequências

- Visitantes podem rolar livremente os vídeos em `/psychologists` sem toast de token e sem redirecionamento forçado.
- Usuários autenticados continuam persistindo preferências reais de onboarding quando a sessão é válida.
- Se a sessão estiver ausente/expirada apenas para dicas, a tela pública continua funcional e as dicas podem ser recalculadas depois de novo login.
- Interações com identidade real (favoritos, avaliações, área privada) continuam fora deste relaxamento e seguem exigindo autenticação.

## Validação

- `pnpm --dir frontend check` concluído com sucesso.
- `Invoke-WebRequest http://localhost:3000/psychologists` retornou `200` no servidor local já ativo.
- `pnpm --dir frontend build` foi tentado, mas o Next bloqueou por existir um dev server ativo segurando `frontend/.next/dev/lock`.

## Pendências

- Reexecutar `pnpm --dir frontend build` quando o dev server local em `localhost:3000` puder ser parado.
