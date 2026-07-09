# TASK-60: Dashboard administrativo de pacientes

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-60 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Admin |
| Status | Pending |
| Dependências | TASK-45, TASK-46 |
| ADR alvo | ADR se houver decisão nova sobre exposição de dados de pacientes ou cálculo de atividade |

## Contexto

A seção **Pacientes** do painel Admin deve ser mais simples que Psicólogos. A referência visual é `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`.

Decisões de produto definidas:

- Não implementar status **Bloqueado** ou **Silenciado** nesta V1.
- Não implementar **taxa de retenção** nesta V1.
- Não criar ações administrativas de bloqueio, silenciamento, moderação ou exclusão de paciente.
- Usar apenas dados reais existentes; não preencher cards, gráficos ou listas com dados fake.

## Objetivo

Implementar o dashboard administrativo de pacientes com visão geral de crescimento, status básico de conta, novos cadastros, lista resumida e estatísticas simples.

## Pré-requisitos e bloqueios

- TASK-45 concluída: autenticação Admin real.
- TASK-46 concluída: app `admin/` e shell lateral.
- Ler `_product/tasks/ARCHITECTURE.md`, `_product/tasks/DATA-MODEL.md`, `_product/tasks/PACKAGES.md` e `_product/tasks/PROTO-INVENTORY.md`.
- Usar `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` como referência visual local.
- Se Builder/Quick Copy estiver disponível, usar como complemento; se não, registrar a limitação e usar a imagem local.

## Escopo frontend

- Criar rota protegida:
  - `/patients` ou rota equivalente definida no app Admin.
- Renderizar:
  - título e subtítulo;
  - filtro de período;
  - exportação somente se houver endpoint real;
  - cards:
    - total de pacientes;
    - pacientes ativos;
    - pacientes inativos;
    - novos cadastros;
  - gráfico temporal sem linha/card de retenção;
  - lista resumida de pacientes com acesso ao detalhe;
  - estatísticas por gênero, localização agregada e forma de cadastro.
- Não renderizar status "Bloqueado" ou "Silenciado".
- Não renderizar taxa de retenção.
- Ações por linha:
  - abrir detalhe;
  - menu adicional somente com ações reais e seguras já implementadas; caso contrário, omitir.

## Escopo backend

- Criar endpoint admin privado:
  - `GET /api/admin/private/patients/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Agregar dados reais de:
  - `user.role="paciente"`;
  - `user.active`;
  - `user.provider`;
  - `patient_profile.gender`;
  - `patient_profile.createdAt` e `user.createdAt`;
  - `community_member`;
  - `community_post`;
  - `post_reply`;
  - `post_vote`;
  - `post_save`/`post_reply_save`, se necessário para atividade recente;
  - `visitor_location` apenas para localização agregada/coarse quando houver fonte real.
- Definição V1:
  - **total de pacientes**: usuários não deletados com `role="paciente"`;
  - **pacientes ativos**: contas com `user.active=true`;
  - **pacientes inativos**: contas com `user.active=false`;
  - **novos cadastros**: pacientes criados dentro do período.
- Se o produto quiser "ativo por uso recente" em vez de `user.active`, criar ADR e ajustar copy para não confundir status de conta com engajamento.

## Fora do escopo

- Status bloqueado/silenciado.
- Ações de bloquear, silenciar, banir, excluir ou moderar paciente.
- Taxa de retenção.
- Definir cohort retention.
- Exibir localização precisa.
- Criar tracking novo apenas para preencher gráfico.
- Criar dados fake, seeds permanentes ou endpoints simulados.

## Contrato técnico detalhado

Backend esperado:

- Módulo admin privado seguindo o padrão de controller/service/repository/validator existente.
- Período:
  - default: últimos 7 dias;
  - aceitar `from` e `to`;
  - validar limites para evitar consultas excessivas.
- Resposta sugerida:
  - `summary`;
  - `series`;
  - `recentPatients`;
  - `demographics`;
  - `locations`;
  - `signupSources`;
  - `coverageNotes` para métricas omitidas por falta de fonte.
- Localização:
  - usar somente cidade/UF/país agregados quando existir em `visitor_location`;
  - não exibir coordenada, IP, endereço ou localização exata.
- Exportação:
  - só criar/habilitar se houver endpoint real, por exemplo `GET /api/admin/private/patients/dashboard/export`.

Frontend esperado:

- Reutilizar shell Admin da TASK-46.
- Reutilizar componentes/tokens existentes; não criar design system paralelo.
- Mobile-first:
  - cards empilhados em mobile;
  - tabela convertida para lista/card em mobile se necessário;
  - layout expandido em desktop seguindo a referência visual.
- Gráficos:
  - usar implementação existente ou CSS/SVG controlado sem instalar pacote novo, salvo validação em `PACKAGES.md` e ADR.
- Campos/filtros:
  - usar React Hook Form, Zod e controllers da TASK-02 quando houver formulário.
- Imagens/avatar:
  - usar `Image` de `next/image`, nunca `<img>`.

## Critérios de aceite

- [ ] Rota de Pacientes só abre para admin autenticado.
- [ ] Dashboard usa somente dados reais de pacientes.
- [ ] Cards exibidos: total, ativos, inativos e novos cadastros.
- [ ] Card/linha/gráfico de retenção não existe nesta V1.
- [ ] Status bloqueado/silenciado não aparece.
- [ ] Lista resumida abre o detalhe do paciente.
- [ ] Localização é agregada e só aparece quando houver fonte real.
- [ ] Métricas sem fonte real aparecem como indisponíveis ou são omitidas com copy honesta.
- [ ] Exportação só aparece/habilita com endpoint real.
- [ ] UI mobile-first validada.
- [ ] Nenhum `<img>` cru foi usado.
- [ ] `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` foi citada como referência visual.
- [ ] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [ ] Checks/builds relevantes executados sem erros.
- [ ] ADR criado/atualizado se houver decisão sobre dados sensíveis, localização ou cálculo de atividade.
- [ ] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local com admin real e pacientes reais.
