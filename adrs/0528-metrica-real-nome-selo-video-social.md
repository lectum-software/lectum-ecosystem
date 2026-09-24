# ADR-0528 - Metrica real do nome e margem do selo no MP4 social

## Status

Aceita em 2026-09-24. Substitui o limite e o posicionamento do ADR-0527.

## Contexto

O usuario confirmou que a previa esta correta e que a sobreposicao acontece no video baixado. Truncar o nome nao corrige o calculo aproximado de largura (quantidade de caracteres vezes fator fixo). Glifos diferentes e fontes de fallback tornam essa estimativa incorreta mesmo em nomes curtos.

## Decisao

- Limite de 30 caracteres antes de reticencias no video e na constante equivalente do frontend, sem modificar a composicao da previa.
- Medir o nome sanitizado em um frame local com o proprio FFmpeg e a mesma fonte/tamanho/escaping do render final. O filtro bbox retorna somente limites numericos via metadata em stdout; nao usar logs debug que incluem texto pessoal.
- Centralizar nome e selo com a largura medida e reservar 16px reais em 1080px. Remover estimativa e clamp independente do selo.
- Se necessario, reduzir tamanho da fonte e medir novamente para caber em 1080px menos margens laterais de 64px, selo e gap. Nao cortar o nome adicionalmente nem sobrepor o selo.
- A geometria e obrigatoria no construtor do filtergraph. O worker mede novamente quando a variante troca de fonte; nao existe fallback para estimativa. Falha de medicao segue erro sanitizado e politica existente de retry.
- Overlays de assets terminam com a entrada principal (shortest=1), inclusive em videos sem audio; a validacao real revelou que assets em loop podiam prolongar o MP4 indefinidamente.

Referencia tecnica: [filtros bbox/metadata do FFmpeg](https://ffmpeg.org/ffmpeg-filters.html).

## Deploy, compatibilidade e rollback

Sem banco, migration, contrato HTTP, env nova ou dependencia npm. FFmpeg e fontes ja existem na imagem do video; bbox e metadata sao filtros padrao. Frontend/video continuam independentes. Custo adicional: pequeno prepass local por tentativa, com timeout e abort da tarefa. Artefatos ja baixados e caches em memoria de abas antigas nao sao reescritos; reabrir a pagina e gerar novo arquivo. Nao limpar buckets/filas/dados. Rollback por commit de reversao revisado em homolog, nunca push em main.

## Validacao

Testes unitarios de limites e geometria; testes reais de FFmpeg/MP4 decodificado verificam distancia entre pixels do nome e selo com Manrope Bold Debian, nomes longos/curtos, W/i repetidos e acentos, com asset e fallback. Evidencias locais ignoradas em .tmp/social-name-qa; checks/build e smoke registrados na task.
