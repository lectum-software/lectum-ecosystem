# Auditoria Lectum — evidências e limitações

[Resumo das correções](AUDITORIA-2026-09-10.md). Auditoria em andamento; não é liberação para produção.

Correções 1–11 publicadas em `0.1.311` (`fa6a6dce`). **Smoke de 10/09, 22:50 UTC:**
backend, frontend e Admin confirmados nessa versão; 16 verificações HTTP passaram, incluindo
`/health`, `/ready`, mensagens PT-BR, imagens e bloqueio de rotas privadas. Video privado não
consultado remotamente. Nenhum reset, limpeza de dados ou cobrança foi feito.

Correções 12–15 enviadas em `389b72c3`, versão `0.1.312`. Senha e código validados no Browser local e por 10
regressões. O novo ciclo completo de cadastro/confirmação em homolog ainda precisa ser repetido
após o deploy; teste isolado de controller não equivale a confirmação real por e-mail.

### Pendência impeditiva para promoção: documentos legais

- Cadastro exige aceite, mas não oferece links para ler os documentos.
- TASK-41 e ADR-0440 já registravam o bloqueio; as minutas de `_product/legal` não estão aprovadas.
- Versões de aceite nos cadastros ainda dizem `pending-legal-copy`.
- É necessário aprovar os textos, responsável/controlador, contatos, idade mínima e política
  comercial com revisão jurídica. Não publicar placeholders nem tratar esta auditoria técnica
  como parecer jurídico. Não existe edição jurídica pelo Admin implementada nesta task.

## Cobertura real até aqui

- Base: `70d6b726` / versão `0.1.309`, branch `homolog`.
- **3.121 arquivos versionados inventariados**. Isso não significa que todos já foram revisados.
- [Inventário por arquivo](AUDITORIA-2026-09-10-INVENTARIO.tsv): hash do Git, tamanho,
  classificação e estado de leitura na base. Arquivos alterados/criados depois entram no diff da task.
- [Entradas de rotas](AUDITORIA-2026-09-10-ROTAS.tsv): 449 entradas estáticas; caminhos de Express
  ainda precisam ser compostos com seus mounts e routers filhos. Não é lista certificada de endpoints.
- Baseline e check final aprovados: frontend 117, backend 292, Admin 35 e video 32 testes
  (476 testes, sem falhas ou skips) em `0.1.310`. Complemento `0.1.311`: 477 testes
  (backend 293) e quatro builds aprovados; build Docker completo Linux amd64 aprovado. Mais 13 testes executados na imagem final,
  sem rede externa, volume publicado ou conexão de banco.
- `pnpm check:dependencies`: zero avisos conhecidos nos cinco escopos.
- Dependências de produção: baseline com 8 ocorrências no backend e 4 em cada app Next;
  após atualização, zero avisos conhecidos nos cinco escopos. Não demonstra ausência de todas as falhas.
- Sete regressões do validador/catálogo passaram, incluindo um POST HTTP com Express e validador reais.
- Smoke HTTP local das builds `0.1.310`: login/erro e imagens PNG responderam 200; rotas privadas
  redirecionaram para login com 307; `/version` de frontend/Admin respondeu 200, sem cache e noindex.
  Isso não valida cliques, viewport, foco ou um navegador real.
- Teste HTTP local com parser real: arquivo no limite aceito, acima recusado, campos extras,
  índice de array excessivo e estrutura profunda recusados. Sem R2 ou provider simulado.
- Homologação: `/health`, `/ready` e `/ping` responderam 200 em `0.1.309`; três rotas privadas
  recusaram acesso anônimo com 401; rota inexistente respondeu 404 sem stack.
- Login vazio de usuário/Admin retornou 400 com termos técnicos nos campos: achado confirmado,
  corrigido e coberto por teste HTTP do validador real; smoke `0.1.311` confirmou as mensagens novas.
- Requisições Python receberam bloqueio 1010 na borda; a mesma verificação com curl chegou ao app.
  Bloqueio de borda não foi confundido com autorização do backend.

## Mapa de execução (a completar com evidência por fluxo)

| Fluxo | Superfícies | Evidência atual | Falta validar |
| --- | --- | --- | --- |
| Cadastro/login/recuperação | Frontend, Admin, API, e-mail/Google | Cadastro paciente próprio, e-mail confirmado, negativos, teclado e OTP; loop de navegação reproduzido | Repetir confirmação após patch, recuperação, Google, expiração e troca de identidade |
| Paciente/perfil/favoritos | Frontend e API privada | Perfil próprio e edição abriram após navegação completa | Permissões entre duas contas, salvar formulários e upload |
| Psicólogo/CRP/onboarding | Frontend, Admin, API, CFP/WhatsApp | Inventário estático | Conta dedicada, aprovação e falhas externas |
| Descoberta/perfis públicos | Frontend e API de leitura | Inventário estático | Anônimo vs dono, mobile e acessibilidade |
| Comunidades/posts/respostas | Frontend, Admin, API | Leitura inicial dos routers | IDOR, moderação, conteúdo anônimo, paginação, estados |
| Vídeo/upload/playback | Frontend, API, R2/Stream | Limites locais e parser testados | Upload/playback real, URLs assinadas, interrupção, Safari |
| Processamento de vídeo | API interna, fila, worker, volume | Inventário e baseline local | Smoke privado no servidor, egress e isolamento atuais |
| Assinaturas/pagamentos | Frontend, Admin, backend, gateway | Inventário estático | Contas/cartões exclusivamente de teste, webhooks/idempotência |
| Conta/privacidade/exclusão | Frontend, Admin, backend | Formulário próprio vazio, foco/erro PT-BR; leitura de serviço/repositório | Revogação/exportação e exclusão somente da conta de auditoria |
| Notificações/analytics | Frontend, Admin, API/jobs/socket | Inventário estático | Preferências e acessos; sem campanha para terceiros |
| Administração/catálogos/SEO | Admin, API administrativa | Dashboard autenticado desktop/mobile; menu fecha com Escape e devolve foco | Permissões de ações, validação de formulários, exportação |
| Infraestrutura/deploy | Quatro apps, manifests, Docker | Atualização focal de dependências | Builds/smoke novos, CSP, cache e headers por superfície |

## Próximos achados para reprodução

- Mapeamento Zod atualizado para a versão 4, preservando mensagens de domínio e sem ecoar valores.
  Conferir ainda todo o restante das mensagens client-side e validações de formulários no navegador.
- Verificar imposição server-side de confirmação de e-mail e troca obrigatória de senha;
  leitura inicial dos guards não mostrou essas condições, mas o cadastro completo ainda não foi
  exercitado. Também rastrear vínculo Google com conta manual pré-existente. Não é exploração confirmada.
- Autenticação opcional corrigida: falha real de conexão local ao banco agora retorna 503;
  visitante sem credencial e token inválido continuam sem autenticação nas rotas públicas.
  A captura da segunda consulta foi revisada em código; interrupção entre consultas ainda não
  foi exercitada com sessão persistida real. Não derrubar o banco publicado para reproduzir.
- Modais e formulários ainda precisam de teclado/foco/leitor de tela e medidas mobile reais.
- Worker possui egresso para render social no compose atual; o teste histórico de isolamento total
  não descreve essa versão. Auditar restrições de origem, redirects, DNS e mídia remota.

## Dependências externas

- Browser conectado; Admin autenticado e conta paciente dedicada criada pelo cadastro normal.
- Aceite autorizado apenas para auditoria; confirmação recebida por e-mail e concluída. Credenciais
  não entram no relatório, logs ou repositório. Conta profissional e segunda identidade pendentes.
- Safari/iPhone e Android reais não validados. Viewport pequeno em Chrome não equivale a Safari.
- Builder MCP passou a responder, mas só listou MUI, não o design Lectum, e não expõe o Quick Copy
  ativo por esta interface. Fallback: `proto/Login.jpg` e `proto/Verificação de E-mail com Código.jpg`.
  Browser local em 390px e desktop validou o patch; sem redesenhar as telas ou adotar MUI.

Detalhes técnicos e fontes: [ADR-0496](../adrs/0496-auditoria-pre-producao-e-dependencias.md).

## Evidências de interação — complemento 0.1.312

- Dashboard Admin: desktop e 375px; menu abre, fecha por Escape e restaura foco.
- Login e cadastro paciente: erros vazios em PT-BR; foco no primeiro campo inválido.
- Antes: Tab saltava o botão de senha; nome acessível do input incluía “Mostrar senha”.
  Depois: Tab/Enter alternam a visibilidade; rótulo contém só o nome do campo.
