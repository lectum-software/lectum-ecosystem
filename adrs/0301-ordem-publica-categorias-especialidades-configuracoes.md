# ADR-0301: Ordem publica das categorias de especialidades segue Configuracoes

## Status

Accepted

## Data

2026-07-21

## Contexto

A TASK-65 tornou as especialidades agrupadas por `specialty_category` administraveis no Admin. Depois dos ajustes de drag, a ordem das categorias em **Configuracoes** passou a ser a interacao principal de curadoria, mas os consumidores publicos ainda montavam os grupos a partir da lista de especialidades. Mesmo com `category.position` vindo no item, isso deixava a UI publica dependente da ordenacao incidental da lista de itens.

## Decisao

A ordem dos grupos de especialidade no site publico deve ser derivada explicitamente do catalogo `specialty_categories` retornado pela API real:

- `/psychologists` usa `filters.specialty_categories` para ordenar e nomear os grupos do filtro de especialidade;
- `/app/professional/profile/setup` usa `catalogs.specialty_categories` para ordenar e nomear os grupos do campo de especialidades;
- `specialties` continua sendo a fonte dos itens dentro de cada categoria, ordenados por `position` e nome;
- itens sem categoria persistida continuam em `Outras especialidades` como fallback honesto.

## Consequencias

- A curadoria feita no Admin vira a fonte unica de ordem visual para paciente e psicologo.
- A UI publica deixa de depender da ordem incidental em que especialidades chegam da API para decidir a sequencia dos grupos.
- Nao foi criado endpoint novo, cache paralelo, pacote novo, migration ou mock.
