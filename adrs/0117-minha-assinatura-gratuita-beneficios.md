# ADR-0117: Minha assinatura gratuita orientada a benefícios

## Status

Accepted

## Task relacionada

TASK-31B

## Contexto

A tela `/app/professional/billing/subscription` para profissionais no Plano Gratuito mostrava apenas o plano atual, a expiração e um aviso técnico sobre checkout/gateway. Isso era correto do ponto de vista de segurança, mas pouco persuasivo para a etapa de conversão: o profissional precisava entender o valor já liberado no plano atual e os benefícios da Assinatura Profissional sem entrar em uma tabela comparativa ou visualizar preço nesta etapa.

As referências visuais consultadas foram a imagem local `_product/proto/Minhas Assinatura - Psicólogo.jpg` e o print enviado pelo usuário. O Builder/Quick Copy não está exposto como ferramenta direta neste ambiente, então a validação visual usou os artefatos locais e browser headless local.

## Decisão

Manter a tela como card centralizado, mobile-first e sem tabela comparativa, mas reposicionar a narrativa do Plano Gratuito como ponto de partida para crescimento profissional.

Para o Plano Gratuito:

- o cabeçalho passa a usar o selo `SEU PLANO ATUAL`, título `Plano Gratuito` e copy de valor sobre comunidades e perfil ativo;
- o card redundante de `Plano atual` abaixo do cabeçalho é removido por duplicar a informação `Plano Gratuito`;
- o aviso técnico sobre cartão/gateway sai da experiência gratuita;
- os benefícios da Assinatura Profissional entram agrupados por credibilidade, visibilidade, recursos de perfil e atendimento prioritário;
- o card azul de destaque resume o ganho de presença profissional;
- o CTA principal vira `Fazer upgrade`, usando o botão primário.

Em refinamento posterior no mesmo dia, a descrição gratuita foi compactada para `Você já pode participar das comunidades e manter seu perfil ativo na Lectum.`, o texto auxiliar da seção de benefícios passou a `Benefícios pensados para fortalecer sua autoridade e ampliar sua presença na Lectum.` e o bloco `Expiração` deixou de ser renderizado para o Plano Gratuito.

Em novo refinamento visual, o container completo de informações do plano gratuito também deixou de ser renderizado. Assim, a seção `O que você desbloqueia com a Assinatura Profissional` passa a vir imediatamente após a descrição do plano. O resumo com `Plano atual` e data continua disponível apenas para cenários não gratuitos, como a cortesia profissional, onde a data de expiração tem valor operacional.

Em outro refinamento, o CTA `Fazer upgrade` deixou de ficar no fim do card e passou a ser renderizado em uma área fixa/flutuante no rodapé da viewport. A área usa superfície translúcida, blur, sombra e safe area para manter o CTA sempre acessível no mobile; em desktop, fica limitada à mesma largura do card central. O conteúdo da página ganhou padding inferior para não deixar o card final escondido atrás do CTA.

O fluxo de cortesia continua separado: profissionais com `source="admin_grant"` mantêm a mensagem de cortesia e o CTA para checkout real/bloqueado da TASK-32. Nenhuma regra de cobrança, persistência, entitlement, gateway ou preço foi alterada.

## Consequências

- A tela gratuita deixa de comunicar uma limitação técnica e passa a vender valor de forma progressiva.
- O cabeçalho passa a ser a única fonte visual do estado `Plano Gratuito`, reduzindo duplicidade e altura vazia no mobile.
- A Assinatura Profissional fica mais clara sem expor preço fora da tela de planos.
- O card permanece responsivo em 390px sem overflow horizontal.
- O CTA de conversão fica persistente sem exigir que o profissional role até o final da tela.
- A decisão mantém a segurança do checkout: não há coleta de cartão fora do Mercado Pago real.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser headless local em `http://localhost:3000/app/professional/billing/subscription`, viewport 390x844, com usuário psicólogo temporário criado por endpoints reais, Plano Gratuito selecionado via API real e removido do banco ao final.
- Validação visual confirmou `Plano Gratuito`, `SEU PLANO ATUAL`, seção de benefícios imediatamente após a descrição, card `Amplie sua presença profissional na Lectum`, CTA fixo `Fazer upgrade`, ausência do texto técnico antigo, ausência de `Plano atual`/`Expiração` no Plano Gratuito e `scrollWidth=390`/`innerWidth=390`.
- A validação browser também confirmou o CTA fixo antes/depois da rolagem em 390x844, padding inferior de `105px`, último card não coberto, e painel desktop 1024x768 alinhado à largura do card central.

## Pendências

- TASK-32 continua responsável pelo checkout real Mercado Pago.
- TASK-33 continua responsável pela gestão completa de assinatura e cartão quando a integração de pagamento estiver disponível.

## Atualização em 2026-07-04: benefícios sem suporte prioritário

O ADR-0205 refinou a lista de benefícios: o grupo `Atendimento prioritário` e o item `Suporte prioritário via WhatsApp` deixam de ser apresentados nas telas de assinatura, enquanto `Respostas nas comunidades com mídia` passa a reforçar o grupo `Mais visibilidade`. A decisão não altera gateway, preço, API, entitlement ou schema.
