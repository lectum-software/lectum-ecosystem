# TASK-262 - Navegacao, Analytics e login gratuito

Status: Done

## Escopo

- [x] Checkout retorna a origem pelo historico seguro, com fallback para Minha Assinatura em entrada direta.
- [x] Analytics gratuito recebe apenas URL/capa do proprio video, sem indicadores pagos.
- [x] Periodo personalizado usa modal comum, foco no titulo, datas contidas e aplicacao explicita.
- [x] Login distingue escolha anterior de plano do entitlement vigente, preservando onboarding de conta nova.
- [x] Validar contratos, API/banco local, navegacao responsiva e builds.

Fonte visual: screenshot e video do usuario de 19/10/2026, inventario local de prototipos. Builder indisponivel; componentes existentes preservados. ADR-0624.

Sem migration, pacote, variavel de ambiente ou alteracao de pagamentos. Sem publicacao remota autorizada neste lote.

## Validacao - 0.1.669

- Checks completos de frontend e backend aprovados. Backend: 926 testes, mais teste novo de loginInclude validado junto aos 5 contratos de analytics.
- Builds de frontend/backend aprovados; cinco manifests sincronizados.
- Chromium com API e PostgreSQL locais reais: login gratuito ativo/expirado/cancelado retorna ao destino normal; conta nova permanece no onboarding; retorno explicito para analytics preservado.
- Midia real carregada na previa gratuita e resposta da API sem metricas. Contas e arquivo temporarios removidos no finally dos testes.
- Checkout retorna a Analytics, Perfil e Minha Assinatura. Entrada direta/fronteira de autenticacao cobertas por testes do helper existente.
- Modal em 320/393/768/1440px: foco no titulo, campos dentro do formulario, Escape com restauracao do foco, intervalo invalido sem consulta e intervalo valido confirmado pela API, reabertura preserva datas aplicadas.
- WebKit movel tambem aprovou a modal nas mesmas quatro larguras, sem erros JS. Validou a fonte de midia no preview, mas nao decodificou o MP4 no Windows; reproducao confirmada apenas no Chromium. Recargas iniciais do Next dev exigiram espera pela hidratacao no harness; nenhum mock de API.
- Evidencias ignoradas em .tmp/task-262-*.log e capturas .tmp/task-262-*.png. Validacao em iPhone fisico permanece externa; nao confundir emulacao com aparelho real.
