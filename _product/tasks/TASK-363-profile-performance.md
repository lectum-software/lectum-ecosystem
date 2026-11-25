# TASK-363 - Estabilidade e legibilidade do perfil

Escopo: perfil publico de psicologo, sem publicacao remota.

- [x] Limitar biografia desde a primeira renderizacao, sem aguardar medicao.
- [x] Otimizar capa/avatar HTTPS, preservando fallback HTTP local.
- [x] Corrigir contraste das acoes e disponibilidade sem alterar contato/reproducao.
- [x] Validar checks, build e perfil real no navegador local em 390 e 1440 px.

Validacao: frontend check e build aprovados; tres testes de regressao aprovados,
incluindo contraste >= 4,5:1 dos tokens nos dois temas. Guards de ADR, tasks,
source-safety e source-size aprovados. Smoke Chrome com API real somente leitura:
capa/avatar carregados pelo otimizador, biografia expande/recolhe, abas respondem
a ArrowRight/Home, sem overflow horizontal. Observer nao registrou layout shifts
sem interacao nessas duas execucoes locais, sem throttling. Nao e nota Lighthouse.

LCP e CLS do PageSpeed precisam de nova medicao apos publicacao autorizada.
Revisao solicitada: azul anterior restaurado em Favoritar e ver mais/menos;
contraste dessas acoes deixa de ser criterio de aceite, por preferencia visual
explicita. Demais ajustes preservados.
Nao atribuir todo o CLS ao video: o artigo identificado pode ser deslocado pelo texto acima.
