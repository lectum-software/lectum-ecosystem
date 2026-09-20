# ADR 0522 — Modal de upgrade para upload de mídia nas comunidades

Data: 2026-09-20

## Status

Aceita

## Contexto

Psicólogos com plano gratuito viam o controle de upload de mídia em posts e respostas de comentário, mas o bloqueio era comunicado inline ou pela indisponibilidade do botão. Como o produto usa "psicólogo verificado" como equivalente ao profissional assinante, a restrição precisa orientar o upgrade sem abrir seletor de arquivos nem expor detalhes técnicos.

## Decisão

Manter o controle de mídia visível em cinza para psicólogos sem permissão, porém clicável para abrir uma modal explicativa. A modal usa o texto aprovado:

- Título: `Upload de mídia disponível para psicólogos verificados`
- Corpo: `Para publicar imagens ou vídeos em posts e respostas, é necessário ter o perfil profissional verificado.`
- CTA primário: `Fazer upgrade`

O CTA direciona direto para o pagamento do plano profissional (`PSYCHOLOGIST_ONBOARDING_PATHS.checkout`), evitando uma etapa intermediária para quem já decidiu fazer upgrade. A regra continua sendo aplicada pelas permissões já existentes e pelo backend; a UI apenas substitui o feedback inline/toast por orientação explícita.

## Consequências

- Psicólogos gratuitos entendem o motivo do bloqueio sem iniciar upload.
- Pacientes continuam sem ver o controle de mídia.
- Psicólogos verificados mantêm o botão ativo e o fluxo de upload atual.
- Mudança frontend-only, sem nova env, package, migration, contrato de API ou mock.
- Rollback: reverter o componente de modal e os handlers que abrem a modal, retornando ao bloqueio visual anterior.
