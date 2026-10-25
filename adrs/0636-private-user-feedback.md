# ADR-0636 - Feedback privado dos usuarios

Status: Aceito

Dependencia: sharp 0.35.5 no backend, com runtime Node >=20.9 compativel com
o projeto. Necessaria para decodificacao/limite de pixels, recodificacao e
remocao de EXIF; nao confiar somente em MIME/extensao fornecidos pelo cliente.

## Decisao
Formulario unico para problemas tecnicos e sugestoes, acessivel a pacientes e
psicologos autenticados. Classificacao somente no Admin, separada de denuncias.
Capturas opcionais: ate tres JPEG/PNG/WebP, 5 MiB de entrada por arquivo.
Sharp verifica e recodifica para JPEG (maximo 1600px, 1 MiB), removendo EXIF.
Persistir binarios em tabela separada no PostgreSQL, nunca no bucket publico
existente. Limites de envio (5 por usuario/24h), tamanho e pixels limitam abuso.
Essa escolha evita uma nova dependencia de bucket privado; aumenta armazenamento
e backups do banco. Rever armazenamento privado externo antes de grande volume.
Listas nunca consultam binarios; download somente por rota autenticada do Admin,
sem cache. Nenhum acesso publico ou por outros usuarios.
Idempotencia por usuario/chave UUID e transacao serializavel; alteracoes Admin
usam revisao otimista e auditoria sem copiar texto/anexos para logs.
Capturar somente versao e viewport; sem telemetria oculta, UA ou dados de sessao.
Dados e notas nao sao publicados ao psicologo/paciente.
Sem notificacoes, emissao fiscal ou disparos externos.

Refinamento de 25/10/2026: suporte separado dos links legais existentes na tela
de ajuda; envio em largura total apos os anexos. Textos reduzidos a pedido do
usuario, sem mudar os limites de upload, autenticacao ou contrato de metadados.
Preview de leitura usa capturas locais, nunca uma rota publica de bypass.

## Rollout e rollback
Schema expansivo com tabelas novas. Aplicar migration no backend antes das UIs.
Sem novas envs. Rollback de codigo conserva dados; nunca apagar tabelas.
Validar autorizacao, limites, idempotencia, concorrencia, anexos e fluxos reais.
