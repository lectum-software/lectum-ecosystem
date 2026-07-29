# TASK-93: Refinamento do alinhamento visual do fluxo de intencao e conversao no Dashboard Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-93 |
| Prioridade | P1 |
| Esforco | P |
| Fase | Admin Analytics |
| Status | Completed |
| Dependencias | TASK-92 |
| ADR alvo | ADR-0346 |

## Contexto

Depois da simplificacao da TASK-92, o fundador validou o formato geral do diagrama, mas pediu tres ajustes de leitura:

1. a coluna de pacientes deve iniciar por **Qualificados** e terminar em **Frios**;
2. as pontas de saida e entrada das setas devem alinhar visualmente com cada bloco de categoria;
3. numeros de exemplo podem aparecer apenas para a visualizacao local do fundador, sem virar dado real do produto.

Referencias consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/tasks/ARCHITECTURE.md`;
- `_product/tasks/PACKAGES.md`;
- captura enviada pelo usuario em 2026-07-29 mostrando o bloco com zero pares e setas desalinhadas.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, ele nao estava exposto como ferramenta callable; a referencia visual foi feita pela captura da conversa e pelas imagens locais/exportadas citadas no inventario.

## Objetivo

Refinar a leitura do diagrama **Fluxo de intencao e conversao** no Dashboard Admin, mantendo a simplicidade 4x4 e deixando claro, durante desenvolvimento local, como a espessura das setas se comporta com numeros de exemplo.

## Escopo frontend

- Reordenar a coluna de pacientes para:
  1. **Qualificados**;
  2. **Interessados**;
  3. **Curiosos**;
  4. **Frios**.
- Manter a coluna de psicologos em:
  1. **Alta Conversao**;
  2. **Interesse Nao Convertido**;
  3. **Trafego Nao Convertido**;
  4. **Baixa Conversao**.
- Ajustar o SVG para que as setas iniciem e terminem nas bordas horizontais do palco visual, com coordenadas verticais calculadas pelo centro de cada linha/categoria.
- Adicionar marcadores visuais discretos nos blocos laterais para reforcar o ponto de entrada/saida das setas.
- Permitir uma matriz de numeros de exemplo somente em localhost/127.0.0.1 quando a API retorna zero pares reais, com aviso explicito de **Exemplo visual local**.
- Manter o fluxo real de producao dependente apenas de `intent_conversion_flow`.

## Escopo backend

- Sem mudanca de backend, contrato de API, Prisma ou migrations.
- A matriz real continua derivada do contrato existente `intent_conversion_flow`.
- A categoria **Frios** segue sem fluxo real quando nao ha par paciente-psicologo observavel.

## Fora do escopo

- Alterar algoritmo ou regra de classificacao de pacientes/psicologos.
- Criar seed, backfill, endpoint simulado ou mock persistente.
- Alterar o bloco **Qualidade do trafego** no detalhe do psicologo.
- Instalar package novo.
- Alterar schema Prisma ou migrations.

## Criterios de aceite

- [x] Pacientes aparecem na ordem **Qualificados**, **Interessados**, **Curiosos**, **Frios**.
- [x] Psicologos permanecem na ordem **Alta Conversao**, **Interesse Nao Convertido**, **Trafego Nao Convertido**, **Baixa Conversao**.
- [x] O diagrama mantem 16 setas, uma para cada cruzamento 4x4.
- [x] As pontas das setas iniciam e terminam alinhadas ao centro visual de cada bloco de categoria.
- [x] Blocos laterais exibem marcadores discretos de porta de entrada/saida alinhados as setas.
- [x] Numeros de exemplo aparecem somente no modo visual local em localhost/127.0.0.1 e apenas quando nao ha pares reais.
- [x] O modo de exemplo esta rotulado como **Exemplo visual local** e informa que nao representa sinais reais.
- [x] Producao continua usando somente dados reais de `intent_conversion_flow`; nenhum endpoint simulado ou dado fake permanente foi criado.
- [x] UI permanece mobile-first com overflow interno controlado, sem `<img>` cru.
- [x] Nao houve alteracao de banco/schema/migrations; `db:migrate` nao se aplica.
- [x] Nenhum package novo foi instalado.
- [x] Checks/builds relevantes foram executados sem erros com as alteracoes da TASK-93 isoladas.
- [x] Browser local validou a ordem, o modo de exemplo, as 16 setas e ausencia de overflow de documento.
- [x] ADR criado em `adrs/0346-refino-alinhamento-exemplo-fluxo-intencao-conversao-admin.md`.
- [x] Commit criado e push executado.

## Validacao minima

- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Browser local autenticado em `http://localhost:3002/dashboard`, validando:
  - ordem de pacientes **Qualificados**, **Interessados**, **Curiosos**, **Frios**;
  - 16 setas SVG no diagrama;
  - modo `data-dashboard-intent-matrix-mode="local-example"` em localhost quando nao ha pares reais;
  - texto **Exemplo visual local**;
  - setas partindo da borda esquerda e chegando a borda direita do palco SVG;
  - ausencia de overflow horizontal no documento em 390px e 1366px;
  - capturas `.tmp/admin-dashboard-intent-flow-task93-mobile.png` e `.tmp/admin-dashboard-intent-flow-task93-desktop.png`.

## Notas de execucao

- Os numeros de exemplo nao entram no backend, nao sao seed e nao substituem o contrato real; sao uma visualizacao local e temporaria para calibracao de leitura enquanto o ambiente nao possui pares reais suficientes.
- Se a API retornar qualquer par real no periodo, a matriz local de exemplo nao e usada.
- Para validar sem interferencia de alteracoes alheias ja existentes no workspace, os arquivos fora do escopo foram isolados temporariamente via stash e restaurados ao final; o commit da TASK-93 inclui apenas Dashboard, task e ADR.
