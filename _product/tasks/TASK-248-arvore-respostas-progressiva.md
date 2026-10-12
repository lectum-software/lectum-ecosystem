# TASK-248 - Arvore de respostas progressiva

## Escopo

Organizar a arvore de comentarios da Lectum com abertura progressiva por ramificacao,
preservando o recuo de cada nivel e a identidade visual existente. Reduzir a densidade
da identificacao nas respostas aninhadas e ampliar o respiro entre as acoes.

## Aceite

- [x] Cada ramificacao inicia recolhida e informa quantas respostas diretas possui.
- [x] A primeira abertura mostra ate tres respostas e as seguintes mostram lotes de ate cinco.
- [x] Enquanto houver respostas ocultas, aparece somente `Ver mais N respostas` no fim do ramo.
- [x] Quando todas estiverem visiveis, aparece somente `Ocultar respostas` no fim do ramo.
- [x] O recuo recursivo, os conectores e o foco por URL continuam funcionando.
- [x] Respostas aninhadas usam identificacao mais compacta e acoes com maior respiro.
- [x] O limite de profundidade continua levando para a pagina da conversa quando necessario.
- [x] Nenhum banco, migration, env, dependencia, mock ou contrato de API e criado.

## Impacto de deploy

Somente frontend. Os descendentes ja hidratados passam a ser revelados progressivamente
no cliente; o fallback de profundidade continua navegando para a conversa. Nao ha mudanca
de dados persistidos, API, ordem entre aplicativos, jobs ou providers. Rollback por
reversao do commit em `homolog`.

## Validacao

- Testes focais da progressao: 2/2 aprovados.
- Check completo do frontend: aprovado, incluindo 602/602 testes da suite principal e
  todas as suites complementares.
- Build do frontend: 90/90 rotas geradas. Executado com `LECTUM_LOW_DISK_MODE=1`
  porque o cache persistente excedeu o espaco local; compilacao, TypeScript e rotas passaram.
- Browser real com post e comentarios da API Lectum, via proxy temporario estritamente
  somente leitura: mobile 393x852 e desktop 1280x900 sem overflow ou sobreposicao.
  Confirmados ramo fechado, abertura independente em dois niveis e controle de ocultar
  sozinho abaixo do ultimo filho. Proxy, Chrome e arquivos temporarios removidos ao final.
