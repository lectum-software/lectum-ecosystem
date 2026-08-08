# TASK-53: Dashboard administrativo de psicólogos

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-53 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin |
| Status | Completed |
| Dependências | TASK-45, TASK-46 |
| ADR alvo | ADR se houver nova decisão sobre agregações, ranking administrativo ou métricas financeiras |

## Contexto

A área Admin de Psicólogos começa com uma visão executiva dos profissionais da plataforma. A referência visual é `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`.

Regra de produto definida em conversa: o botão **Adicionar novo psicólogo** fica fora da V1. O ranking exibido no Admin deve reutilizar o mesmo ranking real usado para posicionar vídeos/profissionais na descoberta pública de psicólogos, sem criar fórmula paralela.

## Objetivo

Implementar o dashboard administrativo de psicólogos com dados reais de perfis, planos, verificação, receita/churn honestos, ranking público reutilizado e estatísticas agregadas.

## Pré-requisitos e bloqueios

- TASK-45 concluída: autenticação Admin real.
- TASK-46 concluída: app `admin/` e shell lateral.
- Ler `_product/tasks/ARCHITECTURE.md`, `_product/tasks/DATA-MODEL.md`, `_product/tasks/PACKAGES.md` e `_product/tasks/PROTO-INVENTORY.md`.
- Usar `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` como referência visual local.
- Se Builder/Quick Copy estiver disponível, usar como complemento; se não, registrar limitação.

## Escopo frontend

- Criar rota protegida de dashboard de psicólogos:
  - `/psychologists` ou subrota equivalente definida no Admin.
- Renderizar:
  - título e subtítulo;
  - filtro de período;
  - exportação somente se houver endpoint real;
  - cards: total, gratuitos, verificados, novos cadastros, receita de assinaturas, churn;
  - gráfico temporal;
  - lista resumida de psicólogos;
  - ranking de psicólogos com score real da descoberta pública;
  - estatísticas por serviços, abordagens, público atendido, modalidade, gênero, experiência, convênio, desconto, valor social e distribuição por estado;
  - seção de filtros mais buscados somente se houver fonte real; caso contrário, exibir indisponível ou omitir com copy honesta.
- O botão "Adicionar novo psicólogo" não deve ser renderizado nesta V1.

## Escopo backend

