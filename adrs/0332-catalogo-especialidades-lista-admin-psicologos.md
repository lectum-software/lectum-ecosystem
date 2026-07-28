# ADR-0332 - Catalogo canonico de especialidades na lista Admin de psicologos

## Status

Accepted

## Contexto

A lista administrativa de psicologos em `/psicologos/lista` possui filtro por **Especialidade** para investigacao operacional. Esse filtro vinha sendo montado a partir das especialidades encontradas nos perfis de psicologos existentes no Admin. Como a busca publica de pacientes usa o catalogo ativo completo (`specialty` + `specialty_category`), o Admin podia exibir uma lista menor do que a exibida aos pacientes.

O pedido de produto foi garantir que todas as especialidades no filtro da lista Admin sejam as mesmas exibidas aos pacientes, sem criar mock, seed, endpoint paralelo ou lista hardcoded no frontend.

## Decisao

`GET /api/admin/private/psychologists` passa a buscar o catalogo ativo de especialidades diretamente das tabelas reais `specialties` e `specialty_categories`, com a mesma regra usada pela descoberta publica:

- `specialties.active = true`;
- `specialties.deleted = false`;
- categoria ativa e nao deletada;
- ordenacao por posicao da categoria, posicao da especialidade e nome.

O backend continua calculando `count` a partir dos perfis administrativos reais, mas a presenca da opcao no filtro nao depende mais de haver psicologo cadastrado naquela especialidade. A UI Admin permanece consumindo `filters.specialties` do contrato real existente.

## Consequencias

- O filtro de especialidades do Admin fica alinhado ao catalogo exibido para pacientes.
- Especialidades sem psicologos vinculados aparecem no filtro com `count = 0` e, quando selecionadas, retornam estado vazio honesto.
- Nao ha mudanca de schema Prisma, migration, pacote, dado fake, seed ou endpoint paralelo.
- O Admin fica menos dependente da composicao atual da base de psicologos para auditar catalogos e cobertura.

## Task relacionada

TASK-54 - Lista administrativa de psicologos.

## Validacao

- Validacoes completas registradas na TASK-54.

## Pendencias

- Nenhuma.
