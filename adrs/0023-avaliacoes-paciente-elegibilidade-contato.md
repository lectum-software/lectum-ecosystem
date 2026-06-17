# ADR-0023 - Avaliações de profissionais por contato prévio

## Status

Accepted

## Contexto

A TASK-17 exige que pacientes avaliem psicólogos sem mocks e com elegibilidade real. O modelo `professional_review` já existia conforme `DATA-MODEL.md`, mas a regra de quem pode avaliar precisava ser decidida antes de liberar o formulário.

## Decisão

A avaliação de um profissional por paciente exige um `contact_request` real, não deletado, do paciente autenticado (`req.auth.id`) para o psicólogo alvo, com `channel = "whatsapp"`. Essa intenção de contato é persistida pela TASK-16 antes de abrir o `wa.me`, então ela é o melhor insumo disponível no MVP para indicar interação real sem depender de integração clínica externa ainda inexistente.

Também foi decidido que:

- `/api/private/patient/reviews*` fica sob `requireRole("paciente")` no mount em `write.ts`, seguindo ADR-0002 e fail-closed.
- Cada par paciente/psicólogo continua limitado por `@@unique([psychologist_id, author_id])`.
- `rating` é validado de 1 a 5; `comment` permanece nullable no modelo histórico, mas a API de criação e a UI exigem depoimento textual para novas avaliações.
- Critérios visuais da tela (`Acolhimento`, `Clareza`, `Pontualidade`) orientam o depoimento, mas não viram colunas novas porque `DATA-MODEL.md` não define notas por critério.
- Ao criar avaliação publicada, `psychologist_profile.rating_avg` é recalculado como média x100 e `rating_count` em transação.
- Moderação futura deve usar `status = "oculta"`, sem apagar o registro real.

## Consequências

- Pacientes sem contato WhatsApp prévio recebem bloqueio de elegibilidade em PT-BR.
- A UI pode exibir o formulário somente quando a API privada confirma `eligible = true`.
- A regra evita avaliações de usuários sem relação persistida e mantém o schema de avaliações alinhado ao `DATA-MODEL.md`.
- A verificação não prova atendimento clínico concluído; é uma regra MVP baseada na interação persistida disponível.

## Task relacionada

- TASK-17: Avaliações pelo paciente

## Validações

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke HTTP real: elegibilidade, criação, listagem, bloqueio de duplicidade e fail-closed para psicólogo.
- Browser local headless em `http://localhost:3000/app/reviews` com sessão real de paciente.


## Atualização - 2026-06-17

A tela **Avaliar Profissional** foi simplificada para reduzir atrito e aumentar a qualidade das avaliações:

- A nota deixou de usar select e passou a ser controlada exclusivamente por estrelas acessíveis, alimentando diretamente o valor enviado ao backend.
- A elegibilidade agora retorna dados públicos adicionais do psicólogo (CRP, gênero e status verificado) para montar o card de avaliação sem depender de bio/headline.
- O depoimento passou a ser obrigatório no frontend e no validador do endpoint de criação, preservando o campo nullable no banco apenas por compatibilidade com registros históricos.

Consequência: novas avaliações seguem com nota 1..5, vínculo real por contato WhatsApp e depoimento obrigatório, sem migração de banco e sem criar campos paralelos.
