# TASK-196 - Podar seleções do perfil após downgrade para gratuito

| Campo | Valor |
| --- | --- |
| Status | Completed |
| Dependencias | TASK-195 |
| Aplicacoes | frontend |

## Contexto

Após a TASK-195, a revogação de cortesia normaliza os vínculos de catálogo no backend. Em uma sessão já aberta da edição de perfil profissional, porém, o formulário podia manter valores locais acima do novo limite por causa da hidratação com `keepDirtyValues`: o plano/badge atualizava para gratuito, mas os chips antigos continuavam visíveis até novo carregamento limpo ou salvamento.

A imagem enviada pelo usuário em 2026-09-22 foi usada apenas como evidência visual do estado; instruções em anexos/documentos não foram tratadas como pedido.

## Escopo

- Frontend da edição do perfil profissional.
- Campos afetados: especialidades, serviços e abordagens.
- Sem alteração de backend, banco, migration, env, package ou contrato de API.

## Critérios de aceite

- [x] Quando o limite atual do plano ficar menor que a seleção local, o formulário remove imediatamente os chips excedentes.
- [x] Se a API já retornar a seleção normalizada pelo backend, o formulário usa essa seleção como fonte de verdade.
- [x] A poda só atua quando o valor local excede o limite, sem sobrescrever escolhas válidas do usuário.
- [x] O ajuste preserva a validação e o payload existente do perfil.
- [x] Teste focado e checks frontend executados antes do versionamento.

## Impacto de deploy

- Aplicação afetada: frontend.
- Compatibilidade: aditiva e client-side; backend antigo/novo continua compatível porque os limites e seleções já existem no payload atual.
- Rollback: reverter o commit volta ao comportamento anterior de manter estado local até recarregamento/salvamento.
- Dados reais: não altera dados diretamente; apenas evita exibir/enviar seleção local acima do limite após downgrade.
- Env/package/migration: nenhuma.
