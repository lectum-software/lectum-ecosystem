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
- Complemento operacional em 2026-07-12: trocar os cards de resultado por uma tabela de uma linha por psicólogo com colunas **Ranking**, **Psicólogo**, **Plano**, **Perfil**, **Registro**, **Avaliações**, **Favoritado**, **WhatsApp** e ações. A linha inteira navega para o detalhe administrativo; os ícones de detalhe e perfil público mantêm seus destinos explícitos. Em telas estreitas, a tabela usa rolagem horizontal interna para não quebrar a linha nem gerar overflow da viewport. O rótulo **Cortesia** usa o sinal real `registry_verification.source="admin_grant"` já retornado pelo contrato, sem criar campo novo.
- Complemento visual em 2026-07-12: a tabela Admin passa a reutilizar os SVGs estabelecidos da Lectum para selo de verificado e WhatsApp, em vez dos equivalentes genericos do `lucide-react`. O CRP exibido abaixo do nome e normalizado apenas para apresentacao no formato compacto `CRP 00/000000`, reaproveitando a mesma regra visual do app principal: remover prefixo `CRP`, extrair os digitos da regional antes da `/` e do numero de registro depois da `/`, com preenchimento de regional em 2 digitos e registro em 6 digitos. A mudanca nao altera o dado persistido nem o contrato da API.
- Complemento de filtros em 2026-07-12: a modal/drawer de filtros da lista Admin foi alinhada ao filtro da descoberta publica de psicologos para pacientes, com a mesma ordem de campos, copy principal, selos/facilidades e botao unico **Aplicar filtros**. Para evitar uma interface divergente, a UI remove os filtros administrativos antigos **Status e plano**, **Experiencia** e **Selos e diferenciais**, e limpa os parametros legados `status`, `plan` e `experience` da URL ao aplicar ou limpar filtros. O backend Admin passou a aceitar filtros reais `available_today`, `more_experienced`, `verified`, `specialty`, `race_color` e `religion`, alem de expor opcoes `specialties`, `race_colors` e `religions`, sem criar mocks, migrations ou packages.

- Complemento administrativo de filtros em 2026-07-12: apos validacao de uso no painel, a modal deixou de repetir a busca textual por nome/CRP e removeu **Somente verificados** para reduzir redundancia com a busca principal e com a coluna de registro. Foram adicionados filtros operacionais de **Plano** (`professional`/Assinante, `courtesy`/Cortesia, `free`/Gratuito), **Perfil** (`profile_status=active|inactive`) e **Registro profissional** (`registry_status=active|pending`). A decisao preserva a busca textual na area principal, limpa parametros legados `verified`, `status` e `experience` ao aplicar/limpar filtros, e usa apenas sinais reais ja existentes no contrato/lista.
- Complemento visual em 2026-07-12: **Perfil** e **Registro profissional** passam a ocupar linhas completas e separadas no drawer de filtros, em vez de dividir a mesma linha em desktop. A decisao melhora leitura operacional e preserva os mesmos parametros reais `profile_status` e `registry_status`, sem alterar backend ou contrato de API.

## Consequências

- A operação consegue pesquisar, filtrar e ordenar psicólogos com dados reais do banco sem criar mocks ou métricas divergentes.
- Alterações futuras no ranking público continuam refletindo no Admin quando passarem pelo helper compartilhado.
- A ausência de busca salva e criação manual reduz escopo da V1 e evita persistência local falsa.
- O detalhe do psicólogo ainda depende da TASK-55 para exibir dados administrativos completos.
- Em viewports intermediárias, a página prioriza cards sem rolagem horizontal em vez de espremer a tabela densa de oito colunas; a tabela completa permanece disponível quando há largura suficiente no shell sem reservar coluna lateral de filtros.
- A lista ganha mais largura útil em desktop porque deixa de reservar coluna fixa para filtros. O custo é um clique adicional para refinar a busca, aceito por alinhar o Admin ao padrão mental já usado pelo usuário final na descoberta.
- O cabeçalho fica menos técnico para a operação diária, reduz redundância visual e mantém os dados de implementação em task/ADR em vez de expô-los ao usuário Admin.
- A limpeza de filtros passa a exigir abrir a modal, mas a tela principal fica menos carregada e mantém foco em busca, ordenação e segmentação.
- A tabela fica mais densa e operacional, reduzindo a altura por profissional. O custo é rolagem horizontal interna em telas pequenas, aceita para preservar a exigência de uma linha por profissional e manter todas as colunas visíveis sem criar dados novos.
- A lista fica visualmente alinhada ao produto principal sem acoplar o app Admin ao `frontend/`; os SVGs e a regra de formatacao foram reproduzidos localmente no componente da lista por serem apresentacionais e nao justificarem novo contrato ou package. O custo e duplicar um pequeno helper visual ate existir uma biblioteca compartilhada aprovada entre aplicacoes separadas.
- A lista Admin passa a segmentar com o mesmo modelo mental da descoberta publica. O custo e deixar filtros administrativos de status/plano fora da UI principal, mantendo-os apenas como compatibilidade de contrato para deep links antigos e removendo-os quando o usuario aplica o novo filtro.

