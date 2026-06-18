# ADR 0122: Card de upgrade no menu principal de perfil

Data: 2026-06-18

## Status

Aceito

## Contexto

A tela **Editar perfil** passou a concentrar pendências e preenchimento obrigatório do perfil profissional. O card azul de upgrade para o Plano Profissional estava dentro desse formulário, misturando monetização com uma tarefa operacional de completar dados do perfil.

Ao mesmo tempo, a tela principal de **Perfil** é o ponto natural de entrada para identidade profissional, assinatura, analytics, avaliações e ferramentas de conta.

## Decisão

- Remover o card de upgrade da tela `/app/professional/profile/setup`.
- Reposicionar o card na tela `/app/profile`, logo abaixo do card superior de identidade do usuário e antes da seção **Conta**.
- Exibir o card apenas para psicólogos sem Plano Profissional/cortesia ativa.
- Usar a mesma linguagem visual premium dos cards recentes de Assinatura, Analytics e Avaliações: fundo azul claro, ícone circular, texto orientado a valor e seta de avanço.
- O destino do card é `/app/professional/billing/subscription`, preservando a jornada de assinatura antes da seleção de planos.

## Consequências

- A edição de perfil fica focada em completar e gerenciar informações, sem distrações comerciais.
- A tela principal de Perfil ganha uma hierarquia mais clara: identidade profissional, oportunidade de upgrade, ferramentas da conta.
- Assinantes ativos não veem o card redundante.
- Não há alteração de contrato de API, schema ou regra de cobrança.
