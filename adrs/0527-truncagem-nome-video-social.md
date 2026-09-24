# ADR-0527 - Truncagem defensiva do nome no video social

## Status

Aceita em 2026-09-24.

## Contexto

O preview/download de compartilhamento social de video-resposta renderiza nome, cargo e selo de verificacao direto no servico de video. Prints de 2026-09-23 mostraram que um nome profissional longo ainda atravessava a area reservada e encostava/sobrepunha o selo azul.

A TASK-42 ja definia que a tag social deveria limitar o nome a 18 caracteres e adicionar `...` antes do selo. Havia uma utilidade equivalente no frontend, mas o artefato final e gerado pelo `video/`; portanto, depender apenas do cliente nao protege jobs criados por backend, admin ou chamadas antigas.

## Decisao

Centralizar a regra no sanitizador do overlay social do `video/`:

- nomes vazios continuam usando o fallback `Profissional Lectum`;
- nomes informados sao normalizados, limitados a 18 caracteres visiveis e recebem `...` quando excedem o limite;
- o posicionamento do selo continua calculado a partir do texto ja sanitizado, preservando margem visual;
- nenhum contrato HTTP, schema, env ou pacote novo foi alterado.

## Consequencias

- O video social fica resiliente mesmo quando o backend envia nome completo ou clientes antigos iniciam renderizacao.
- O titulo/arquivo de compartilhamento nao precisa ser reduzido; a reducao vale apenas para a arte visual.
- Alterar futuramente o limite visual deve ser feito no `video/` e refletido nos testes de filtergraph.
