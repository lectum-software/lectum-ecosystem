# Auditoria integral de produção — correções

Concluída em 08/08/2026.

## Escopo conferido

- Todos os arquivos versionáveis do repositório foram lidos.
- Backend, frontend, admin, scripts, configurações, tasks e ADRs foram auditados.
- Arquivos `.env` foram conferidos sem revelar seus valores.
- Dependências, caches e saídas de build foram validados pelos checks próprios, mas não tratados como código autoral.
- `sample/` serviu apenas como referência técnica de divisão e contratos citados; nada antigo foi copiado como produto final.

## Itens corrigidos

1. O fluxo de implementação foi fixado na branch `homolog`.
2. Push local direto para `main` passou a ser bloqueado.
3. As regras passaram a tratar homologação e produção como ambientes com dados persistentes.
4. Alterações de banco passaram a exigir migration e validação durante a execução.
5. Reset de banco ficou proibido sem autorização explícita.
6. Campos obrigatórios novos passaram a exigir estratégia compatível com dados existentes.
7. Variáveis obrigatórias novas passaram a exigir alerta antes do deploy.
8. Frontend, backend e admin continuam tratados como aplicações independentes.
9. O Docker do backend passou a aplicar migrations antes de iniciar por padrão.
10. Sessões de usuário passaram a usar cookie `HttpOnly` nos clientes atuais.
11. Sessões administrativas passaram a usar cookie `HttpOnly` restrito às rotas do admin.
12. JWTs deixaram de ser devolvidos ao JavaScript dos clientes atuais.
13. A transição temporária de clientes antigos por bearer foi preservada sem quebrar login.
14. JWTs passaram a aceitar somente o algoritmo `HS256` configurado.
15. Tokens e usuário do admin deixaram de permanecer no `localStorage`.
16. Redux deixou de persistir dados de autenticação.
17. “Visualizar como” deixou de persistir o token temporário em cookie JavaScript.
18. O token de “visualizar como” é removido da URL antes da navegação.
19. Logout passou a revogar a sessão atual no banco.
20. Logout remove apenas dados pertencentes à Lectum no navegador.
21. Sessões antigas ganharam limite máximo de validade.
22. Sockets voltam a conferir a validade da sessão.
23. Sockets deixaram de enviar ou renovar JWT na hidratação.
24. Todas as rotas privadas do admin receberam proteção central.
25. Rotas de paciente passaram a exigir o perfil correto.
26. Autenticação opcional passou a validar o identificador do dispositivo.
27. Cabeçalhos de proxy só são confiados quando o proxy está explicitamente configurado.
28. Analytics deixou de confiar em IP encaminhado sem proxy confiável.
29. Recuperação de senha não informa se o e-mail existe.
30. Senhas novas usam hash forte e hashes antigos continuam compatíveis.
31. Confirmação de senha deixou de ser persistida.
32. Login Google ganhou proteção contra retorno forjado.
33. Redirecionamentos externos maliciosos no login foram bloqueados.
34. Códigos temporários do Google passaram a funcionar uma única vez.
35. Uploads passaram a conferir extensão, MIME e assinatura binária.
36. Uploads ganharam limites de quantidade, tamanho, fila e concorrência.
37. Upload interrompido passa por limpeza segura.
38. A API deixou de tentar criar bucket R2 durante uma requisição.
39. Arquivos privados deixaram de sair por uma rota pública genérica.
40. URLs de mídia passaram a aceitar apenas origens confiáveis.
41. A API ganhou limite de tamanho para o corpo das requisições.
42. O rate limit ganhou limite de memória.
43. A API ganhou `/health` e `/ready`, incluindo teste real do banco.
44. O servidor ganhou encerramento seguro em deploys e reinícios.
45. Chamadas externas ganharam timeout para não bloquear telas indefinidamente.
46. Repetição automática de queries ficou restrita a falhas temporárias.
47. Campanhas automáticas antigas ficaram desligadas por padrão.
48. Tarefas agendadas deixaram de executar em duplicidade na mesma instância.
49. Falha de e-mail deixou de ser tratada como sucesso.
50. Mensagens técnicas deixaram de aparecer para usuário e administrador.
51. Erros públicos não mostram stack, SQL, URLs internas ou detalhes de fornecedores.
52. Erros do Mercado Pago e de outras integrações passaram a ser traduzidos para mensagens seguras.
53. Status 401, 403, 404, 408, 429 e 5xx passaram a usar mensagens públicas previsíveis.
54. Logs críticos deixaram de registrar tokens, CPF, IDs de planos e payloads sensíveis.
55. Logs de webhook deixaram de registrar identificadores recebidos integralmente.
56. Logs de socket deixaram de registrar a origem completa bloqueada.
57. Respostas do admin deixaram de explicar tabelas, colunas e mecanismos internos.
58. Tooltips deixaram de expor nomes técnicos de fontes e métricas.
59. Exportações CSV passaram a bloquear fórmulas maliciosas.
60. Exportações de tráfego deixaram de expor metadados internos.
61. A antiga listagem pública de usuários foi removida.
62. Respostas sensíveis passaram a bloquear cache do navegador.
63. Componentes repetidos de erro e loading foram centralizados.
64. Paginação repetida no admin virou um componente compartilhado.
65. Regras repetidas de datas e períodos foram centralizadas.
66. Cálculos de dias passaram a respeitar datas civis e horário de verão.
67. Formatação repetida de comunidade foi centralizada.
68. Textos expansíveis repetidos viraram componente compartilhado.
69. Tratamento de imagens e URLs do admin foi centralizado.
70. Acesso repetido a sessões foi extraído para repositório próprio.
71. Arquivos gigantes foram divididos por composição, domínio, dados e visualização.
72. Fachadas públicas foram preservadas para evitar quebra de imports e contratos.
73. O detalhe administrativo do psicólogo foi separado por abas e responsabilidades.
74. Dashboards do backend foram separados por consultas, cálculos e montagem de resposta.
75. A busca de psicólogos foi separada em contexto, hooks, módulos e views.
76. Repositórios extensos foram divididos atrás das fachadas existentes.
77. Dados estáticos extensos foram movidos para JSON validado.
78. O ciclo de imports do Socket.IO foi removido.
79. Um check automático passou a bloquear novos ciclos de imports.
80. Um check automático passou a bloquear crescimento de arquivos gigantes.
81. O baseline de arquivos grandes foi reduzido a zero.
82. Exports públicos foram comparados antes e depois das divisões.
83. Os packages locais de Swagger, Validator e Seed mantiveram seus contratos legados.
84. As dez exceções `@ts-nocheck` ficaram presas a uma lista fechada de compatibilidade.
85. O Swagger de `src` e `dist` voltou a produzir o mesmo documento.
86. O Swagger compilado manteve 64 paths e 73 operações.
87. A execução de seeds destrutivos não foi usada na auditoria.
88. Cores diretas foram substituídas por tokens semânticos.
89. Utilities com paletas nomeadas passaram a ser bloqueadas automaticamente.
90. Elementos `<img>`, HTML injetado, SQL inseguro e `eval` passaram a ser bloqueados por check.
91. Mocks e linguagem de implementação na interface passaram a ser bloqueados por check.
92. Textos com encoding inválido passaram a ser bloqueados por check.
93. Uma migration aditiva corrigiu especialidades históricas com caracteres inválidos.
94. A migration histórica já aplicada foi preservada sem mudança de checksum.
95. A correção de encoding altera somente registros ainda corrompidos.
96. O redirecionamento legado `/dashboard` do frontend passou a usar a rota canônica protegida.
97. Botões indisponíveis passaram a ficar realmente desabilitados para teclado e leitor de tela.
98. Estados mortos de “Em breve” foram removidos de áreas já implementadas.
99. A tela do admin deixou de mostrar a porta técnica do ambiente local.
100. O repositório passou a verificar credenciais acidentalmente versionadas.
101. O repositório passou a comparar envs usadas com os `.env.example`.
102. Biome e ESLint passaram a falhar diante de qualquer warning.
103. Dependências runtime do backend passaram a ser verificadas.
104. Dependências de produção dos três aplicativos ficaram sem vulnerabilidade conhecida.
105. Quarenta e cinco testes automatizados do backend passaram.
106. Builds de backend, frontend e admin passaram separadamente.
107. A imagem Docker do backend foi construída e testada.
108. `/health` e `/ready` responderam `200` dentro do container.
109. Login e rotas protegidas foram testados em 390 px e desktop sem overflow.
110. O feed público saiu do loading e renderizou dados da API configurada.

