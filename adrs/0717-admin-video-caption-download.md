# ADR-0717 - Downloads administrativos com legenda

## Decisao

Reutilizar o componente de downloads administrativo e o endpoint existente de render com overlayMode opcional, padrao identification, preservando clientes antigos. A nova escolha captions carrega no servidor a ultima revisao pronta da legenda do asset autorizado e envia cues ao mesmo renderizador social usado pelo psicologo. Nao aceitar cues nem origem fornecidos pelo cliente.

Original continua sendo o download existente, sem transcodificacao. ID corresponde a antiga opcao Com arte. Videos sem autoria profissional mantem apenas Original habilitado. Falta de legenda retorna erro, sem substituicao por outro formato. Consulta e arquivo continuam vinculados ao handle assinado e ao conteudo/autoria.

Lista expansivel com details/summary, botoes nativos, fechamento por Escape/clique externo e foco devolvido ao controle. Durante preparo fica desabilitada. Backend deve ser promovido antes do admin; a previa local nao comprova renderizacao remota.
