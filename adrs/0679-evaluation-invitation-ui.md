# ADR-0679 - Apresentacao dos convites para avaliar

## Status

Aceito em 2026-11-05.

## Decisao

Reutilizar ReviewsIcon e padronizar a acao Avaliar, incluindo o titulo da pagina,
nomes acessiveis e acao de push. O novo titulo e servido pelo backend para novos
pushes e pela apresentacao frontend para notificacoes existentes, sem reenvio.

CommunityMediaBlock aceita afterMedia separado do footer de contato: WhatsApp
mantem seu comportamento sobre o video, enquanto Avaliar fica fora do player,
alinhado pela largura real da midia. Posicoes desktop e mobile sao mutuamente
exclusivas por breakpoint, preservando regras de elegibilidade e formulario.

A lista de pendencias usa nome em largura flexivel e botao azul em linha propria,
conforme o padrao existente de informar pacientes, sem nova abstracao de layout.

## Consequencias

Sem migration, variavel nova, dependencia ou alteracao de envio. Nao altera
pushes ja entregues ao sistema operacional. Validacoes e evidencias na TASK-318.
