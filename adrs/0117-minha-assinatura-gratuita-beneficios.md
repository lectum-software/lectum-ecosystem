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

- o cabeçalho passa a usar o selo `SEU PLANO ATUAL`, título `Plano Gratuito` e copy de valor sobre comunidades, avaliações e perfil ativo;
- o card de plano atual mantém `Plano atual` e `Expiração`, com ícones discretos e bordas suaves;
- o aviso técnico sobre cartão/gateway sai da experiência gratuita;
- os benefícios da Assinatura Profissional entram agrupados por credibilidade, visibilidade, recursos de perfil e atendimento prioritário;
- o card azul de destaque resume o ganho de presença profissional;
- o CTA principal vira `Ver planos e benefícios`, usando o botão primário.

O fluxo de cortesia continua separado: profissionais com `source="admin_grant"` mantêm a mensagem de cortesia e o CTA para checkout real/bloqueado da TASK-32. Nenhuma regra de cobrança, persistência, entitlement, gateway ou preço foi alterada.

## Consequências

- A tela gratuita deixa de comunicar uma limitação técnica e passa a vender valor de forma progressiva.
- A Assinatura Profissional fica mais clara sem expor preço fora da tela de planos.
- O card permanece responsivo em 390px sem overflow horizontal.
- A decisão mantém a segurança do checkout: não há coleta de cartão fora do Mercado Pago real.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser headless local em `http://localhost:3000/app/professional/billing/subscription`, viewport 390x844, com usuário psicólogo temporário criado por endpoints reais, Plano Gratuito selecionado via API real e removido do banco ao final.
- Validação visual confirmou `Plano Gratuito`, `SEU PLANO ATUAL`, seção de benefícios, card `Amplie sua presença profissional na Lectum`, CTA `Ver planos e benefícios`, ausência do texto técnico antigo e `scrollWidth=390`/`innerWidth=390`.

## Pendências

- TASK-32 continua responsável pelo checkout real Mercado Pago.
- TASK-33 continua responsável pela gestão completa de assinatura e cartão quando a integração de pagamento estiver disponível.