- Antes: `123456`, apagar terceiro dígito, resultado `12456_`. Depois: `12_456`; repor
  dígito não altera os demais. Colagem, zero inicial, limpeza e bloqueio de envio incompleto passaram.
- OTP: interação local com controller/RHF/schema reais em página temporária sem API, removida
  antes do build. Nenhum endpoint simulado e nenhuma verificação inventada.
- Confirmação real em homolog: conta confirmada, mas links retornavam à tela de confirmação;
  navegação completa ao mesmo destino abriu o perfil. Correção opt-in apenas nessa transição,
  mantendo guard e destino interno normalizado. Repetição completa pós-deploy ainda pendente.
- Capturas locais em `/tmp/lectum-audit-178-ui/` (01–10); antes/depois 07, 09 e 10 conferidos
  novamente a partir dos arquivos salvos. Capturas e credenciais não serão versionadas.
- A árvore de acessibilidade do diretório anunciou “Unable to play media” em players; podem
  estar inativos/fora da tela. Reprodução e visibilidade ainda precisam ser cruzadas antes de
  considerar falha real. Não desativar assinaturas/permissões para investigar.
- Select customizado: Enter e Escape sem efeito reproduzidos em homolog. Corrigidos em 0.1.313;
  testes de teclado passaram localmente nas três variantes customizadas. Setas, leitor de tela e
  toque em iOS/Android reais continuam pendentes; não é certificação completa WAI-ARIA.

**Validação local 0.1.312:** check agregado aprovado (487 testes), build do frontend aprovado,
cinco manifests sincronizados. Sem a rota temporária no artefato. Publicação/smoke a acompanhar.

## Continuação — seletores e publicação

- 0.1.312: frontend/Admin publicados; backend alcançou a mesma versão às 23:56 UTC. Houve
  três respostas 502 durante a substituição do backend; smoke final deve ser repetido após ready.
  No Browser, conta já confirmada retornou da verificação ao perfil, sem o loop anterior.
- 0.1.313: Enter/Espaço selecionam, Escape fecha e restaura foco. Busca do estado e dependência
  da cidade preservadas; escolha testada somente em formulário local sem envio, com hooks reais.
- 12 regressões dos controllers passaram; `pnpm check` passou com 489 testes; build frontend
  aprovado. Harness e seus tipos gerados removidos antes do build; sem mudança de banco/env.
- Dimensões verificadas nos arquivos: Admin/cadastro/OTP antes em 375×812; login local e
  controllers depois em 390×844; desktop 1280×720 e 1320×953. Não são dispositivos móveis reais.
- Capturas 11/12 registram o select antes/depois; 12 inspecionada do arquivo salvo.

## Continuação — autenticação e mensagens 0.1.314

- Smoke final 0.1.312: 16/16 aprovados em 10/09 às 23:57 UTC, após recuperação do backend.
- Smoke 0.1.313: 16/16 aprovados em 11/09 às 00:07 UTC; backend/frontend/Admin na mesma versão.
- Browser homolog 0.1.313: Enter selecionou; Escape fechou/restaurou foco no perfil real. Saída
  sem salvar os valores de teste. Captura 13; conta não recebeu alterações demográficas.
- Tela pública de erro reproduziu `Invalid field` em homolog. O filtro existente passa a cobrir
  erros padrão de validação; mensagens de domínio PT-BR continuam preservadas. Captura 14.
- Autenticação opcional: Express, Passport/JWT e Prisma reais em processo local isolado, sem .env
  do workspace. Banco aponta para socket inexistente temporário, sem acessar banco real ou provider.
  Antes: credencial assinada com consulta impossível seguia como visitante (204 no teste do guard).
  Depois: 503 seguro. Visitante/token inválido preservados; guard privado também respondeu 503.
- Catch dentro do callback impede que uma rejeição de validação de sessão fique sem tratamento;
  falha operacional síncrona também não segue como visitante. Sem mudar regras público/privado.
- Formulário da conta vazio mostrou orientação PT-BR e foco em novo e-mail. Nenhuma senha,
  e-mail, vínculo Google ou exclusão foi alterado pelo teste.
- Leitura integral das duas minutas confirmou placeholders e checklist de aprovação pendentes.
- Check agregado aprovado: 495 testes (132 frontend, 296 backend, 35 Admin, 32 video), sem skips.
  Builds backend/frontend aprovados. Página de erro real na build local substituiu o inglês por
  orientação PT-BR; desktop 1280×720 e mobile 390×844 sem overflow. Capturas 15/16 conferidas do disco.
  Não há API ou provider simulado. Publicação/smoke desta versão ainda pendentes deste registro.

Revisão de identidade ainda pendente: confirmar comportamento de contas manuais não verificadas
quando o mesmo e-mail entra por Google e imposição de confirmação/troca obrigatória no servidor.
Leitura de código não equivale à exploração confirmada nem autoriza alterar vínculo de contas reais.

## Continuação — senhas e leitura de permissões 0.1.315

- 0.1.314: backend/frontend/Admin confirmados; 16/16 smokes aprovados em 11/09, 00:23 UTC.
  Browser publicado confirmou a mensagem PT-BR na página de erro. Video privado não consultado.
- Admin: formulário vazio de nova comunidade recusado com mensagem PT-BR e foco no nome;
  saída sem criar comunidade. Captura 17, 375×812, conferida do arquivo salvo.
- Reproduzido localmente: com bcrypt, duas senhas diferentes depois do byte 72 eram aceitas
  como iguais. Agora novas senhas maiores usam Argon2id já instalado. Limite de 128 caracteres,
  espaços e acentos preservados; nenhuma conta foi alterada para este teste.
- Seis testes reais de hash/comparação passaram com configuração bcrypt, argon e parâmetros
  publicados; antes, os casos de sufixo ASCII e UTF-8 falhavam. Não usa hash/provider simulado.
- **Limitação importante:** hashes bcrypt antigos não permitem recuperar o trecho que foi
  descartado. A correção protege novos cadastros/trocas de senha; avaliar redefinição controlada
  das contas legadas antes da produção. Não há reset automático nem regravação em login.
- Routers de comunidades/posts e guard Admin lidos; criação/edição/exclusão exigem sessão,
  com verificação de dono nos repositórios examinados. Isso não conclui testes entre identidades.
- Revisão de confirmação de e-mail: formato exato, janela temporal e obrigatoriedade nas demais
  ações ainda em análise; nenhuma regra de acesso público foi modificada nesta correção.

Sem migration, package ou env nova. Argon2 em ambiente publicado já usa 128 MiB por operação;
observar memória/concorrência ao testar cadastros reais. Medição local não certifica capacidade
do servidor. Build, check agregado e publicação de 0.1.315 serão registrados após execução.

Validação local 0.1.315: 499 testes passaram (132 frontend, 300 backend, 35 Admin, 32 video),
build backend e imagem Docker Linux amd64 aprovados. Os seis testes de hash também passaram no
artefato final, não root, sem rede, somente leitura, limitado a 768 MiB/2 CPUs. Nenhum entrypoint,
migration ou banco foi iniciado. Publicação/smoke pendentes. Sessão Admin solicitou novo login;
usuário reautenticou e a lista de comunidades abriu. Paciente permaneceu conectado.

## Continuação — anonimato 0.1.316

- Smoke de 0.1.315: 16/16 em 11/09, 00:39 UTC; backend/frontend/Admin na mesma versão.
- Reproduzida exposição do identificador de autoria anônima com a imagem anterior e PostgreSQL
  temporário real. Não foi necessário consultar identidades de usuários publicados.
- O dono conserva a edição; outro leitor recebe um pseudônimo. Identificação administrativa
  depende do guard autenticado, não de um campo enviado pelo cliente.
- Listas de comentários próprios/salvos agora respeitam o anonimato herdado da publicação.
- Onze verificações HTTP com banco, JWT, login, guards e repositórios reais passaram: visitante,
  leitor, dono, administrador, feed, comentários, salvos, edição e recusa de exclusão alheia.
  O banco foi criado em rede Docker interna, sem portas públicas/credenciais reais, e removido
  ao final. Não representa teste de OAuth, notificações enviadas ou cadastro por e-mail.
- O número do apelido anônimo muda com este deploy e em futuras rotações da chave JWT. Continua
  estável por usuário com a mesma chave. Não muda a autoria armazenada nem apaga conteúdo.
- O novo cálculo reaproveita segredo existente; sem chave, a apresentação fica genérica.
  Nenhuma env nova, migration, dependência ou reset é necessário.

