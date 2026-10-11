# ADR-0599: WhatsApp discreto em conteudo sem midia

Status: aceito. Data: 2026-10-11. Task: TASK-25.

## Decisao

Reutilizar CommunityWhatsAppCta e o redirecionador existente: sem midia, somente icone monocromatico com nome acessivel, no endSlot da barra apos Compartilhar. Preservar tracking do post/resposta, identidade, consentimento e fluxo de contato. Onde a previa destacada nao possui barra propria, apresentar apenas o icone na propria previa, sem atribuir contato a barra do post de outra pessoa. Midia com CTA anexado permanece inalterada. Nao adicionar contador publico.

## Impacto e validacao

Somente frontend, mobile-first 390px, sem env, pacote, schema, contrato ou provider novo. Rollback por reversao de codigo. Referencia: capturas do usuario de 11/10; Builder indisponivel. Testes, check/build e visual pendentes. Sem push/deploy.

Implementacao local: icone reutiliza WhatsAppIcon e PsychologistWhatsAppRedirectButton, com mesmo tracking e nome acessivel. Barras do feed/comunidade, Salvos/perfil e detalhe recebem o contato depois de Compartilhar; previas sem barra mantem icone proprio alinhado a direita. Check completo passou (.tmp/oct11-whatsapp-icon-check.log), incluindo 18 testes de controles; ADR indexado validado. Build final aprovado (.tmp/oct11-whatsapp-icon-build-final.log). Browser indisponivel mesmo apos nova tentativa; conferencia visual local ainda pendente. Nao enviar mensagem de WhatsApp nem alterar dados para testar apresentacao.

## Refinamento aprovado em 11/10

Usuario confirmou o aparecimento do contato e solicitou ordem votos, comentario, WhatsApp, salvar, compartilhar. Slot antes de salvar na barra existente; icone reduzido de 18px para 16px sem reduzir alvo de toque. Substitui a decisao anterior de posicionamento apos compartilhar. Mesmo impacto frontend-only, sem alterar destino/tracking. Validacao deste refinamento pendente.

Refinamento validado tecnicamente: check frontend e build aprovados; teste SSR confirma ordem nas barras inline e trailing. Usuario confirmou visual anterior, mas nova ordem/tamanho ainda aguardam conferencia local. Sem commit/push/deploy.

Refinamento final solicitado: icone textual em 17px (antes 16px), preservando ordem, cor, alvo de toque e CTA de videos. Captura do usuario confirma a ordem; tamanho final ainda para conferencia. Sem alteracao de impacto/contrato.
Validacao 17px: 19/19 testes de controles, Biome focal e build frontend aprovados (.tmp/oct11-whatsapp-17-test.log, .tmp/oct11-whatsapp-17-build.log). Sem push/deploy; refinamento visual final pendente. Alvo de toque e CTA com midia nao alterados.

Confirmacao final do usuario: "agora deu certo" para ordem e tamanho 17px; encerra as pendencias visuais anteriores. Sem push/deploy.
