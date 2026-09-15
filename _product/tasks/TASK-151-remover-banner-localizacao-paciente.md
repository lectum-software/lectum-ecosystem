# TASK-151: Remover banner de localizacao opcional no perfil do paciente

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-151 |
| Prioridade | P2 |
| Esforco | P |
| Fase | Paciente / Perfil |
| Status | Completed |
| Dependencias | TASK-02, TASK-21, TASK-150 |
| ADR alvo | ADR-0448 |

## Contexto

A TASK-150 adicionou Estado e Cidade no perfil do paciente e incluiu um alerta azul acima dos campos para explicar o uso da localizacao. Em teste mobile real, a faixa ficou visualmente pesada e empurrou os campos principais para baixo. A decisao de produto desta task e remover essa faixa azul, mantendo os campos opcionais e a explicacao enxuta no proprio campo de Estado.

Referencia visual: screenshot enviada pelo usuario em 2026-08-10 e tela `_product/proto/Editar Perfil - Paciente.jpg`. Builder/Quick Copy continua sendo a fonte visual ativa quando callable; nesta sessao foi usada a evidencia visual enviada e o fallback local registrado no inventario.

## Objetivo

Remover a faixa azul "Localizacao opcional" da tela de edicao de perfil do paciente sem alterar persistencia, validacao ou comportamento dos campos Estado/Cidade.

## Escopo

- Remover o `InlineAlert` informativo de localizacao dentro de "Informacoes Basicas".
- Manter Estado e Cidade como campos opcionais.
- Manter a copy curta do campo Estado indicando que a informacao ajuda a aproximar psicologos da regiao.
- Nao alterar backend, banco, admin ou contratos.

## Fora do escopo

- Pedir permissao de geolocalizacao do navegador.
- Remover Estado/Cidade.
- Alterar algoritmo de proximidade ou ordenacao de psicologos.
- Alterar a regra de **Nao informado** no Admin.

## Impacto em producao e rollout

- Compatibilidade com dados existentes: sem alteracao de banco ou API.
- Envs: nenhuma env nova.
- Contratos: inalterados.
- Ordem de deploy: somente frontend precisa refletir a mudanca visual, mas o deploy automatico de `homolog` pode publicar todos os artefatos versionados.
- Rollback: reverter o commit restaura o banner informativo.
- Smoke de homologacao: frontend `/version`; backend `/health`, `/ready`, `/ping` e admin `/version` para confirmar que a versao publicada ficou consistente.

## Criterios de aceite

- [x] A faixa azul "Localizacao opcional" nao aparece mais na edicao de perfil do paciente.
- [x] Os campos Estado e Cidade continuam visiveis e opcionais.
- [x] A explicacao curta de uso da localizacao permanece no campo Estado.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] UI mobile-first; nenhum `<img>` cru foi usado.
- [x] Sem alteracao de banco, env ou contrato de API.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR atualizado em `adrs/`.
- [x] Versao dos quatro manifests foi incrementada uma vez e permanece sincronizada.
- [x] Commit criado com mensagem convencional.
- [x] Commit e push ocorreram em `homolog`; o deploy de homologacao foi comunicado e nao houve push direto em `main`.

## Validacao executada

- `pnpm --dir frontend check` - sem erros.
- `pnpm --dir frontend build` - sem erros.
- `pnpm check:tasks` - sem erros.
- `pnpm check:adrs` - sem erros.
- `pnpm check:encoding` - sem erros.
- `pnpm version:bump` - 0.1.31 -> 0.1.32.
- `pnpm check:version` - sem erros.
- `pnpm check` - sem erros.
- Browser local/HTTP: tentativa com `pnpm --dir frontend dev -- --hostname 127.0.0.1 --port 3100` nao respondeu antes do timeout do executor; processo iniciado foi encerrado. Validacao visual ficou baseada na remocao direta do componente e build Next.

## Notas de execucao

- A remocao reduz altura inicial da secao no mobile e deixa os campos principais mais proximos do topo.
- A decisao de coletar localizacao declarada da TASK-150 permanece valida.
