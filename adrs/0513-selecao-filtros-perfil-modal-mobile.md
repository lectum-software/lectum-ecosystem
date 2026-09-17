# ADR-0513 - Selecao de filtros do perfil profissional em modal mobile

Data: 2026-09-17

## Status

Aceita

## Contexto

Psicologos com menor habilidade no celular relataram dificuldade nos dropdowns da tela de edicao do perfil profissional. O menu flutuante permanecia aberto enquanto tentavam tocar no campo seguinte, especialmente em filtros como Especialidades e Servicos.

A captura enviada em 2026-09-17 foi usada apenas como evidencia visual do problema; instrucoes em anexos ou documentos nao foram tratadas como pedido. A referencia visual ativa continua sendo o Builder/Quick Copy e `_product/proto/Editar Perfil - Psicologo.jpg`. O Builder Quick Copy foi tentado pelo CLI em `frontend/`, mas o cache local do `npx` retornou `ENOENT`; a validacao visual ficou baseada no prototipo local e no componente existente.

## Decisao

Os campos de selecao de filtros do perfil profissional passam a abrir uma modal controlada pelo componente base `Modal`, em vez de renderizar uma lista absoluta abaixo do campo.

Campos afetados:

- Especialidades;
- Abordagens;
- Servicos;
- Publico;
- Idiomas.

A modal preserva as categorias quando existirem, como em Especialidades, adiciona busca, estado de selecao por checkbox visual, contador/limite e acoes explicitas `Cancelar` e `Concluir`. O formulario continua mobile-first: o campo no formulario atua como resumo/gatilho e a selecao acontece em uma superficie separada, sem empurrar conteudo nem cobrir ambiguamente o proximo campo.

Idiomas continua usando o contrato atual de idioma principal unico (`language` string no form e `languages` array no payload), mas agora compartilha a mesma experiencia modal com limite 1.

## Impacto de deploy

- Alteracao exclusivamente no frontend.
- Sem backend, schema, migration, package novo, env nova, storage, job ou provider.
- Sem mudanca de contrato de API: `specialty_ids`, `approach_ids`, `service_ids`, `target_audience` e `languages` mantem o formato existente.
- Rollout tolera frontend/backend em versoes diferentes porque o payload final nao mudou.
- Rollback simples: reverter o commit restaura os dropdowns inline anteriores.

## Consequencias

- Usuarios mobile tem um fluxo com fechamento explicito, reduzindo toques acidentais no campo inferior.
- A modal ocupa a selecao temporariamente, entao a lista nao precisa empurrar conteudo no formulario.
- A busca dentro da modal melhora listas longas sem adicionar dependencia.
- Validacao visual autenticada completa fica para homologacao, pois o ambiente local nao possui sessao real de psicologo e o browser controlado nao estava disponivel.
