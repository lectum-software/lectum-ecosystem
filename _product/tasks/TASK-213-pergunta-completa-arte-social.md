# TASK-213 - Pergunta completa na arte social

Data: 2026-10-02.

## Escopo

Mostrar a pergunta completa no MP4 social, aumentando somente a altura do corpo
branco quando forem necessarias mais de tres linhas. Referencia: capturas do
usuario de 02/10/2026. Builder/Quick Copy indisponivel neste cliente; usamos o
renderer e os assets existentes, sem redesenhar a caixa.

## Criterios de aceite

- [x] Quebra de linhas preserva o texto sem adicionar reticencias ou cortar palavras.
- [x] Cada linha adicional aumenta o corpo branco em 60px no canvas de 1080x1920.
- [x] Fonte, entrelinha, centralizacao, largura, posicao, cabecalho e identidade profissional preservados.
- [x] Perguntas de ate tres linhas mantem a geometria original.
- [x] O asset de fundo preserva cabecalho e cantos; apenas uma faixa branca e estendida.
- [x] O modo portatil de renderizacao recebe a mesma altura dinamica.

## Validacao

Build, Biome e tipos do video aprovados. Os 24 testes direcionados compilados
passaram. Suite compilada: 86 aprovados, 11 skips por FFprobe ausente e uma falha
ambiental no teste de startup, cujo subprocesso usa tsx. O check padrao encontra
`uv_os_get_passwd ENOMEM` no carregador tsx antes de executar os testes neste
Windows; nenhum teste foi alterado para ocultar essa limitacao.

Render real local em FFmpeg: seis MP4s/PNGs, perguntas curta, longa e de 180
caracteres, nos modos standard e portable. Comparacao sem perdas confirmou pixels
identicos no cabecalho e identificacao profissional; os cantos inferiores sao
identicos apos deslocamento vertical. Capturas inspecionadas. O teste local usou
Arial como fonte disponivel; a configuracao de fontes de producao foi preservada.

## Deploy

Somente comportamento do servico video. Sem banco, API, env ou dependencia nova.
Novas geracoes recebem o ajuste; arquivos ja baixados nao sao reescritos.
Push em homolog dispara o deploy de homologacao. Producao exige promocao posterior.
Decisao registrada em ADR-0553.

## Complemento - previa completa (0.1.551)

A previa HTML ainda tinha um limite independente de tres linhas. Removemos tanto
as reticencias na quebra de texto quanto o line-clamp. Palavras longas sao
divididas sem perda, seguindo o render do video. A altura base continua 13.85cqh,
com mais 3.125cqh por linha adicional (60px em 1920px), mantendo centralizacao,
tipografia, posicao, largura, cabecalho, cantos e identificacao profissional.

- [x] Pergunta completa na previa, inclusive o exemplo de quatro linhas enviado.
- [x] Perguntas curtas mantem a altura anterior.
- [x] Testes de texto longo, palavras extensas, acentos e fallback adicionados.

Mudanca somente no frontend; sem API, banco, env ou dependencia nova. Rollback
por reversao deste complemento em homolog. Producao depende de promocao propria.

Validacao: check completo do frontend e build aprovados; sete testes direcionados
passaram. Componente real isolado com CSS compilado validado em Chromium nas
larguras 320/390/1440, com textos curto, longo, 180 caracteres e palavra extensa:
sem corte/reticencias, centralizacao com erro inferior a 1px, cabecalho/largura/
identificacao inalterados e sem sobreposicao. Nao houve geracao de video remoto
nem alteracao de dados de usuario. O primeiro build falhou por ENOSPC; apenas
arquivos descartaveis do cache webpack local foram removidos antes da repeticao.
Smoke local Next: `/version` confirmou 0.1.551 e `/psicologos` abriu com HTTP 200
em navegador mobile. `pnpm check` passou pelas verificacoes gerais e frontend,
mas parou no typecheck do backend por `DATABASE_URL` local ausente; nao houve
uso de banco remoto nem alteracao de configuracao para contornar a limitacao.
