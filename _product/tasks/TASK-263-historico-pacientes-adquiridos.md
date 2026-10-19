# TASK-263 - Historico de pacientes adquiridos

Status: Done

- [x] Historico semanal proprio para gratuitos e assinantes, sem dados pessoais.
- [x] Semana atual e quatro anteriores editaveis pela API; antigas somente consulta.
- [x] Total substitutivo compartilhado entre pagina, modal, Analytics e admin.
- [x] Contador adquirido liberado no preview, demais indicadores protegidos.
- [x] Bloco clicavel com chevron; observacao de pessoas unicas; numeros alinhados.
- [x] Personalizado exibe datas aplicadas no seletor, sem linha adicional.
- [x] Migration local, testes reais, checks, builds e QA responsivo.

Referencia: screenshot WhatsApp de 19/10/2026 11:13:54, inventario e componentes existentes. Builder indisponivel. Mobile-first. ADR-0625. Sem push/deploy nesta task.

## Validacao local - 19/10/2026

- Versao 0.1.670 sincronizada nos cinco manifests; builds backend e frontend aprovados.
- Migration 20261019150000_manual_whatsapp_results aplicada via db:migrate somente no PostgreSQL isolado 127.0.0.1:55432/lectum_whatsapp_dev_20261017, sem reset.
- Check raiz: guards e frontend aprovados; primeira suite backend teve timeout no teste preexistente optional-auth-failure. Reexecucao isolada e nova suite backend completas passaram (930/930). Checks admin/video tambem aprovados, assim como lint dos ultimos ajustes e check:version.
- Testes focados: 15 backend e 14 componentes frontend. Integracao real acquired-patients.integration.ts cobre substituicao/zero, concorrencia e unicidade, titularidade, limites, notificacao lida sem inventar resposta, resumo gratuito/admin e paginacao sem repeticoes. Dados temporarios removidos ao terminar.
- Playwright com login/API/banco reais, Chrome e WebKit: larguras 320/393/768/1440, gratis e assinante, clique no card inteiro, salvar/editar, zero, antigas somente leitura, foco da modal, campos contidos e nenhum overflow horizontal/erro de pagina. Seletor personalizado permanece visivel ao redimensionar. Capturas locais em .tmp/task-263-*.png.
- Health/ready/ping locais 200; frontend /version 200. Servidores disponiveis em localhost:3000 e localhost:3001. iPhone fisico nao testado; WebKit local nao substitui essa conferencia.
- Publicacao futura exige migration e backend totalmente atualizados antes do frontend; rollback deve manter suporte a notification_id opcional. Nenhum job externo ou configuracao de producao alterado.
