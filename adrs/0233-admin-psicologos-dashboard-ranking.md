# ADR-0233 - Dashboard Admin de psicólogos reutiliza ranking público e métricas honestas

## Status

Accepted

## Contexto

A TASK-53 implementa a visão executiva de psicólogos no app `admin/`, usando a referência visual local `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`. A regra de produto definida foi manter o botão **Adicionar novo psicólogo** fora da V1 e exibir no Admin o mesmo ranqueamento usado para posicionar vídeos/profissionais na descoberta pública de psicólogos, sem fórmula paralela.

Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` não estava disponível como ferramenta neste ambiente; a tela foi implementada a partir da imagem local registrada no inventário de protótipos.

## Decisão

- Extrair a fórmula real de ranking público para `backend/src/utils/psychologist-public-ranking.ts` e fazer a descoberta pública e o dashboard Admin consumirem o mesmo helper.
- Criar o endpoint protegido `GET /api/admin/private/psychologists/dashboard` com período padrão de 7 dias e limite de 90 dias.
- Tratar receita como **MRR estimado** de assinaturas profissionais ativas originadas no Mercado Pago (`source=mercadopago`) e preço do `subscription_plan`; `admin_grant`, cortesias e plano gratuito não contam como receita.
- Documentar churn no service como cancelamentos reais de assinaturas profissionais Mercado Pago no período dividido por base paga ativa no início + novas assinaturas pagas do período; cortesias e gratuito ficam fora do numerador e denominador.
- Exibir filtros mais buscados como indisponíveis porque ainda não há tracking persistido por termo/filtro de busca no diretório público.
- Entregar a rota Admin protegida em `/psicologos`, seguindo a navegação já existente do app Admin.

Atualização 2026-07-12:

- A rota do dashboard passa a aceitar `period=week|month|year|all|custom`, mantendo `from`/`to` para período personalizado.
- O limite operacional do dashboard foi ampliado para 3660 dias para permitir **Este ano** e **Todo o período** sem voltar aos chips fixos de 7/30/90 dias.
- `period=all` deriva o início pelo primeiro cadastro real de psicólogo retornado por `user.createdAt`, sem mockar data inicial.
- A UI do Admin usa o mesmo modelo de seletor aplicado nas estatísticas do detalhe do psicólogo e remove a linha redundante de período consultado e descrições longas dentro dos cards de contadores.


Atualização 2026-07-12 (contadores integrados ao gráfico):

- O painel passa a expor seis contadores operacionais: **Total de psicólogos**, **Psicólogos gratuitos**, **Psicólogos assinantes**, **Psicólogos cortesia**, **Novos cadastros** e **Churn**.
- **Psicólogos assinantes** conta assinaturas profissionais pagas ativas com `professional_subscription.source="mercadopago"`; **Psicólogos cortesia** conta concessões profissionais ativas com `source="admin_grant"`; **Psicólogos gratuitos** usa o segmento gratuito ativo, sem somar profissionais que estejam como assinantes ou cortesia.
- O gráfico temporal do dashboard deixa de usar curvas de eventos de engajamento e passa a usar as mesmas chaves dos contadores, permitindo que cada card funcione como toggle para exibir ou esconder sua curva.
- Receita estimada e psicólogos verificados deixam de aparecer como cards primários neste dashboard, sem remover as fórmulas documentadas nem as fontes reais para telas financeiras/detalhes que precisem delas.

Atualização 2026-07-12 (remoção de blocos lista/ranking):

- A rota `/psicologos` deixou de renderizar os blocos resumidos **Lista de psicólogos** e **Ranking dos psicólogos**.
- Os dados reais de lista e ranking permanecem no contrato do dashboard por compatibilidade e para usos dedicados/futuros, mas não compõem mais a experiência visual principal da página.
- O estado vazio do dashboard passa a considerar apenas os cards e a série temporal que continuam visíveis, evitando que blocos removidos escondam uma ausência real de dados exibidos.

## Consequências

- O Admin não cria uma métrica de ranking divergente do Explorar público.
- As métricas financeiras ficam úteis para operação, mas explicitamente estimadas até existir conciliação financeira confirmada por evento de pagamento/receita líquida.
- Métricas sem fonte real aparecem como indisponíveis em vez de serem preenchidas com dados inventados.
- A fórmula compartilhada reduz duplicação e obriga futuras alterações de ranqueamento público a refletirem no Admin.

- Períodos longos podem gerar séries diárias maiores, mas mantêm a consulta honesta sobre dados reais e seguem o limite já usado nas estatísticas individuais.
- O dashboard de psicólogos fica menos duplicado em relação à rota dedicada de lista, mantendo a página focada em contadores, gráfico e estatísticas agregadas.

## Task relacionada

- TASK-53: Dashboard administrativo de psicólogos

## Validações

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Chamada real da API com admin temporário e remoção posterior do usuário de validação.
- Browser local headless em `http://localhost:3002/psicologos` com admin real temporário, validando viewport mobile de 390px e desktop, ausência de "Adicionar novo psicólogo" e presença de seções reais.
- Atualização 2026-07-12: `pnpm --dir admin check`, `pnpm --dir admin build` e Biome direcionado nos arquivos do dashboard backend.
- Atualização 2026-07-12: `pnpm --dir backend check`, `pnpm --dir backend build` e `pnpm check` foram tentados, mas ficaram bloqueados por alterações pré-existentes no workspace (formatação/TypeScript fora do dashboard e `backend/prisma/schema.prisma` com falha P1012 no `prisma generate`).
- Atualização 2026-07-12 (contadores integrados): `pnpm --dir admin check` (sem erros, com warning pré-existente fora do dashboard em `admin/src/app/(admin)/psicologos/[id]/client.tsx`), `pnpm --dir admin build`, Biome direcionado nos DTO/services do dashboard, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm check` e smoke HTTP local em `/psicologos` retornando 200.
- Atualização 2026-07-12 (remoção de lista/ranking): `pnpm --dir admin check`, `pnpm --dir admin build`, smoke HTTP local em `/psicologos` retornando 200; `pnpm check` tentado e encerrado por timeout de 124s sem saída conclusiva.
