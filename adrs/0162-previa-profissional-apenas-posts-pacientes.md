# ADR-0162: Prévia profissional apenas em posts de pacientes

## Status
Accepted

## Contexto
A prévia de resposta profissional em destaque foi criada para evidenciar, no feed e dentro da comunidade, que uma dúvida publicada por paciente recebeu orientação de um psicólogo. Quando o post original é de outro psicólogo, gratuito ou assinante, essa prévia deixa de cumprir esse papel e pode gerar ruído visual entre conteúdos profissionais.

## Decisão
Renderizar `highlighted_professional_reply` somente quando o autor original do post tiver `role="paciente"`.

Posts publicados por psicólogos não exibem a prévia profissional em destaque no feed agregado nem dentro da comunidade, mesmo quando possuem respostas de psicólogos verificados. A regra visual não remove respostas reais do detalhe do post e não altera a listagem de contribuições em que a própria resposta é o conteúdo principal exibido.

## Consequências
- O destaque passa a comunicar exclusivamente "resposta profissional a paciente".
- Psicólogos gratuitos, assinantes, cortesias e verificados seguem a mesma regra ao publicar posts próprios.
- O backend pode continuar enviando a relação por compatibilidade; o frontend aplica a barreira visual nos contextos solicitados.