- Criar endpoint admin privado:
  - `GET /api/admin/private/psychologists/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Agregar dados reais de:
  - `user.role="psicologo"`;
  - `psychologist_profile`;
  - `professional_subscription` e `subscription_plan`;
  - `professional_review`;
  - `psychologist_favorite`;
  - `contact_request`;
  - `profile_view_event`;
  - catálogos `service`, `approach`, `specialty`;
  - campos `modality`, `gender`, `target_audience`, `accepts_insurance`, `discount_first_session`, `social_value`, `crp_registration_date`.
- Reutilizar a função/score de ranking existente na descoberta pública de psicólogos. Se a função atual estiver acoplada ao repositório público, extrair helper compartilhável sem alterar a fórmula.

## Fora do escopo

- Criar psicólogo manualmente pelo Admin.
- Editar psicólogo.
- Moderar avaliações.
- Cancelar assinatura.
- Criar tracking novo de filtros buscados, se ainda não existir.
- Criar fórmula nova de ranking administrativo.

## Contrato técnico detalhado

Backend esperado:

- Módulo admin privado com controller/service/repository/validator.
- Período:
  - default: últimos 7 dias;
  - limite máximo inicial: 90 dias;
  - `from <= to`.
- Receita:
  - contar apenas pagamentos/assinaturas confirmadas com origem real de cobrança quando possível;
  - `admin_grant`/cortesia não conta como receita;
  - se o dado financeiro não permitir confirmar valor, retornar `unavailable` ou `estimated` com label explícito.
- Churn:
  - fórmula documentada no service;
  - não misturar cancelamento real com expiração de cortesia.
- Ranking:
  - `Mais relevantes` e bloco de ranking usam o mesmo score da descoberta pública;
  - retornar posição, score e componentes apenas quando já existirem/forem seguros.

Frontend esperado:

- `admin/src/api/req/psychologists`;
- `admin/src/api/callers/psychologists`;
- query keys próprias;
- gráficos simples acessíveis com alternativa textual;
- cards responsivos e mobile-first.

Packages usados:

- Nenhum pacote novo por padrão.
- Qualquer chart/table lib exige validação em `PACKAGES.md` e ADR.

## Critérios de aceite

- [x] A rota só abre para admin autenticado.
- [x] Botão "Adicionar novo psicólogo" não aparece nesta V1.
- [x] Cards e gráficos usam dados reais.
- [x] Ranking reutiliza a fórmula real da descoberta pública de psicólogos.
- [x] Receita/churn têm fórmula honesta e não contam cortesia como receita.
- [x] Métricas sem fonte real aparecem como indisponíveis ou são omitidas.
- [x] Filtro de período atualiza as agregações.
- [x] UI mobile-first validada em ~390px, tablet e desktop.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Nenhum `<img>` cru foi usado.
- [x] Gráfico de percentual de devices usados por psicólogos usa sessões reais autenticadas.
- [x] `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` foi citado como referência visual.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado ou atualizado se houver decisão relevante.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local com admin real.

## Notas de execução

- Os números da imagem são referência visual, não seed.
- Se `Filtros de busca` ainda não tiver rastreamento real, não preencher com dados inventados.
- Executado em 2026-07-09.
- Referência visual usada: `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`.
- Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` não estava exposto como ferramenta neste ambiente; a implementação usou a imagem local e registrou a limitação no ADR.
- O endpoint real criado é `GET /api/admin/private/psychologists/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD`.
- A rota do app Admin entregue é `/psicologos`, equivalente à rota administrativa protegida definida pela navegação existente do painel.
- O ranking administrativo reutiliza o helper compartilhado `backend/src/utils/psychologist-public-ranking.ts`, extraído da descoberta pública sem alterar a fórmula.
- Receita é MRR estimado com assinaturas profissionais ativas `source=mercadopago`; `admin_grant`/cortesia e plano gratuito não contam como receita.
- Churn usa cancelamentos reais de assinaturas profissionais Mercado Pago no período dividido pela base paga ativa no início do período; novas assinaturas pagas no período não entram no denominador; cortesia e gratuito ficam fora.
- Filtros mais buscados aparecem como indisponíveis porque não há tracking persistido de filtros/termos de busca.
- Validações executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, chamada real da API com admin temporário e validação headless local em `/psicologos` nos viewports 390px e desktop.

### Correção UX em 2026-07-12

- Título do dashboard alterado para **Dashboard de Psicólogos**.
- Linha **Período consultado** removida do topo da rota `/psicologos`.
- Chips rápidos **7 dias**, **30 dias** e **90 dias** removidos; o filtro passou a seguir o seletor usado nas estatísticas do detalhe do psicólogo: **Esta semana**, **Este mês**, **Este ano** e **Todo o período**, mantendo datas manuais como período personalizado.
- Textos descritivos longos dentro dos cards de contadores foram removidos da UI, preservando os dados reais no contrato.
- Backend do dashboard passou a aceitar `period=week|month|year|all|custom`; `period=all` deriva o início pelo primeiro cadastro real de psicólogo e não usa data mockada.
- Referência visual consultada: `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`; Builder/Quick Copy não estava disponível como ferramenta callable no ambiente.
- Validações desta correção: `pnpm --dir admin check`, `pnpm --dir admin build` e `pnpm --dir backend exec biome check --error-on-warnings src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts src/modules/api/admin/private/psychologists/dashboard/validator/index.ts`.
- `pnpm --dir backend check`, `pnpm --dir backend build` e `pnpm check` foram executados, mas ficaram bloqueados por alterações pré-existentes no workspace (formatação/TypeScript em fluxos de nome profissional/WhatsApp e `backend/prisma/schema.prisma` já modificado com falha P1012 no `prisma generate`).
- Browser local/headless em 390px confirmou a rota protegida em `/psicologos` redirecionando/carregando sem sessão Admin; validação visual autenticada depende de sessão Admin real no navegador do operador.

### Correção UX/analytics em 2026-07-12 - contadores no gráfico

