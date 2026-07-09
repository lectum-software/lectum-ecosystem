# TASK-61: Detalhe administrativo do paciente

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-61 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Admin |
| Status | Pending |
| Dependências | TASK-45, TASK-46, TASK-60 |
| ADR alvo | ADR sobre exposição administrativa de dados pessoais de pacientes |

## Contexto

A tela de detalhe do paciente usa como referência `_product/proto/admin/Pacientes/Pacientes - Detalhes.png`.

Esta tela é operacional e deve ser **somente leitura** na V1. O Admin visualiza perfil resumido, engajamento, atividade recente, comunidades e horários de maior atividade quando houver fonte real.

Decisões de produto:

- Não implementar bloqueio ou silenciamento de paciente.
- Não implementar taxa de retenção.
- Não criar ações administrativas destrutivas.
- Não expor dados sensíveis além do necessário para operação.

## Objetivo

Criar a tela de detalhe administrativo do paciente com dados reais e uma leitura simples de engajamento, sem moderação, sem retenção e sem ações de bloqueio/silenciamento.

## Pré-requisitos e bloqueios

- TASK-60 concluída com navegação da lista para o detalhe.
- Ler `ARCHITECTURE.md`, `DATA-MODEL.md`, `PACKAGES.md` e `PROTO-INVENTORY.md`.
- Usar `_product/proto/admin/Pacientes/Pacientes - Detalhes.png` como referência visual local.
- Definir em ADR quais dados pessoais do paciente podem ser exibidos no Admin V1.

## Escopo frontend

- Criar rota protegida:
  - `/patients/[id]` ou equivalente.
- Renderizar:
  - botão "Voltar para pacientes";
  - cabeçalho com avatar, nome, ID do paciente, status básico, e-mail, gênero, localização agregada quando disponível, data de cadastro e origem de cadastro;
  - cards de engajamento;
  - gráfico de engajamento por período;
  - lista de atividade recente;
  - comunidades mais ativas;
  - heatmap de horários de maior atividade, quando houver dados reais.
- Status:
  - usar apenas `Ativo`/`Inativo` baseado em `user.active`;
  - não mostrar "Bloqueado" ou "Silenciado".
- Menu de três pontos:
  - omitir se não houver ações reais e seguras;
  - não incluir bloquear, silenciar, deletar ou moderar.

## Escopo backend

- Criar endpoint admin privado:
  - `GET /api/admin/private/patients/:id?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Retornar dados reais de:
  - `user`;
  - `patient_profile`;
  - `visitor_location` somente para localização agregada/coarse quando houver;
  - `community_member`;
  - `community_post`;
  - `post_reply`;
  - `post_vote`;
  - `post_save`;
  - `post_reply_save`;
  - `professional_review` quando o paciente for autor de avaliação, somente se necessário para atividade recente e respeitando regras de privacidade.

## Fora do escopo

- Bloquear, silenciar, banir ou excluir paciente.
- Moderação de publicações, comentários, votos ou avaliações.
- Taxa de retenção.
- Exibir localização precisa.
- Exibir telefone, nascimento, bio ou dados sensíveis sem decisão explícita.
- Criar novo modelo de auditoria.
- Criar tracking novo apenas para preencher a tela.

## Contrato técnico detalhado

Métricas de engajamento V1:

- **Posts criados**: contagem de `community_post.author_id = patient.id`.
- **Comentários**: contagem de `post_reply.author_id = patient.id`.
- **Upvotes recebidos**:
  - votos positivos em posts do paciente;
  - votos positivos em respostas do paciente;
  - se não for possível cobrir ambos com segurança, retornar nota de cobertura.
- **Downvotes recebidos**:
  - votos negativos em posts do paciente;
  - votos negativos em respostas do paciente;
  - se não for possível cobrir ambos com segurança, retornar nota de cobertura.
- **Respostas recebidas**:
  - respostas em posts criados pelo paciente;
  - replies encadeadas para respostas do paciente quando houver relação confiável.

Atividade recente:

- Derivar apenas de eventos reais existentes:
  - post criado;
  - comentário/resposta criada;
  - voto realizado;
  - post salvo;
  - resposta salva;
  - entrada em comunidade;
  - avaliação criada;
  - login apenas se houver fonte real de sessão/login.
- Não exibir "fez login" se não existir evento confiável de login/sessão.

Comunidades mais ativas:

- Combinar participação (`community_member`) com interações do paciente em cada comunidade.
- Mostrar contagem de interações no período.
- Exibir "seguindo"/"membro" somente se vier de `community_member` real.

Heatmap:

- Calcular por dia da semana e hora a partir de `createdAt` de posts, comentários, votos e salvamentos.
- Usar fuso `America/Sao_Paulo`/Brasília na agregação e informar a referência na UI.
- Se não houver eventos suficientes, exibir estado vazio honesto.

Privacidade/LGPD:

- E-mail pode ser exibido para admin autenticado se aprovado no ADR da task.
- Localização deve ser coarse e derivada de `visitor_location` ou omitida.
- Não expor IP, coordenadas, endereço completo, telefone, data de nascimento ou bio nesta V1.

Frontend esperado:

- Reutilizar shell Admin e componentes existentes.
- Mobile-first:
  - cabeçalho empilhado em mobile;
  - cards em grid responsivo;
  - listas legíveis sem tabela horizontal obrigatória.
- `Image` de `next/image` para avatar.
- Filtro de período com RHF/Zod/controllers se implementado como form.

## Critérios de aceite

- [ ] Rota de detalhe só abre para admin autenticado.
- [ ] Tela é somente leitura.
- [ ] Não há ação de bloquear, silenciar, banir, excluir ou moderar paciente.
- [ ] Não há métrica de retenção.
- [ ] Status usa apenas `Ativo`/`Inativo` baseado em fonte real.
- [ ] Métricas de engajamento usam dados reais.
- [ ] Atividade recente lista apenas eventos com fonte confiável.
- [ ] "Fez login" só aparece se houver evento real de login/sessão.
- [ ] Comunidades mais ativas são calculadas por interações reais.
- [ ] Heatmap usa eventos reais e informa fuso horário.
- [ ] Dados sensíveis são omitidos ou tratados conforme ADR.
- [ ] UI mobile-first validada.
- [ ] Nenhum `<img>` cru foi usado.
- [ ] `_product/proto/admin/Pacientes/Pacientes - Detalhes.png` foi citada como referência visual.
- [ ] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [ ] Checks/builds relevantes executados sem erros.
- [ ] ADR criado/atualizado sobre exposição de dados pessoais do paciente.
- [ ] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local com admin real e paciente real.
