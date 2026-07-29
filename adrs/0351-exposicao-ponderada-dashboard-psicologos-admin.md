# ADR-0351 - Exposição ponderada no dashboard Admin de psicólogos

## Status

Accepted

## Contexto

O dashboard Admin de psicólogos já separa **Conversão** como resultado bruto de cliques no WhatsApp e **Engajamento** como ações do próprio psicólogo nas comunidades. Faltava uma leitura intermediária para responder se a atuação do psicólogo está gerando oportunidade real de ser visto antes da conversão.

Essa leitura não deve reutilizar WhatsApp, favoritos, avaliações ou ações feitas pelo psicólogo. Ela precisa medir exposição recebida, usando apenas eventos first-party reais já persistidos.

## Decisão

Adicionar `profile_exposure` ao contrato real `GET /api/admin/private/psychologists/dashboard`, também dentro de cada `plan_segments`.

A Exposição será classificada por score ponderado no período selecionado:

- impressão em resultado/listagem (`profile_view_event.source="search_result"`): peso `0,25`;
- view de resposta/comentário autoral na comunidade (`page_view_event.target_type=reply/post_reply`): peso `0,5`;
- view de post autoral na comunidade (`page_view_event.target_type=post/community_post`): peso `0,75`;
- abertura de perfil público (`profile_view_event.source="profile_page"`): peso `1`;
- visualização qualificada de vídeo do perfil (`profile_video_watch_session`, 3s+): peso `1,5`.

As categorias seguem o padrão de percentis da plataforma no período:

- **Alta Exposição**: score acima de P75;
- **Exposição Padrão**: score entre P25 e P75;
- **Baixa Exposição**: score abaixo de P25, mas maior que zero;
- **Sem Exposição**: zero eventos ponderados;
- **Dados Insuficientes**: primeiros 30 dias desde `user.createdAt`.

No Admin, o card superior passa a exibir **Conversão**, **Engajamento** e **Exposição** em três blocos responsivos. A legenda dos donuts fica abaixo do gráfico para caber no layout lado a lado em desktop amplo, preservando comportamento mobile-first.

## Consequências

- A leitura de exposição passa a explicar a etapa entre atividade comunitária e conversão sem afirmar causalidade.
- Comentários vistos na comunidade não valem o mesmo que perfil aberto, evitando distorção por volume de views indiretas.
- Não há migration, backfill, seed, mock ou tracking novo; a V1 usa somente eventos existentes.
- O benchmark pode ficar sem faixa padrão quando não houver psicólogos elegíveis com exposição fora da adaptação, e a UI deve comunicar isso como ausência de faixa.
- A execução divide consultas de dashboard em lotes menores para evitar `EMAXCONNSESSION` no banco de desenvolvimento em modo session pool.