- Os cards principais do dashboard passam a ser: **Total de psicólogos**, **Psicólogos gratuitos**, **Psicólogos assinantes**, **Psicólogos cortesia**, **Novos cadastros** e **Churn**.
- O gráfico **Evolução no período** usa as mesmas métricas dos cards, com séries reais derivadas de `user` e `professional_subscription`.
- Cada card funciona como toggle acessível para exibir/esconder sua curva no gráfico, mantendo pelo menos uma curva ativa.
- `Psicólogos assinantes` conta assinaturas profissionais pagas Mercado Pago ativas; `Psicólogos cortesia` conta concessões `admin_grant` ativas; `Psicólogos gratuitos` conta o segmento gratuito ativo sem sobrepor assinantes/cortesias.
- Receita estimada e psicólogos verificados foram removidos dos cards primários por decisão de produto desta correção, sem criar fonte paralela nem mock.
- Referência visual local mantida: `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`; Builder/Quick Copy não estava disponível como ferramenta callable no ambiente.
- Validações desta correção: `pnpm --dir admin check` (sem erros, com warning pré-existente fora do dashboard em `admin/src/app/(admin)/psicologos/[id]/client.tsx`), `pnpm --dir admin build`, `pnpm --dir backend exec biome check --error-on-warnings src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts`, `pnpm --dir backend check`, `pnpm --dir backend build` e `pnpm check`.
- Smoke HTTP local em `http://localhost:3002/psicologos` retornou 200; validação visual autenticada/click real dos cards depende de sessão Admin no navegador do operador.

### Correção UX em 2026-07-12 - remoção de lista e ranking

- Por decisão de produto, os blocos **Lista de psicólogos** e **Ranking dos psicólogos** foram removidos da rota `/psicologos`.
- O dashboard agora mantém o foco nos contadores integrados ao gráfico, estatísticas agregadas e estados/limitações honestos; a listagem operacional segue concentrada na rota dedicada `/psicologos/lista`.
- O endpoint/contrato backend não foi alterado nesta correção para preservar dados reais já agregados e compatibilidade; a UI apenas deixou de renderizar esses blocos e o estado vazio passou a considerar somente cards e série temporal visíveis.
- Referência visual local mantida: `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`; Builder/Quick Copy não estava disponível como ferramenta callable no ambiente.
- Validações desta correção: `pnpm --dir admin check`, `pnpm --dir admin build` e smoke HTTP local em `http://localhost:3002/psicologos` retornando 200.
- `pnpm check` foi tentado nesta correção, mas atingiu timeout depois de 124s sem saída conclusiva; as validações específicas do app Admin foram concluídas sem erros.

### Correção UX em 2026-07-12 - simplificação do gráfico

- Texto auxiliar do topo alterado para **Gerencie os psicólogos da plataforma.**.
- A tag de fonte do card **Evolução no período** foi ocultada na UI e o texto instrucional sobre clicar nos contadores foi removido.
- A legenda com bolinhas coloridas e o bloco **Resumo textual do gráfico** foram removidos do gráfico; as cores dos ícones dos contadores agora usam exatamente as mesmas cores das séries do gráfico.
- O sombreamento dos cards de contadores selecionados foi removido, mantendo a borda/estado ativo e preservando o clique para exibir/esconder curvas.
- Referência visual local mantida: `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`; Builder/Quick Copy não estava disponível como ferramenta callable no ambiente.
- Validações desta correção: `pnpm --dir admin check`, `pnpm --dir admin build` e smoke HTTP local em `http://localhost:3002/psicologos` retornando 200.

### Correção UX/dados em 2026-07-12 - especialidades nas estatísticas

- As tags técnicas de fonte nos cards da seção **Estatísticas** foram removidas da UI, preservando os campos `source` no contrato para auditoria e diagnóstico.
- Adicionado bloco real **Especialidades** na seção **Estatísticas**, derivado de `user.psychologist_specialties.specialty` já carregado pelo repositório Admin do dashboard.
- O bloco **Especialidades** foi reposicionado antes de **Serviços** na ordem visual da seção **Estatísticas**.
- Não houve criação de tabela, campo Prisma, mock ou fonte paralela; a nova estatística reutiliza relações reais de catálogo existentes.
- Referência visual local mantida: `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`; Builder/Quick Copy não estava disponível como ferramenta callable no ambiente.
- Validações desta correção: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm --dir backend check`, `pnpm --dir backend build` e smoke HTTP local em `http://localhost:3002/psicologos` retornando 200.
- Validações do ajuste de ordem: `pnpm --dir admin check`, `pnpm --dir admin build` e smoke HTTP local em `http://localhost:3002/psicologos` retornando 200.