Durante o teste, um validador legado recusou endereço com sufixo longo; a mesma expressão também
recusa aliases com `+`. Achado separado para correção seguinte, ainda não corrigido em 0.1.316.
Cobertura da auditoria permanece parcial; não liberar produção com base nesses onze cenários.

Validação 0.1.316: `pnpm check` aprovado, 507 testes (132/308/35/32), além dos seis testes
da política de versão. Build backend, imagem Docker e onze cenários de integração aprovados.
Inventário: 146 arquivos com leitura inicial, 11 parciais e 2.964 ainda não revisados na base.

## Continuação — validação de e-mail 0.1.317

- 0.1.316 publicada em `d7db1934`; smoke final 16/16 às 00:57 UTC de 11/09.
  Frontend/Admin chegaram antes do backend; a verificação inicial detectou a versão anterior
  ainda ativa e foi repetida após `/ping` confirmar o novo artefato.
- Expressão legada recusava `+`, apóstrofo e sufixos acima de seis letras, mas aceitava alguns
  endereços malformados. Frontend/Admin já usam a validação de e-mail do Zod.
- Backend passou a usar o mesmo formato, preservando normalização para minúsculas e tratamento
  de campo obrigatório/opcional. Não remove pontos/sufixos nem combina identidades.
- Quatro regressões HTTP passaram; três falhavam antes da correção. Banco/contas não são
  alterados. Validação sintática não substitui a confirmação real do endereço.
- Formulário de post em homolog: campos vazios recusados em PT-BR e foco na comunidade.
  Capturas 18/19 em 390×844 conferidas; nenhum conteúdo foi publicado.

Endereços malformados admitidos pela API antiga, se existirem, exigem atendimento individual;
não reescrever cadastros, inventar e-mails nem disparar redefinições em massa.
Sem nova env, package ou migration. Auditoria integral e fluxos com outra identidade permanecem abertos.

Validação final 0.1.317: onze cenários HTTP/PostgreSQL repetidos com aliases/domínio longo
passaram; recursos isolados removidos. Quatro testes de formato passaram dentro da imagem final
não root, somente leitura e sem rede externa. Nenhuma mensagem de e-mail foi enviada no teste.

## Continuação — código de confirmação 0.1.318

- Smoke 0.1.317: 16/16 às 01:06 UTC de 11/09, três apps na versão esperada. Dois testes
  complementares confirmaram formato com alias/TLD longo e erro PT-BR para endereço malformado;
  sem criar conta ou enviar e-mail. Estado vazio da busca Admin validado no Browser (captura 20).
- Imagem anterior aceitou código com 61 segundos quando a validade era de um minuto, em banco
  isolado. A comparação por minutos inteiros foi substituída por idade em milissegundos;
  datas futuras/ausentes/inválidas são recusadas. Env de validade existente preservada.
- Confirmação atualiza um único registro com condição de código, data de emissão, estado e prazo.
  Reenvio ou outra confirmação invalida a leitura anterior. Não há migration ou limpeza de dados.
- Quatro regressões unitárias/de formato, check agregado com 515 testes, build backend e imagem
  Linux amd64 aprovados. Quatro testes também passaram na imagem final sem rede externa.
- Sete verificações com PostgreSQL e autenticação reais passaram: expirado, emissão futura,
  formato inválido, incorreto, válido/replay, duas chamadas concorrentes e emissão substituída.
  Seis cenários usam HTTP; o último exercita diretamente o compare-and-set real no repositório.
  Recursos temporários removidos. Nenhum SMTP/OAuth foi simulado ou chamado.

Quem tentar usar código depois da validade precisa pedir outro; não resetar contas confirmadas.
Esta correção cobre confirmação de e-mail, não certifica recuperação de senha, SMS ou vínculo Google.
0.1.318 publicada em `1661c14c`: smoke final 16/16 às 01:20 UTC de 11/09. Backend, frontend
e Admin na versão esperada. Video privado não consultado; falha transitória da sondagem durante
o rollout não foi confundida com validação completa de disponibilidade.

## Continuação — recuperação de senha 0.1.319

- Quatro falhas reproduzidas na imagem anterior com PostgreSQL isolado: prazo arredondado,
  emissão futura, duas redefinições concorrentes e link mantido após trocar senha pela conta.
- Oito cenários passaram na imagem corrigida; seis usam o endpoint HTTP real e dois o repositório
  real. Validado também o formato de link já emitido, senha do vencedor, revogação das sessões e
  ausência de mutação para link incorreto, data ausente ou emissão substituída.
- `pnpm check`: 515 testes; build backend e Docker Linux amd64 aprovados. Oito cenários de banco
  são adicionais e manuais, não estão incluídos nessa contagem nem no check automático.
- Imagem testada: `fc163a0769d2f07627122528ef1fd3abe6f5898241d16210666f6938945ff814`.
- Repetição local: `node backend/scripts/password-reset-integration.mjs --image=lectum-backend:audit-0.1.319`.
  Requer Docker e imagens locais. Não passar credenciais/envs nem adaptar para banco publicado.
- Recursos descartáveis removidos; não houve SMTP, reset de conta publicada ou alteração de schema.
  Testes não certificam entrega por e-mail, rollback por falha entre comandos, todos os tipos de
  concorrência, Google ou dispositivos reais. Auto-hidratação histórica preservada, a revisar.

Browser Admin: categoria vazia recusada em PT-BR, foco no campo e retorno ao botão ao cancelar;
capturas 21/22 em 390×844, sem criar categoria. Ao exceder 160 caracteres, a captura 23 mostrou
`Invalid input`: achado reproduzido para correção de UI seguinte, não marcado como resolvido aqui.
Inventário: 178 leituras iniciais, 10 parciais e 2.933 não revisados na base.
0.1.319 publicada em `997f7c5d`: smoke final 16/16 às 01:35 UTC de 11/09, backend/frontend/Admin
na versão esperada. Nenhuma recuperação por e-mail de conta publicada foi disparada.

## Continuação — formulários Admin 0.1.320

- Nome com 161 caracteres exibiu `Invalid input` em homolog (captura 23). Schema passou a
  orientar o limite em PT-BR sem alterar o máximo de 160, o trim ou a confirmação forte.
- Labels de input/select/textarea não englobam mais controle/erro. Estado de obrigatório e
  slot de alerta são explícitos; cores, medidas e espaço reservado foram preservados.
- Browser local em 390×844 exercitou os componentes reais, sem API simulada nem persistência.
  Nome excessivo ficou com `Use no máximo 160 caracteres.`; foco permaneceu no campo.
  Seleção Ativo/Inativo funcionou; textarea vazio mostrou erro e recebeu foco (capturas 24/25).
- A página local temporária era apenas um teste de componentes: não autenticou administrador,
  não criou catálogo e não validou um salvamento ponta a ponta. Ela foi removida, login original
  restaurado e dev server encerrado antes do commit. Arquivos gerados pelo Next dev foram retirados.
- Referência de configuração inspecionada no proto local; Builder retornou apenas MUI global.
  Cores locais padrão diferem da configuração visual carregada em homolog, não alterada no patch.
- Check agregado final: 518 testes (132 frontend, 316 backend, 38 Admin, 32 video), mais os
  seis testes da política de versão. Build Admin e novo check Admin aprovados. A regressão
  estrutural também detectou os três controllers na revisão anterior, sem modificar o workspace.
- Teste de estrutura impede recolocar controles/erros dentro do label; não certifica anúncio
  em leitor de tela nativo. Safari/iPhone/Android reais permanecem pendentes.

0.1.320 publicada em `2f4c58c0`: 16/16 checks às 01:46 UTC de 11/09, backend/frontend/Admin
na versão esperada; `/health` e `/ready` em 200. Captura 26 do Admin autenticado em 390×844
comparada à 23: mensagem PT-BR correta, foco e dimensões preservados. Cancelamento sem gravar
categoria; contagens permaneceram 16 categorias/98 especialidades. Viewport temporário retirado.


## Continuação — pré-requisitos da conta 0.1.321

- Na imagem anterior, onboarding e leitura privada funcionavam com `confirmed=false`; troca
  privada de senha atribuía confirmação indevida; senha temporária não impedia requisição direta.
- Guarda `_auth` mantém a autenticação existente e agora exige estado confirmado/sem troca pendente.
  Bootstrap e segurança da própria conta têm exceção explícita autenticada. Leitura pública intacta.
- A primeira imagem candidata (não publicada) mostrou que o painel Conta usava outro repositório:
  troca de senha/e-mail ainda mantinha recovery. Invalidação centralizada nos dois repositórios.
