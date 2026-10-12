# ADR-0600: Abas de Minhas publicacoes

Status: aceita. Data: 2026-10-11. Task: TASK-28.

Reutilizar apresentacao das abas do perfil publico: duas colunas, capsula branca selecionada e contagem apos o rotulo. Preservar callbacks, contagens reais, estado carregando/desabilitado e nomenclatura Respostas para psicologos / Comentarios para pacientes. Sem alterar cards ou metricas nesta etapa. Mobile-first 390px, capturas do usuario e proto como referencia; Builder indisponivel.

Frontend-only; sem env, pacote, schema, contrato, dados ou efeitos externos. Rollback por reversao. Check/build/browser pendentes. Sem push/deploy.

Validacao tecnica: check frontend completo (.tmp/oct11-mine-tabs-check-final.log), build (.tmp/oct11-mine-tabs-build.log) e 21 testes de controles incluindo SSR das duas nomenclaturas, contagem zero, carregamento e disabled aprovados. Browser continua indisponivel (kernel da ferramenta encerra); conferencia visual autenticada pendente. Sem commit/push/deploy deste complemento.

Refino apos captura do usuario: aplicar text-xs/font-bold/leading-none tambem ao span do rotulo, como ProfileTabs. A regra global button { font: inherit } sobrepoe tipografia do botao; nao alterar regra global nem fonte da aplicacao. Preservar medidas e contadores. Validacao do refinamento pendente.
Validacao do refino: 21/21 testes de controles (incluindo classes explicitas do rotulo), Biome e build frontend aprovados. Logs: .tmp/oct11-mine-tabs-font-test.log e .tmp/oct11-mine-tabs-font-build.log. Sem alterar fonte global, callbacks, contadores ou consultas. Visual atualizado pendente; sem commit/push/deploy.

Validacao final: usuario aprovou a tipografia e apresentacao local em 2026-10-11 (aprovado, continue). Automacao indisponivel; evidencia visual manual do usuario. Task concluida para commit local, sem push/deploy.