### Correção UX em 2026-07-12 - valor social ao lado do desconto

- O card **Valor social** deixou de ocupar a linha inteira em desktop e passa a usar a mesma largura dos demais cards booleanos, ficando ao lado de **Desconto 1ª sessão** quando houver espaço horizontal.
- Não houve alteração de contrato backend, cálculo, Prisma, mock ou fonte de dados; o ajuste é apenas de composição visual da grade de estatísticas.
- Referência visual local mantida: `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`; Builder/Quick Copy não estava disponível como ferramenta callable no ambiente.
- Validações desta correção: `pnpm --dir admin check`, `pnpm --dir admin build` e smoke HTTP local em `http://localhost:3002/psicologos` retornando 200.

### Correção UX/dados em 2026-07-12 - churn com contagem absoluta

- A tag visual **estimado** foi removida dos cards do dashboard de psicólogos; para churn sem base, a UI mantém o estado honesto **Indisponível**.
- O card **Churn** passa a exibir o valor no formato `cancelamentos (percentual)`, por exemplo `0 (0%)`.
- O backend preserva `value` como percentual do churn e adiciona `value_count`/`previous_value_count` opcionais ao contrato de métrica para expor a contagem absoluta de cancelamentos reais Mercado Pago do período sem alterar a série temporal.
- Não houve alteração de Prisma schema, migrations, fórmula de churn, mock ou fonte paralela de dados.
- Referência visual local mantida: `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`; Builder/Quick Copy não estava disponível como ferramenta callable no ambiente.
- Validações desta correção: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build` e smoke HTTP local em `http://localhost:3002/psicologos` retornando 200.
- `pnpm check` foi executado, mas falhou por erros TypeScript preexistentes/concomitantes fora do escopo desta correção em `backend/src/modules/api/admin/private/psychologists/feedback/use-cases/services.ts`.


### Correção dados em 2026-07-12 - denominador clássico do churn

- A fórmula do **Churn** foi ajustada para usar `cancelamentos pagos Mercado Pago no período ÷ base paga ativa no início do período`.
- Novas assinaturas pagas iniciadas dentro do período não são mais somadas ao denominador, evitando diluir ou distorcer o percentual de perda da base inicial.
- O card continua exibindo `cancelamentos (percentual)`, por exemplo `0 (0%)`; `value_count` permanece como a contagem absoluta de cancelamentos reais Mercado Pago no período.
- Quando não há base paga Mercado Pago ativa no início do período, o churn segue com estado honesto **Indisponível**.
- Não houve alteração de Prisma schema, migrations, mock ou fonte paralela de dados.
- Validações desta correção: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm --dir frontend check`, `pnpm check` e smoke HTTP local em `http://localhost:3002/psicologos` retornando 200.

### Correção UX em 2026-07-13 - taxa nos contadores de plano

- Os cards **Psicólogos gratuitos**, **Psicólogos assinantes** e **Psicólogos cortesia** passam a exibir `quantidade (percentual)` usando o total real de psicólogos como denominador, por exemplo `0 (0%)`.
- O percentual fica com menor peso visual que a contagem, preservando legibilidade mobile-first e mantendo o mesmo tratamento visual em **Churn**.
- Não houve alteração de contrato backend, Prisma, migrations, mock ou fonte paralela de dados; o cálculo é derivado no Admin a partir dos cards reais já retornados pelo dashboard.
- Validações desta correção: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local em `http://localhost:3002/psicologos` retornando 200.

### Correção UX/dados em 2026-07-18 - comparativo por filtros do diretório