- 17 cenários de conta passaram: 16 envolvendo HTTP real e um no repositório de troca de e-mail.
  O último não certifica SMTP; provedor ausente retorna 503 real, sem simulação. A recusa de
  senha/confirm divergentes foi testada com `x-refine=true`, que ativa as relações do validador
  legado em NODE_ENV=test; a primeira expectativa sem esse header não representava produção.
- Oito regressões de recuperação e onze de privacidade/autorização também passaram na imagem final.
  Esses 36 cenários manuais usam PostgreSQL descartável, não estão incluídos no check automatizado.
- Check agregado final: 523 testes (132 frontend, 321 backend, 38 Admin, 32 video), mais seis
  testes da política de versão. Build backend, Prisma generate e Biome aprovados.
- Imagem Linux amd64: `33c75b9d3d6391829e8a61817b7946c0cea1ed032985518eb546af34158ed63e`.
  A primeira execução do check de tamanho apontou 701 linhas no repositório legado; a transação
  foi extraída para account-session-store já existente, sem relaxar a política (686 linhas).
- Runner manual: `node backend/scripts/auth-integration.mjs --image=lectum-backend:audit-0.1.321 --suite=account-confirmation`.
  Wrapper de recuperação anterior preservado. Nenhum banco/segredo publicado foi usado.
- Inventário da base: 211 leituras iniciais, 11 parciais e 2.899 ainda não revisados. Não equivale
  a autorização para produção ou auditoria concluída. Cadastro profissional/Google/dispositivos
  reais e documentos legais continuam pendentes.

Na aba antiga do feed, algumas mídias apareceram indisponíveis. A causa ainda não foi isolada
(expiração/estado antigo/rede/codec não diferenciados); não atribuir ao patch de autenticação nem
marcar vídeo como aprovado apenas pelo HTTP. Nenhum vídeo/post publicado foi alterado.
0.1.321 publicada em `78c14408`: smoke 16/16 às 02:17 UTC de 11/09, backend/frontend/Admin
na versão esperada, health/ready 200. Nenhuma env nova ou migração necessária.


## Continuação — foco do player 0.1.322

A investigação da aba antiga distinguiu carregamento adiado de erro real: os vídeos fora da tela
estavam sem source/metadados, sem MediaError. Ao entrar na área visível, a segunda mídia carregou
2:01 e reproduziu até 0:40 sem erro (capturas 27/28). Não confirma todos os vídeos nem codecs.
Nenhuma URL assinada, token ou mídia remota foi extraída/baixada para contornar o navegador.

No detalhe público, a navegação Tab focou mute durante reprodução. Após 2,2 segundos o controle
ficou dentro de `aria-hidden=true` e invisível, mantendo o foco (captura 29). Defeito reproduzido
na interface real; não é apenas hipótese de inspeção estática. O hook existente passa a preservar
controles enquanto houver foco `:focus-visible` no player. Sair por Tab restaura o comportamento
imersivo; cliques/toques continuam permitindo ocultação. Shell comum cobre portal e layout empilhado.

Browser local com MP4 real de validação gerado por FFmpeg, sem API ou provider simulado: Enter
iniciou reprodução, mute permaneceu visível/focado após 16 segundos, Enter alternou som, seta avançou
a mídia e Tab fora do player devolveu o modo imersivo (captura 30, 390×844). Não equivale a teste
ponta a ponta do Stream nem a Safari/iPhone/Android reais. Layout/cores/medidas não foram alterados;
proto `Feed Comunidade.jpg` inspecionado, Quick Copy continua indisponível como descrito acima.

Check final 0.1.322: 524 testes (133 frontend, 321 backend, 38 Admin, 32 video), mais seis
da política de versão; build frontend aprovado e sem source maps publicados. Página/MP4 temporários
removidos antes do build, servidor dev encerrado e regra AGENTS gerada restaurada. Inventário
agora registra 222 leituras iniciais, 12 parciais e 2.887 não revisados. Sessões publicadas Admin
e paciente confirmadas por navegação real após 0.1.321, sem usar/gravar a nova senha fornecida.

0.1.322 publicada em `c54e98c9`: 16/16 checks em 2026-09-11T02:27:55Z; backend/frontend/Admin na
versão esperada e health/ready 200.

## Continuação — saída do vídeo ampliado 0.1.323

Em homolog, um vídeo ampliado reproduzia em 9,48s; Escape o devolveu a 0s, pausado (capturas 31/32).
O botão de saída capturava snapshot; o listener de Escape removia diretamente o portal. Agora
ambos compartilham o fechamento existente com captura anterior à desmontagem. Callback mantido
em ref atualizado por efeito, sem reinstalar locks de scroll a cada timeupdate.

Componente local e MP4 reais: saída de reprodução em 13,97s continuou tocando, chegando a 26,20s
(captura 33). Caso pausado/mutado manteve exatamente 4,5s, pausa e mute depois de Escape.
Página/arquivo temporários removidos e servidor dev encerrado; integração Cloudflare publicada
ainda será repetida. A regressão automática verifica o fluxo comum de fechamento; não equivale
a execução de DOM/navegador, para a qual a evidência é o teste real descrito acima.

Leitura complementar: bloqueio de zoom é decisão explícita do ADR-0442, não modificado nesta
correção; o trade-off de acessibilidade exige revisão de produto e teste real de baixa visão.

Repetição publicada 0.1.322: foco de mute permaneceu visível, fora de aria-hidden, aos 11,92s
de reprodução (capturas 34/35). O conteúdo de vídeo avançou normalmente. Verificação de teclado
aprovada; diferenças temporárias de viewport das capturas são registradas, não usadas como prova
de equivalência pixel a pixel. A mudança não altera classes/medidas do layout.

Check 0.1.323: 525 testes (134 frontend, 321 backend, 38 Admin, 32 video), mais seis da versão;
build frontend aprovado. Artefato não contém rota/MP4 de auditoria nem source maps públicos.
Inventário: 226 leituras iniciais, 12 parciais, 2.883 não revisados; auditoria continua em andamento.

0.1.323 publicada em `a6ababbd`: 16/16 checks às 2026-09-11T02:38:31Z, backend/frontend/Admin
na versão esperada. Browser com Stream real: ampliado em 31,36s, Escape desmonta a mídia e, após
metadados, retoma reproduzindo; observado 60,85s na captura 37. A leitura imediata anterior aos
metadados tinha readyState=0; não confundir essa transição com a perda definitiva de posição
anterior. Vídeo pausado ao fim e abas Admin/paciente preservadas, sem utilizar a senha fornecida.

## Continuação — credenciais administrativas e emissão concorrente 0.1.324

Imagem anterior .321: seis cenários falharam. Nos dois perfis, link de recuperação antigo
continuou retornando 200 depois da troca administrativa de e-mail, alterando senha e confirmação
do novo endereço. Invalidação agora é parte da mesma transação de e-mail/sessões/auditoria,
reutilizando o helper central já aplicado aos fluxos da própria conta.

O primeiro patch não impedia emissão iniciada antes da troca e persistida depois. Reproduzido
também nos fluxos público/privado: snapshots antigos conseguiam gravar códigos e recuperações
retornavam 200. Atualizações condicionadas a e-mail/hash/deleted rejeitam o estado ultrapassado.
Confirmação exige pendência atual; limpeza por falha de entrega compara também o código daquela
tentativa, preservando qualquer emissão posterior. Público mantém 200 genérico/não enumerável;
Admin e confirmação autenticada recebem conflito PT-BR sem detalhes internos.

Integração manual usa a imagem final e PostgreSQL real com migrations aplicadas em rede interna,
sem portas no host, sem .env local/publicado, usuário não root e filesystem somente leitura.
Transações, snapshots, FK/rollback e HTTP de reset são reais; SMTP não é simulado nem declarado
validado. A primeira ampliação da suíte atingiu o rate limit real (429), não um defeito do patch:
as verificações de snapshot passaram a consultar o estado persistido, mantendo oito chamadas
HTTP e a proteção real sem desabilitar/aumentar limite. Não contar falha por 429 como bypass.

Imagem final: `lectum-backend:audit-0.1.324`,
`sha256:fed653d279d3a9ce56390ef6467738707693fd27e87887bd1810228778e4eeef`.
Suíte nova: 28 cenários aprovados; recursos descartáveis removidos ao final de cada execução.
Check agregado: 527 testes (134 frontend, 323 backend, 38 Admin, 32 video), mais seis da versão;
build backend e Docker Linux amd64 aprovados. Também repetidas as suítes reais de confirmação
(17 cenários) e reset (8), sem regressões. Nenhuma migration/package/env nova, nenhum envio SMTP
ou alteração de conta publicada. Dez arquivos administrativos adicionais lidos integralmente;
base: 236 leituras iniciais, 12 parciais e 2.873 não revisados. Não certificar a auditoria completa.

