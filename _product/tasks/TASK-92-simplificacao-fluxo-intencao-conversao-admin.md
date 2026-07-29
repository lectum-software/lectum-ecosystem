# TASK-92: Simplificação visual do fluxo de intenção e conversão no Dashboard Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-92 |
| Prioridade | P1 |
| Esforço | P |
| Fase | Admin Analytics |
| Status | Completed |
| Dependências | TASK-91 |
| ADR alvo | ADR-0345 |

## Contexto

Após a primeira versão do bloco **Fluxo de intenção e conversão**, o produto avaliou a tela em `/dashboard` e concluiu que a execução ficou carregada: havia insights, cards de nós e uma lista de caminhos observados competindo pela atenção.

A direção aprovada é mais simples e visual: quatro categorias de pacientes à esquerda e quatro categorias de psicólogos à direita, conectadas por linhas/setas cuja espessura representa a intensidade do fluxo.

Referências consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Dashboard.png`;
- captura enviada pelo usuário em 2026-07-28 mostrando a versão carregada do bloco.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execução, ele não estava exposto como ferramenta callable; a referência visual foi feita pelas imagens locais/exportadas e pela captura da conversa.

## Objetivo

Reduzir a carga cognitiva do bloco no Dashboard Admin e substituir a composição anterior por um diagrama único, com 4 categorias de pacientes à esquerda, 4 categorias de psicólogos à direita e 16 setas de intensidade.

## Escopo frontend

- Remover os cards de insights do bloco **Fluxo de intenção e conversão**.
- Remover a lista textual de **Caminhos observados** como elemento principal.
- Renderizar uma matriz visual 4x4 com:
  - **Frios**, **Curiosos**, **Interessados** e **Qualificados** à esquerda;
  - **Alta Conversão**, **Interesse Não Convertido**, **Tráfego Não Convertido** e **Baixa Conversão** à direita;
  - uma linha/seta para cada cruzamento;
  - espessura proporcional ao volume real de pares naquele cruzamento;
  - linhas zeradas apenas como trilhas discretas, sem inventar dado.
- Remover números visuais locais de exemplo do Dashboard.
- Manter layout mobile-first com overflow interno controlado, sem gerar overflow horizontal no documento.

## Escopo backend

- Sem mudança de contrato obrigatória nesta task.
- O frontend deriva a matriz 4x4 a partir de `intent_conversion_flow.flows`, preenchendo cruzamentos ausentes com zero.
- A categoria **Frios** aparece como nó visual com zero fluxo quando não há vínculo real paciente-psicólogo, preservando a regra de não inventar associação.

## Fora do escopo

- Alterar a regra de classificação de intenção/conversão.
- Alterar o bloco **Qualidade do tráfego** no detalhe do psicólogo.
- Adicionar mock, seed, backfill ou exemplo local.
- Alterar schema Prisma ou migrations.
- Instalar package novo.

## Critérios de aceite

- [x] Dashboard exibe visual simples com quatro categorias de pacientes à esquerda e quatro categorias de psicólogos à direita.
- [x] Cada categoria de paciente possui uma seta/linha para cada categoria de psicólogo.
- [x] A espessura das setas varia conforme o volume real do cruzamento.
- [x] Cruzamentos sem dados aparecem discretamente, sem número inventado.
- [x] Os cards de insights e a lista textual de caminhos observados foram removidos do bloco.
- [x] Números locais de exemplo foram removidos.
- [x] UI permanece mobile-first e nenhum `<img>` cru foi introduzido.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Não houve alteração de banco/schema/migrations; `db:migrate` não se aplica.
- [x] Formulários/campos da `TASK-02` não se aplicam nesta task.
- [x] Builder/Quick Copy não estava callable; imagens locais de `_product/proto/admin` foram citadas.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado em `adrs/0345-simplificacao-fluxo-intencao-conversao-admin.md`.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Browser local autenticado em `http://localhost:3002/dashboard`, validando:
  - 4 categorias de pacientes e 4 categorias de psicólogos;
  - 16 setas SVG reais no diagrama;
  - ausência dos textos removidos `Números de exemplo` e `Caminhos observados`;
  - ausência de overflow horizontal no documento em 390px e 1366px;
  - capturas `.tmp/admin-dashboard-intent-flow-simple-mobile.png` e `.tmp/admin-dashboard-intent-flow-simple-desktop.png`.

## Notas de execução

- A categoria **Frios** é exibida para manter simetria visual e alinhamento com o vocabulário de pacientes, mas não recebe fluxo sem vínculo real com um psicólogo.
- O gráfico usa somente o contrato real `intent_conversion_flow`; cruzamentos ausentes são zero visual.
