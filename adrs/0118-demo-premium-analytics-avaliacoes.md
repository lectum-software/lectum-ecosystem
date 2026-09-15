# ADR-0118: Demonstração premium em Analytics e Avaliações

## Status

Accepted

## Task relacionada

TASK-19, TASK-20

## Contexto

As telas profissionais de Analytics e Minhas Avaliações estavam corretas como recursos premium, mas a experiência para psicólogos no Plano Gratuito era percebida como bloqueio: Analytics retornava erro de acesso e Minhas Avaliações podia exibir mensagem de indisponibilidade por plano.

A decisão de produto de 2026-06-18 muda a estratégia para demonstração de valor: o profissional gratuito deve visualizar a existência, a hierarquia e o potencial dos recursos, com CTA consistente para upgrade, sem receber dados falsos e sem simular avaliações.

As referências visuais consideradas foram `_product/proto/Meus Analytics - Psicólogo.jpg`, `_product/proto/Minhas Avaliações - Psicólogo.jpg`, a tela de assinatura profissional recém-refinada e os prints enviados pelo usuário. Builder/Quick Copy não está exposto como ferramenta direta neste ambiente; a validação visual usou os artefatos locais e browser local/headless.

## Decisão

### Analytics

O endpoint `GET /api/private/psychologist/analytics` deixa de responder `403` para psicólogos sem Plano Profissional ativo/cortesia. A autenticação, o papel `psicologo` e o escopo por `auth.id` continuam obrigatórios, mas a ausência de entitlement agora retorna `200` com dados reais agregados e metadado de acesso:

- `access.has_professional_entitlement=false`;
- `access.mode="preview"`.

No frontend, o modo `preview` mantém abas, cards, link de avaliações, bloco de busca por especialidades e dica Pro renderizados. Valores e dados sensíveis são desfocados, enquanto títulos, labels e estrutura permanecem legíveis. A tela recebe banner premium com título `Desbloqueie seus Analytics`, descrição de valor e CTA `Fazer upgrade` para `/app/professional/billing/subscription`.

Erros técnicos reais de rede/API continuam usando estado de erro, mas o antigo texto de bloqueio por plano não é mais exibido como experiência normal do Plano Gratuito.

### Minhas Avaliações

O endpoint `GET /api/private/psychologist/reviews` também deixa de responder `403` para psicólogos sem entitlement profissional. Para Plano Gratuito, retorna `200` com resposta vazia e metadado:

- `access.can_receive_reviews=false`;
- `access.mode="preview"`;
- `data=[]`, `count=0`, `pages=0` e distribuição zerada.

A tela permanece acessível e renderiza um estado premium explicativo com o título `Desbloqueie avaliações de pacientes`, benefícios com checkmarks e CTA `Fazer upgrade` para a tela de assinatura. Nenhuma avaliação fictícia, depoimento simulado ou seed foi criada.

A ação `POST /api/private/psychologist/reviews/:id/response` continua protegida por entitlement profissional, pois responder avaliações só faz sentido quando há avaliações reais elegíveis.

### Responsividade

As duas telas mantêm layout mobile-first. O wrapper de conteúdo passou a forçar `grid-cols-[minmax(0,1fr)]` nos grids principais para evitar que conteúdo longo ou cards internos criem trilhas implícitas maiores que a viewport em 390px.

## Consequências

- Psicólogos gratuitos deixam de encontrar um erro/bloqueio e passam a ver uma amostra estrutural do recurso premium.
- Analytics pode comunicar valor sem inventar métrica: os números vêm das fontes reais já mapeadas e aparecem desfocados no preview.
- Minhas Avaliações comunica o benefício desbloqueado sem gerar depoimentos fake.
- A navegação de upgrade fica consistente entre Assinatura, Analytics e Minhas Avaliações.
- O contrato de API fica explícito sobre modo de acesso, permitindo evoluir outros componentes sem depender de parsing de mensagens de erro.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Validação API real com psicólogo temporário no Plano Gratuito:
  - `GET /api/private/psychologist/analytics?period=30d` retornou `200`, `access.mode="preview"` e `has_professional_entitlement=false`.
  - `GET /api/private/psychologist/reviews?page=1&limit=10&period=all` retornou `200`, `access.mode="preview"`, `can_receive_reviews=false`, `count=0` e lista vazia.
- Browser local/headless em 390x844 confirmou:
  - Analytics exibe banner `Desbloqueie seus Analytics`, abas de período, cards de métricas, CTA para `/app/professional/billing/subscription`, valores desfocados, sem os textos antigos de bloqueio e sem overflow horizontal.
  - Minhas Avaliações exibe `Desbloqueie avaliações de pacientes`, os quatro benefícios solicitados, CTA para `/app/professional/billing/subscription`, sem erro de plano, sem estado vazio genérico e sem avaliações simuladas.
- O usuário temporário criado por endpoints reais foi removido do banco ao final da validação.

## Pendências

- Eventos ainda não persistidos continuam sem número real em Analytics, conforme decisão anterior da TASK-20. A UI não simula percentuais ou séries históricas.
- A conversão real do CTA continua dependendo do fluxo de checkout/planos das tasks de billing.

## Refinamento visual premium em 2026-06-18

Após a adoção do modo `preview`, as telas foram refinadas visualmente para parecerem uma continuação natural da jornada de upgrade iniciada em `Minha assinatura`:

- `Meus Analytics` usa header em card, tabs de período em pílulas, banner premium azul-claro, CTA primário consistente e cards de métricas com ícones em círculos azul-claro.
- O preview gratuito dos números de Analytics usa blur dentro de cápsulas visuais, com selo `Prévia`, para comunicar recurso premium de forma intencional e não como erro visual.
- `Minhas Avaliações` usa um estado premium centralizado com ícone, selo, texto de valor, benefícios em cards e CTA para `/app/professional/billing/subscription`.
- A responsividade foi revisada mobile-first: métricas ficam em uma coluna em 390px e em duas colunas quando há espaço; tabs cabem no mobile; cards e CTAs respeitam a largura útil.
- A validação local confirmou ausência de overflow horizontal real em 390x844 e alinhamento central em 1024x768.
