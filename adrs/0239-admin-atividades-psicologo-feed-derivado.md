# ADR-0239: Atividades do psicólogo no Admin como feed derivado

## Status

Accepted

## Data

2026-07-10

## Task relacionada

TASK-59: Detalhe administrativo do psicólogo — Atividades simples.

## Contexto

A aba administrativa **Atividades** precisa oferecer visibilidade operacional sobre eventos relevantes do psicólogo, mas a regra de produto da V1 é explícita: a tela deve ser simples e honesta, sem prometer auditoria completa nem capturar eventos novos apenas para preencher a interface.

O modelo atual já possui fontes reais para alguns eventos principais, como criação de conta/perfil, posts, respostas, salvamentos, assinatura, contatos WhatsApp, avaliações e denúncias. Porém não existe trilha confiável para alteração campo a campo do perfil, troca/upload de vídeo ou vínculo direto de `payment_event` com o psicólogo.

## Decisão

- Criar o endpoint privado Admin `GET /api/admin/private/psychologists/:id/activities`.
- Não criar novo modelo/tabela de auditoria nesta V1.
- Montar o feed a partir de fontes reais existentes:
  - `user`;
  - `psychologist_profile`;
  - `professional_subscription`;
  - `community_post`;
  - `post_reply`;
  - `post_save`;
  - `post_reply_save`;
  - `contact_request`;
  - `professional_review`;
  - `post_report`.
- Gerar a descrição dos eventos no backend em PT-BR.
- Retornar `coverage_note` e `unavailable` para declarar lacunas de cobertura, em vez de inventar eventos.
- Não exibir ação de exportação enquanto não existir endpoint real de exportação para atividades.
- Exibir links de detalhe apenas quando houver rota pública real para o conteúdo.

## Consequências

- O Admin passa a ver eventos principais reais sem criar uma auditoria paralela incompleta.
- A UI fica honesta sobre lacunas de cobertura e não promete listar todas as ações.
- Uma auditoria completa futura deverá ser implementada como nova decisão/modelagem, com captura explícita de eventos e política de retenção.
- `payment_event` permanece fora do feed porque não há vínculo confiável direto com o psicólogo no schema atual.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- API local autenticada retornou `200` para `GET /api/admin/private/psychologists/demo-profile-marina-rocha/activities`, com fonte real e `export.available=false`.
- Browser local via Edge/CDP em `http://localhost:3002/psicologos/demo-profile-marina-rocha?tab=atividades` confirmou renderização da aba, copy recomendada, ausência de promessa de "todas as ações", ausência de botão de exportação e lista com fontes reais.

## Limitações da execução

- Builder/Quick Copy não estava disponível como ferramenta no ambiente; a implementação visual foi guiada pelo PNG local `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Atividades.png`.
- A tela não cobre auditoria campo a campo, troca/upload de vídeo nem eventos brutos de pagamento sem vínculo confiável.