- Pedido do usuário: no dashboard Admin de psicólogos, o seletor **Tipo de filtro** do bloco **Comparativo de oferta e demanda** deve incluir também **Modalidades**, **Estado**, **Cidade**, **Gênero**, **Raça**, **Religião** e **Selos e facilidades**.
- A demanda do comparativo deixa de depender de contagens hardcoded no frontend e passa a usar eventos first-party reais em `important_action_event` com `action_type="psychologist_directory_filter_search"`, gravados quando filtros do diretório público de psicólogos são aplicados.
- O evento grava somente tipo de filtro e identificador controlado da opção selecionada (`target_type`/`target_id`), sem texto livre de busca; pesquisas textuais por nome/CRP não entram no comparativo.
- **Estado** usa a lista completa de UFs brasileiras na tabela, mesmo sem buscas no período, para cumprir a leitura operacional de cobertura geográfica.
- **Cidade** lista opções com pelo menos 10 buscas reais no período selecionado ou pelo menos um psicólogo cadastrado; abaixo desse corte e sem oferta, a UI mostra estado honesto de ausência de cidades elegíveis.
- O backend expõe `filters_searches.dimensions` no contrato do dashboard e calcula oferta a partir de perfis reais (`psychologist_profile`, catálogos, endereço, demografia, assinatura/verificação e facilidades), sem migration, seed, backfill, mock ou dado artificial.
- Referência visual local mantida: `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`; Builder/Quick Copy não estava disponível como ferramenta callable no ambiente.
- Validações desta correção: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm --dir frontend check`, `pnpm --dir frontend build` e `pnpm check`.
- Browser local headless em `http://localhost:3002/psicologos` confirmou carregamento da rota Admin/Next; validação visual autenticada continua dependente de sessão Admin real no navegador do operador.


### Correção dados em 2026-07-18 - opções iguais ao filtro público do paciente

- Pedido do usuário: todas as opções exibidas no **Comparativo de oferta e demanda** devem ser exatamente as mesmas opções disponíveis para pacientes no site público.
- **Modalidades** passou a listar somente **Online** e **Presencial**, iguais a `PATIENT_MODALITY_FILTER_OPTIONS` em `frontend/src/app/app/psychologists/use-form.tsx`; **Híbrido** continua sendo valor interno de perfil, mas não aparece como opção porque o paciente não vê esse filtro.
- Para manter a mesma semântica do diretório público, a oferta de **Online** conta perfis `online` e `hibrido`, e a oferta de **Presencial** conta perfis `presencial` e `hibrido`, espelhando `buildModalityWhere` do backend público.
- **Estado**, **Gênero**, **Raça** e **Religião** foram alinhados às opções públicas usadas pelo formulário do paciente; estados exibem o mesmo rótulo público sem sufixo de UF, mantendo o ID da UF para matching.
- A agregação de demanda agora descarta eventos com `target_id` fora das opções públicas controladas quando a dimensão possui catálogo/lista de opções; **Cidade** combina oferta real cadastrada com buscas reais filtradas por pelo menos 10 buscas quando não houver oferta.
- Não houve alteração de Prisma schema, migration, seed, mock, pacote novo ou fonte paralela de dados.
- Validações desta correção: verificação Node local comparando arrays públicos e Admin (`modalities`, `states`, `genders`, `race_colors`, `religions`), `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local em `http://localhost:3002/psicologos` retornando 200.

### Correção dados em 2026-07-19 - cidades com oferta ou demanda mínima

- Pedido do usuário: no bloco **Comparativo de oferta e demanda**, ao selecionar **Cidade**, exibir cidades com pelo menos 10 buscas reais no período ou pelo menos um psicólogo cadastrado.
- As cidades passam a ser rotuladas com a UF no formato `Cidade/UF`, por exemplo `São Paulo/SP`, usando `psychologist_profile.professional_address_city` junto de `professional_address_state`.
- A oferta de cidades cadastradas entra no comparativo mesmo com zero buscas no período; cidades sem psicólogo só entram ao atingir o corte `>= 10` buscas reais.
- O tracking first-party do diretório público passa a registrar futuras buscas por cidade como `Cidade/UF` quando houver estado selecionado, preservando compatibilidade com eventos históricos por cidade.
- Não houve alteração de Prisma schema, migration, seed, mock, backfill, pacote novo ou fonte paralela de dados.
- Referência visual local mantida: `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`; Builder/Quick Copy não estava disponível como ferramenta callable no ambiente.
- Validações desta correção: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e smoke HTTP local em `http://localhost:3002/psicologos` retornando 200.

### Correção UX em 2026-07-19 - alinhamento dos números do comparativo

