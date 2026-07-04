# ADR-0023 - Avaliações de profissionais

## Status

Accepted (atualizada em 2026-06-26)

## Contexto

A TASK-17 exige que pacientes avaliem psicólogos sem mocks e com elegibilidade real. O modelo `professional_review` já existia conforme `DATA-MODEL.md`, mas a regra de quem pode avaliar precisava ser decidida antes de liberar o formulário.

## Decisão original - 2026-06-09 (superada pela atualização de 2026-06-26)

A decisão original exigia `contact_request` real, não deletado, do paciente autenticado (`req.auth.id`) para o psicólogo alvo, com `channel = "whatsapp"`. Essa regra foi usada no MVP inicial, mas não é mais a regra vigente desde 2026-06-26.

Também foi decidido que:

- `/api/private/patient/reviews*` fica sob `requireRole("paciente")` no mount em `write.ts`, seguindo ADR-0002 e fail-closed.
- Cada par paciente/psicólogo continua limitado por `@@unique([psychologist_id, author_id])`.
- `rating` é validado de 1 a 5; `comment` permanece nullable no modelo histórico, mas a API de criação e a UI exigem depoimento textual para novas avaliações.
- Critérios visuais da tela (`Acolhimento`, `Clareza`, `Pontualidade`) orientam o depoimento, mas não viram colunas novas porque `DATA-MODEL.md` não define notas por critério.
- Ao criar avaliação publicada, `psychologist_profile.rating_avg` é recalculado como média x100 e `rating_count` em transação.
- Moderação futura deve usar `status = "oculta"`, sem apagar o registro real.

## Consequências originais (históricas)

- Pacientes sem contato WhatsApp prévio recebiam bloqueio de elegibilidade em PT-BR.
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

Consequência histórica: novas avaliações seguiam com nota 1..5, vínculo real por contato WhatsApp e depoimento obrigatório, sem migração de banco e sem criar campos paralelos. A exigência de contato foi superada em 2026-06-26.

## Atualização - 2026-06-17 - Confirmação pós-avaliação

A confirmação de avaliação passou a priorizar continuidade de descoberta em comunidade:

- O card de sucesso reutiliza os dados públicos reais retornados pela elegibilidade (`psychologist_name`, `psychologist_gender`, `psychologist_crp`, `psychologist_verified`) para confirmar quem foi avaliado.
- A ação principal `Finalizar` redireciona para `/app/community/feed`, em vez de retornar ao perfil do psicólogo, reforçando a próxima etapa de engajamento comunitário.
- Não houve mudança de contrato persistido ou schema; a decisão é de fluxo e apresentação no frontend.

## Atualização - 2026-06-17 - Lista de avaliações feitas

A tela `/app/reviews` foi ajustada para manter a lista de avaliações do paciente mais objetiva e consistente com os dados profissionais usados no fluxo de avaliação:

- O contrato de listagem de avaliações feitas retorna `psychologist_crp` e `psychologist_gender` junto aos dados já existentes do psicólogo.
- A UI substitui a headline/bio por `Profissão • CRP`, preservando o `psychologist_headline` no contrato apenas por compatibilidade com consumidores existentes.
- A nota da avaliação é apresentada somente no indicador compacto estrela + número; o cluster de cinco estrelas foi removido da lista para reduzir redundância visual.
- A ação textual `Ver perfil` foi removida do rodapé, mantendo a setinha superior direita como única ação de navegação ao perfil.

Não houve alteração de banco nem migração: a decisão é de contrato de leitura e apresentação visual usando campos reais já persistidos em `psychologist_profile`.

## Atualização - 2026-06-19 - Header compartilhado em Avaliações feitas

A tela `/app/reviews` passou a reutilizar o `AppPageHeader`, mesmo componente usado em `/app/posts/saved` e `/app/posts/mine`, para alinhar a família de telas secundárias do perfil.

Decisão:

- Substituir o `SecondaryPageHeader` por `AppPageHeader` apenas em `Avaliações feitas`.
- Preservar o texto do título, a rota de retorno para `/app/profile` e todo o conteúdo dos cards de avaliação.
- Não criar novo componente nem fork visual: a padronização deve usar o componente compartilhado já existente.

Consequência:

- O header passa a ter card branco/surface arredondado, borda, sombra suave, botão de voltar em círculo azul-claro e título centralizado, igual a `Salvos` e `Meus posts e comentários`.
- Não há impacto em API, regra de elegibilidade, contrato de listagem, schema Prisma, migrations ou packages.

Validação complementar:

- `pnpm --dir frontend biome:fix`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- Chrome headless local no `next start` em `/app/reviews`: sucesso, validando header em grid/card surface branco, botão circular azul-claro de voltar para `/app/profile` e título `Avaliações feitas`. A listagem exibiu erro real de conexão/API com token de smoke, sem uso de mock.

## Atualização - 2026-06-26 - Avaliações abertas a qualquer usuário

