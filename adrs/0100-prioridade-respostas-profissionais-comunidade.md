# ADR 0100 — Prioridade fixa para respostas profissionais em posts da comunidade

## Status

Aceito.

## Contexto

Nas páginas de detalhe de posts e nos cards do feed de comunidades, a resposta profissional deve reforçar a autoridade da Lectum sem ocultar a participação dos pacientes. A regra de produto exige que, quando existir resposta de psicólogo verificado, a melhor contribuição profissional apareça primeiro/destacada, usando votos úteis como critério principal e ranking comunitário do profissional como desempate.

## Decisão

- Centralizar no backend a seleção da resposta profissional destacada dos feeds e a ordenação principal da página de detalhes.
- Calcular um sinal real de ranking comunitário por psicólogo a partir de dados persistidos da comunidade: votos recebidos, comentários recebidos, salvamentos, posts/respostas publicados, dias ativos e penalidade por posts removidos.
- Não criar campo novo no banco neste momento; o ranking é calculado sob demanda para os autores candidatos ao destaque/primeira posição.
- No detalhe do post, fixar a melhor resposta de psicólogo verificado como primeiro comentário quando existir, e ordenar o restante por relevância com bônus para psicólogos verificados.
- No frontend, manter uma ordenação defensiva sobre os dados já recebidos e aplicar o destaque visual azul em todas as respostas de psicólogos verificados e nas threads abertas a partir delas.

## Consequências

- A primeira resposta vista no detalhe do post passa a privilegiar contribuição profissional verificada.
- O card do feed mostra a resposta profissional mais útil/relevante entre psicólogos verificados, com desempate por ranking comunitário.
- Comentários de pacientes continuam elegíveis no restante da discussão quando tiverem relevância superior.
- O cálculo sob demanda evita migração de banco, mas deve ser reavaliado se o volume de comentários por post crescer muito.
