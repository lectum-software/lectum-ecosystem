# ADR-0635 - Nome fiscal separado do perfil publico

Status: Accepted

Nome de exibicao nao e evidencia fiscal. Guardar revisoes append-only em
fiscal_identity_event, vinculadas a perfil/CPF, origem, data e ator administrativo
ou consulta CFP confirmada. Nao adicionar nome como escalar do perfil, evitando
vazamento em serializadores genericos. APIs administrativas dedicadas, sem rotas
publicas/privadas do profissional. Dados nao vao para logs.

Consulta CFP so e reutilizada se CPF consultado, registro selecionado e data de
confirmacao correspondem ao perfil. Consulta sem confirmacao nao vale. Nome
ausente/divergente bloqueia preparacao da nota, sem fallback para nome publico.
Alteracoes manuais nao mudam nome publico, CRP, cortesia ou acesso. Nota preparada
mantem seu snapshot. Cortesia nao gera cobranca/nota.

O formulario Conceder cortesia tambem exige o nome fiscal e o apresenta na
confirmacao. Usa o mesmo registro/historico, nao um segundo cadastro. Gravar
evento e concessao na mesma transacao serializavel, validando revisao do perfil
e da identidade antes de mudar CPF/CRP. Nome ausente nao usa nome publico.
O payload fiscal e aditivo/opcional no backend para clientes legados durante
rollout; o novo Admin o envia obrigatoriamente. Fluxos legados sem nome mantem
emissao pendente ate completar identidade, sem impedir cortesia por si so.

Migration apenas aditiva, sem colunas obrigatorias em tabelas existentes. Sem
backfill: evidencia historica confirmada pode ser lida com os mesmos criterios.
Aplicar migration local e validar acesso, concorrencia e ausencia nas respostas
do profissional antes de publicar. Deploy futuro: banco/backend antes do Admin.
Rollback preserva tabela e eventos; nenhum provider produtivo ativado.

Publicacao isolada em 24/10: identidade fiscal pode subir antes da TASK-271.
Validador CPF usa a fundacao existente, sem dependencia de contratos/ledger SendNF.
Nao incluir worker, endpoints de notas, envs SendNF ou UI de notas neste lote.
Captura automatica ocorre na confirmacao do registro, nao na simples consulta.