## Continuação funcional — 11/09 / campos 0.1.325

- Paciente: edição vazia recusada com foco e texto PT-BR; logout confirmado.
- Psicólogo: formulário vazio validado; cadastro e confirmação por e-mail reais; escolha grátis
  encaminhou ao WhatsApp obrigatório. Próxima etapa aguarda número controlado pelo usuário.
- Admin: criada comunidade de auditoria e regra pela UI. Formulário vazio não foi salvo.
- Modal de regra reproduziu IDs duplicados e rótulo associado ao campo da página. Correção nos
  controllers, com 39 testes Admin e Browser local real em 390×844/1280×720. Nenhum API mock.
- Screenshots locais 38–46 em `/tmp/lectum-audit-178-ui`; 43 evidencia duplicação e 45–46 mostram
  componente corrigido com erro/foco exclusivos. Não incluir credenciais nem OTP nos documentos.
- Quick Copy acessível como recurso, mas leitura recusada por espaço errado; proto local de
  detalhes da comunidade e screenshot publicado usados. Não foi usada fonte Figma alternativa.
- Check/build Admin limpos passaram; build inicial com `.next/dev` residual foi recusado corretamente
  pela política de source maps. Nenhum script foi enfraquecido. Harness removido antes do build final.
- Smoke e repetição em homologação da 0.1.325 ainda pendentes no momento do commit.

### Ajuste da validação e publicação 0.1.326

O pre-push bloqueou 0.1.325: a primeira versão do teste SSR usava execução dinâmica de código,
proibida pela guarda do repositório mesmo em teste. Nenhum deploy ocorreu nessa tentativa.
O teste foi refeito com o loader nativo Node, limitado aos controllers e utilitário local reais;
não foi criada exceção nem desabilitada a guarda. A correção visual permanece a mesma. Novo commit
recebe novo bump conforme a política; publicação efetiva esperada em 0.1.326, ainda a verificar.

### Publicação 0.1.326 confirmada e continuidade funcional

- Push `ed855e03` concluído com as guardas, sem bypass. Smoke de 11/09 11:25:16 UTC:
  **16/16**, backend/frontend/Admin em 0.1.326; `/health` e `/ready` aprovados.
  Arquivo sanitizado: `/tmp/lectum-audit-326-smoke-homolog.json`.
- Controller corrigido repetido no Admin publicado: nenhuma duplicação de ID; erro e foco
  exclusivamente no modal vazio, sem invalidar a descrição da página. Screenshot 50.
- Profissional seguiu a comunidade de auditoria, criou/editou post e comentário, salvou ambos,
  criou uma filha e confirmou/cancelou exclusão. Somente a filha própria foi removida.
- Contador geral voltou 2 → 1, porém o comentário manteve “Ver mais 1” após reload; salvo mostrou
  “Seguir” apesar de comunidade seguida. Achados reproduzidos, não falha presumida de cache.
- Paciente acessou o post profissional público, fez login com retorno e salvamento pendente,
  alternou votos e removeu seu salvo, mantendo o da conta profissional.
- Paciente enviou denúncia explicitamente de auditoria sobre o post da outra conta de teste.
  No Admin geral, campos vazios bloquearam a resolução; justificativa e confirmação corretas
  encerraram como Improcedente. Filtro confirmou persistência; ninguém foi penalizado.
- Aba de denúncias da comunidade falhou na consulta e mostrou zeros indevidos (screenshot 49).
  Patch compatível no request/validator e separação de erro/vazio em integração, não publicado ainda.
- Paciente criou/editou publicação anônima. Comunidade e anonimato permaneceram bloqueados na edição;
  após logout não houve nome nem link de perfil ou ações de proprietário (screenshot 51).
  Denunciar sem sessão só pediu login após preenchimento; não foi certificado como boa UX.

### Backend/video em integração local — não confundir versão da imagem com publicação

Imagem local integral `lectum-backend:audit-0.1.326`,
`sha256:f818a88f80bd09bc49be4dcd2448b016f9d76d72316ec0237e5fa8355296fc72`, contém
patches de comunidades/billing ainda não publicados. A .326 pública contém a correção do Admin.

- Billing: 13/13 HTTP/Prisma/PostgreSQL reais em rede isolada; baseline .324 reproduziu nove falhas.
  Sem provider de pagamento, cobrança ou credencial real. Evidência em
  `/tmp/lectum-task178-billing-history-6g7qv1m_/report.md`.
- Concorrência/moderação: 16/16 serviços/repositórios/Prisma/PostgreSQL reais, repetidos em dois
  bancos descartáveis. Baseline .324 reproduziu exatamente dez falhas; nenhuma montagem de runtime
  corrigido sobre a imagem. **Não é teste HTTP**, nem Passport/JWT ou provider.
  `/tmp/lectum-community178-artifact.SiRKJ1/RELATORIO.md`.
- Video: parent repetiu check (43), build, 13 casos HTTP/Redis/BullMQ/filesystem/FFmpeg e nove casos
  FFmpeg/TLS/rede. Sem mocks como prova de integração; imagem final/publicação ainda pendentes.
- Helper de origem da resposta: regressão com propriedades herdadas reproduzida (5/6), corrigida
  com checagem de propriedade própria (6/6). Mudança posterior à imagem .326 de laboratório.
- Denúncias: imagem .326 anterior ao patch reproduziu duas falhas em dez casos HTTP/PG; sete testes
  unitários do componente/QueryCache passaram após o patch. Teste unitário não substitui imagem final
  nem Browser publicado. Novo validator ainda aguarda build integral para prova verde.
- Leituras adicionais com proveniência e hash em `AUDITORIA-2026-09-11-LEITURAS.tsv`; base tem
  480 leituras iniciais, 11 parciais e 2.630 pendentes. Isso não certifica os fluxos inteiros.
- Nenhuma nova env, package, schema ou migration. Sem reset, backfill ou correção em massa de dados.
  Referências antigas de renderização e partes de upload em curso serão recusadas após hardening;
  reiniciar somente essas operações. Planos incompatíveis são recusados, nunca recriados/destruídos.
  Checkout incerto e reconciliação canônica de webhooks seguem pendências financeiras explícitas.

### Artefatos integrados locais 0.1.327 e continuidade funcional

- Backend Linux amd64 integral: `lectum-backend:audit-0.1.327`,
  `sha256:10a216abe21eb5bf668e94940e65073cb1c25d48aa9592ae39b07df6e03c8d66`.
  Histórico financeiro repetido: 13/13 HTTP/Prisma/PostgreSQL reais; denúncias: 10/10 HTTP/PG;
  estados de posts/salvos/respostas: 48/48 serviços/repositórios/PG. Sem mounts de runtime.
- A consulta de seguimento foi medida: um SELECT de vínculos para doze itens, sem N+1.
  Respostas removidas não entram na contagem de filhas. Baseline anterior reproduziu os defeitos.
- Video Linux amd64 integral: `lectum-video:audit-0.1.327`,
  `sha256:c9e16a6522e7a4f9faa26c0e2352acd2d4941bd06587f39f9111564642a9318a`.
  Oito provas reais da imagem: API/worker prontos, rotas operacionais/versão, recusa sem token,
  multipart → Redis/BullMQ → FFmpeg, saída Range 206, limpeza do job próprio e shutdown SIGTERM.
  Volumes/rede/containers descartáveis removidos; não certifica Cloudflare/R2 publicado.
- Check agregado inicial: 578 testes (134 frontend, 355 backend, 46 Admin, 43 video), além de
  seis testes de versão. Build final do Admin e Browser local ainda a registrar antes do push.
- WhatsApp autorizado salvo na conta profissional pelo fluxo real, sem solicitação/envio de OTP.
  Perfil incompleto recusado em PT-BR, com foco no CPF e sem overflow em 390px. Visibilidade
  desmarcada apenas no formulário não salvo; não declarar perfil persistido/publicado.
  Dados profissionais autorizados solicitados para entrada direta, sem inventar CPF/CRP.
- Profissional respondeu ao post anônimo da conta paciente. Paciente tentou excluir e foi
  impedido pela preservação de contribuição profissional (screenshot 52); silenciar e reativar
  notificações funcionaram. Nenhuma publicação/resposta foi excluída nesse teste.
- Notificação real da resposta chegou ao paciente: abrir levou ao post correto e marcou como
  lida, retirando o indicador. Preferências carregaram; push bloqueado pelo navegador foi
  explicado. Permissão de push e preferências não foram alteradas nessa verificação.

