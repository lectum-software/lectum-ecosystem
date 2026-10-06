# TASK-216 - Rotulo profissional com peso de metadados

Data: 2026-10-05.

## Escopo

Usar Resposta profissional em sentence case, com tamanho, peso e cor dos
metadados de cada variante do card. Preservar margens, line-height e favoritos.
Referencia: capturas e aprovacao do usuario. PROTO-INVENTORY e arquitetura
consultados; Builder/Quick Copy indisponivel neste cliente. Mobile-first.

## Criterios de aceite

- [x] Dois rotulos sem caixa alta, usando text-muted e fonte de 11px.
- [x] Peso igual ao metadado local: semibold no feed e medium no card compartilhado.
- [x] Espacamento mb-3 e line-height existentes preservados, sem efeitos.
- [x] Favoritar, selo e logica de interacoes inalterados.
- [x] 33 testes direcionados aprovados, incluindo protecao dos estilos e texto.
- [x] Check completo, build e guards aprovados.
- [x] Smoke local mobile: pagina renderiza; API local indisponivel, sem mocks.

## Validacao

Check completo frontend aprovado (um skip Windows preexistente), build aprovado
apos liberar cache, guards de versao, ADRs, tasks, encoding e source-safety OK.
Smoke local em http://localhost:3025/ a 390x844: shell renderiza, feed mostra
indisponibilidade da API local. Conferencia com dados reais mobile/desktop apos
deploy sera registrada em outputs/professional-label-0588-smoke.md.

## Deploy

Somente apresentacao frontend, sem API, env, dependencia ou migration nova.
Publicar em homolog 0.1.588; nao promover producao. ADR-0556.
Evidencias externas ao artefato: outputs/professional-label-0588-*.