A decisão original de exigir contato WhatsApp fica superada pela regra de produto vigente: qualquer usuário autenticado pode avaliar um psicólogo público real, sem critérios de elegibilidade por contato e sem necessidade de clicar/registrar contato pelo WhatsApp.

Decisão:

- A rota canônica passa a ser `/api/private/user/reviews*`, protegida apenas por `_auth`, para aceitar autores de qualquer `role` autenticado.
- A rota legada `/api/private/patient/reviews*` permanece sob `requireRole("paciente")` para compatibilidade e para manter o namespace antigo fail-closed; o frontend deve usar o namespace neutro.
- A elegibilidade de criação não consulta mais `contact_request`, não exige contato WhatsApp e não exige Plano Profissional/cortesia manual do psicólogo alvo.
- Permanecem as travas reais: psicólogo alvo existente/publicado com vídeo público, bloqueio de autoavaliação, `@@unique([psychologist_id, author_id])`, nota 1..5 e depoimento obrigatório nas novas criações.
- `contact_request` continua existindo para analytics/KPI de WhatsApp, mas não é mais insumo de avaliação.

Consequências:

- Usuários sem contato WhatsApp prévio deixam de receber "Avaliação indisponível" por esse motivo.
- Psicólogos autenticados podem avaliar outros psicólogos, mas não o próprio perfil.
- O histórico de avaliações segue auditável por `author_id`; não houve mudança de schema ou migração.

Validação complementar planejada/executada na task:

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke HTTP real em `GET /api/private/user/reviews/eligibility/cmqmg35850000asuheq2ucwd0` com usuário autenticado de role `psicologo`, retornando `eligible=true` e `contact_request_id=null`.
- Browser local em `/app/reviews/new?psychologist_id=cmqmg35850000asuheq2ucwd0`, confirmando ausência do bloqueio por WhatsApp.

## Atualizacao 2026-06-26 - foto real no fluxo de nova avaliacao

### Contexto

O card superior da tela `/app/reviews/new` ja recebia `psychologist_avatar` no contrato de elegibilidade, mas a interface renderizava sempre um avatar textual com as iniciais. Isso quebrava a continuidade visual com o perfil publico e dificultava o reconhecimento do profissional no momento da avaliacao.

### Decisao

- Renderizar a foto de perfil real do psicologo no card de nova avaliacao quando `psychologist_avatar` estiver preenchido.
- Usar exclusivamente `next/image`, com `resolvePublicMediaUrl` e `isPublicMediaUrl`, seguindo a regra de UI do projeto e os mesmos utilitarios usados na lista de avaliacoes feitas.
- Manter iniciais como fallback honesto apenas quando nao existir avatar persistido.

### Consequencias

- O usuario reconhece melhor o psicologo avaliado antes de enviar o depoimento.
- O ajuste reaproveita o contrato e os utilitarios existentes, sem mudar API, schema, elegibilidade, persistencia ou packages.
- Perfis sem foto continuam com fallback visual estavel e sem mock.

### Validacao

- `pnpm.cmd --dir frontend exec biome check --write "src/app/app/reviews/new/logic.tsx"`
- `pnpm.cmd --dir frontend check`
- `pnpm.cmd --dir frontend build`
- `pnpm.cmd check`
- `git diff --check`
- HTTP local `200` em `/app/reviews/new?psychologist_id=cmqmg35850000asuheq2ucwd0`
- Chrome headless local em viewport mobile 390x844 na mesma rota.


## Atualizacao 2026-07-04 - CTA de avaliacao no proprio perfil publico

### Contexto

A regra vigente permite que qualquer usuario autenticado avalie psicologos publicos, mas preserva o bloqueio real de autoavaliacao. No perfil publico do proprio psicologo, a UI ainda oferecia o botao `Avaliar` em `Avaliacoes`, levando o profissional para uma acao que a API ja recusaria.

### Decisao

- O perfil publico compara o usuario autenticado em sessao (`currentUser.id`) com o `profile.id` retornado pelo diretorio.
- Quando os ids sao iguais, a interface oculta apenas o CTA `Avaliar` na previa de `Avaliacoes` da aba `Geral` e no card de resumo da aba completa `Avaliacoes`.
- A navegacao `Ver todas`, a listagem de avaliacoes, as metricas, a distribuicao de notas e o botao de editar perfil permanecem independentes.
- A API continua sendo a fronteira de seguranca: a autoavaliacao permanece bloqueada no backend; esconder o botao e um ajuste de experiencia, nao controle de acesso.

### Consequencias

- O psicologo nao ve uma chamada para avaliar a si mesmo no proprio perfil publico.
- Outros usuarios autenticados ou anonimos continuam vendo o CTA quando as regras visuais do perfil permitirem, seguindo o fluxo existente de login/criacao de avaliacao.
- Nao houve mudanca de schema, endpoint, contrato de elegibilidade, packages ou dados persistidos.