Logs locais: `/tmp/lectum-327-billing-pg.log`,
`/tmp/lectum-task178-community-reports/corrected-0.1.327.txt`,
`/tmp/lectum-task178-post-state/fixed.log`, `/tmp/lectum-327-video-image-smoke.log`.
Essas provas não autorizam declarar .327 publicada nem auditoria completa.

### Browser local de denúncias 0.1.327

- Login/cookie/hidrate e módulos Admin reais da imagem final, com PostgreSQL descartável.
  Não é o boot integral do backend: o router global exige configuração externa Google no
  carregamento. Nenhum provider foi inventado para validar essa UI; montados apenas módulos
  reais de Admin, com os guards de autenticação, origem, dispositivo e CORS preservados.
- Docker manteve rede interna. Um relay TCP limitado a `127.0.0.1:4501` encaminhou bytes ao
  container próprio, sem substituir respostas, inspecionar cookies ou liberar egress do container.
- A consulta inicial trouxe uma denúncia persistida; filtros longos de post/resposta de psicólogo
  não verificado trouxeram vazio legítimo, sem erro. Improcedentes recuperou o registro existente.
- Período incompleto foi recusado em português; selecionar Hoje carregou ambas as datas válidas.
  Browser: 390×844 sem overflow horizontal (53) e 1280×720 com filtros/resultado (54).
- Interrompido apenas o relay local: a consulta falhou de verdade e mostrou mensagem de conexão
  com Tentar novamente, sem cartões zerados, resultado vazio ou paginação (55). Após restaurar
  o relay, o botão recuperou o resultado. Nenhuma rota simulada/interceptação de resposta.
- Sessão local encerrada; aba retornada à homologação antes de parar dev/relay. Removidos somente
  containers, rede, configs e credencial descartáveis de propriedade desse laboratório.
- Catálogos no Admin publicado: abordagem/idioma vazios recusados, mínimo de dois caracteres
  aplicado, foco no nome e Escape restaurando foco no botão de abertura. Nenhum catálogo salvo.
  Placeholder “Nome do abordagem” é pendência de copy; não classificar como falha de validação.
- Concorrência/moderação também repetida na imagem .327 final: **16/16** em PG real isolado;
  evidência `/tmp/lectum-community178-artifact327.5htPyo/RELATORIO.md`.
- Leitura adicional de notificações: 109 integrais com proveniência. Encontrado risco estático
  de opt-outs sobrescritos por defaults após falha do GET; reprodução/correção em preparação.
  Base acumulada: 599 leituras iniciais, 11 parciais, 2.511 ainda pendentes. Não confundir
  notificações entregues pela jornada UI com certificação de todos os canais/digests/concorrência.
- Build final Admin .327 aprovado com diretório gerado limpo e dev parado: source maps de
  produção ausentes, 30 manifests de route groups sincronizados. Check agregado repetido
  após todos os scripts novos: 578/578, sem falha; cinco manifests sincronizados em .327.

### Publicação e repetição 0.1.327

- Commit `4bcd50e6`, push em homolog concluído, sem bypass de hooks. Backend/frontend/Admin
  responderam .327 no smoke público de 2026-09-11T12:29:33Z: **16/16**, incluindo health/ready
  200, rotas de versão sem cache/noindex, recusa de acesso privado e leitura pública.
  Evidência sanitizada: `/tmp/lectum-audit-327-smoke-homolog.json`.
- Operador executou o diagnóstico dentro do backend homolog e informou
  `VIDEO_PROCESSING_SERVICE_CHECK_OK`: versão .327, autenticação válida, ready, rede privada.
  É evidência fornecida pelo operador, não uma sessão SSH do agente nem teste Stream/R2.
- Browser publicado: denúncia de teste aparece no filtro de post de psicólogo não verificado
  + Improcedentes (57); Salvos mantém Seguindo e resposta sem filha removida (58). Lista
  Minhas respostas contém somente as duas respostas remanescentes da conta de auditoria.
- Aba Conteúdo, distinta de Denúncias, ainda recusou filtro de psicólogo não verificado,
  acompanhando o erro com zero registros (56). Reproduzido e atribuído à continuação .328.
- Cobertura acumulada atualizada com proveniência: 647 leituras integrais da base, 10 parciais
  e 2.464 pendentes. A publicação não conclui a auditoria nem remove os bloqueios de produção.

### Pendência de teclado reproduzida após .327

No post anônimo próprio da auditoria, profissional abriu Mais opções → Denunciar post. Foco
permaneceu no documento; Tab alcançou o link da comunidade atrás do overlay, fora de `role=dialog`
(screenshot59). Escape fechou, mas manteve foco nesse link. Nenhuma denúncia enviada. O componente
não implementa foco inicial/contenção/restauração; inventário de padrões dos demais modais em
revisão antes de escolher correção reutilizável. Não confundir `aria-modal` com contenção de foco.

Preferências .327 publicadas: na conta profissional própria, desativado somente “Novos upvotes”,
salvo e recarregado; opt-out persistiu, outros switches permaneceram ligados. Depois restaurado
ao estado original, salvo/recarregado, botão Salvar desabilitado. Sem mudar permissão do Browser
ou enviar notificações. Essa prova é do caminho de sucesso, não da correção para GET falho.

### Validação .328 — módulos reais, não simulação de provider

- Check agregado passou: raiz6, frontend159, backend359, Admin53, video43 (614 das apps +6).
  Logs `/tmp/lectum-328-root-check.log`, checks focais e relatório dos agentes. Testes novos
  de notificações executam o componente exportado usado pelo app com React Query/RHF reais;
  sem extração AST/VM, substituição de hooks ou respostas interceptadas.
- Imagem integral `lectum-backend:audit-0.1.328`, digest
  `sha256:bba879cebb3f1fc8e66ace6c6c4b8c1471684560f4d2f65ecc7ac51da98a7dd4`.
  Build Prisma/TypeScript aprovado; teste HTTP/PG de denúncias+conteúdo **23/23**, recursos
  descartáveis removidos. Baseline .327 falhava em quatro tipos longos de conteúdo.
- Laboratórios locais utilizaram Express, login/cookies, CORS, guards, Prisma/PostgreSQL e
  módulos reais da imagem, com Next local das árvores .328. Não é boot global nem OAuth.
  Dois parâmetros Google já existentes no env local foram usados apenas para construir a
  strategy importada pelo módulo JWT; nenhum provider chamado e nenhum valor impresso.
  Containers em rede Docker interna sem egress; relays TCP loopback encaminham bytes, não
  alteram respostas. Usuários/registro de comunidade exclusivos do PG descartável.
- Admin: oito tipos de Conteúdo conferidos no Browser390×844; tipo compatível trouxe o post
  existente, demais trouxeram vazio legítimo. Relay interrompido provocou erro real sem
  contagem/vazio/paginação; retry após restabelecer o relay recuperou consulta. Busca limpa
  recuperou o post em1280×720, sem overflow horizontal. Screenshots60–62 em
  `/tmp/lectum-audit-178-ui/`; 61 capturou viewport mobile ainda durante resize, não desktop.
- Preferências: tabela do PG **exclusivo do laboratório** renomeada temporariamente para
  provocar GET falho real; Browser exibiu só erro e retry, sem switches nem Salvar (63).
  Nome da tabela restaurado em seguida; retry recuperou opt-outs reais. Alterada apenas
  avaliação na conta local, salva e recarregada (64); cinco opt-outs anteriores, incluindo
  `admin_campaign` não mostrado, foram conferidos no PG e preservados. Nenhum canal enviado.
- Perfil390px: nome>80 recebeu mensagem PT-BR; campos obrigatórios focados sem salvar (65).
  Valor nacional começando por55 gerou link WhatsApp com DDI+DDD preservados, sem abrir/enviar.
  Todos os quatro inputs de arquivo tinham display:none/sem caixa. Enter abriu seletores de
  capa do perfil, foto e menu Trocar vídeo. Nenhum arquivo selecionado ou enviado. Limitação:
  API de chooser não aceita lista vazia; Escape/reload encerraram fluxo sem arquivo. Não
  certificar cancelamento nativo por essa tentativa, nem capa de vídeo ainda inexistente.
  Limite composto160 comprovado pelos testes RHF/Zod; formulário local não teve CPF/CRP/DOB
  inventados para satisfazer requisitos profissionais. Não houve publicação de perfil.
- Push nativo não está configurado no módulo local; mensagem segura indica indisponibilidade.
  Rotas não montadas no laboratório podem responder404 (ex.: Dashboard e chave VAPID); não
  contar isso como quebra do app publicado nem como teste de integração desses serviços.
