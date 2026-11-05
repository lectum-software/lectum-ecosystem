# ADR-0675 - Identidade fiscal na aprovacao manual

O piloto fiscal ficou em recipient_incomplete por falta de nome fiscal.
A interface tinha aprovacao do CRP e nome fiscal em formularios independentes.

Exigir full_name na confirmacao manual e persistir fiscal_identity_event junto
da aprovacao, na transacao serializavel existente. O CPF e o nome sao os
confirmados nessa acao; nao usar nome publico nem simular consulta ao conselho.
O controle otimista existente impede decisao contra perfil alterado.
Falha ao salvar qualquer evento desfaz toda a aprovacao.

Manter editor fiscal para manutencao de perfis antigos e nao remover aprovacoes
existentes. Nenhuma migracao, emissao ou mudanca de flags e necessaria.
O Admin antigo deve ser atualizado apos o Backend; aprovacoes sem full_name
falham de forma segura durante a transicao.
