# ADR-0505: Upload da galeria com leitura limitada por parte

## Status
Accepted

## Task relacionada
TASK-184

## Contexto

O mesmo vídeo de 250.743.537 bytes concluiu no desktop e falhou na resposta em Chrome Android
(galeria), após cinco retries sem resposta HTTP acessível. O erro genérico de rede escondia a
etapa. O SDK instalado entrega File.slice diretamente ao XHR, mantendo dependência do arquivo
externo no corpo da requisição. Isso é compatível com uma classe de falhas relatada em
https://github.com/tus/tus-js-client/issues/255, mas não comprova a causa histórica deste aparelho.

## Decisão

- Usar fileReader documentado do tus-js-client 4.3.1 já instalado, não criar cliente TUS paralelo.
- File.slice → ArrayBuffer → Blob de memória por parte <=5 MiB; preservar exatamente os bytes.
- Cache de uma parte por intervalo, sem reter vídeo inteiro. Pico de memória pode incluir cópias
  do ArrayBuffer/Blob/XHR; é limitado por parte, não uma promessa de apenas 5 MiB de heap.
- close idempotente descarta cache e rejeita leitura pendente; resultado tardio de arrayBuffer
  não é enviado. Verificar cancelamento também antes de enviar a requisição.
- Não fazer retry de leitura definitivamente recusada. Retentativas de transporte continuam
  limitadas por sequência sem progresso conforme SDK; não são um orçamento global de upload.
- Eventos opcionais com enums fechados distinguem HEAD/PATCH/POST e leitura local. Nunca serializar
  DetailedError do SDK, causa, request, response ou mensagem do provider. Status zero permanece
  ausência de resposta acessível, não diagnóstico de internet.
- Não alterar seletores, preview, permissões, limites ou qualidade por uma hipótese não provada.

## Produção e rollout

Sem banco/migration/env/package novo. Backend primeiro preferível; aceita eventos antigos.
Frontend com backend anterior usa diagnóstico legado após 422; falha do diagnóstico é best-effort.
Sem alteração de inicialização, bucket, filas ou processamento do vídeo dedicado.
Push somente homolog; rollback de código preserva mídia e dados. Nada em main.

## Validação

`pnpm check` passou nas quatro apps, incluindo regressões de leitura/contrato;
os seis testes condicionais de integração do serviço de vídeo continuam skipped.
Builds das quatro apps aprovados. O reader executado em Node e browser local
leu o arquivo original em 48 partes (maior 5.242.880 bytes, última 4.328.177), com
SHA-256 idêntico. Testes usam Blob e arquivo de disco real, incluindo alteração da
origem após cache, cancelamento pendente e retomada não alinhada; sem endpoint simulado.
Revisão independente somente leitura não identificou novo bug concreto após os ajustes.
Upload Stream pós-deploy e Chrome Android físico ainda precisam ser validados.

## Pendências

Validação no Android físico pela galeria necessária. Materialização elimina referência ao provider
no corpo do XHR, mas não recupera acesso a um arquivo que o próprio sistema já recusa ler, nem
corrige falha de HEAD/rede/CORS. Não alegar que a causa foi reproduzida com setFiles no desktop.

## Referências

- https://github.com/tus/tus-js-client/blob/main/docs/api.md#filereader
- https://www.w3.org/TR/FileAPI/
- https://developers.cloudflare.com/stream/uploading-videos/resumable-uploads/