- Devs/relays parados, aba retornada à homologação. Containers, rede e arquivos de credenciais
  próprios removidos após conferir labels de propriedade. Dados/serviços locais preexistentes
  e toda homologação permaneceram intactos. Nenhuma migration/schema/env/package alterado.
- Builds finais frontend/Admin .328 aprovados (exit0), sem source maps de produção e30
  manifests Admin sincronizados. Primeiro build Admin após dev falhou por artefatos gerados
  de desenvolvimento; repetido com apenas `.next` limpo e dev parado, sem relaxar o guard.
  O wrapper inicial também usou nome reservado `status` do zsh; retentativa com `rc` confirmou
  exit0 real. Logs finais `/tmp/lectum-328-frontend-build-final.log` e
  `/tmp/lectum-328-admin-build-clean.log`. Nenhum novo bump para essa retentativa.
- Cobertura de base675 leituras integrais iniciais/10 parciais/2436 pendentes. Leitura de fonte
  não substitui testes de fluxo. Commit/push e repetição publicada ainda pendentes nesta anotação.


Publicação .328: commit `2d1cb07b`, push em homolog com todos os hooks aprovado. Primeiro smoke
após push manteve13/16 condições; os três serviços ainda anunciavam .327, mas health/ready e
contratos de segurança estavam íntegros. Aguardando conclusão dos deploys, não tratar isso como
versão .328 já publicada. Vídeo continua confirmado pelo operador na .327; alteração .328 nele
é somente manifest e o filtro de watch pode não disparar deploy por esse arquivo.


Smoke final .328 em 2026-09-11T13:24:12Z: **16/16**, backend/frontend/Admin0.1.328, health/ready200,
versões públicas sem cache/noindex e contratos de segurança preservados. Browser publicado
recuperou o post próprio no filtro de psicólogo não verificado (66); preferências salvaram
opt-out de upvote após reload, e depois o valor original foi restaurado e conferido com
Salvar desabilitado. Sem envio de canais nem modificação de usuários terceiros.

## Denúncias — validação local para .329

- Laboratório novo `aace328dcea34c63f625`: PG real descartável em rede Docker interna,
  módulos reais da imagem backend .328 e frontend em dev; relay TCP sem respostas simuladas.
  Apenas configuração construtora OAuth local existente foi montada, sem chamada OAuth ou
  integração externa. Conta local própria, perfil não publicado e identidade profissional
  não inventada. O módulo local não equivale ao boot integral do backend.
- Corrigida preparação do laboratório: post do harness Admin usava `published`; rotas públicas
  exigem `publicado`. Alterado somente esse post descartável. Também reproduzidos os guards reais
  optionalAuth/posts/community, account e requireRole/profile. Seis checks de prontidão reais.
  Isso não invalida a prova Admin .328, mas impede alegar que o fixture antigo já validava o feed.
- Denúncia nativa em390×844 (67), erro real com relay interrompido (68), desktop1280×720 (69).
  Visual comparado à captura59: mesma largura máxima430, tokens, campos e ações, agora sem
  rolagem do fundo. Sem overflow horizontal em390. Nenhuma mídia foi enviada.
- showModal/:modal conferidos no DOM, foco inicial Fechar denúncia, fundo ausente da árvore AX,
  body/html overflow hidden e restauração ao fechar. Tab/Shift+Tab não focam controles do fundo;
  Chromium admite passagem pelo chrome do navegador, refletida como BODY, antes de retomar.
- Escape/Cancelar/X retornam ao botão específico do post, comentário ou filha. Texto digitado
  permanece no rerender. Select aberto: primeiro Escape só fecha opções, segundo fecha modal.
  Reaberturas não preservam erro/texto de denúncia anterior, mantendo reset do formulário.
- Falha real de transporte mantém alerta PT-BR e detalhes, sem reset; botão temporariamente
  disabled pode deixar foco no BODY do browser. role=alert anuncia falha e fundo segue inerte;
  não alegar que o botão preserva foco durante disabled. Reenvio após relay restaurado persistiu
  denúncia da filha; envio na rota dedicada persistiu a do pai. PG confirmou uma de cada.
  Sucesso devolveu foco ao botão correto. Post report prévio do harness não contado como novo.
- Doze testes de módulos reais (SSR, RHF/Zod e ownership puro), sem substituir React/hooks ou
  simular DOM, passaram. SSR cobre marcação e contratos, não prova foco/teclado. Runner agregado
  será atualizado para incluir o arquivo; check/build/publicação ainda em andamento.
- Revisão de29 fontes de modais e66 de checkout incorporada por proveniência, sem contar81
  arquivos financeiros ainda pendentes nem20 somente inventariados de modais. Cobertura inicial
  da base:706 integrais/10 parciais/2405 não revisados. Relatório financeiro sem operação externa:
  `/tmp/lectum-task178-checkout-readonly.7ffxsf5n/RELATORIO.md`.
- Safari/iOS, teclado virtual e navegação SPA/camadas simultâneas continuam não certificados.
  Aviso local de hydration de sessão antiga observado em Psicólogos: investigar separadamente;
  não atribuído à denúncia, nem corrigido por ocultar warnings.

Reteste final do foco em erro: após submit desabilitado perder foco, a denúncia agora foca o
bloco de erro somente se documento ativo e foco em BODY/dialog. Novo erro real com relay
parado confirmou activeElement=DIV com ID da mensagem, dentro do modal; Tab seguiu para
Cancelar e Escape devolveu à reticência da filha. Texto preservado. Foco em campo já ativo
não é redirecionado. Recursos próprios, relays e dev foram removidos/parados depois, com
verificação de labels; credenciais temporárias apagadas, serviços preexistentes intactos.
Bump único .328→.329 executado nos cinco manifests, check de versão6/6. Teste permanente de
modal incluído no runner normal do frontend; build/check global em curso.

