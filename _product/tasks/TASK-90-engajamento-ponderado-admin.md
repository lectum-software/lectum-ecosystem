# TASK-90: Engajamento ponderado no Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-90 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Admin Analytics |
| Status | Completed |
| Dependências | TASK-53, TASK-54, TASK-60, TASK-89 |
| ADR alvo | ADR-0340 |

## Contexto

Após a normalização em 30 dias adotada para comparar usuários em janelas diferentes, o produto precisa diferenciar o valor das ações que compõem engajamento. Votar muito ou criar muitos posts não deve permitir que um psicólogo seja classificado como **Muito engajado** se ele não responde pacientes. Para pacientes, publicar e responder indicam participação mais forte que apenas votar ou salvar conteúdo.

Esta task evolui os diagnósticos administrativos de engajamento de psicólogos e pacientes para um score ponderado, mantendo as fontes first-party reais de comunidade já existentes e sem alterar schema Prisma.

Referências visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`;
- `_product/proto/admin/Psicólogos/Psicólogos- Lista.png`;
- `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execução, ele não estava exposto como ferramenta callable; a referência visual foi feita pelas imagens locais/exportadas.

## Objetivo

O Admin deve classificar engajamento comunitário com pesos por tipo de ação, tetos para ações leves e uma trava qualitativa para psicólogos: **Muito engajado** só pode acontecer quando há respostas normalizadas a posts de pacientes.

## Pré-requisitos e bloqueios

- Sem requisito externo novo.
- Sem package novo.
- Sem migration, pois todos os sinais já existem em `community_post`, `post_reply`, `post_vote`, `post_save` e `post_reply_save`.
- Usar arquitetura de módulos e DTOs existentes em `backend/src/modules/api/admin/private`.
- Usar contratos reais em `admin/src/api/req`, sem mock ou endpoint paralelo.

## Escopo frontend

- Atualizar `/psicologos` para explicar o critério ponderado no bloco **Tração x Engajamento**.
- Atualizar `/psicologos/lista` para aceitar os quadrantes compostos com categorias de tração não convertida e exibir **Sem engajamento** no filtro de engajamento.
- Atualizar `/pacientes` para explicar os cortes ponderados do gráfico **Engajamento dos pacientes**.

## Escopo backend

- Centralizar pesos, tetos e cortes em `backend/src/utils/admin-community-engagement-diagnosis.ts`.
- Psicólogos:
  - responder post de paciente: peso 4, sem teto;
  - post criado: peso 2, teto 6 pontos/30d;
  - resposta fora de post de paciente: peso 2, teto 8 pontos/30d;
  - voto: peso 0,5, teto 3 pontos/30d;
  - **Muito engajado** exige 12+ pontos/30d e pelo menos 2 respostas a posts de pacientes/30d.
- Pacientes:
  - post criado: peso 4, sem teto;
  - resposta criada: peso 2, sem teto;
  - salvamento: peso 1,5, teto 6 pontos/30d;
  - voto: peso 0,5, teto 3 pontos/30d.
- Cortes compartilhados:
  - **Sem engajamento/Sem base**: abaixo de 3 pontos/30d ou nenhuma ação real, conforme o contrato da tela;
  - **Pouco engajado**: 3 a 5 pontos/30d;
  - **Engajado**: 6 a 11 pontos/30d;
  - **Muito engajado**: 12+ pontos/30d, com trava qualitativa adicional para psicólogos.

## Fora do escopo

- Ranking público por engajamento.
- Inferência clínica, qualidade de atendimento ou punição automática.
- Backfill, seed, mock ou dados estimados.
- Alteração de schema/migration Prisma.
- Novo tracking de eventos.

## Contrato técnico detalhado

- Backend mantém os endpoints Admin existentes e apenas expande DTOs com thresholds/sinais ponderados.
- Dashboard e lista de psicólogos diferenciam `post_reply` em:
  - resposta de psicólogo a post de paciente (`patient_reply`);
  - resposta de psicólogo em outros posts (`reply`).
- Dashboard e lista de pacientes usam o score ponderado para segmentar engajamento, preservando intenção como eixo separado.
- Os contratos expõem pesos/tetos para que a UI descreva a regra sem hardcode duplicado.
- Nenhum pacote novo foi instalado; `PACKAGES.md` foi consultado.
- Nenhum formulário/campo novo foi criado.
- UI permanece mobile-first nos cards existentes; nenhum `<img>` foi introduzido.

## Critérios de aceite

- [x] Psicólogos no dashboard e na lista Admin usam score ponderado normalizado em 30 dias para engajamento comunitário.
- [x] Psicólogo sem respostas a posts de pacientes não pode ser **Muito engajado**, mesmo com muitos votos, posts ou respostas leves.
- [x] Ações leves de psicólogos têm teto de pontuação: votos, posts e respostas fora de posts de pacientes.
- [x] Pacientes usam pesos diferentes para posts, respostas, salvamentos e votos.
- [x] Votos e salvamentos de pacientes têm teto de pontuação, impedindo engajamento alto só por ação leve.
- [x] Cortes ficam documentados e expostos nos contratos Admin: 3, 6 e 12 pontos/30d.
- [x] UI mobile-first; nenhum `<img>` cru foi introduzido.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Não houve alteração de banco/schema/migrations; `db:migrate` não se aplica.
- [x] Formulários/campos da `TASK-02` não se aplicam nesta task.
- [x] Builder/Quick Copy não estava callable; imagens locais de `_product/proto/admin` foram citadas.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado em `adrs/0340-engajamento-ponderado-admin.md`.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir admin check`
- Smoke direto com `pnpm --dir backend exec tsx -e`, validando:
  - psicólogo com muitos votos/posts/respostas, mas 0 respostas a pacientes, fica no máximo **Engajado**;
  - psicólogo com 3 respostas a posts de pacientes/30d atinge **Muito engajado**;
  - paciente só com votos fica abaixo de **Engajado** pelo teto;
  - paciente com 3 posts/30d atinge **Muito engajado**.
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local em `/psicologos`, `/psicologos/lista` e `/pacientes`.
- Browser local/headless autenticado em viewport mobile 390px validou `/psicologos`, `/psicologos/lista?engagement=sem_base` e `/pacientes`, com `scrollWidth=390` em todas as rotas e screenshots salvos em `.tmp/admin-psychologists-weighted-engagement-mobile.png`, `.tmp/admin-psychologists-list-weighted-engagement-mobile.png` e `.tmp/admin-patients-weighted-engagement-mobile.png`.

## Notas de execução

- A expansão de quadrantes de **Tração x Engajamento** preserva a navegação para filtros reais na lista.
- O score ponderado é métrica operacional interna do Admin; não aparece para pacientes/psicólogos e não altera descoberta pública.
- A validação em browser usou um admin temporário real criado via `admin:bootstrap` e removido do banco ao final.
