# ADR 0352 - Visibilidade e engajamento recebido no dashboard Admin de psicólogos

Data: 2026-07-29

## Status

Aceito

## Contexto

O card superior do dashboard Admin de psicólogos havia passado a exibir Conversão, Engajamento e Exposição. Após revisão conceitual, ficou claro que:

- **Engajamento** deve representar a interação que o psicólogo recebe, não as ações que ele executa na comunidade.
- As ações do psicólogo na comunidade são melhor descritas como **Atividade**.
- A antiga **Exposição** é mais clara para o produto como **Visibilidade**.
- Atividade é um dos fatores que pode gerar visibilidade, mas não deve ser um bloco concorrente no topo neste momento.

## Decisão

1. Renomear a leitura exibida de **Exposição** para **Visibilidade** no Admin, mantendo o contrato interno/API `profile_exposure` por compatibilidade e para evitar uma quebra sem necessidade operacional.
2. Reordenar os blocos superiores para **Visibilidade > Engajamento > Conversão**, sem criar funil visual nesta etapa.
3. Redefinir **Engajamento** dos psicólogos como sinais recebidos, usando apenas dados reais persistidos:
   - favoritos no perfil (`psychologist_favorite`);
   - seguidores do perfil (`psychologist_follow`);
   - comentários recebidos em posts do psicólogo e respostas diretas recebidas em comentários do psicólogo (`post_reply`);
   - votos positivos recebidos em posts/respostas (`post_vote.value=1`);
   - salvamentos recebidos em posts/respostas (`post_save` e `post_reply_save`);
   - compartilhamentos recebidos em posts/respostas (`post_share`).
4. Excluir autoengajamento nos eventos de conteúdo quando houver autor do evento igual ao psicólogo destinatário.
5. Manter WhatsApp exclusivamente como Conversão e manter views/impressões/vídeo/conteúdo visto como Visibilidade.
6. Manter o filtro composto `profile_conversion_engagement` da lista Admin alinhado à mesma classificação de engajamento recebido, para que os links da matriz continuem consistentes com o dashboard.

## Pesos de engajamento recebido

A pontuação normalizada para 30 dias usa pesos por qualidade de intenção:

- comentário recebido: `3`;
- novo seguidor: `2,5`;
- favorito no perfil: `2`;
- compartilhamento de conteúdo: `2`;
- salvamento de conteúdo: `1,5`;
- voto positivo: `1`.

Os cortes continuam em score normalizado de 30 dias: mínimo `3`, engajado `6` e muito engajado `12`. A categoria **Sem engajamento** segue reservada para zero interações recebidas no período; **Pouco engajado** representa algum sinal recebido abaixo do corte de engajado.

## Consequências

- O dashboard passa a comunicar o funil conceitual esperado pelo produto: **Visibilidade > Engajamento > Conversão**, mesmo sem desenhar o funil visual nesta entrega.
- O nome público **Visibilidade** evita confusão com exposição passiva/indesejada e melhora a leitura executiva.
- O termo **Engajamento** deixa de medir atividade operacional do psicólogo e passa a medir resposta do público/plataforma ao psicólogo.
- O contrato `profile_exposure` permanece como dívida controlada de nomenclatura técnica; uma renomeação futura para `profile_visibility` deve ser feita com compatibilidade ou versionamento.
- Nenhum schema Prisma, migration ou package novo foi necessário.