## Atenção no deploy

- Branch atual: `homolog`; validar esse ambiente antes de qualquer merge para `main`.
- Existe uma migration nova, aditiva e compatível: `20260808140000_repair_specialty_text_encoding`.
- Ela já foi aplicada no banco configurado para desenvolvimento/homologação; nenhum reset foi feito.
- `prisma migrate dev` foi executado, mas o schema engine não concluiu contra o banco remoto.
- `prisma migrate deploy` concluiu as 89 migrations e a checagem final encontrou zero nomes inválidos.
- Não houve coluna nova, nova env obrigatória ou package novo.
- Sessões antigas podem pedir novo login.
- Campanhas automáticas devem continuar desligadas até revisão operacional.

## Validação final

- `pnpm check`: aprovado sem warning.
- Backend: check, 45 testes e build aprovados.
- Frontend: check, build e smoke visual aprovados.
- Admin: check, build e smoke visual aprovados.
- Swagger de fonte e build: equivalentes.
- Auditoria de dependências de produção: nenhuma vulnerabilidade conhecida.
- Docker do backend: build, `/health` e `/ready` aprovados.
- Migration: aplicada sem reset e sem perda de dados.

## Limites conhecidos

1. Dez arquivos dos packages portados ainda usam `@ts-nocheck` para preservar compatibilidade.
2. O fallback bearer só deve ser removido após encerrar a transição dos clientes antigos.
3. A CSP ainda precisa de uma task própria para substituir `unsafe-inline` por nonce ou hash.
4. Rate limit e schedulers precisam de coordenação distribuída antes de múltiplas réplicas.
5. O `401` da hidratação anônima do admin é esperado e não concede acesso.
