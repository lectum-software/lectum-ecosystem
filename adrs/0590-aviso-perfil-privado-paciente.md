# ADR-0590 - Aviso de perfil nao publico do paciente

Data: 2026-10-10
Status: aceito; implementacao local em validacao

## Decisao aprovada pelo usuario
Aviso somente para paciente, entre cabecalho e menu do perfil. Titulo: "Seu perfil nao e publico". Explicar que somente psicologos tem perfil publico; nome/foto do paciente podem aparecer em publicacoes nao anonimas. Botao "Entendi" com persistencia por conta, entre dispositivos. Conteudo consultavel em Privacidade apos dispensar. Nao representar esse clique como consentimento legal.

## Inspecao
- Branch homolog. Alteracoes anteriores de Salvos preservadas e separadas.
- Perfil paciente usa auth.id e role paciente, sem consulta publica por id de terceiro. Diretorio publico exige role psicologo (profile-query.ts). community-response.ts mascara nome/avatar em posts anonimos.
- Reutilizar mecanismo account/onboarding-tips, com campo proprio; nao reutilizar outra dica nem esconder erro de persistencia como sucesso. Hook atual possui fallback local em falhas; este aviso deve exigir confirmacao do servidor.
- Builder/Quick Copy indisponivel; referencia consultada: _product/proto/Perfil do paciente.jpg. Implementacao mobile-first 390px, preservando componentes e tokens atuais.

## Pendencia antes de escrever no banco
A configuracao backend/.env usa PostgreSQL remoto, nao localhost; NODE_ENV=dev e nome generico do banco nao comprovam isolamento de homologacao/producao. Confirmar com o usuario que esse alvo e exclusivamente de desenvolvimento antes de executar migrate dev. Nenhum schema/migration ou dado alterado nesta etapa. Sem reset, seed ou uso de dados falsos.

## Plano de compatibilidade
Adicionar flag propria com default seguro para contas existentes; contrato opcional/aditivo. Campo ausente no backend antigo nao confirma aceite. Migracao antes do backend, frontend depois; rollback preserva coluna/dados. Executar pnpm --dir backend db:migrate apos confirmar isolamento. Sem env ou package novo; sem push/deploy autorizado. Checks/build/browser e commit ficam pendentes da implementacao.

