# TASK-270 - Notificacoes selecionam a metrica dos Analytics

Status: Done

## Escopo

Novo favorito abre Favoritado; visualizacao de perfil abre Acesso ao perfil.
Valer para notificacoes existentes e futuras, sem reescrever dados.
Manter destinos push, retorno de navegacao e periodo padrao de 30 dias.
Carrossel revela a selecao em celular sem deslocar a pagina verticalmente.
Referencia: captura e pedido do usuario em 23/10/2026; PROTO-INVENTORY
consultado. Sem redesenho; Builder indisponivel. ADR-0633.

## Aceite

- [x] Destinos in-app por tipo e pushes preservados.
- [x] URL seleciona metrica valida sem restore; invalida usa WhatsApp.
- [x] Contador selecionado visivel em mobile e desktop.
- [x] Checks, build e navegacao local validados.

## Validacao

Frontend check completo e build aprovados. Backend check completo: 956 testes
aprovados. Source-safety, versao, ADRs e tasks aprovados.
Playwright com API e PostgreSQL locais: avisos com destinos legados abrem
Favoritado/Acesso ao perfil, contador visivel, retorno as Notificacoes e sem
overflow em 390/1440px. Conta/notificacoes temporarias removidas no finally.
Sem chamadas de push reais, sem dados artificiais em codigo publicado.
Versao local 0.1.711. Sem push ou deploy.

## Deploy e rollback

Backend e frontend; contrato query aditivo. Sem migration, dependencia ou env.
Frontend antigo ignora metric sem restore; backend antigo segue compativel.
Rollback de codigo. Sem push/deploy automatico.
