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
- O cabeçalho gratuito passou a usar `SEU PLANO ATUAL`, `Plano Gratuito` e copy de valor sobre comunidades, avaliações e perfil ativo.
- O card do plano atual manteve `Plano atual: Plano Gratuito` e `Expiração: Sem data definida`, agora com ícones discretos, bordas suaves e espaçamento mobile-first.
- O aviso técnico `A Lectum não coleta cartão fora do gateway real...` foi removido da experiência gratuita.
- A tela passou a exibir a seção `O que você desbloqueia com a Assinatura Profissional`, agrupando benefícios por credibilidade, visibilidade, recursos de perfil e atendimento prioritário.
- Adicionado card azul claro `Amplie sua presença profissional na Lectum` e CTA primário `Ver planos e benefícios`.
- A tela de cortesia (`source="admin_grant"`) foi preservada com CTA para checkout real/bloqueado, sem alterar regras de gateway, cobrança, entitlement, API ou preço.
- ADR criado: `adrs/0117-minha-assinatura-gratuita-beneficios.md`.

### Validação do ajuste

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser headless local em viewport 390x844 na rota `/app/professional/billing/subscription`, com usuário psicólogo temporário criado por endpoints reais, Plano Gratuito selecionado via API real e removido do banco ao final, confirmou os textos novos, a ausência do aviso técnico antigo e `scrollWidth=390`/`innerWidth=390`.
