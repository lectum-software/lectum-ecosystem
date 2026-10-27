# ADR-0639 — Classificação segura de erros de assinatura

## Status

Aceito — 2026-10-26

## Task relacionada

TASK-32 — Checkout de assinatura.

## Contexto

Após troca de conta recebedora, os logs mostram 404 na consulta do plano persistido e 400 na cobrança. O checkout já renova a referência ausente e alcança a etapa de assinatura. O mapeamento genérico de 400/402/409/422 para recusa de cartão impedia distinguir falhas de integração. O usuário confirmou credenciais trocadas no frontend/backend, recebedor CNPJ e cartão pessoal, com e-mails diferentes no site e na conta recebedora. A resposta original de produção não está disponível; a causa do 400 permanece não confirmada.

## Decisão

Recusa de cartão exige código conhecido em status_detail, error ou cause_codes. Status HTTP isolado mantém o fallback de indisponibilidade. Esta decisão substitui somente a regra genérica de 4xx da ADR-0456. O adapter reconhece mensagens exatas de uma lista fechada e retém somente categoria fixa de diagnóstico; texto desconhecido é descartado. Não há logging de mensagem bruta, cartão, token, e-mail ou payload. Não se alteram cobranças, planos nem assinaturas existentes para tentar corrigir uma hipótese.

## Consequências

A interface não atribui falhas desconhecidas ao cartão. Categorias conhecidas auxiliam a investigação, mas mensagens fora da lista continuam sem diagnóstico específico. A correção da cobrança exige evidência do ambiente publicado; estes ajustes não comprovam retomada dos pagamentos.

## Produção e rollout

Sem migration, dependência ou variável nova. Backend compatível com frontend atual, usando fallback existente. Publicação depende do fluxo local para produção autorizado; sem push/deploy automático. Após publicação, observar diagnóstico de tentativa legítima sem induzir repetição de cobranças. Rollback pelo código anterior, sem mutação de dados.

## Validação

Checkout isolado baseado em origin/homolog ece621aee, versão 0.1.717. Autodeploys de homologação confirmados desligados pelo usuário em 26/10; frontend/admin bloqueiam homolog nos arquivos vercel.json; workflow Stream não é acionado pelos caminhos alterados. Produção antes da publicação: /ping, /health e /ready HTTP 200, versão 0.1.716.

Biome backend, dependências de runtime, typecheck e guardas de versão, segredos, UTF-8, ADRs, tasks, segurança de fonte, envs, tamanho e ciclos aprovados. Suite backend: 968 testes, inicialmente 964 aprovados e quatro falhas causadas por NODE_ENV=test fornecido pelo executor; os 15 testes dos módulos afetados passaram após remover essa variável. DATABASE_URL aponta somente a loopback porta 1 e a chave JWT é exclusiva de testes, sem credenciais reais. A suíte completa será repetida pelos hooks de publicação com essa configuração corrigida. Nenhum teste de pagamento real foi executado.

Build backend aprovado. Hooks de commit/push permanecem gates antes da publicação. Revisão do diff: somente gateway, testes, docs e bump dos cinco manifests; nenhuma alteração de banco ou frontend visual.

## Pendências

Confirmar causa do 400 de produção e validar pagamento após eventual correção da configuração.

## Complemento — resposta não classificada em produção

Após publicar 0.1.717 e confirmar health/ready 200, a nova tentativa retornou somente status 400. A lista de mensagens exatas não cobriu a resposta real. O SDK instalado lança o JSON do corpo, sem anexar os headers em erros; portanto não há request ID recuperável dessa interface.

Ampliar a inspeção em memória para message/error/code/status_detail e descrições em cause/errors, com limites de tamanho e quantidade. Quando não houver correspondência exata, registrar provider_error_unclassified e diagnostic_hints de um vocabulário fechado. Esses sinais não são a causa confirmada: apenas indicam assuntos encontrados no texto. Nunca copiar substrings, nomes, emails, tokens ou texto técnico do provider ao log. Não alterar payload, retries, transporte nem classificação pública a partir desses sinais.

Doze testes direcionados aprovados, incluindo causas aninhadas, resposta sem mensagem e tentativa de injeção de dados no diagnóstico. Publicação segue os mesmos gates e a autorização de concluir o diagnóstico de pagamentos.
