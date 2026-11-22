# ADR-0704 — Anonimato público e medição consentida

Por solicitação explícita do usuário em 22/11/2026, anonymous controla somente a apresentação pública. Posts publicados de usuários comuns, inclusive anônimos, podem gerar forum_post sob as mesmas verificações de consentimento anterior e vigente, autoria, estado, origem revisada e deduplicação. A resolução na fila e na entrega usa a mesma regra. Revogar consentimento continua impedindo entrega.

Remover apenas o filtro anonymous=false; não exportar conteúdo, título, comunidade nem o atributo anonymous. Não alterar payload, política de origem, dados públicos ou reprocessar posts antigos. A dica existente explica que anonimato público não desativa medição autorizada. Layout existente preservado; sem novas APIs Next. Documentação Next embarcada ausente conforme ADR-0703.
