# TASK-310 - Aceite no cadastro e data de confirmacao

## Escopo
- Checkbox inicialmente desmarcado no cadastro por e-mail e na modal de nascimento do Google.
- Links dos documentos junto ao checkbox, sem duplicacao no rodape do cadastro.
- Aceite atomico de versoes publicadas, sem converter campo legado em consentimento.
- Topo de Termos e Privacidade informa aceite da versao consultada para o proprio usuario.
- Visitantes nao recebem informacoes de aceite.

## Aceite
- [ ] Email e Google registram versoes exatas e rejeitam alteracao concorrente.
- [ ] Data vem de legal_acceptance; falha de consulta nao equivale a falta de aceite.
- [ ] Testes e verificacoes locais; nenhum push/deploy.

## Rollout
Backend antes do frontend. Cadastro novo exige documentos publicados e acessiveis.
Nao publicar documentos juridicos nem inventar datas/aceites durante esta task.
