# TASK-64: Tela administrativa de notificações

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-64 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin / Notificações |
| Status | Pending |
| Dependências | TASK-45, TASK-46, TASK-63 |
| ADR alvo | ADR somente se houver nova decisão de UX/domínio sobre campanhas ou métricas |

## Contexto

A tela Admin de Notificações usa como referência `_product/proto/admin/Notificações.png`.

Ela deve permitir ao administrador criar notificações para usuários e acompanhar campanhas manuais e logs automáticos. Não é uma tela de notificações recebidas pelo admin.

Decisão de produto:

- Não considerar e-mail nesta V1.
- Canais visíveis: `in-app` e `push` quando push estiver disponível.
- Logs automáticos são leitura/auditoria, não criação manual.

## Objetivo

Implementar a UI administrativa de notificações com criação de campanhas manuais, filtros, abas, métricas reais e logs de notificações automáticas, consumindo a fundação da TASK-63.

## Pré-requisitos e bloqueios

- TASK-45 concluída: autenticação Admin real.
- TASK-46 concluída: app `admin/` e shell lateral.
- TASK-63 concluída: modelos/endpoints reais de campanhas, entregas e logs.
- Ler `ARCHITECTURE.md`, `DATA-MODEL.md`, `PACKAGES.md` e `PROTO-INVENTORY.md`.
- Usar `_product/proto/admin/Notificações.png` como referência visual local.
- Se Builder/Quick Copy estiver disponível, usar como complemento; se não, registrar limitação.

## Escopo frontend

- Criar rota protegida:
  - `/notifications` ou rota equivalente definida no Admin.
- Renderizar:
  - título "Notificações";
  - subtítulo;
  - botão **Nova notificação**;
  - cards:
    - Enviadas (30 dias ou período selecionado);
    - Usuários alcançados;
    - Taxa de abertura média;
    - Taxa de cliques média;
  - abas:
    - Todas;
    - Agendadas;
    - Enviadas;
    - Rascunhos;
    - Canceladas;
  - filtros:
    - período;
    - público;
    - canal;
    - busca por título/conteúdo;
  - tabela/lista de campanhas manuais;
  - seção "Logs de notificações automáticas".
- Criar fluxo **Nova notificação**:
  - modal, drawer ou página conforme padrão Admin;
  - campos:
    - título;
    - mensagem;
    - público;
    - canais (`in_app`, `push` se disponível);
    - redirect/link interno opcional;
    - enviar agora ou agendar;
  - ações:
    - salvar rascunho;
    - enviar agora;
    - agendar;
    - cancelar rascunho/agendada quando permitido.
- Não mostrar canal e-mail.
- Não mostrar template de e-mail.
- Não mostrar taxa de abertura/clique quando a TASK-63 retornar métrica indisponível.

## Escopo backend

- Consumir endpoints da TASK-63.
- Se algum endpoint de listagem/filtro faltar, completar no módulo Admin seguindo a mesma fundação.
- Não criar nova regra de envio paralela na UI.
- Não criar endpoint fake para preencher cards.

## Fora do escopo

- E-mail.
- SMTP/templates de e-mail.
- WhatsApp/SMS.
- Editor rico.
- Segmentação avançada.
- Campanhas recorrentes.
- A/B testing.
- Moderação de notificações automáticas.
- Métricas inventadas de abertura/clique.
- Notificações recebidas pelo admin.

## Contrato técnico detalhado

Cards:

- **Enviadas**:
  - contar campanhas/entregas conforme contrato da TASK-63;
  - a label deve deixar claro se está contando campanhas ou entregas, conforme decisão na execução.
- **Usuários alcançados**:
  - usuários com entrega real no período;
  - não contar usuários sem subscription quando campanha for push-only.
- **Taxa de abertura média**:
  - in-app: baseada em `read_at`;
  - push: somente por clique/interação real;
  - se não houver base confiável, exibir "Indisponível".
- **Taxa de cliques média**:
  - baseada em `clicked_at`;
  - se a campanha não tiver redirect, não contar como falha nem clique.

Tabela de campanhas manuais:

- Colunas mínimas:
  - notificação;
  - público;
  - canal;
  - status;
  - enviada/agendada em;
  - ações.
- Ações permitidas:
  - visualizar detalhes;
  - editar rascunho;
  - cancelar agendada;
  - duplicar somente se houver implementação real;
  - não permitir editar campanha já enviada.

Logs automáticos:

- Mostrar histórico de notificações automáticas enviadas pela plataforma.
- Colunas mínimas:
  - notificação automática;
  - disparo;
  - público;
  - canal;
  - enviada em;
  - alcance;
  - abertura;
  - cliques.
- Logs são somente leitura.
- Métricas indisponíveis devem aparecer como `—` ou copy honesta.

Formulário:

- Usar React Hook Form, Zod e controllers da TASK-02.
- Validações:
  - título obrigatório;
  - mensagem obrigatória;
  - público obrigatório;
  - ao menos um canal;
  - `email` não é canal aceito;
  - data futura para agendamento;
  - redirect opcional validado.
- Preview simples do conteúdo antes de enviar/agendar.
- Confirmação explícita antes de enviar agora.

UI:

- Mobile-first:
  - cards empilhados;
  - abas roláveis;
  - tabela vira lista/card ou scroll acessível;
  - modal/drawer utilizável em ~390px.
- Usar tokens/componentes do Admin; não criar design system paralelo.
- `Image` de `next/image` quando houver imagens/avatares; ícones por biblioteca existente.

## Critérios de aceite

- [ ] Rota Notificações só abre para admin autenticado.
- [ ] `_product/proto/admin/Notificações.png` foi citada como referência visual.
- [ ] A tela deixa claro que serve para gerenciar/enviar notificações aos usuários.
- [ ] Botão **Nova notificação** abre fluxo real de criação.
- [ ] Não existe canal e-mail na UI.
- [ ] Form usa React Hook Form, Zod e controllers.
- [ ] Campanhas manuais listam status reais: rascunho, agendada, enviada, cancelada.
- [ ] Logs automáticos são somente leitura.
- [ ] Métricas de abertura/clique só aparecem quando há fonte real.
- [ ] Push aparece apenas quando disponível; caso contrário, UI informa indisponibilidade ou oculta o canal.
- [ ] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [ ] UI mobile-first validada.
- [ ] Nenhum `<img>` cru foi usado.
- [ ] Checks/builds relevantes executados sem erros.
- [ ] ADR criado/atualizado se houver decisão nova.
- [ ] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local com admin real:
  - criar rascunho;
  - enviar campanha in-app;
  - agendar campanha;
  - cancelar agendada;
  - validar logs automáticos reais.
