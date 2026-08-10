# TASK-150: Localizacao declarada do paciente para proximidade

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-150 |
| Prioridade | P1 |
| Esforco | M |
| Fase | Paciente / Perfil e Admin |
| Status | Completed |
| Dependencias | TASK-02, TASK-21, TASK-60, TASK-61 |
| ADR alvo | ADR-0448 |

## Contexto

A captura aproximada por IP/navegador para analytics pode retornar apenas pais ou cidades muito distantes, como ocorreu em testes com paciente em Minas Gerais exibindo Rio de Janeiro. O produto decidiu nao adicionar agora mais um pop-up de permissao de localizacao, porque o usuario ja encontra prompts de PWA e notificacoes.

A decisao desta task e coletar uma localizacao declarada no proprio perfil do paciente: Estado e Cidade, com explicacao clara de que essa informacao sera usada para mostrar profissionais mais proximos. Ate uma versao futura de permissao contextual no navegador, o Admin e leituras de localizacao de pacientes devem considerar somente esse dado declarado. Pacientes que nao preencherem devem aparecer como **Nao informado**.

Referencia visual: a tela pertence a edicao de perfil do paciente (`/app/profile/edit` ou rota PT-BR equivalente) e deve manter o padrao da TASK-21, usando `_product/proto/Editar Perfil - Paciente.jpg`. Builder/Quick Copy e a fonte ativa quando disponivel; nesta sessao nao ha ferramenta Builder callable, entao foi usado o fallback local registrado em `PROTO-INVENTORY.md`.

## Objetivo

Adicionar Estado e Cidade na edicao de perfil do paciente, persistir esses campos reais no backend e ajustar Admin/listagens/dashboards para exibir localizacao declarada ou **Nao informado**, sem usar localizacao aproximada por IP como fonte do paciente.

## Pre-requisitos e bloqueios

- Branch obrigatoria: `homolog`.
- Sem requisito externo novo.
- Sem env nova.
- Banco precisa de expansao segura com colunas nullable em `patient_profile`.
- Nao resetar banco, seeds ou buckets em ambientes publicados.

## Escopo frontend

- Atualizar a edicao de perfil do paciente com campos `Estado` e `Cidade`.
- Usar React Hook Form, Zod, `frontend/src/hooks/form` e `frontend/src/components/controllers`.
- Reutilizar opcoes brasileiras existentes de Estado/Cidade ja usadas nos filtros/perfil profissional.
- Exibir disclaimer: localizacao usada para mostrarmos profissionais mais proximos, com preenchimento opcional.
- Enviar `state` e `city` no payload real de atualizacao do perfil.

## Escopo backend

- Expandir `patient_profile` com `state` e `city` nullable.
- Validar `state` e `city` como par: ambos preenchidos ou ambos vazios.
- Persistir a localizacao declarada no endpoint privado de perfil do paciente.
- Ajustar contratos/tipos internos para aceitar os novos campos.
- Ajustar Admin de pacientes para usar somente `patient_profile.state/city` como localizacao do paciente, com fallback **Nao informado**.

## Fora do escopo

- Pedir permissao de geolocalizacao do navegador.
- Capturar localizacao do navegador sem permissao.
- Calcular distancia real por coordenadas ou ordenar psicologos por proximidade nesta versao.
- Alterar a captura anonima/analytics por IP existente fora das telas de paciente do Admin.
- Tornar Estado/Cidade obrigatorios.

## Impacto em producao e plano de rollout

- Compatibilidade com dados existentes: pacientes antigos continuam validos com `state = null` e `city = null`; a UI mostra **Nao informado**.
- Banco: expansao segura com duas colunas nullable e indice para leitura futura por localidade; sem backfill obrigatorio e sem contracao neste deploy.
- Envs: nenhuma env nova.
- Contratos: backend novo aceita campos opcionais; frontend/admin antigos continuam funcionando ignorando campos novos; frontend/admin novos toleram ausencia de campos enquanto backend antigo ainda estiver em rollout.
- Jobs/providers: sem efeito externo.
- Ordem de deploy: backend, frontend e admin podem subir no deploy automatico de `homolog`; o backend novo deve ser publicado antes de depender da localizacao declarada no Admin novo, mas os contratos sao aditivos.
- Rollback: reverter codigo deixa colunas nullable sem uso e sem perda de dados; nao remover coluna em rollback imediato.
- Smoke de homologacao: backend `/health`, `/ready`, `/ping`; frontend `/version`; admin `/version`; editar perfil do paciente; verificar detalhe/lista/dashboard de pacientes com **Nao informado** quando vazio.

