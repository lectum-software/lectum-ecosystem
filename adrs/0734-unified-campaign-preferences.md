# ADR-0734 - Escolha unica de campanhas no painel

Data: 2026-11-25
Status: Aceito

## Contexto
O usuario pediu uma unica opcao Google/Meta, ligada por padrao, e descricoes essenciais.

## Decisao
Substituir os dois controles por um, mantendo os registros e validacoes de cada provider. Salvar aplica a selecao aos dois; aceitar e recusar continuam explicitos. A pre-selecao nao e consentimento: nenhum efeito grava autorizacao ao abrir. Uma recusa valida de qualquer provider deixa o controle desligado. Quando nao ha escolha, fica ligado. Preferencias mistas antigas nao sao migradas; somente a proxima acao explicita sincroniza as escolhas. Escopo Google continua no navegador e Meta preserva regras de conta e revogacao.

Simplificar os textos do painel, mantendo link para a politica e controles separados de experiencia e associacao. Nao alterar o documento legal publicado ou ampliar dados coletados. Esta decisao substitui apenas a separacao visual definida na ADR-0733.

## Validacao
TASK-370: testes existentes de consentimento, check/build frontend e navegador local em 390/1440px. Nenhuma publicacao automatica.