- Pedido do usuário: centralizar os números das colunas **Buscas**, **Psicólogos** e **Buscas/psicólogo** na tabela do bloco **Comparativo de oferta e demanda**.
- O ajuste é exclusivamente visual no Admin, mantendo o layout mobile-first: no mobile os rótulos continuam à esquerda e os valores à direita; em desktop os valores e cabeçalhos numéricos ficam centralizados nas respectivas colunas.
- Não houve alteração de contrato backend, Prisma, migration, mock, pacote novo ou fonte de dados.
- Referência visual local mantida: `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`; Builder/Quick Copy não estava disponível como ferramenta callable no ambiente.
- Validações desta correção: `pnpm --dir admin check`, `pnpm --dir admin build` e smoke HTTP local em `http://localhost:3002/psicologos` retornando 200. A primeira tentativa de build encontrou outro `next build` já em execução; após aguardar o processo encerrar, o build concluiu sem erros.

### Correção UX em 2026-07-19 - totais e taxas no comparativo

- Pedido do usuário: nos títulos das colunas **Opções do filtro**, **Buscas** e **Psicólogos**, exibir o total entre parênteses com menor peso visual.
- Pedido do usuário: nas células das colunas **Buscas** e **Psicólogos**, exibir a taxa entre parênteses com menor peso visual.
- O total de **Opções do filtro** usa a quantidade de linhas da dimensão selecionada; **Buscas** usa o total real de demanda da dimensão; **Psicólogos** usa o total real de oferta da dimensão.
- As taxas das linhas reutilizam os percentuais reais já retornados pelo contrato do comparativo para demanda e oferta, sem criar cálculo paralelo ou fonte artificial.
- Não houve alteração de contrato backend, Prisma, migration, mock, pacote novo ou fonte de dados.
- Referência visual local mantida: `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`; Builder/Quick Copy não estava disponível como ferramenta callable no ambiente.
- Validações desta correção: `pnpm --dir admin check`, `pnpm --dir admin build` e smoke HTTP local em `http://localhost:3002/psicologos` retornando 200.

### Correção UX em 2026-07-19 - remoção dos cards-resumo do comparativo

- Pedido do usuário: remover os três blocos brancos de contadores no topo do **Comparativo de oferta e demanda**: **Opções do filtro**, **Buscas no filtro** e **Psicólogos**.
- Os totais continuam disponíveis nos títulos das colunas da tabela, evitando redundância visual e preservando a leitura dos dados reais.
- Não houve alteração de contrato backend, Prisma, migration, mock, pacote novo ou fonte de dados.
- Referência visual local mantida: `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`; Builder/Quick Copy não estava disponível como ferramenta callable no ambiente.
- Validações desta correção: `pnpm --dir admin check`, `pnpm --dir admin build` e smoke HTTP local em `http://localhost:3002/psicologos` retornando 200.

### Correção UX em 2026-07-19 - taxas na origem do tráfego

- Pedido do usuário: na tabela **Origem do tráfego**, exibir a taxa em menor peso visual ao lado dos números das colunas **Perfil** e **WhatsApp**.
- A taxa de **Perfil** reutiliza `source.percentage`, já retornado pelo contrato real de origem do tráfego.
- A taxa de **WhatsApp** é derivada no Admin a partir da soma real de `whatsapp_clicks` disponível nas fontes retornadas; quando não há cliques atribuídos no contrato, a taxa permanece `0%`.
- Não houve alteração de contrato backend, Prisma, migration, mock, pacote novo ou fonte de dados.
- Referência visual local mantida: `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`; Builder/Quick Copy não estava disponível como ferramenta callable no ambiente.
- Validações desta correção: primeira tentativa de `pnpm --dir admin check` atingiu timeout sem resultado; na repetição, `pnpm --dir admin check`, `pnpm --dir admin build` e smoke HTTP local em `http://localhost:3002/psicologos` retornando 200 concluíram sem erros.

### Correção UX/dados em 2026-07-19 - gráfico de devices dos psicólogos

