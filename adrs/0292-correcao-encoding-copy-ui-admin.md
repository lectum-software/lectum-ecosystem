# ADR-0292 - Correção de encoding em copies da UI Admin

Data: 2026-07-20
Status: Aceito

## Contexto

O detalhe administrativo de paciente exibiu textos com mojibake em produção local, por exemplo `EstatÃ­sticas`, `PublicaÃ§Ãµes`, `perÃ­odo` e mensagens de erro similares.

O problema estava em literais já corrompidos no código do Admin, em strings retornadas pelo backend para o detalhe do paciente e em alguns textos compartilhados do frontend. Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência visual usada foi a captura enviada pelo usuário e o inventário local `_product/tasks/PROTO-INVENTORY.md`.

## Decisão

- Corrigir os literais na fonte para UTF-8 válido, em vez de adicionar decodificação ou normalização em tempo de execução.
- Manter os contratos, endpoints, schema Prisma, migrations e packages inalterados.
- Não criar sanitizador global, interceptor de API ou camada de tradução paralela apenas para mascarar dados/textos corrompidos.
- Limitar a correção a copies de UI, mensagens operacionais e comentários afetados por mojibake nos diretórios de aplicação.

## Consequências

- A UI Admin de pacientes volta a exibir acentos corretamente em abas, cards, métricas, estados vazios, tabelas e notas de cobertura.
- O backend deixa de retornar labels/descriptions corrompidos no contrato do detalhe de paciente.
- Erros e labels compartilhados do frontend também ficam legíveis sem mudança de comportamento.
- Se novos textos corrompidos surgirem em dados persistidos no banco, eles devem ser tratados por migration/rotina específica, não por runtime decoder genérico.

## Validação

- `pnpm --dir admin check`
- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir admin build`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes/cmrqsr926001d1guhoz10yvaz` retornou `200`.
