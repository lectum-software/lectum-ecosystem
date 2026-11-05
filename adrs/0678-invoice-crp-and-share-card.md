# ADR-0678 - Nomes fiscais e normalizacao de apresentacao

## Status

Aceito para implementacao local em 2026-11-05.

## Decisao

O nome do PDF e produzido pelo backend apos validar posse e documento fiscal.
Usa numero da nota (pagamento como fallback), authorized_at em America/Sao_Paulo
e somente caracteres seguros. Metadados opcionais preservam contratos legados.
Referencia: https://sendnf.com/desenvolvedores/api/ (GET documents/{id}).

A busca CRP normaliza pontuacao e zeros sem mudar dados armazenados nem filtros
de visibilidade. Consultas SQL parametrizadas complementam o filtro Prisma existente.

A arte social mantem fonte/espacamento e limita a tres linhas, acrescentando
reticencias apenas quando houver texto excedente. Preview e FFmpeg compartilham
a mesma regra por testes de paridade, mantendo os deploys independentes.

Sem novas dependencias ou migrations. Ver riscos e evidencias na TASK-317.
