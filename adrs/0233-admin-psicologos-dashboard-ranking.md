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

## Consequências

- O Admin não cria uma métrica de ranking divergente do Explorar público.
- As métricas financeiras ficam úteis para operação, mas explicitamente estimadas até existir conciliação financeira confirmada por evento de pagamento/receita líquida.
- Métricas sem fonte real aparecem como indisponíveis em vez de serem preenchidas com dados inventados.
- A fórmula compartilhada reduz duplicação e obriga futuras alterações de ranqueamento público a refletirem no Admin.

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
