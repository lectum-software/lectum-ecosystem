# TASK-31B: Cortesia profissional na assinatura e perfil

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-31B |
| Prioridade | P1 |
| Esforço | M |
| Fase | Assinatura |
| Status | Completed |
| Dependências | TASK-18A, TASK-31A |
| ADR alvo | ADR-0029 |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/TASK-31A-concessao-administrativa-assinatura.md`
- `adrs/0028-concessao-administrativa-assinatura.md`

## Referências visuais

- `_product/proto/Perfil - Psicólogo.jpg`
- `_product/proto/Editar Perfil - Psicólogo.jpg`
- `_product/proto/Minhas Assinatura - Psicólogo.jpg`

Builder/Quick Copy não foi acessado por ferramenta disponível nesta execução; foram usadas as imagens locais e os prints enviados pelo usuário como referência visual.

## Contexto

Psicólogos com `professional_subscription.source="admin_grant"` recebem todos os benefícios do Plano Profissional durante uma cortesia por prazo determinado. A UI precisava deixar de tratá-los como plano gratuito na edição de perfil e precisava de uma tela de "Minha Assinatura" mostrando a cortesia e a data de expiração.

## Escopo

- Redirecionar "Minha Assinatura" para uma tela própria de assinatura.
- Exibir Plano Profissional de cortesia, data de expiração e CTA para inserir cartão.
- Manter o CTA de cartão apontando para o checkout real existente, sem coletar cartão fora do Mercado Pago enquanto a TASK-32 estiver bloqueada.
- Tratar cortesia como entitlement profissional na edição do perfil:
  - remover faixa de upgrade;
  - liberar upload real de vídeo de apresentação;
  - permitir até 10 especialidades;
  - permitir todos os serviços ativos;
  - permitir todas as abordagens ativas.
- Manter plano gratuito com limites anteriores e CTA de upgrade.

## Fora do escopo

- Implementar checkout/cartão real sem Mercado Pago configurado.
- Criar área admin.
- Criar dados fake, seed ou mock.
- Alterar schema Prisma.

## Critérios de aceite

- [x] "Minha Assinatura" no menu do perfil abre a tela de assinatura.
- [x] Psicólogo com cortesia vê plano de cortesia, data de expiração e CTA para inserir cartão.
- [x] CTA de cartão não simula cobrança e aponta para o checkout real/bloqueado da TASK-32.
- [x] Perfil em cortesia/profissional não exibe faixa azul de upgrade.
- [x] Perfil em cortesia/profissional libera upload real de vídeo com arquivo persistido no storage público existente.
- [x] Perfil em cortesia/profissional permite até 10 especialidades.
- [x] Perfil em cortesia/profissional permite todos os serviços ativos.
- [x] Perfil em cortesia/profissional permite todas as abordagens ativas.
- [x] Plano gratuito mantém limites e CTA de upgrade.
- [x] Nenhum package novo foi instalado.
- [x] ADR criado ou atualizado.
- [x] Checks/builds relevantes foram executados.
- [x] Commit criado e push executado.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local sem sessão em `/app/profile`, `/app/professional/profile/setup` e `/app/professional/billing/subscription` respondeu `307`, confirmando proteção por redirect/login; validação visual autenticada real fica dependente da sessão do usuário no navegador.

## Ajuste visual em 2026-06-18: Plano Gratuito persuasivo em Minha Assinatura

- Pedido direto de produto: tornar `/app/professional/billing/subscription` mais persuasiva para profissionais no Plano Gratuito, sem transformar a tela em tabela comparativa e sem exibir preço nesta etapa.
- Referência visual consultada: `_product/proto/Minhas Assinatura - Psicólogo.jpg` e print enviado pelo usuário; Builder/Quick Copy não está exposto como ferramenta direta neste ambiente.
- O cabeçalho gratuito passou a usar `SEU PLANO ATUAL`, `Plano Gratuito` e copy compacta de valor sobre comunidades e perfil ativo.
- O card do plano atual manteve apenas `Plano atual: Plano Gratuito`; a expiração deixou de aparecer no Plano Gratuito e o card foi reequilibrado em largura única com ícone discreto, bordas suaves e espaçamento mobile-first.
- O aviso técnico `A Lectum não coleta cartão fora do gateway real...` foi removido da experiência gratuita.
- A tela passou a exibir a seção `O que você desbloqueia com a Assinatura Profissional`, agrupando benefícios por credibilidade, visibilidade, recursos de perfil e atendimento prioritário.
- Adicionado card azul claro `Amplie sua presença profissional na Lectum` e CTA primário `Fazer upgrade`.
- A tela de cortesia (`source="admin_grant"`) foi preservada com CTA para checkout real/bloqueado, sem alterar regras de gateway, cobrança, entitlement, API ou preço.
- ADR criado: `adrs/0117-minha-assinatura-gratuita-beneficios.md`.

### Validação do ajuste

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser headless local em viewport 390x844 na rota `/app/professional/billing/subscription`, com usuário psicólogo temporário criado por endpoints reais, Plano Gratuito selecionado via API real e removido do banco ao final, confirmou os textos novos, a ausência do aviso técnico antigo, a remoção de `Expiração` no Plano Gratuito e `scrollWidth=390`/`innerWidth=390`.

## Refinamento visual em 2026-06-18: CTA direto de upgrade

- Pedido direto de produto: compactar a tela gratuita de "Minha assinatura" após remover a expiração e tornar o CTA mais direto.
- A descrição do Plano Gratuito passou para `Você já pode participar das comunidades e manter seu perfil ativo na Lectum.`
- O card de informações do Plano Gratuito passou a renderizar somente `Plano atual` e `Plano Gratuito`, sem bloco de expiração.
- O texto auxiliar da seção de benefícios passou para `Benefícios pensados para fortalecer sua autoridade e ampliar sua presença na Lectum.`
- O CTA principal passou de `Ver planos e benefícios` para `Fazer upgrade`, preservando estilo primário.
- Espaçamentos verticais, altura do ícone superior e distância entre seções foram reduzidos para uma composição mais compacta no mobile.

### Validação do refinamento

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser headless local em viewport 390x844 confirmou descrição nova, CTA `Fazer upgrade`, ausência de `Expiração`, ausência de `Ver planos e benefícios`, ausência de `dentro da Lectum` e `scrollWidth=390`/`innerWidth=390`.

## Refinamento visual em 2026-06-18: remoção do card redundante do Plano Gratuito

- Pedido direto de produto: remover completamente o container `Plano atual` exibido logo abaixo da descrição do Plano Gratuito, porque o cabeçalho já comunica `SEU PLANO ATUAL` e `Plano Gratuito`.
- A renderização do resumo de plano abaixo do cabeçalho passou a ocorrer somente para planos não gratuitos, preservando a cortesia profissional com data de expiração e CTA de cartão.
- No Plano Gratuito, a seção `O que você desbloqueia com a Assinatura Profissional` sobe imediatamente após a descrição do plano, eliminando o fundo cinza claro, o card interno, o ícone e a duplicação do texto `Plano Gratuito`.
- Os espaçamentos mobile-first foram revisados no próprio fluxo: card principal centralizado, benefícios sem corte lateral em 390px e CTA `Fazer upgrade` mantido como ação principal.

### Validação da remoção

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser headless local em viewport 390x844 na rota `/app/professional/billing/subscription`, com usuário psicólogo temporário criado por endpoints reais, Plano Gratuito selecionado via API real e removido do banco ao final, confirmou `planAtualCount=0`, `expiraCount=0`, `scrollWidth=390`, `innerWidth=390`, CTA `Fazer upgrade` e a presença da seção de benefícios sem o container redundante.
