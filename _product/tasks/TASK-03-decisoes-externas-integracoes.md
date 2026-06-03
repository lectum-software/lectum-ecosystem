# TASK-03: Decisões externas e integrações obrigatórias

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-03 |
| Prioridade | P0 |
| Esforço | M |
| Fase | Product decisions |
| Status | Pending |
| Dependências | TASK-00 |
| ADR alvo | ADR de integrações externas |

## Contexto

O PRD prevê pagamentos, WhatsApp, verificação CFP, notificações, e-mail/SMS, storage e compliance. Essas decisões não podem ser simuladas com mocks porque o usuário não-dev não saberá diferenciar uma integração real de uma interface falsa.

Esta task não implementa gateway ou provedor específico. Ela registra decisões mínimas para desbloquear tasks futuras.

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Objetivo

Criar um documento de decisões pendentes/definidas para integrações externas e bloquear implementações que dependeriam de fornecedores ainda não escolhidos.

## Pré-requisitos e bloqueios

- Esta task depende de decisões do usuário/produto.
- Se uma decisão não puder ser tomada agora, registrar como `Bloqueado` em `_product/decisions.md`.
- Não implementar código de integração nesta task.
- Não escolher provedor por conveniência técnica sem registrar trade-off em ADR.

## Decisões a registrar

- Gateway de pagamento:
  - provedor;
  - modelo de assinatura;
  - ambiente sandbox/prod;
  - eventos/webhooks necessários.
- Storage/bucket:
  - provedor;
  - política de acesso;
  - tipos de arquivo;
  - limites de tamanho.
- WhatsApp:
  - link direto simples;
  - WhatsApp Business API;
  - provedor intermediário;
  - validação OTP.
- CFP:
  - fonte oficial ou processo manual;
  - dados mínimos;
  - fallback quando registro não for encontrado.
- E-mail/SMS:
  - provedores;
  - templates;
  - remetente;
  - limites e retry.
- LGPD:
  - termos;
  - política de privacidade;
  - consentimento;
  - remoção/exportação de dados.
- Moderação de comunidade:
  - manual, automática ou híbrida;
  - critérios de denúncia;
  - fluxo de bloqueio.

## Saída esperada

- Criar `adrs/0003-integracoes-externas-e-decisoes-pendentes.md` (ADR-0002 já está em uso para a arquitetura de auth/papéis).
- Criar ou atualizar `_product/decisions.md` com decisões e pendências.
- Marcar claramente o que está decidido e o que ainda bloqueia implementação.

## Escopo frontend

- Nenhuma tela de produto deve ser implementada.
- CTAs ou fluxos visuais dependentes dessas decisões devem permanecer para tasks futuras.
- Se a decisão impactar copy/estado de tela, registrar o impacto em `_product/decisions.md`.

## Escopo backend

- Nenhum endpoint de integração deve ser implementado.
- Nenhum SDK novo deve ser instalado.
- Nenhum model Prisma deve ser criado nesta task, salvo se for exclusivamente documental e justificado em ADR.

## Fora do escopo

- Implementar gateway de pagamento.
- Criar bucket real.
- Criar contrato com provedor CFP/WhatsApp/SMS.

## Contrato técnico detalhado

Referências obrigatórias:

- `PACKAGES.md`, seções Candidatos condicionais e Backend já instalado.
- `ARCHITECTURE.md`, seções Backend, Prisma e Anti-recriação.
- `PROTO-INVENTORY.md`, para entender quais telas dependem de cada integração.
- `ROADMAP-REVALIDADO.md`, para mapear impacto das decisões nas tasks `TASK-10`, `TASK-11`, `TASK-16`, `TASK-29`, `TASK-31`, `TASK-32` e `TASK-33`.

Formato esperado de `_product/decisions.md`:

```text
# Decisões de Integração Lectum

## Gateway de pagamento
Status: Decidido | Bloqueado
Provedor:
Ambiente:
Webhooks:
Pacotes:
Impacto nas tasks:

## Storage
...
```

Decisões técnicas mínimas:

- Pagamento: definir se será `stripe`, `mercadopago`, `asaas` ou outro. Não instalar SDK até decisão.
- Storage: confirmar se usará S3/AWS SDK já instalado ou outro provider.
- WhatsApp: confirmar link direto, Twilio ou WhatsApp Business API.
- CFP: confirmar fonte de consulta e fallback operacional.
- E-mail/SMS: confirmar uso de `nodemailer`/`twilio` já instalados ou troca de provedor.
- Observabilidade: decidir se Sentry entra no MVP ou fica para TASK-34.

## Estados obrigatórios

Esta task não possui interface. O estado verificável é documental:

- decisão marcada como `Decidido` ou `Bloqueado`;
- impacto listado por task;
- package candidato listado quando aplicável;
- responsável/pendência explícita quando bloqueado.

## Critérios de aceite

- [ ] `_product/decisions.md` existe.
- [ ] Gateway de pagamento está definido ou marcado como bloqueio explícito.
- [ ] Storage/bucket está definido ou marcado como bloqueio explícito.
- [ ] WhatsApp está definido ou marcado como bloqueio explícito.
- [ ] CFP está definido ou marcado como bloqueio explícito.
- [ ] E-mail/SMS estão definidos ou marcados como bloqueio explícito.
- [ ] LGPD/termos têm responsável e status.
- [ ] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [ ] ADR criado em `adrs/`.
- [ ] Commit criado com mensagem convencional.

## Validação mínima

- Revisão manual dos documentos criados.
- Não há necessidade de build se apenas documentação for alterada.

## Notas para executor

Não escolha um provedor para desbloquear implementação sem validação do usuário/produto. Esta task existe para impedir que pagamentos, storage, CFP, WhatsApp, e-mail/SMS, push e LGPD virem interfaces falsas.
