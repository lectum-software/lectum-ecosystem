# ADR-0287: Abas do detalhe Admin de paciente alinhadas ao padrão do psicólogo

## Status

Accepted

## Task relacionada

TASK-61

## Contexto

Após os refinamentos do detalhe administrativo de psicólogos, o detalhe de pacientes já possuía o mesmo cabeçalho com abas, mas o conteúdo interno ainda usava blocos mais simples e menos consistentes. A solicitação de produto foi padronizar as abas de pacientes com a hierarquia visual das abas do psicólogo, sem ampliar dados pessoais nem criar contratos novos.

Builder/Quick Copy não está exposto como ferramenta callable neste ambiente. A execução usou as capturas enviadas pelo usuário e as referências locais `_product/proto/admin/Pacientes/Pacientes - Detalhes.png` e `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Perfil e Cadastro.png`.

## Decisão

- O detalhe de pacientes passa a usar os mesmos padrões visuais locais do detalhe de psicólogos: cards com ícone, linhas `FieldRow` em duas colunas no desktop, métricas compactas, cards de situação e listas em tabela com overflow horizontal mobile-first.
- A aba **Geral** fica resumida, como no psicólogo: métricas principais, três cards de situação (`Situação da conta`, `Cadastro do paciente`, `Engajamento`) e atividades recentes.
- A aba **Perfil e cadastro** concentra apenas dados pessoais/cadastrais mínimos de paciente e a nota de privacidade/cobertura.
- As abas **Estatísticas**, **Publicações**, **Denúncias**, **Atividades** e **Conta** reaproveitam o contrato real já disponível, com estados vazios honestos quando não há endpoint dedicado.
- Não foi criado backend, endpoint, schema Prisma, migration, package, seed, mock ou ação administrativa nova.

## Consequências

- Pacientes e psicólogos ficam mais coerentes visualmente no Admin, sem fingir paridade de volume de dados.
- A diferença de domínio permanece explícita: pacientes têm leitura reduzida e continuam sem ações destrutivas na V1.
- A leitura mobile-first melhora porque tabelas/listas densas usam rolagem horizontal somente dentro do card.
- Qualquer ação futura de conta/moderação de paciente ainda exige task e ADR próprios.

## Validação

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin exec eslint "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin typecheck`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local em `/pacientes/cmrqsrab5001f1guh2ve5oy90` e nas abas `perfil`, `estatisticas`, `publicacoes`, `denuncias`, `atividades` e `conta`, todos com retorno `200`.

## Pendências

- Validação visual autenticada interativa depende da sessão Admin do navegador do usuário; nesta execução foi feita validação local por build/check e smoke HTTP.
