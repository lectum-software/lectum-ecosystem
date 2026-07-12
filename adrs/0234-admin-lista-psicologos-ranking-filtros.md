# ADR-0234 - Lista Admin de psicólogos usa ranking público e exposição operacional mínima

## Status

Accepted

## Task relacionada

TASK-54: Lista administrativa de psicólogos

## Contexto

A TASK-54 cria a listagem administrativa de psicólogos no app `admin/`, com referência visual local `_product/proto/admin/Psicólogos/Psicólogos- Lista.png`. A regra de produto definiu que **Adicionar novo psicólogo** e **Salvar busca** ficam fora da V1, enquanto a ordenação "Mais relevantes" deve refletir o mesmo ranqueamento público usado na descoberta/exploração de psicólogos.

Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` não estava disponível como ferramenta neste ambiente; a implementação foi feita a partir da imagem local registrada no inventário de protótipos.

## Decisão

- Criar o endpoint protegido `GET /api/admin/private/psychologists` no backend, sem aceitar `select/include` vindos do frontend.
- Reutilizar `rankPsychologistCandidates` para a ordenação `relevance`, evitando uma fórmula administrativa paralela ao ranking público.
- Expor apenas dados operacionais necessários para a lista: posição no ranking, avaliação agregada, favoritos, cliques no WhatsApp, localização, experiência derivada do registro CRP, plano/status e flags de busca.
- Não expor campos pessoais sensíveis na lista administrativa, como CPF, telefone, endereço completo ou e-mail do profissional.
- Manter filtros em URL/search params e sem persistência de busca salva nesta V1.
- Criar a rota protegida `/psicologos/lista` no app Admin, com visual mobile-first e filtros em drawer no mobile.
- Incluir uma rota mínima `/psicologos/[id]` sem dados simulados apenas para evitar navegação quebrada a partir da lista; o detalhe real fica para a TASK-55.
- Ajuste de regressão em 2026-07-11: manter a lista sem rolagem horizontal de viewport usando containers `min-w-0`/`minmax(0,1fr)`, tabela fluida apenas em larguras amplas (`min-width: 1700px`) e cards mobile-first nas demais larguras; remover o ícone inerte de menu por linha para preservar somente as ações reais da V1.
- Complemento em 2026-07-12: remover a coluna lateral fixa de filtros em desktop e centralizar todos os filtros no botão **Filtros ativos**, que abre uma modal/drawer responsiva inspirada na descoberta pública de psicólogos. A modal mantém estado local e só persiste filtros na URL ao clicar **Aplicar filtros**, preservando ranking, paginação, endpoint e contratos existentes.
- Complemento visual em 2026-07-12: reduzir ruído operacional da lista removendo a etiqueta **Ranking público aplicado**, a linha técnica de fonte e badges de escopo V1 do card de resultados. O ranking continua aplicado no backend pela ordenação `relevance`; a UI passa a agrupar busca, ordenação e filtros como controles de uma mesma área, com **Ordenar por** acima do seletor e **Filtros ativos** à direita em desktop.
- Complemento de copy em 2026-07-12: remover **Limpar filtros** da área principal para manter os controles enxutos e trocar o subtítulo para **Encontre profissionais por nome, CRP e filtros cadastrados.** A ação de reset segue disponível dentro da modal como **Limpar**, evitando perda funcional.

## Consequências

- A operação consegue pesquisar, filtrar e ordenar psicólogos com dados reais do banco sem criar mocks ou métricas divergentes.
- Alterações futuras no ranking público continuam refletindo no Admin quando passarem pelo helper compartilhado.
- A ausência de busca salva e criação manual reduz escopo da V1 e evita persistência local falsa.
- O detalhe do psicólogo ainda depende da TASK-55 para exibir dados administrativos completos.
- Em viewports intermediárias, a página prioriza cards sem rolagem horizontal em vez de espremer a tabela densa de oito colunas; a tabela completa permanece disponível quando há largura suficiente no shell sem reservar coluna lateral de filtros.
- A lista ganha mais largura útil em desktop porque deixa de reservar coluna fixa para filtros. O custo é um clique adicional para refinar a busca, aceito por alinhar o Admin ao padrão mental já usado pelo usuário final na descoberta.
- O cabeçalho fica menos técnico para a operação diária, reduz redundância visual e mantém os dados de implementação em task/ADR em vez de expô-los ao usuário Admin.
- A limpeza de filtros passa a exigir abrir a modal, mas a tela principal fica menos carregada e mantém foco em busca, ordenação e segmentação.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Chamada real de `GET /api/admin/private/psychologists?page=1&limit=2&sort=relevance` com admin existente retornando `status=200`, `count=6`, `items=2` e `firstRank=1`.
- Chamada sem autenticação para o mesmo endpoint retornando `401`.
- Browser local headless em `http://localhost:3002/psicologos/lista?sort=relevance&limit=8` com admin real, validando desktop com 6 linhas, ações de detalhe/perfil público, viewport mobile de 390px com 6 cards, ausência de **Adicionar novo psicólogo** e ausência de **Salvar busca**.
- Revalidação de regressão em 2026-07-11: Chrome headless local com sessão admin real em `http://localhost:3002/psicologos/lista?sort=relevance&limit=8`; desktop 1920px e mobile 390px retornaram `documentScrollWidth <= innerWidth`, sem overflow horizontal de viewport.
- Revalidação de UI em 2026-07-12: `pnpm --dir admin check`, `pnpm --dir admin build` e browser local headless/CDP com admin temporário real removido ao final em desktop `1440x1000` e mobile `390x844`; antes da abertura não havia **Filtros de busca** visível fora da modal, e após clicar **Filtros ativos** a modal exibiu Localização, Status/plano, Selos/diferenciais e Perfil profissional sem overflow horizontal.
- `pnpm check` foi executado em 2026-07-12 e bloqueou por formatação preexistente no `frontend/` fora do escopo deste complemento (`frontend/src/app/app/professional/profile/setup/use-form.tsx` e `frontend/src/app/auth/register/psychologist/use-form.tsx`).
- Revalidação visual complementar em 2026-07-12: `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/lista/client.tsx"`, `pnpm --dir admin exec eslint "src/app/(admin)/psicologos/lista/client.tsx"`, `pnpm --dir admin check`, `pnpm --dir admin build` e browser local/headless com admin temporário real removido ao final em desktop `1440x1000` e mobile `390x844`, validando ausência de textos removidos, busca limitada, label compacto de ordenação, filtro à direita do seletor em desktop e modal de filtros funcional.
- Revalidação de copy em 2026-07-12: `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/lista/client.tsx"`, `pnpm --dir admin exec eslint "src/app/(admin)/psicologos/lista/client.tsx"`, `pnpm --dir admin check`, `pnpm --dir admin build` e browser local/headless em desktop e mobile base `390px`, validando subtítulo simplificado, ausência de **Limpar filtros** na área principal e modal de filtros ainda funcional.

## Pendências

- Implementar o detalhe administrativo completo do psicólogo na TASK-55.
- Persistência real de buscas salvas poderá ser discutida em task futura se voltar ao escopo do produto.
