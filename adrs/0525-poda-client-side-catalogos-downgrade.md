# ADR 0525 - Poda client-side de catálogos após downgrade

## Status

Aceita em 2026-09-22.

## Contexto

A normalização de downgrade para o plano gratuito é feita no backend por soft-delete dos vínculos excedentes. Mesmo assim, uma aba já aberta da edição de perfil podia manter valores locais acima do limite porque o formulário preserva valores sujos durante reidratação, comportamento importante para não descartar edições em andamento.

## Decisão

Adicionar uma guarda client-side no controller da edição de perfil: quando `specialty_ids`, `service_ids` ou `approach_ids` excederem o limite atual do plano, o formulário troca o valor pela seleção já normalizada da API quando ela estiver dentro do limite; se ainda não houver seleção normalizada disponível, mantém os primeiros itens até o limite.

## Consequências

- A UI passa a refletir imediatamente o downgrade sem depender de reload manual.
- O backend continua sendo a fonte de verdade para persistência e ordenação normalizada.
- A guarda não sobrescreve seleções válidas dentro do limite.
- Sem mudança de contrato, banco, env ou package.
