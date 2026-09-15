# ADR-0447: Captura de localização prioriza cidade quando proxy traz só país

Data: 2026-08-10
Status: Aceita

## Contexto

A localização exibida no Admin do paciente deriva da última linha em `visitor_location` e concatena
`city`, `state` e `country`. Em homologação, um paciente apareceu apenas como `BR` porque a captura
aceitou os headers de proxy como fonte suficiente quando havia somente país (`x-vercel-ip-country`,
`cf-ipcountry` ou equivalente), sem tentar consultar o provider por IP para obter cidade/estado.

Além disso, a janela anti-duplicidade de 24 horas bloqueava qualquer nova captura quando já existia
registro recente, mesmo que esse registro tivesse apenas país.

## Decisão

- A captura continua usando headers de proxy quando eles já trazem cidade.
- Quando os headers trouxerem apenas país, a API tenta enriquecer a localização pelo provider de IP
  configurado, preservando o país do proxy como fallback.
- Um registro recente só bloqueia nova captura automaticamente quando já possui cidade.
- Se houver registro recente parcial, a API só grava uma nova linha quando obtiver informação mais
  específica, como estado ou cidade; caso contrário, mantém o skip por frequência.
- Nenhum IP bruto, coordenada ou endereço passa a ser persistido.

## Consequências

- Novas sessões podem substituir capturas `BR` por cidade/UF/país quando o provider retornar essa
  granularidade.
- Capturas existentes com apenas país não são alteradas por backfill automático em ambiente
  publicado; serão enriquecidas por nova captura real quando possível.
- A mudança é aditiva e compatível com frontend/backend em versões diferentes.
- Não há package novo, variável obrigatória nova, migration ou alteração de schema.
- Rollback: reverter o commit faz a API voltar a aceitar país-only do proxy como captura final.

## Validação

- Testes unitários cobrem proxy com apenas país, proxy com cidade e prevenção de duplicidade sem
  ganho de granularidade.
- `pnpm --dir backend test`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check:version`
- `pnpm check`
