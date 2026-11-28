# TASK-378 - Inventario e visitas de pagina no Pixel

Status: Concluida

## Escopo e inventario
Correcao solicitada pelo usuario apos a publicacao da TASK-377. A API emite seis conversoes internas com cinco nomes Meta, todos ja espelhados no Pixel:

| Origem | Meta Pixel / CAPI |
|---|---|
| Cadastro usuario e profissional | CompleteRegistration |
| Contato WhatsApp | Contact |
| Postagem confirmada | forum_post |
| Inicio de checkout | InitiateCheckout |
| Primeira assinatura confirmada | Subscribe |

Google usa sign_up, whatsapp_click, forum_post, begin_checkout e subscribe para essas acoes; page_view estava sem equivalente Meta. Adicionar PageView explicito. page_leave e diagnostico de navegacao Google, nao conversao CAPI nem requisito para visitas de destino; permanece Google. Nao inventar ViewContent, Purchase ou Lead inexistentes.

## Aceite
- [x] PageView apos consentimento valido, flags e resposta do backend com Pixel ID.
- [x] Um evento por visita, sem repeticao por polling/StrictMode; retorno a rota gera nova visita.
- [x] Revogacao e rotas privadas interrompem envio; corrida durante SDK nao transmite.
- [x] Conversoes preservam eventID da API; PageView somente browser, sem falsa deduplicacao CAPI.
- [x] Check e build locais aprovados.

ADR-0742. Sem migration, dependencias ou variaveis novas. Apenas frontend funcionalmente alterado. Rollback por versao anterior ou flag existente. A Meta pode bloquear a entrega no navegador; confirmacao de LPV atribuida exige clique real em anuncio, nao e garantida por teste unitario. Nenhuma conversao de negocio artificial.

## Evidencias
Versao 0.1.883. Check completo do frontend e 68 testes de privacidade aprovados. Build com NEXT_PUBLIC_META_PIXEL_ENABLED=true aprovado. Navegador local em 390/1440: aceite, recusa, sem overflow e sem Meta em localhost. Backend: biome, dependencias, tipos e 1570 testes aprovados; 61 opcionais skipped. A configuracao local de DATABASE_URL e JWT foi fornecida somente ao processo de validacao. Nenhuma alteracao funcional de backend. Recebimento remoto de PageView e atribuicao publicitaria sao verificacoes distintas; nao declarados como resultado dos testes locais.
