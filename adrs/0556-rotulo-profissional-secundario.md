# ADR-0556 - Rotulo profissional com peso de metadados

## Status

Aceita em 2026-10-05. TASK-216.

## Contexto

Mesmo em grafite, o rotulo em caixa alta compete com a identidade e Favoritar.
O usuario aprovou usar o mesmo peso visual da linha Psicologa / Top mentor.

## Decisao

Substituir a parte tipografica da ADR-0555: Resposta profissional em sentence
case, text-muted, 11px, com o peso do metadado da propria variante (semibold
no feed; medium no card compartilhado). Manter a fonte da Lectum, mb-3 e
line-height existentes. Sem brilho, animacao ou fonte decorativa.
Preservar integralmente o alinhamento do Favoritar aprovado na ADR-0555.

## Consequencias

Hierarquia secundaria consistente com os metadados; moldura e posicao ainda
identificam a resposta profissional. Sem abstracao ou dependencia nova.
Testes de regressao verificam texto, estilos, espaco e ausencia de efeitos.
Validacao mobile/desktop, publicacao somente em homologacao.
