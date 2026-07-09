# TASK-54: Lista administrativa de psicólogos

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-54 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin |
| Status | Pending |
| Dependências | TASK-45, TASK-46, TASK-53 |
| ADR alvo | ADR se houver nova decisão sobre filtros persistidos, ordenação ou exposição de dados sensíveis |

## Contexto

A listagem administrativa de psicólogos tem referência visual em `_product/proto/admin/Psicólogos/Psicólogos- Lista.png`. Ela deve permitir encontrar profissionais por nome/CRP, filtrar, ordenar e abrir o detalhe.

Regra definida: o botão **Adicionar novo psicólogo** fica fora da V1. Ordenação "Mais relevantes" deve usar o mesmo ranking da descoberta pública de psicólogos.

## Objetivo

Criar a lista administrativa de psicólogos com filtros reais, paginação, ordenação por ranking público e métricas operacionais por profissional.

## Pré-requisitos e bloqueios

- TASK-45, TASK-46 e TASK-53 concluídas.
- Ler `ARCHITECTURE.md`, `DATA-MODEL.md`, `PACKAGES.md` e `PROTO-INVENTORY.md`.
- Usar `_product/proto/admin/Psicólogos/Psicólogos- Lista.png` como referência visual local.

## Escopo frontend

- Criar rota protegida:
  - `/psychologists/list` ou equivalente.
- Renderizar:
  - breadcrumb;
  - busca por nome/CRP;
  - filtros laterais;
  - indicadores de filtros ativos;
  - limpar filtros;
  - ordenação;
  - alternância visual grid/lista somente se ambas forem implementadas com dados reais; caso contrário, manter apenas lista;
  - paginação;
  - ações por linha: abrir detalhe e abrir perfil público.
- Não renderizar "Adicionar novo psicólogo" nesta V1.
- "Salvar busca" fica fora da V1 salvo se existir persistência real de preferências admin; não usar local fake como requisito de produto.

## Escopo backend

- Criar endpoint admin privado:
  - `GET /api/admin/private/psychologists`
- Filtros:
  - nome/CRP;
  - estado/cidade;
  - status de verificação;
  - plano;
  - experiência;
  - desconto 1ª sessão;
  - aceita convênios;
  - valor social;
  - público atendido;
  - abordagem;
  - serviço;
  - modalidade;
  - idioma;
  - gênero.
- Ordenações:
  - `relevance`: score real da descoberta pública;
  - avaliação;
  - favoritos;
  - cliques WhatsApp;
  - cadastro recente;
  - nome.
- Métricas por linha:
  - posição no ranking;
  - avaliação média e quantidade;
  - favoritos;
  - cliques WhatsApp;
  - experiência derivada de `crp_registration_date`;
  - localização;
  - plano/status.

## Fora do escopo

- Criar psicólogo manualmente.
- Editar psicólogo na lista.
- Ações em massa.
- Persistir buscas salvas.
- Exportação da lista, salvo se endpoint real for implementado explicitamente.

## Contrato técnico detalhado

Backend esperado:

- Paginação padrão do projeto.
- Filtros validados.
- Nenhum `select/include` vindo do frontend.
- `deleted=false` em todos os modelos.
- Reutilizar helper de ranking público.

Frontend esperado:

- `admin/src/api/req/psychologists`;
- `admin/src/api/callers/psychologists`;
- query keys e invalidação quando aplicável;
- filtros em URL/search params quando fizer sentido;
- layout mobile-first com filtros em drawer no mobile.

## Critérios de aceite

- [ ] Lista só abre para admin autenticado.
- [ ] Busca por nome/CRP usa backend real.
- [ ] Filtros usam campos reais do banco.
- [ ] Ordenação "Mais relevantes" usa ranking público real.
- [ ] Métricas por linha vêm de dados reais.
- [ ] Botão "Adicionar novo psicólogo" não aparece.
- [ ] "Salvar busca" não aparece/habilita sem persistência real.
- [ ] Paginação funciona.
- [ ] UI mobile-first validada.
- [ ] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [ ] Nenhum `<img>` cru foi usado.
- [ ] `_product/proto/admin/Psicólogos/Psicólogos- Lista.png` foi citado como referência visual.
- [ ] Checks/builds relevantes foram executados sem erros.
- [ ] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local com admin real.

## Notas de execução

- Se um filtro visual não tiver campo real, omitir ou retornar indisponível em vez de simular.
