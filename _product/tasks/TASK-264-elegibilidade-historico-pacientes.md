# TASK-264 - Elegibilidade do historico de pacientes adquiridos

Status: Done

- [x] Texto da modal: X pessoas clicaram no seu botao de WhatsApp neste periodo.
- [x] Lista usa clique/cliques no WhatsApp, preservando deduplicacao por pessoa.
- [x] Historico comeca no cadastro; primeira semana exibe apenas o periodo desde o cadastro.
- [x] Semanas sem cliques nao aparecem; estado vazio e paginacao coerentes.
- [x] API impede gravacao anterior ao cadastro ou sem cliques.
- [x] Pergunta aprovada nas duas modais: Quantos novos pacientes voce adquiriu pela Lectum neste periodo?
- [x] Quantidade adquirida independente de cliques, com validacao consistente no formulario/API/banco.
- [x] Testes reais, checks/builds e QA responsivo; commit local sem push/deploy.

Usuario aprovou adquiridos acima dos cliques e a pergunta ampliada. Referencia: capturas de 19/10/2026 15:16-15:20 e componentes/inventario existentes. Builder nao usado; alteracao pontual mobile-first. ADR-0626.

## Validacao local - 19/10/2026

- Versao 0.1.671. Migration validada via db:migrate no banco isolado lectum_whatsapp_dev_20261017 e aplicada via migrate deploy no banco local da previa lectum_privacy_dev, sem reset nem perda de cadastros. A primeira tentativa falhou somente no shadow por nome de constraint; corrigida antes de aplicar nos bancos de dados.
- Integracao real cobre primeira semana parcial, cliques anteriores ao cadastro ignorados, ausencia de semanas vazias, paginacao limitada, autoria, zero, edicao, notificacao lida e adquiridos superiores aos cliques preservados no resumo gratuito/admin.
- Playwright Chrome e WebKit com API/banco reais: larguras 320/393/768/1440, estado vazio, datas desde cadastro, clique singular, textos aprovados nas duas modais, salvar 3/4 pacientes com 1 clique e contador gratuito atualizado. Contas temporarias removidas. Capturas em .tmp/task-264-*.png. WebKit passou na repeticao apos timeout inicial; iPhone fisico nao testado.
- Builds backend/frontend aprovados. Check raiz completo aprovado (frontend, backend 930/930, admin e video); skips preexistentes de symlink no Windows e testes opcionais do servico de video. Nenhum teste funcional desta task ignorado.
- Sem push/deploy. Para futura publicacao, aplicar migration e backend antes do frontend; manter restricao relaxada em rollback.
