# ADR-0714 - Entrada publica de Reels

## Decisao

A rota publica dedicada usa o mesmo ContentVideoHost e a mesma fila do produto. O sinal directLink impede que um escopo antigo no historico suprima sua abertura. Os hosts do feed/perfil continuam respeitando seus escopos, evitando viewers duplicados.

O HTML inicial preserva video e metadados para indexacao, mas nao oferece controles nativos concorrentes enquanto o componente interativo carrega. O compartilhamento gera o endereco publico do video sem parametros de foco do post. URLs anteriores continuam aceitas. Nenhum deploy autorizado nesta task.
