# ADR-0630 - Confirmacao transitoria de favorito e nascimento persistido

Status: aceita.

O usuario aprovou retirar indicadores persistentes de favorito do feed, mantendo remocao no perfil e lista de favoritos. A confirmacao local ocorre somente apos sucesso da API, por 900ms, com fade e alternativa sem escala para reduced-motion. Cache compartilhado continua sincronizado; outras instancias nao reproduzem a animacao.

A confirmacao de maioridade coleta nascimento para pacientes e psicologos e preenche seus perfis editaveis. O paciente recebe CalendarController pt-BR antes de Genero. Colunas existentes evitam migration. Validacao de datas impossiveis e idade ocorre no cliente e servidor; contratos opcionais preservam clientes antigos no rollout.

No Google, POST prepara state AES-GCM existente e nonce HttpOnly dedicado ao inicio do login. A URL subsequente contem apenas state cifrado. O callback cria o perfil com a data, sem sobrescrever contas existentes nem registrar nascimento em logs/analytics. A finalidade analitica deve constar na politica de privacidade antes da publicacao.

Rollout: backend, depois frontend. Sem variaveis novas ou efeitos em bancos remotos. Validacao e evidencias registradas na TASK-267.