## Resolucao de isolamento - 2026-10-10
Usuario autorizou preparar o necessario sem conhecer o alvo remoto. Nao inferir isolamento por NODE_ENV: usar cluster PostgreSQL portatil exclusivamente em 127.0.0.1:55432, em .tmp ignorado, sem servico Windows nem acesso externo. Binarios oficiais EDB/PostgreSQL 17 (https://www.enterprisedb.com/download-postgresql-binaries); ferramenta de desenvolvimento, nao dependencia npm do produto. Nenhum banco remoto sera migrado. Cluster com senha aleatoria SCRAM, acesso somente loopback; processos locais com schedulers e integracoes externas desativados.

## Divergencia de indice detectada no cluster isolado
A geracao automatica inicial em banco vazio incluiu DROP INDEX notifications_user_id_seen_at_idx, pois a migration historica 20260920120000 cria esse indice mas o schema nao o declarava. A migration inicial ja havia sido aplicada SOMENTE ao cluster local e nao foi editada. Declarado o indice no schema e gerada migration corretiva seguinte que o recria, preservando o estado final e o historico imutavel. Antes de eventual publicacao, revisar custo da recriacao em notifications; nenhum ambiente publicado foi migrado nesta task.

## Implementacao
Frontend reutiliza useAccount com modo requirePersistedTips opt-in, sem fallback local em leitura/escrita e exigindo o valor confirmado pelo servidor. Outras dicas preservam seu contrato. Flag opcional no cliente para backend anterior; falha mostra mensagem segura e nao dispensa o aviso. Privacidade abre modal existente com a mesma explicacao e link da politica, sem alterar textos legais. Backend permite atualizar a nova flag apenas ao paciente autenticado e usa current.id, nunca id do payload.

## Evidencias parciais
Cluster local aplicado com pnpm --dir backend db:migrate, incluindo migration corretiva de indice; sem reset. Copias minimas de duas contas existentes (users, patient_profiles, user_tokens) transferidas em transacao READ ONLY da origem para o cluster local, sem inventar dados. Integracao real via services/repositorios: persistencia em conexao independente, idempotencia, isolamento entre contas, psicologo negado e outras dicas preservadas; valor de teste restaurado apenas na copia local. Credenciais/runtime permanecem em .tmp ignorado e nao entram no commit. SMTP, push, pagamentos, storage de escrita, geolocalizacao e schedulers desabilitados no backend de teste.

Configuracao local persistida: backend/.env (ignorado) agora aponta ao cluster loopback e desabilita efeitos externos; original preservado em arquivo privado ignorado. Instrucoes de reinicio em .tmp/README-privacy-local.md. Isso nao altera qualquer configuracao de provedor publicado. Builds backend/frontend 0.1.619 aprovados; bump unico ja executado.

## Refinamento visual solicitado em 2026-10-10

Botao Entendi usa variante primaria azul. Nomes nos cabecalhos privado (paciente e psicologo) e publico profissional preservam tamanho/peso e recebem entrelinha 1.4; o nome privado limitado a duas linhas ganha 2px de respiro inferior para descendentes. Ajuste localizado, sem alteracao global de tipografia, contrato ou dados. Referencias: capturas enviadas pelo usuario e PROTO-INVENTORY (perfis TASK-15/18/21); Builder indisponivel neste cliente. Browser real local: perfil privado inspecionado em 390px e desktop. Perfil publico com nomes contendo descendentes ainda depende de cadastro profissional publicado no banco local isolado; nao criar mock para substituir essa evidencia. Biome dos dois componentes e 20 testes de profile-hero aprovados; build atualizado em verificacao. Nenhum push/deploy.

Validacao final deste refinamento interrompida: disco C sem espaco livre durante o build local. Nao usar VPS, nao excluir dados. Build nao aprovado e commit permanece pendente. Biome focal, testes e inspecao do perfil privado aprovados antes da interrupcao.

## Correcao de sincronizacao apos editar perfil - 2026-10-10

Causa: Redux recebia o nome confirmado, mas PrivateTemplate remontava com auth_hydrate antigo e sobrescrevia Redux. usePatient agora cancela leituras concorrentes e atualiza o cache de hidratacao da mesma conta com o retorno real antes do callback/redirecionamento. Preserva campos de sessao nao retornados pela API; nao cria sessao nem altera outra conta. Mesmo caminho para salvar/remover avatar. Sem backend, contrato, dependencia ou env nova. Validacao completa/build e commit seguem pendentes do espaco em disco; sem push/deploy.

Evidencia browser local: cabecalho exibia valor antigo; formulario real ja continha o nome novo salvo pelo usuario. Salvar sem modificar campos retornou automaticamente a /app/perfil mostrando o nome persistido, sem reload. Biome focal aprovado. O teste nao alterou o nome escolhido pelo usuario nem tocou producao.

## Retomada do build local - 2026-10-10
Usuario autorizou excluir somente frontend/.next/cache. A opcao existente LECTUM_LOW_DISK_MODE=1 passou a desativar cache webpack tambem no build, nao apenas no dev; comportamento padrao permanece inalterado. Trade-off local: compilacoes subsequentes sem reaproveitamento de cache, reduzindo disco utilizado. Sem package ou env obrigatoria nova. Build frontend e backend concluidos; db:migrate confirmou banco isolado sincronizado. Check completo ainda em execucao; validacao visual restante e revisao de rollout das migrations continuam gates de publicacao.

## Validacao integrada e runtime local - 2026-10-10
pnpm check completo aprovado (exit 0): frontend, backend (896 testes), admin e video. Builds frontend/backend aprovados. A primeira repeticao teve timeout de um teste de autenticacao sob carga; o teste isolado e a segunda suite completa passaram sem alterar timeout nem suprimir testes. Integracao do aviso no banco isolado passou novamente, restaurando a flag local.

next start com API HTTP localhost nao serve como smoke autenticado: a politica existente de origens rejeita loopback em NODE_ENV=production, resultando em api.invalid. Restaurado next dev para QA local, sem relaxar a protecao nem apontar localhost a producao. Browser confirmou Salvos autenticado sem erro de sessao apos a troca. Validacao dos cards com conteudo ainda em andamento; nenhum push/deploy.

## Evidencia final para publicacao autorizada
Check geral exit 0, builds backend/frontend aprovados, db:migrate local sem pendencias e integracao real aprovada. Smoke local de perfil privado/nome sem reload e aprovacao visual do usuario registrados. Hero publico: testes aprovados; perfil publico nao abre na copia minima por ausencia deliberada de dados cadastrais privados. Nao fabricar cadastro nem copiar CPF para validar tipografia. Manter essa limitacao especifica explicita. Preflight READ ONLY produtivo confirmou notifications 516096 bytes e indice 40960 bytes; migracoes aditivas e indice corretivo mantidos imutaveis. Build local funcionou com LECTUM_LOW_DISK_MODE existente, sem cache webpack; comportamento padrao de producao inalterado.