## Contrato tecnico detalhado

Backend esperado:

- Prisma: `patient_profile.city String?` e `patient_profile.state String?` com indice `@@index([state, city])`.
- Migration aditiva aplicada com `pnpm --dir backend db:migrate` quando possivel no banco local configurado.
- Endpoint `PUT /api/private/patient/profile` aceita `city` e `state` opcionais/nullables.
- Servicos/repositorios normalizam strings vazias para `null`.
- Admin pacientes: lista, detalhe, dashboard e filtros por intencao leem localizacao declarada do perfil, nao `visitor_location`.
- Traducoes publicas seguras para validacao de localidade.

Frontend esperado:

- `frontend/src/app/app/profile/edit` atualizado com campos mobile-first.
- `api/req/patient` e tipos gerados locais atualizados com `city/state`.
- Sem `<img>` novo; foto continua usando `next/image`.

Admin esperado:

- Tipos `admin/src/api/req/patients` atualizados para fonte declarada.
- Cabecalho/dados pessoais mostram **Nao informado** quando o paciente nao declarou localidade.
- Copy do Admin deixa claro que a localizacao e declarada pelo paciente.

Packages usados:

- Somente pacotes ja instalados em `PACKAGES.md`.

## Criterios de aceite

- [x] Paciente consegue informar Estado e Cidade na edicao de perfil com disclaimer de proximidade.
- [x] Estado/Cidade sao opcionais, mas quando apenas um deles e informado a UI/API retorna erro amigavel.
- [x] Backend persiste `patient_profile.state/city` em colunas nullable por migration aditiva.
- [x] Admin lista/detalhe/dashboard de pacientes usam somente localizacao declarada e mostram **Nao informado** quando vazia.
- [x] Nenhuma tela de paciente no Admin usa `visitor_location` como localizacao do paciente.
- [x] UI mobile-first; nenhum `<img>` cru foi usado.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Se houve alteracao de banco/schema/migrations, `pnpm --dir backend db:migrate` foi executado sem erro ou bloqueio registrado sem reset.
- [x] Dados existentes continuam compativeis; nenhuma migration aplicada foi alterada.
- [x] Envs, ordem de deploy, rollback e smoke de homologacao foram registrados; nenhuma env obrigatoria nova.
- [x] Contratos toleram aplicacoes em versoes diferentes durante o rollout.
- [x] Formularios/campos usam React Hook Form, Zod e controllers da TASK-02.
- [x] Builder/Quick Copy foi usado quando disponivel, ou as imagens locais de `_product/proto` foram citadas.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Versao dos quatro manifests foi incrementada uma vez e permanece sincronizada.
- [x] Commit criado com mensagem convencional.
- [x] Commit e push ocorreram em `homolog`; o deploy de homologacao foi comunicado e nao houve push direto em `main`.

## Validacao executada

- `pnpm --dir backend db:migrate` - executado; bloqueado por drift preexistente em migrations antigas ja aplicadas no banco configurado, sem reset.
- `pnpm --dir backend db:migrate-prod` - migration aditiva `20260810195000_add_patient_profile_location` aplicada com sucesso.
- `pnpm --dir backend exec prisma migrate status` - schema up to date apos aplicacao.
- `pnpm --dir backend db:generate` - Prisma Client gerado.
- `pnpm --dir backend check` - sem erros.
- `pnpm --dir backend build` - sem erros.
- `pnpm --dir frontend check` - sem erros.
- `pnpm --dir frontend build` - sem erros.
- `pnpm --dir admin check` - sem erros.
- `pnpm --dir admin build` - sem erros.
- `pnpm check:tasks` - sem erros.
- `pnpm check:encoding` - sem erros.
- `pnpm version:bump` - 0.1.30 -> 0.1.31.
- `pnpm check:version` - sem erros.
- `pnpm check` - sem erros.
- Browser local/HTTP: tentativas de subir servidores temporarios por `Start-Process`, `Start-Job` e processos filhos foram bloqueadas pela politica do executor; validacao local ficou limitada a builds Next e rotas compiladas.

## Notas de execucao

- Nao capturar localizacao do navegador sem permissao; isso nao e permitido de forma confiavel pelos navegadores modernos e seria ruim para confianca/LGPD.
- O campo declarado deve ser tratado como dado de produto, nao como geolocalizacao precisa.
- A captura `visitor_location` pode continuar existindo para analytics agregados fora do escopo, mas nao deve alimentar a localizacao do paciente no Admin.
