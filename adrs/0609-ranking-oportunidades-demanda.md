# ADR-0609 - Oportunidades como demanda nao atendida

## Status

Aceito.

## Contexto

A aba profissional `Oportunidades` priorizava menos respostas de psicologos e, em
seguida, menos comentarios totais. Com isso, uma conversa ativa descia no feed mesmo
quando os comentarios demonstravam demanda ainda pouco atendida. A contagem bruta
tambem nao distinguia varias pessoas de repeticoes entre poucos participantes.

## Decisao

Calcular no backend um score de oportunidade antes da paginacao. O score soma:

- recencia do post, com decaimento linear na janela existente de 90 dias;
- ate cinco pacientes distintos, com peso principal de engajamento;
- comentarios adicionais com ganho logaritmico e teto baixo;
- recencia do ultimo comentario de paciente em uma janela de 14 dias.

Cada resposta de psicologo aplica penalidade progressiva, limitada para nao tornar o
score indefinidamente negativo. Empates favorecem menos respostas profissionais,
mais pacientes distintos e, por fim, o post mais recente.

O frontend deixa de recalcular `Oportunidades` sobre as paginas ja carregadas e
preserva a ordem global enviada pela API. As metricas novas sao aditivas e opcionais
no consumidor para manter compatibilidade durante rollout misto.

## Consequencias

Posts novos sem cobertura continuam visiveis, enquanto conversas com demanda coletiva
e pouca atencao profissional podem subir. Repeticoes da mesma pessoa ajudam pouco e
nao equivalem a novos participantes. Nao ha migration, escrita de dados, env ou pacote
novo. Backend e frontend podem ser publicados em qualquer ordem; rollback por reversao
revisada em `homolog`.
