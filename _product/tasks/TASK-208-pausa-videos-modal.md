# TASK-208 - Pausa de videos ao abrir modal

Dependencia: TASK-207 (Completed). Status: Completed.

## Escopo

Pausar qualquer video de fundo quando a modal de criar post abrir sobre a
pagina atual, inclusive no diretorio imersivo de psicologos. Preservar volume,
tempo do video, rota e previews internos da modal. Sem mudanca visual.

Arquitetura, packages, inventario e guias locais de Next consultados.
Referencia mobile-first: composicao existente (~390px); sem novo prototipo.

## Criterios de aceite

- [x] Pausa imediata de videos de fundo, registrados ou nao no autoplay do feed.
- [x] Tentativas tardias de play nao reiniciam o fundo enquanto houver modal.
- [x] Preview da modal ativa permitido; modais aninhadas e cleanup seguros.
- [x] Sem alterar volume, preferencia de audio, posicao ou rota de origem.
- [x] Testes de regressao, frontend check/build e tentativa de smoke local.

## Validacao

33 testes focados aprovados, incluindo cinco testes de runtime da protecao.
Frontend check completo e build otimizado aprovados em 0.1.543. Guards de
versao, tasks, ADRs, encoding, segredos, source-safety, source-size, ciclos e
env aprovados. Sem alterar os limites/baselines existentes.

Smoke local em localhost:3004/psicologos: pagina inicia, mas a API remota
retorna erro de conexao. Sem simular conteudo ou sessao. Validacao real no
deploy de homologacao sera registrada em outputs/pausa-modal-videos-0543.md
antes de qualquer promocao para producao.

## Deploy

Somente frontend, sem API, banco, dependencia ou env nova. ADR-0552.
Homologacao primeiro; producao apenas sob solicitacao explicita.
Rollback: reverter a protecao de escopo em nova revisao.