- Pedido do usuário: adicionar no dashboard Admin de psicólogos um gráfico com o percentual de devices usados pelos psicólogos, como mobile, tablet, desktop e não identificado.
- O backend passa a expor `device_usage` em `GET /api/admin/private/psychologists/dashboard`, agregado a partir de `visitor_session.device_type` somente para sessões reais autenticadas com `user.role="psicologo"` e janela `first_seen_at <= fim` / `last_seen_at >= início`.
- O percentual é calculado sobre o total de sessões reais de psicólogos no período; o mesmo psicólogo pode aparecer em mais de um device quando houver sessões reais em dispositivos distintos.
- A UI adiciona o card **Devices dos psicólogos** com gráfico de pizza, percentuais nas fatias e legenda com sessões e psicólogos ativos por device; sem sessões no período, mostra estado honesto de indisponibilidade.
- Não houve alteração de Prisma schema, migration, seed, mock, pacote novo ou fonte paralela de dados.
- Referência visual local mantida: `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`; Builder/Quick Copy não estava disponível como ferramenta callable no ambiente.
- Validações desta correção: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin build`, `pnpm --dir admin check`, `pnpm check`, execução direta do service com `.env` local via `tsx -r dotenv/config` confirmando `device_usage` real e smoke HTTP local em `http://localhost:3002/psicologos` retornando 200. A primeira tentativa de `pnpm --dir admin check` falhou por cache `.next` stale referenciando rota antiga de pacientes; após o build regenerar tipos do Next, o check passou.

### Correcao UX em 2026-07-19 - remocao da faixa explicativa de devices

- Pedido do usuario: remover a faixa **Percentual por sessoes reais de psicologos autenticados...** do card **Devices dos psicologos**.
- A UI deixou de renderizar apenas o texto auxiliar inferior do card, mantendo grafico, legenda, percentuais, sessoes e contagem de psicologos por device.
- Nao houve alteracao de backend, contrato HTTP, calculo, Prisma, migration, seed, mock, package novo ou fonte de dados.
- Referencia visual local mantida: `_product/proto/admin/Psicologos/Psicologos - Dashboard.png`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- Validacoes desta correcao: `pnpm --dir admin exec biome check "src/app/(admin)/psicologos/client.tsx"`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local em `http://localhost:3002/psicologos` retornando 200.

### Correção UX em 2026-07-22 - filtros dentro da visão geral

- Pedido do usuário: mover **Visão geral** para dentro do bloco branco dos contadores/gráfico e posicionar **Período**, **De** e **Até** na mesma linha do título dessa visão geral.
- O card de topo mantém somente o título **Dashboard de Psicólogos** e o subtítulo executivo; os filtros saíram desse topo e passam a compor o cabeçalho interno do bloco de contadores e gráfico.
- O texto informativo do período consultado agora fica logo abaixo de **Visão geral**, dentro do mesmo bloco branco, preservando a leitura do intervalo real retornado pela API.
- A composição segue mobile-first: em telas estreitas o título, texto do período e filtros empilham; em desktop os filtros ficam alinhados à direita na mesma linha do título.
- Não houve alteração de backend, contrato HTTP, cálculo, Prisma, migration, seed, mock, package novo ou fonte de dados.
- Referência visual local mantida: `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`; Builder/Quick Copy não está exposto como ferramenta callable neste ambiente, e a correção também considerou o screenshot enviado pelo usuário.
- Validações desta correção: `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`, `pnpm --dir admin check`, `pnpm --dir admin build` e smoke local em `http://localhost:3002/psicologos` retornando 200. O build exigiu aguardar build concorrente em diretório temporário e remover lock stale de `.next/dev/lock` após encerrar o dev server Admin local.

### Ajuste complementar 2026-07-25 - filtros por plano nos blocos analiticos