- O drawer deixa de ser uma copia literal da descoberta publica e passa a equilibrar criterios publicos com filtros administrativos pedidos para a operacao. O custo e manter semantica especifica no backend para `plan=professional|courtesy|free`, aceita por refletir os mesmos labels exibidos na tabela.
- O drawer fica mais alto, mas reduz ambiguidade entre status do perfil e status do registro profissional ao evitar dois selects administrativos lado a lado.

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
- Revalidação da tabela operacional em 2026-07-12: `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/lista/client.tsx"`, `pnpm --dir admin exec eslint "src/app/(admin)/psicologos/lista/client.tsx"`, `pnpm --dir admin check`, `pnpm --dir admin build` e browser local/headless em desktop e mobile base `390px`, validando cabeçalhos/colunas, uma linha por psicólogo, clique na linha para detalhe, ações de detalhe/perfil público e ausência de overflow horizontal de viewport.
- Revalidacao de icones e CRP em 2026-07-12: `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/lista/client.tsx"`, `pnpm --dir admin exec eslint "src/app/(admin)/psicologos/lista/client.tsx"`, `pnpm --dir admin check`, `pnpm --dir admin build` e browser local/headless/CDP com admin temporario real removido ao final. Desktop `1440x1000` validou 7 linhas reais, `CRP 04/123456` presente, `4ª Região - MG/123456` ausente, 6 selos Lectum de verificado e 7 icones Lectum de WhatsApp. Mobile base `390x844` validou rota autenticada, tabela com linhas reais e `document.documentElement.scrollWidth=390`.

- Revalidacao de filtros publicos em 2026-07-12: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke API autenticado em `GET /api/admin/private/psychologists?available_today=true&verified=true&specialty=teste&race_color=teste&religion=teste&more_experienced=true` retornando `200`, `active_filters_count=6` e filtros `specialties`, `race_colors`, `religions`; browser local/headless/CDP com admin temporario real validou desktop `1440x1000` (modal `560px`, labels publicos presentes, textos antigos ausentes) e mobile `390x844` (modal `390px`, sem overflow horizontal).

- Revalidacao de filtros administrativos em 2026-07-12: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke API autenticado em `GET /api/admin/private/psychologists?plan=professional&profile_status=active&registry_status=pending` retornando `200` e `active_filters_count=3`; browser local/headless/CDP com admin temporario real validou desktop `1440x1000` e mobile `390x844` com novos campos/opcoes, sem **Pesquisa**, **Buscar por nome ou CRP** e **Somente verificados**, e sem overflow horizontal.
- Revalidacao visual de layout em 2026-07-12: `pnpm --dir admin exec biome format --write "src/app/(admin)/psicologos/lista/client.tsx"`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e browser local/headless/CDP com admin temporario real removido ao final. Desktop `1440x1000` e mobile `390x844` validaram **Perfil** e **Registro profissional** em linhas separadas, ambos com a mesma largura/coluna de **Plano** e sem overflow horizontal de viewport.

## Pendências

- Implementar o detalhe administrativo completo do psicólogo na TASK-55.
- Persistência real de buscas salvas poderá ser discutida em task futura se voltar ao escopo do produto.
