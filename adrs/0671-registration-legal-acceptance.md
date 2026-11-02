# ADR-0671 - Aceite explicito durante cadastro

Status: proposta implementada localmente, aguardando validacao.

Reutilizar legal_document_version e legal_acceptance. O novo cadastro envia IDs
das versoes exibidas e confirmacao explicita; o backend valida sob os mesmos locks
da publicacao e grava aceite na transacao de criacao da conta. Clientes anteriores
continuam sujeitos ao gate posterior, sem criar comprovante a partir do campo legado.
Google transporta as declaracoes no estado cifrado vinculado ao navegador.

A data e pessoal e consultada somente pelo cliente autenticado, sem cache publico
ou SSR personalizado. Documentos antigos usam seu proprio ID. Publicacao e aceite
continuam com datas separadas. Sem documentos completos o novo cadastro fica
indisponivel; publicar textos revisados antes de liberar este frontend.