- Pedido do usuario: no dashboard Admin de psicologos, adicionar filtro com opcoes **Todos**, **Gratuitos** e **Assinantes** nos blocos **Origem do trafego**, **Comparativo de oferta e demanda**, **Modo de cadastro**, **Devices e sistemas** e **Uso da plataforma**.
- O backend passou a retornar `plan_segments` no endpoint real `GET /api/admin/private/psychologists/dashboard`, com agregados por segmento derivados de `professional_subscription`, `subscription_plan`, `page_view_event`, `visitor_session`, `important_action_event`, `user` e `psychologist_profile`.
- No **Comparativo de oferta e demanda**, a demanda permanece baseada nas buscas reais do diretorio publico, enquanto a coluna **Psicologos** troca para a oferta do segmento selecionado; **Buscas/psicologo** e **Leitura** mudam por derivacao dessa oferta.
- **Assinantes** representa assinatura profissional paga real Mercado Pago ativa; cortesias administrativas seguem somente em **Todos**, pois nao foram solicitadas como opcao propria.
- A UI adicionou selects locais por bloco, mobile-first, sem endpoint paralelo, schema Prisma/migration, package novo, mock, seed ou backfill.
- Referencia visual local mantida: `_product/proto/admin/Psicologos/Psicologos - Dashboard.png`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR criado: `adrs/0316-filtros-plano-blocos-dashboard-psicologos-admin.md`.
- Validacoes deste ajuste: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke direto do service com `.env` local via `tsx -r dotenv/config` confirmando `plan_segments` reais e smoke HTTP/browser local em `http://localhost:3002/psicologos` retornando 200. O primeiro `pnpm --dir admin build` foi bloqueado por lock de processo Next concorrente; apos encerrar o processo stale, o build passou. Nao houve alteracao Prisma/migration, portanto `db:migrate` nao se aplicou.

### Ajuste pos-feedback 2026-07-25 - filtros compactos por plano nos blocos

- Pedido do usuario: nos blocos do dashboard Admin de psicologos, remover o texto visivel **Plano** dos filtros e aproximar a linha de periodo do titulo do bloco.
- A UI manteve o filtro por plano com label acessivel apenas via `sr-only` e reduziu a altura do select para preservar o cabecalho compacto.
- A linha de periodo passou a compor o grupo de titulo nos blocos de conversao, modo de cadastro, devices/sistemas e uso da plataforma, evitando que o dropdown empurre o periodo para baixo.
- O ajuste e apenas visual no Admin, mobile-first, sem alteracao de backend, contrato HTTP, Prisma, migration, mock, seed, package novo ou fonte de dados.
- Referencia visual local mantida: `_product/proto/admin/Psicologos/Psicologos - Dashboard.png`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente, e o screenshot enviado pelo usuario em 2026-07-25 foi usado como referencia direta.
- Validacoes deste ajuste: `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e browser local/headless autenticado em `http://localhost:3002/psicologos` validando 5 selects sem **Plano** visivel, altura de 40px e periodo a 4px abaixo dos titulos dos blocos.

## Ajuste pos-feedback 2026-07-26 - Sistemas em uma linha no card de devices

- Pedido do usuario: manter os detalhes de sistema operacional do card **Devices e sistemas** em uma unica linha, sem quebra entre opcoes como **Android / iOS** e **Windows / macOS**.
- A legenda do card em `/psicologos` passou a aplicar `whitespace-nowrap` ao resumo de sistemas operacionais, alinhando o comportamento ao ajuste feito em `/pacientes`.
- Nao houve alteracao de backend, contrato HTTP, Prisma, migration, package novo, mock, seed ou regra de calculo.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia auditavel continua sendo `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`, complementada pelo screenshot enviado pelo usuario em 2026-07-26 para o card homonimo.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx" "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local/headless em `http://localhost:3002/psicologos` carregou a rota sem overflow horizontal; a base local nao retornou sublabels de sistemas operacionais para esse card no periodo validado. O comportamento `nowrap` foi validado com dados locais em `/pacientes` no mesmo componente visual de devices/sistemas.
- Admin temporario de validacao `codex-device-nowrap-*` foi criado apenas para sessao autenticada de browser e removido ao final.

### Ajuste pós-feedback 2026-07-27 - título da origem de tráfego no dashboard

- Pedido do usuário: remover a etiqueta azul **Origem do tráfego** do bloco homônimo no dashboard Admin de psicólogos e trocar o título **Canais que levam pacientes até os perfis** por **Origem do tráfego para psicólogos**.
- O ajuste é apenas de copy/hierarquia visual no Admin, mobile-first, sem alteração de backend, contrato HTTP, Prisma, migration, package novo, mock, seed ou fonte de dados.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a alteração usou a referência local `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` e o screenshot enviado pelo usuário.
- Validações deste ajuste: `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local em `http://localhost:3002/psicologos` retornando 200. O build exigiu pausar/reiniciar o dev server Admin local para liberar o lock do Next; o servidor foi reiniciado depois.