Consulta documental financeira, sem API autenticada: a referência de
[criação de assinatura](https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/create-preapproval/post)
consultada em11/09 não explicita garantias de idempotência; isso **não prova ausência de suporte**.
A página de [Webhooks](https://www.mercadopago.com.br/developers/en/docs/checkout-bricks/additional-content/your-integrations/notifications/webhooks)
orienta consultar o recurso após receber o evento. A referência de
[fatura](https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/get-authorized-payment/get)
expõe vínculo com preapproval e pagamento. Filtros/garantias de busca por referência e retry
continuam a confirmar antes da implementação. Solicitados IDs de recursos exclusivamente de
sandbox preexistentes, sem tokens/cartões; não foram criadas cobranças nem chamadas sync/dunning.

Validação final .329: `pnpm check` exit0,626 testes das apps +6 de versão (632), incluindo
os12 novos do modal no runner normal. Frontend build exit0, sem source maps de produção.
Source-safety2132 e source-size aprovados. Logs `/tmp/lectum-329-root-check.log` e
`/tmp/lectum-329-frontend-build.log`. Sem schema/env/package novo; APIs continuam compatíveis.
Backend/Admin/video mudam apenas a versão neste recorte; não alegar novo smoke privado do vídeo.

Publicação .329: d367fee5, push aprovado com hooks. Smoke final16/16 (terceira leitura),
backend/frontend/Admin .329 e health/ready200. Leituras anteriores capturaram deploy parcial,
não regressão de contrato. Browser publicado70: modal nativo390, foco Fechar, fundo inerte,
primeiro Escape no select preserva modal, segundo fecha e retorna Mais opções, overflowrestaurado.
Nenhuma denúncia enviada em homologação nesse reteste. Vídeo permanece último confirmado .327.

Leitura adicional detectou condição de corrida em PageViewTrackingRepository.updateDuration.
Probe de repositório real na imagem .328/PGdescartável:6 cenários passaram e2 falharam — duração
menor concorrente sobrescreve maior; soft-delete durante espera não impede escrita. Locks nativos
observados em pg_stat_activity, não delays simulando banco. Resultado baseline exit1 e cleanup
confirmado. Artefatos `/tmp/lectum-analytics-duration-178/`, nenhuma mudança em banco publicado.


Continuação .330 — leituras e controle isolado:
- Financeiro: 130 novas leituras integrais (incluindo81 antes pendentes); 18/18 arquivos da UI
  financeira lidos pelo subagente, sem teste visual/consulta de gateway nesse recorte. Ledger
  cumulativo distingue documentos parciais e fontes alteradas depois da leitura.
- Sessão:51 fontes integrais; template lê presença de cookie diferentemente no SSR/cliente.
  Fonte explica o mismatch local já observado mesmo com cookie válido/cache frio; ainda sem
  correção ou reteste de produção. Não ampliar suppressHydrationWarning nem restaurar Redux
  persistido. Relatório `/tmp/lectum-task178-session-hydration-review/report.md`.
- Cobertura integrada inicial:837 fontes integrais,10 parciais,2274 ainda não revisadas;
 734 entradas no ledger adicional. Leitura não substitui validação de fluxo.
- Runner PG compartilhado extraído de post-state, sem ler .env do host nem iniciar scheduler;
  configuração efêmera sem credenciais OAuth fictícias. Import é inerte e dois testes verificam
  rejeição de argumentos/configuração insegura antes de criar recursos.
- A imagem controle .328 continua com48/48 cenários de estado de posts aprovados após extração;
  duração repetiu6/8, mesmas duas falhas concorrentes reais. Todos os recursos etiquetados foram
  removidos; comandos `/tmp/lectum-330-poststate-baseline.log` e
  `/tmp/lectum-330-duration-baseline.log`. Não atribuir6/8 à imagem corrigida ainda não construída.

Leitura das40 fontes de analytics público concluída, incluindo localização, atenção, retenção,
ações e suas rotas/DTOs/validators. Ainda não significa40 fluxos end-to-end: callbacks de auth,
headers do edge, geolocalização externa, sinais reais de retenção e política de remoção dos
registros têm validação pendente. Nesta alteração somente duração de página é corrigida.
As métricas de origem/atenção usam sinais do cliente e não constituem confirmação financeira.


Financeiro .330: baseline preservado a partir do Gitd367fee5,16 casos (13 falhas +3 controles);
mesmos16 corrigidos e12 controles adicionais passaram28/28, módulos reais importados. Testes
executados pelo subagente em cópia de fontes com SHAs, sem AST/VM/substituir provider e apenas
PATH no ambiente. Parent revisou diff, testes e conferiu os cinco SHAs do freeze. Evidência em
`/tmp/lectum-task178-finance-f127.mt7q3m40/`: baseline.tap, fixed.tap, FREEZE-SHA256.json.
Cobre status exato/nestedpayment, propriedade em ordem diferente, quantia inválida/overflow,
vínculo exato/ambíguo, status_detail nulo e consumidores de receita/histórico/saúde/LTV/mapCharge.
Zero explícito tem controle próprio; contratos de resumo, dedupe e MRR preservados. Não é prova
de liquidação canônica ou de cobrança externa; C1/C3/F3-F6 seguem pendentes.
Bump único .329→.330 realizado nos cinco manifests; versão6/6. Checkglobal e imagem em andamento.

Check agregado .330 exit0:656 testes das apps +6 de versão (662 no total), sendo
frontend171/backend389/Admin53/video43. Prisma/TypeScript/Biome, segurança de fonte2134,
862 módulos backend alcançáveis, ciclos, envs e segredo aprovados. Build local backend aprovado;
imagem integral e provas PG corrigidas ainda em execução. Nenhuma alteração de schema/migration.

Imagem backend integral .330 construída com sucesso:
`sha256:ecbef43f10c8170b0419eecabf68c91e9b3f054f157789a6a3eaa181d15099fc`.
Duração corrigida8/8, incluindo os dois casos que falhavam no controle; estado de posts48/48
na mesma imagem. Bancos/redes locais próprios removidos por label. Logs
`/tmp/lectum-330-duration-fixed.log`, `/tmp/lectum-330-poststate-fixed.log`,
`/tmp/lectum-330-docker-build.log`. Não houve execução de db:migrate em banco local persistente:
schema/migrations não mudaram; migrate deploy limitou-se aos bancos descartáveis.
Cobertura inicial atualizada:870 integrais/10 parciais/2241 não revisados;769 entradas adicionais.
Financeiro/analytics são correções de código, não recálculo de dados publicados. Sem env/package
novo; nenhuma alteração de UI além dos manifests nesta versão. Publicação e smoke em andamento.


Publicação .330 concluída: `056b09ab`; terceiro smoke16/16, backend/frontend/Admin .330,
health/ready200. Primeiro/segundo capturaram deploy parcial; não foram marcados como sucesso.
Último vídeo privado confirmado continua .327 pelo operador. Nenhuma nova cobrança ou backfill.

Continuação .331 — H1 de hidratação:
- Baseline Git056b09ab preservada em /tmp, sem .env copiado. Browser real390/1280 reproduziu
  hydration mismatch de PrivateTemplate em /psicologos com sessões válidas de PSI e paciente;
  /app/perfil também apresentou o mesmo contraste SSR restrito × loading cliente.
  Capturas71/72 e logs com timestamp em /tmp/lectum-331-user-ui/.
- Laboratório usa imagem integral backend .330 e PostgreSQL/contas descartáveis reais,
  módulos reais de login/HttpOnly/hidrate/logout/diretório/perfil, sem endpoints simulados.
  Não é boot integral de schedulers/providers. Imports de auth exigiram somente configuração
  OAuth existente, mantida privada; rede Docker interna sem egresso, sem chamada Google/SMTP.
- Rotas não montadas de push/plano retornam404 reais e não constituem defeito do deploy. O
  erro adicional de VAPID no dev overlay foi separado de H1, não ignorado como teste aprovado.
- Build otimizado local aprovado. Execução desse build com API localhost é recusada pela
  política existente de origens de produção (api.invalid); mostra sessão indisponível. Não
  relaxar CSP/origens para fazer teste passar. Regressão autenticada será validada no dev local;
  resultado do build não equivale a sessão autenticada de produção local.
- Goodall leu86 fontes de configurações/SEO (64 anteriormente pendentes); riscos A01–A10 são
  achados estáticos, sem certificação visual/provider/DB: URL escrita × consumo, EXIF, upload
  atrasado cruzando páginas, manutenção em GET, trilha administrativa/corridas de catálogos,
  fallback global ignorado, teclado/reordenação e scroll modal. Relatório/ledger em
  /tmp/lectum-task178-admin-config-seo/. Nenhum deles foi declarado corrigido.
- Euclid acrescentou62 leituras de sessão/conversão; I1–I6 permanecem estáticos: replay antes
  de sessão validada, intenção sem contexto/prazo, storage frágil, perda de query/hash no
  retorno, lock de scroll fora do guard e zoom global bloqueado. H1 não deve alterar essas
  regras silenciosamente. Artefatos /tmp/lectum-task178-session-hydration-followup/.


H1 corrigido no dev local com os mesmos módulos reais/PG e sessão de paciente da baseline:
- Capturas73 desktop1280 e74 mobile390: diretório vazio legítimo carregado, sem novo mismatch.
- Navegação SPA e recarga de /app/perfil exibem apenas a identidade paciente esperada.
- Relay TCP próprio parado: perfil substituído por sessão indisponível, sem dados privados.
  Captura75. Relay reiniciado + Tentar novamente recuperou a identidade sem novo login.
- Sessão da conta efêmera revogada pelo helper real, exclusivamente no PG descartável:
  próxima recarga recusou sessão e voltou ao login com callback; nenhum mismatch novo.
- Sem sessão, /psicologos continua público; rota privada continua restrita. Isso não valida
  conteúdo de perfil publicado, streaming, OAuth, Safari nem dispositivos móveis reais.
- Testes agregados667 (frontend176/backend389/Admin53/video43 +versão6). Primeiro check
  acusou a palavra de comentário no teste como dado artificial; comentário corrigido, sem
  relaxar guard/teste. Repetição completa exit0. Build Next local otimizado exit0.

Usuário confirmou que pagamentos são exclusivamente sandbox e autorizou cartões de teste.
Não foram fornecidos IDs de recursos existentes; antes de eventual operação, verificar conta
vendedora/modo efetivo e usar apenas dados documentados de teste. Nenhuma cobrança criada aqui.
Cobertura consolidada:984 integrais iniciais/9 parciais/2128 pendentes;894 entradas adicionais.


Controle anônimo privado confirmado na captura76: /app/perfil mostra “Área restrita / Acesse
sua conta”, sem identidade, com Criar conta/Fazer login. Não é redirect nessa rota; o redirect
anterior foi consequência da revogação real. Browser local encerrado, viewport restaurada.
Recursos próprios H1 removidos por labels, inclusive rede/PG/Admin auxiliar e credenciais
locais; cleanup precisou path canônico /private/tmp por guard CLI do auxiliar. Não tocar
contas, volumes, serviços ou credenciais publicados. Build final frontend .331 exit0 e
version6/6; bump único feito. Publicação/smoke ainda pendentes.
