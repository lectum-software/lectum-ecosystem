# TASK-53: Dashboard administrativo de psicólogos

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-53 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin |
| Status | Pending |
| Dependências | TASK-45, TASK-46 |
| ADR alvo | ADR se houver nova decisão sobre agregações, ranking administrativo ou métricas financeiras |

## Contexto

A área Admin de Psicólogos começa com uma visão executiva dos profissionais da plataforma. A referência visual é `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`.

Regra de produto definida em conversa: o botão **Adicionar novo psicólogo** fica fora da V1. O ranking exibido no Admin deve reutilizar o mesmo ranking real usado para posicionar vídeos/profissionais na descoberta pública de psicólogos, sem criar fórmula paralela.

## Objetivo

Implementar o dashboard administrativo de psicólogos com dados reais de perfis, planos, verificação, receita/churn honestos, ranking público reutilizado e estatísticas agregadas.

## Pré-requisitos e bloqueios

- TASK-45 concluída: autenticação Admin real.
- TASK-46 concluída: app `admin/` e shell lateral.
- Ler `_product/tasks/ARCHITECTURE.md`, `_product/tasks/DATA-MODEL.md`, `_product/tasks/PACKAGES.md` e `_product/tasks/PROTO-INVENTORY.md`.
- Usar `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` como referência visual local.
- Se Builder/Quick Copy estiver disponível, usar como complemento; se não, registrar limitação.

## Escopo frontend

- Criar rota protegida de dashboard de psicólogos:
  - `/psychologists` ou subrota equivalente definida no Admin.
- Renderizar:
  - título e subtítulo;
  - filtro de período;
  - exportação somente se houver endpoint real;
  - cards: total, gratuitos, verificados, novos cadastros, receita de assinaturas, churn;
  - gráfico temporal;
  - lista resumida de psicólogos;
  - ranking de psicólogos com score real da descoberta pública;
  - estatísticas por serviços, abordagens, público atendido, modalidade, gênero, experiência, convênio, desconto, valor social e distribuição por estado;
  - seção de filtros mais buscados somente se houver fonte real; caso contrário, exibir indisponível ou omitir com copy honesta.
- O botão "Adicionar novo psicólogo" não deve ser renderizado nesta V1.

## Escopo backend

- Criar endpoint admin privado:
  - `GET /api/admin/private/psychologists/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Agregar dados reais de:
  - `user.role="psicologo"`;
  - `psychologist_profile`;
  - `professional_subscription` e `subscription_plan`;
  - `professional_review`;
  - `psychologist_favorite`;
  - `contact_request`;
  - `profile_view_event`;
  - catálogos `service`, `approach`, `specialty`;
  - campos `modality`, `gender`, `target_audience`, `accepts_insurance`, `discount_first_session`, `social_value`, `crp_registration_date`.
- Reutilizar a função/score de ranking existente na descoberta pública de psicólogos. Se a função atual estiver acoplada ao repositório público, extrair helper compartilhável sem alterar a fórmula.

## Fora do escopo

- Criar psicólogo manualmente pelo Admin.
- Editar psicólogo.
- Moderar avaliações.
- Cancelar assinatura.
- Criar tracking novo de filtros buscados, se ainda não existir.
- Criar fórmula nova de ranking administrativo.

## Contrato técnico detalhado

Backend esperado:

- Módulo admin privado com controller/service/repository/validator.
- Período:
  - default: últimos 7 dias;
  - limite máximo inicial: 90 dias;
  - `from <= to`.
- Receita:
  - contar apenas pagamentos/assinaturas confirmadas com origem real de cobrança quando possível;
  - `admin_grant`/cortesia não conta como receita;
  - se o dado financeiro não permitir confirmar valor, retornar `unavailable` ou `estimated` com label explícito.
- Churn:
  - fórmula documentada no service;
  - não misturar cancelamento real com expiração de cortesia.
- Ranking:
  - `Mais relevantes` e bloco de ranking usam o mesmo score da descoberta pública;
  - retornar posição, score e componentes apenas quando já existirem/forem seguros.

Frontend esperado:

- `admin/src/api/req/psychologists`;
- `admin/src/api/callers/psychologists`;
- query keys próprias;
- gráficos simples acessíveis com alternativa textual;
- cards responsivos e mobile-first.

Packages usados:

- Nenhum pacote novo por padrão.
- Qualquer chart/table lib exige validação em `PACKAGES.md` e ADR.

## Critérios de aceite

- [ ] A rota só abre para admin autenticado.
- [ ] Botão "Adicionar novo psicólogo" não aparece nesta V1.
- [ ] Cards e gráficos usam dados reais.
- [ ] Ranking reutiliza a fórmula real da descoberta pública de psicólogos.
- [ ] Receita/churn têm fórmula honesta e não contam cortesia como receita.
- [ ] Métricas sem fonte real aparecem como indisponíveis ou são omitidas.
- [ ] Filtro de período atualiza as agregações.
- [ ] UI mobile-first validada em ~390px, tablet e desktop.
- [ ] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [ ] Nenhum `<img>` cru foi usado.
- [ ] `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` foi citado como referência visual.
- [ ] Checks/builds relevantes foram executados sem erros.
- [ ] ADR criado ou atualizado se houver decisão relevante.
- [ ] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local com admin real.

## Notas de execução

- Os números da imagem são referência visual, não seed.
- Se `Filtros de busca` ainda não tiver rastreamento real, não preencher com dados inventados.
