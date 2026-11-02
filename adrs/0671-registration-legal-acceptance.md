# ADR-0671 - Aceite explicito durante cadastro

Status: implementado e validado localmente em 2026-11-02; sem push/deploy.

Reutilizar legal_document_version e legal_acceptance. O novo cadastro envia IDs
das versoes exibidas e confirmacao explicita; o backend valida sob os mesmos locks
da publicacao e grava aceite na transacao de criacao da conta. Clientes anteriores
continuam sujeitos ao gate posterior, sem criar comprovante a partir do campo legado.
Google transporta as declaracoes no estado cifrado vinculado ao navegador.

A data e pessoal e consultada somente pelo cliente autenticado, sem cache publico
ou SSR personalizado. Documentos antigos usam seu proprio ID. Publicacao e aceite
continuam com datas separadas. Sem documentos completos o novo cadastro fica
indisponivel; publicar textos revisados antes de liberar este frontend.

Hidratar a sessao tambem em acesso direto/nova aba aos documentos; nao depender
somente do Redux preexistente. Resetar o checkbox quando os IDs publicados mudam.
QA com API/PostgreSQL locais e Chrome em 320/390/1440 aprovado; fluxo externo do
Google e textos juridicos finais permanecem fora desta validacao.
