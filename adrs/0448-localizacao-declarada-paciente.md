# ADR-0448: Localizacao declarada do paciente

## Status

Accepted

## Task relacionada

TASK-150

## Contexto

A localizacao aproximada por IP/proxy pode retornar apenas pais ou uma cidade distante do paciente real. Em testes de homologacao, a localizacao exibida no Admin variou entre apenas BR e Rio de Janeiro para um paciente testado em Minas Gerais. Pedir mais uma permissao no navegador agora aumentaria fadiga de prompts, pois a aplicacao ja possui prompts de PWA e notificacoes.

## Decisao

A Lectum passa a tratar a localizacao do paciente exibida em perfil/lista/dashboard Admin como dado declarado pelo proprio paciente no perfil: Estado e Cidade. Os campos sao opcionais, devem ser preenchidos em par e ficam armazenados em `patient_profile.state` e `patient_profile.city`. Quando o paciente nao informa os dois campos, as telas devem exibir **Nao informado**.

A captura `visitor_location` continua existindo para analytics agregados fora deste escopo, mas nao alimenta mais a localizacao do paciente nas telas administrativas de pacientes. A futura ordenacao por proximidade de psicologos deve partir destes campos declarados ou de uma permissao contextual especifica, em outra task.

## Consequencias

- A localizacao exibida no Admin deixa de depender de heuristica de IP, reduzindo erros grandes de cidade.
- O paciente entende o beneficio do preenchimento antes de fornecer o dado.
- Pacientes existentes permanecem validos sem backfill e aparecem como **Nao informado** ate preencherem o perfil.
- A localizacao ainda nao e coordenada precisa; proximidade real por distancia exige versao futura com geocoding/permissao contextual.

## Producao e rollout

- Compatibilidade com dados existentes: colunas novas sao nullable; nenhum registro antigo precisa ser atualizado.
- Banco: expansao segura com `city`, `state` e indice `patient_profiles_state_city_idx`; sem backfill obrigatorio e sem contracao neste deploy.
- Envs: nenhuma env nova.
- Compatibilidade entre apps: backend aceita campos opcionais e consumidores antigos ignoram os campos; frontend/admin novos toleram campos ausentes durante rollout.
- Ordem de deploy: publicar backend, frontend e admin em `homolog` pelo push da branch; validar homologacao antes de promover para `main`.
- Rollback: reverter codigo deixa colunas nullable sem uso; nao remover colunas em rollback imediato para evitar perda de dados.

## Validacao

- `pnpm --dir backend db:migrate` executado; bloqueado por drift preexistente em migrations antigas e nao houve reset.
- `pnpm --dir backend db:migrate-prod` aplicado com sucesso para `20260810195000_add_patient_profile_location` no banco configurado.
- `pnpm --dir backend exec prisma migrate status` sem pendencias apos deploy da migration.
- `pnpm --dir backend check` sem erros.
- `pnpm --dir frontend check` sem erros.
- `pnpm --dir admin check` sem erros.
- `pnpm --dir backend build` sem erros.
- `pnpm --dir frontend build` sem erros.
- `pnpm --dir admin build` sem erros.
- `pnpm check` sem erros.
- Browser local/HTTP ficou limitado: tentativas de subir servidores temporarios foram bloqueadas pela politica do executor; a validacao local usou builds Next e rotas compiladas.

## Pendencias

- Definir em task futura se a Lectum pedira permissao contextual de geolocalizacao do navegador e como conciliara o dado com a localizacao declarada.
- Definir em task futura o algoritmo de proximidade entre pacientes e psicologos.
