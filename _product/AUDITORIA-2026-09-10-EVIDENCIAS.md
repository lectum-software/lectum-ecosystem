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

Publicação .331 concluída: c56c6ca4, push exit0, terceiro smoke16/16. Backend/frontend/Admin
confirmados .331; health/ready200 e versões sem cache/noindex. Os dois smokes anteriores
registraram somente publicação parcial, não falha funcional nova. Browser publicado:
- /psicologos com sessão existente: recarga390×844 e1280×720, sem novo erro de hidratação.
- Vídeo ativo visível reproduziu; isso não valida todos os vídeos/formatos/controles.
- /app/perfil: SPA e recarga390px exibiram somente a conta profissional da auditoria.
- Capturas77–79. Nenhum dado de perfil foi editado; sessão e aba profissional pausada preservadas.

Leituras adicionais sem runtime: Tesla154 arquivos completos de upload/Stream/R2, Euclid31
arquivos de feed/conversão. Proveniência/SHA integrados ao ledger, sem contar imports apenas
inventariados. Riscos M1–M7 e T1–T6/G1–G2 descritos nos relatórios locais respectivos. Não são
correções nem reproduções de perda física no provider: cancelamento/associação e hidratação
pós-commit precisam provas dirigidas. Na aba publicada existiam48 elementos de vídeo (3 ciclos);
alguns inativos anunciavam erro de mídia no AX, mas o ativo funcionou. Não generalizar esse
sinal para falha visível de todos os vídeos nem para tempo de carregamento medido.

A04/SEO: Goodall reproduziu11 verificações na imagem .330 e PG descartável, sem provider/env
publicado:7 controles passaram e4 falhas confirmadas (inicialização pública concorrente,
GET escrevendo legado, perda de customização e alteração de tombstone durante lock). Provas
experimentais de primitivas SQL não contam como regressão do patch:15 controles adicionais
orientam a decisão, mas a imagem corrigida deve executar os métodos reais novamente.

A04 fechado localmente na imagem .332:18/18 cenários dos repositórios/serviços compilados reais.
Comando permanente: `node backend/scripts/seo-metadata-integration.mjs --image=lectum-backend:audit-0.1.332`.
Imagem Linuxamd64 sha256:608c3b669635c201d1c9ecc8926e954a77bcbf9f8db5c75c4498d5a7b9577807.
PG recusa toda gravação durante GET, barreiras reais coordenam2 inicializações e corridas de
manutenção/customização/remoção; repositório Admin com auditoria também ganha a disputa sem
perder sua edição. Colisão de ID desconhecido recusa e reverte a inicialização completa.
Datas/IDs reais, aliases exatos, campos editoriais, ausência/tombstone e upload autorizado sem
provider foram cobertos. HTTP/Browser não são substituídos por chamadas de serviço nessa prova.

Artefatos em /tmp/lectum-task178-a04-seo-pg/permanent-{332.log,result.json,freeze.json}; cleanup
verificado sem containers/redes/diretórios privados remanescentes. Baseline final ampliada foi
7/12 com5 falhas (a quinta envolve edição pelo repositório Admin auditado); versão inicial11
permanece em baseline-v1. Nenhum runtime substituído, provider/credencial publicada usado.

Buildhost e imagem final com pnpm build passaram. Primeira imagem .332 foi substituída localmente
antes de testar, para incluir transação de rollback total e ordem determinística dos locks;
nenhum deploy dessa imagem preliminar. Quatro testes puros complementam18 integrações, sem
alegar cobertura do gateway, outros uploads ou todos os metadados dinâmicos. Bump único .332.
Cobertura inicial1115/3121,7 parciais,1999 pendentes;1036 entradas adicionais com proveniência.
Check agregado final .332 aprovado:671 testes (frontend176/backend393/Admin53/video43 +versão6),
Biome/TypeScript/Prisma e guards sem falhas. Duas fontes de probe permanentes foram revisadas
pelo principal, incluindo cleanup exclusivo, transações, barreiras e asserts de preservação.
Nenhum reset/backfill publicado. Publicação ainda pendente até commit/push/smoke reais.

## Publicação .332 — metadados e incidente de infraestrutura

Commit372e534d publicado em homolog. Primeiro build remoto interrompido ao obter token anônimo
do Docker Hub para node:22-bookworm-slim (HTTP500), antes de compilar a aplicação; usuário
repetiu deploy sem alterar imagem/env/código. Backend anterior permaneceu .331 com health/ready
200 durante a espera. Após retry: backend/frontend/Admin .332, smoke16/16; /health e /ready200.
Artefatos `/tmp/lectum-332-push.log`, `/tmp/lectum-audit-332-smoke-homolog.json`,
`/tmp/lectum-audit-332-smoke-third.log`. Servidor privado de vídeo não foi recertificado nesta etapa.

Browser publicado: Admin SEO carrega os9 registros e trocar seleção para Busca de psicólogos
mostra rota/canônico /psicologos; sem erro novo no console. Não houve edição/salvamento de
configuração publicada. Captura80 em `/tmp/lectum-audit-178-ui/80-homolog-332-seo.jpg`.

### Continuação: leitura de conta, avaliações e moderação (não confundir com teste executado)

55 fontes novas de frontend e 44 de comunidades/moderação foram lidas integralmente pelos
subagentes, com SHA/proveniência incorporados ao ledger. Dependências parciais permanecem
parciais. As hipóteses abaixo ainda exigem reprodução/correção, não entram na lista simples
de itens corrigidos. Nenhum dado publicado foi alterado nessa revisão.

| ID | Evidência de código / risco | Próxima prova e limite |
| --- | --- | --- |
| AF1/P2 | `frontend/src/app/auth/admin-view-as/logic.tsx`: estado inicial interpreta fragmento só no cliente | Confirmar SSR/CSR real antes de afirmar mismatch; `useSearchParams` pode causar bailout. Token segue validado pelo backend; não demonstrado bypass. |
| AF2/P2 | `frontend/src/components/account/account-delete-section.tsx`: query `deleteReauth=ok` mantém readiness mesmo após recusa específica | Reoferecer autenticação quando autorização expira/é consumida; não tratar query como prova. OAuth/exclusão reais não executados. |
| AF3/P2 | `frontend/src/app/app/reviews/logic.tsx`: “carregar mais” substitui página sem voltar; versão profissional troca limite/query e desmonta cards com rascunho | PG com >10 avaliações e Browser; preservar histórico/rascunhos e erro. Não alegar perda persistida. |
| AF4/P2 | `frontend/src/app/auth/recovery/logic.tsx`: onSuccess lê campo atual, não e-mail da mutation | Sucesso/reenvio devem usar envio A mesmo se campo mudar para B. Sem prova de entrega externa/vazamento. |
| AF5/P3 | `frontend/src/app/app/reviews/success/logic.tsx`: entrada direta afirma avaliação concluída sem recibo | Verificar avaliação real/contexto antes de sucesso; POST normal só navega após sucesso. |
| C01/P2 | `AdminModerationResolutionRepository`: resolução recebe denúncia lida antes da transação | Dois operadores podem concluir decisões divergentes; remoção pode ocorrer mesmo com zero denúncias atualizadas. Claim antes do efeito/auditoria, PG e ambos os schedules. |
| C02/P2 | Mesmo repositório: markReviewing atualiza por ID com snapshot antigo | Pode reabrir resolved com resolved_at preenchido; definir revisão explícita de decisão e evitar auditoria de no-op. |
| C03/P2 | `AdminModerationMutationSupportRepository` e `AdminCommunityManageContentMutationRepository`: contagem absoluta/lista de descendentes antecipadas | PG: duas remoções e criação concorrente de filha; coordenar todos os writers e contar alterações efetivas. Não recontar dados publicados. |
| C04/P2 | `community-list.ts` + `manage-selects.ts`: post.reports inclui denúncia da resposta, somada novamente por replies.reports | Uma denúncia pode contar duas vezes; alias em_analise omitido. Provar com mapper/PG real, sem alterar registros. |
| C05/P2 | `community-operations.ts`/`AdminCommunityManageCoreRepository`: dados/avatar/regras sem trilha mínima de ator | TASK-52 pede auditoria; usar padrão transacional já existente na ativação, com before/after seguros. Não é ausência de autenticação. |
| C06/P2 | `AdminModerationCommunitySuggestionsRepository`: movimento recebe bloco elegível antes da transação | Arquivar bloco concorrente pode não impedir movimento; reler estados e auditar só mudança efetiva. Conversão interna sem comunidade é permitida na TASK-149. |
| C07/P3 | Dashboard legado limita antes de prioridade, compara motivos PT com canônicos e ordena severity textual | Blocos retirados da UI na TASK-51; não afirmar perda de alerta visível. Decidir correção/depreciação compatível do DTO. |

Relatórios causais locais: `/tmp/lectum-task178-frontend-flows-readonly/report.md` e
`/tmp/lectum-task178-admin-community-moderation/relatorio.md`. Imports inventariados não são
leituras; leitura não equivale a Browser, HTTP, entrega, pagamento nem dispositivo real.

### Continuação .333 — validação de associação/cancelamento em execução

Mudanças isolam cancelamento de tentativa e remoção deliberada; nenhuma alteração visual de
produto. O build otimizado local foi aberto em390×844: login vazio mostra dois erros PT-BR,
foco no e-mail e largura do documento390 sem overflow, console sem novo erro. Capturas82/83
em `/tmp/lectum-audit-178-ui/`; captura81 ocorreu antes da repintura e não sustenta evidência
visual. Esse teste de regressão NÃO prova TUS, cancelamento no celular ou reprodução no provider.

Prova HTTP usa router, validator, middleware JWT/dispositivo/cookie e banco PostgreSQL reais
na imagem integral. Provider desabilitado e rede isolada; registros ready são pré-condições
locais, não alegação de upload real. Placeholders de OAuth somente permitem construir a
strategy não utilizada; não substituem método nem certificam Google. Baseline .332 não tem
a nova rota; o teste de usuário inativo foi corrigido para o contrato efetivo401, não tratado
como vulnerabilidade. Resultado final será registrado após imagem .333.

Primeira imagem .333 `sha256:7b2a8e360568388e40c789322303174886ca73488fde551771a02c5814dec5a5`:
- `pnpm check`:673 testes (frontend178, backend393, Admin53, video43, versão6), zero falha.
- Builds backend/frontend e Docker integral amd64 passaram. Sem migration/schema/env/package novo.
- PG associação24/24, HTTP/JWT/cookie/dispositivo16/16, regressões de concorrência16/16 e
  post-state48/48 passaram. O baseline antigo de concorrência continua reproduzindo10 falhas;
  não somar baseline ao número de invariantes corrigidas. Recursos isolados removidos.
- Logs HTTP: `/tmp/lectum-333-cleanup-http-final.log`; demais PG:
  `/tmp/lectum-task178-media-m23-333.s8lfcz77/`. Sem overlay de dist/métodos, mock ou provider.
- Gate adicional antes do commit: incluir controles de candidato mais recente e CAS de migração
  no probe. Validação funcional em homolog e novas versões dependem do próximo push/deploy.

Gate adicional fechado: `association-28.log` aprovou28/28, incluindo newest uploading e CAS
de origem/capa válidos/divergentes. Runtime congelado, sem mudança para fazer o teste passar.
Frontend final remove TUS DELETE do abort e repete check178/build; cancel remoto fica sob
a decisão autenticada do backend. Suporte de Termination pela Cloudflare não foi presumido.
Contagem total de PG/HTTP final108 (28+16+16+48), independente dos673 checks do workspace.

Browser repetido no build frontend final após o ajuste TUS: login vazio390×844, foco e dois
alertas PT-BR, scrollWidth390, console sem erro/warning. Captura84 é byte a byte idêntica à83
(SHA `5246b48f6233220f5ebcb8998c7c810d74b77a9c2d392823f0065cb2288e4008`), sem mudança visual.
Servidor local temporário encerrado e viewport restaurado; abas/sessões do usuário preservadas.

Limitação operacional: o teste específico M1 de falha controlada no PG não chegou a executar;
a ferramenta recusou a operação do subagente. Não foi repetida por outro canal nem contada
como prova. O caminho estático pós-commit continua pendente de validação/correção própria;
nenhum banco ou objeto R2 publicado foi tocado. A revisão normal de fontes e demais validações
permitidas continua, sem simular resultado desse teste.

Publicação .333 confirmada: commit8dc679b9, pushorigin/homolog, pre-push aprovado. Primeira
consulta ainda viu.332; segunda passou17/17, com backend/front/Admin.333 e health/ready200.
Endpoint de cleanup recusa visitante401; isso não substitui os16 testes HTTP autenticados locais.
Logs: `/tmp/lectum-333-push.log`, `/tmp/lectum-333-smoke-second.log` e
`/tmp/lectum-audit-333-smoke-homolog.json`. Serviço privado de vídeo não foi acessado nesta prova.

### Recuperação AF4 — validação .334

- Callback usa variáveis efetivamente submetidas; reenvio valida apenas sentEmail pelo schema
  existente. Form/controller ficam somente-leitura durante pending, sem duplicar fundação.
- Loader TS/TSX para fontes reais compartilhado entre cinco arquivos de testes; removidas
  quatro cópias anteriores. Sem mock de módulo/API, package ou código de produção paralelo.
- `pnpm check`:679 (frontend184/backend393/Admin53/video43/versão6), zero falha. Frontend build
  aprovado; logs `/tmp/lectum-334-root-check.log` e `/tmp/lectum-334-frontend-build.log`.
- Seis novos testes: schema e SSR de RHF/Form/controller reais; vínculo callback/reenvio é
  contrato estático, não sucesso de mutation/entrega de e-mail simulados.
- Browser local otimizado390×844 e1280×900: validação vazia/inválida PT-BR, foco no e-mail,
  sem overflow horizontal. Uma tentativa com endereço autorizado retornou erro real de
  conexão do destino local/tunnel já configurado; UI segura e campo editável depois da falha.
  Nenhum novo token/código foi solicitado ao usuário, nenhum e-mail dado como entregue.
- Capturas86–89 em `/tmp/lectum-audit-178-ui/`. A captura85 de homolog não é recuperação:
  sessão já autenticada redirecionou para diretório. Não foi tomada como prova do formulário.
- Sucesso/reenvio/consumo do link em homolog e Safari/iOS/dispositivos continuam pendentes.
  Nenhuma mudança de API, banco, migrations, envs, tokens ou política anti-enumeração.

### Profissional — novas fontes e lacunas PF1–PF3

Euclid leu57 fontes inéditas/4455 linhas com SHA estável, sem runtime, Browser ou provider.
Evidências `/tmp/lectum-task178-professional-forms-readonly/reading.json` e `report.md`.
PF1: extração repetida de DDI pode remover DDD igual ao país no WhatsApp. PF2: reiniciar CFP
ainda permitido durante confirmação; payload antigo correto, não prova de bypass/CPF novo.
PF3: modalidade apenas presencial recebe rótulo híbrido no perfil. Próximas correções exigem
provas próprias; não afirmar número salvo errado, consulta CFP real ou perfil publicado afetado.
Ledger integrado1204; base3121:1276 leitura inicial,5parciais,1840não lidos. Dois imports de
perfil/mídia adiados estão explícitos; nenhuma cobertura por simples grep/listagem.

### Integração concorrente .335 — origem das versões e regressões

O push2aa02fa9 foi recusado sem force:58b071e9 chegou a origin/homolog com sua própria.334.
O smoke17/17 em `/tmp/lectum-334-smoke-first.log` pertence a58b071e9, NÃO comprova AF4.
O campo commit daquele JSON foi coletado do HEAD local, portanto não identifica o artefato
remoto; preservar o log com esta ressalva, sem atribuição falsa de publicação da recuperação.

Integração por merge de ambos os históricos; bump único.335 para este novo commit, distinto
do commit de recuperação. Preservados Cidade/Estado, seta, opções porUF, fieldNestingDepth0
e junction de teste. Sem force/reset, migration/env/package/provider ou reparo de dados.

Duas incompatibilidades da atualização concorrente foram detectadas e corrigidas:
1. Com Multer2.3.0 travado/instalado, limite+1 aceita5MiB+1. HTTP real baseline4/5, falha200
   em vez de400. Restaurado fileSize inclusivo nativo;5/5 após correção, sem mudar teste.
2. ESLint atual possui a regra de navegação interna: remover as diretivas específicas fez
   o check falhar. Restauradas as exceções justificadas de descarte de sessão/cache; sem
   trocar hard reload por navegaçãoSPA nem desabilitar a regra globalmente.

Validações da integração:
- `pnpm check` final679/679, frontend184/backend393/Admin53/video43/versão6.
- Builds frontend/Admin/backend/video aprovados. Restauro posterior de duas diretivas é
  comentário apenas, sem alteração de runtime; lint/check final aprovados nas fontes finais.
- Docker backend integral `sha256:cf5a3c17f478187736d51df15b28e2880951bdf8277eb0ac8addfe7453332708`
  construído amd64 com lock congelado.5/5 HTTP do chunk dentro da imagem, networknone, sem
  hostenv, provider, banco ou overlay; container temporário removido com --rm.
- Browser homolog334: conta PSI de auditoria, rascunho SP/Campinas→RJ limpa input/cidade;
  Campinas deixa as opções e Rio aparece. Sem clicar Salvar. Reload confirma UF/cidade vazias,
  cidade novamente desabilitada. Capturas90/91,390×844; não é prova de save/CPF/CFP.
- Browser local335: formulário recuperação vazio, alerta PT-BR e foco, captura92; HTTP local
  `/version`335. A navegação do Browser para JSON/version foi bloqueada pelo cliente; HTML
  de recuperação carregou normalmente, sem contornar aviso/segurança ou instalar extensão.
Logs `/tmp/lectum-335-{root-check-final,frontend-build,admin-build,backend-build,video-build,
docker-build,docker-multipart,multipart-fixed,merge-multipart-baseline}.log`.

### Reanálise video — não ampliar cobertura por releituras

Tesla relê59 fontes já integrais no mesmoSHA por falha de deduplicação e reconhece o erro.
Nenhum crédito novo por essas fontes. Relatório154linhas em
`/tmp/lectum-task178-video-readonly.qa302s8c/RELATORIO.md`, acompanhado do ledger/imports.
V01 status intermediário cancelamento;V02 timeout probe classificado inválido;V03 limite
de dimensões incompatível com render social;V04 reserva sem renovação durante fila longa;
V05 diagnóstico por propriedade herdada;V06 script anuncia cancelamento não executado.
Todos são achados porfonte ainda sem nova reprodução/correção. R01–R04 (ordem conclusão,
resultado incerto fila, startup/shutdown e tamanho payload) permanecem hipóteses explícitas.
Não executar nem retomar a operaçãoM1 bloqueada. Nova seleção inédita passou a cruzar o TSV
consolidado antes da abertura; revisão permitida de fontes prossegue em outros módulos.

### Publicação335 confirmada

c2daa015 publicado em homolog; segunda verificação17/17, backend/frontend/Admin0.1.335,
health/ready200. Logs `/tmp/lectum-335-smoke-second.log` e
`/tmp/lectum-audit-335-smoke-homolog.json`. Primeira consulta após push ainda retornava334;
não foi atribuída à correção de recuperação. Servidor privado video: última prova fornecida
pelo operador continua327; build local335 não é confirmação do deploy privado.

### PF1–PF3 — contato, confirmação e modalidade336

Baseline determinístico com módulos reais335:3 falhas (DDD removido, excesso aceito,
presencial anunciado híbrido); online passa. `/tmp/lectum-336-whatsapp-baseline.log`.
Correção: helpers compartilhados sem import entre formulários, hidratação separada de
serialização, limites nacionais preservados; pending impede reinício e troca de resultado;
rótulo segue modalidade real. Schema/backend/check_id/result_key inalterados.

692 testes workspace aprovados:197front,393back,53Admin,43video,6versão. Build frontend
final aprovado. Logs `/tmp/lectum-336-root-check-final.log` e
`/tmp/lectum-336-frontend-build-final.log`. Treze testes adicionais:5 contato,4 modalidade,
2 card SSR real e2 composição estática CFP. Fixtures de apresentação sem identidade/registro;
nenhum provider ou resultado de busca simulado, nenhuma alegação de confirmação real.

A primeira execução de novos testes expôs import de navegação Next fora do bundler e glob
[id] que não selecionava teste. Separado card existente/reexport compatível e teste do helper
em utils. Também corrigida expectativa de capitalização para o mapa canônico já existente;
não alterado o contrato híbrido para satisfazer teste. Suíte final executa todos os13.

Browser local336: reload do build, entrada /psychologist/cfp redireciona ao login real sem
sessão.390×844 sem overflow; envio vazio mantém foco em e-mail e mensagens PT-BR. Captura93
em `/tmp/lectum-audit-178-ui/93-local336-cfp-session-mobile.png` mostra **login**, não resultados
CFP. Resultados/erro pós-confirmação e formulário profissional autenticado ainda não foram
validados visualmente nesta versão. Não inserir CPF ou contornar o gate para completar prova.

### Leituras inéditas incorporadas336

Tesla:63 fontes/8857linhas integrais, ledger `/tmp/lectum-task178-backend-admin-readonly.k4kfyxfw/READLIST.json`;
37 fontes selecionadas não lidas. Euclid:86 fontes/10318linhas integrais, sendo37 shells/aliases,
ledger `/tmp/lectum-task178-community-posts-readonly/reading.json`. Parent revisou relatórios,
contraprovas e metadados;149 fontes novas, hashes estáveis ao integrar. Fontes não lidas/riscos
não executados não recebem crédito. Base1425integrais/5parciais/1691não lidas; ledger1358
inclui novos testes/helpers fora da base. Isto não equivale a testar1425fluxos.

Achados fonte-only: BA01 edição após transição de campanha;BA02 razões canônicas ignoradas
na gravidade do resumo;BA03 histórico Admin de profissional inativo;BA04 rótulo gênero bruto;
BA05 notas humanas inglesas;BA06 snapshot de auditoria fora da transação;BA07 duração no DTO
errado. BR01–08 são contratos/riscos condicionais (bases históricas, ranking limitado, entrega
incerta, paginação em memória, mapas legados, redirects, timezone e votoszero); nenhum ataque,
provider, falha induzida ou mutação remota executados. BA02/04/05/07 recebem recorte focal seguinte.

CP1 anonimato fora do Tab;CP2 snapshots de voto/salvo sobrepõem props novas;CP3 rollback global
pode apagar atualização de outro alvo até refetch. Fonte-only, não incidente persistido.
Paginação24, ranking público/guard, copy resposta/comentário e curadoria por slug têm limites
registrados no relatório. CP1/copy recebem recorte seguinte; CP2/3 exigem validação própria.
PF4 observado no formatter PhoneController (máscaraBR em país internacional) permanece pendente,
não corrigido nem certificado pelos helpers336. M1 bloqueado permanece sem retomada.

### Publicação336 confirmada e verificação337 local

bf18ba4c publicado via homolog. Primeiro smoke mostrou frontend/backend ainda335 e Admin336;
uma consulta durante troca de container recebeu502 no backend. Nova consulta confirmou
health/ready200 e ping336; segundo smoke16/16 com backend/frontend/Admin336. Sem reset ou
mudança de env. O conjunto deste recorte não inclui DELETE; só GET e rejeição de login vazio.
Logs `/tmp/lectum-336-smoke-{first,second}.log`, JSON `/tmp/lectum-audit-336-smoke-homolog.json`.

337:731/731 no `pnpm check` (216front/413back/53Admin/43video/6versão), builds frontend e
backend aprovados. Docker backend amd64 construído integralmente:
`sha256:5fbecb06f090ca7d615be3b0ade5c3f02e7b42feb7385e46b65b2b9ef248134b`.
17testes compilados de ranking/gênero/notas passaram nessa imagem com networknone,
entrypointnode, sem volumes/env externos; container --rm removido.3testes TypeScript do DTO
são source-only de desenvolvimento; não foram anunciados como testes da imagem.
Logs `/tmp/lectum-337-{root-check,frontend-build,backend-build,docker-build,docker-pure-tests}.log`.

PF4: controller real SSR baseline3falhas e controlesBR/legado passam; corrigido17/17 incluindo
os12testes antigos de controllers. Campo nacional com DDI separado não ganha +55 nem mascara
país estrangeiro, excesso continua visível paraZod. Mask sem seletor preservada; watch reativo
segue padrão do SelectController. Logs `/tmp/lectum-337-phone-{baseline,final}.log`.

CP1/copy: baseline após extração mecânica,6falhas/8controles; final14/14. Botão/handlers,
RHF/schema/payload reais; detail0 em teste unitário não é execução de Tab/Space no navegador.
Relatório `/tmp/lectum-task178-cp1-implementation/report.md` e ledgers/SHA de freeze verificados.
BA02/04/05/07: baseline12falhas/5controles; BR05focal2falhas/4controles; final20/20, sem
provider/DB/HTTP. Relatório `/tmp/lectum-task178-ba02457-a1ec8_y4/RELATORIO.md` e ledgers.
Robustez de dicionário demonstrada, não exploit remoto. Não houve mudança em BA01/03/06,
CP2/3, outros mapas ou M1. Hash dos15arquivos delegados conferido no freeze.

Fonte visual: proto Criar Nova Postagem - Pacientes e Confirmação de WhatsApp - Inserir Número
inspecionados. Tokens/layout anteriores mantidos; Builder indisponível nesta execução,
não usado Figma. Browser local337reload, gate/login real sem sessão,1280×900 sem overflow,
captura94 `/tmp/lectum-audit-178-ui/94-local337-login-desktop.png`. Não é prova visual do
switch ou telefone autenticados. Teclado nativo, toque/Safari/iOS e submissão real continuam
pendentes; não usar fixture de conta/CPF/provider para concluir. Ledger1373; base1430leituras
iniciais,5parciais,1686ainda não lidas. Releituras/compilação de dependências não ampliam cobertura.

### Publicação337 e confronto visual do telefone

3c8b356a publicado, smoke16/16 em2026-09-11T16:45:27Z; backend/frontend/Admin337,
health/ready200. `/tmp/lectum-337-smoke-final.log` e JSON337 registram somente GET e
validação de login vazio, sem exclusão/limpeza, dados pessoais ou nova chamada de provider.

Capturas96/97 comparam a mesma conta de auditoria/formulário, país e entrada temporária:
336 esconde os dois últimos dígitos;337 mostra os13dígitos completos. Viewport real887px;
captura95 tem nome mobile mas NÃO é prova390px. Override do Browser atingia somente a aba
selecionada18, não a16 autenticada. Valores vazios na projeção DOM não são perda de dados:
a screenshot confirma preenchimento.16dígitos permanecem completos em337; blur não mostrou
erro de tamanho, logo somente schema/unit demonstra rejeição, não feedback visual dessa etapa.
NenhumSalvar/TestarWhatsApp acionado. Reload descarta rascunhos e captura99 confirma dados
originais. Evidência contém contato autorizado em/tmp e não integra screenshots no Git.
CP1 permanece sem prova nativa Tab/Space em paciente; gate da aba18 não autoriza copiar sessão.

### V05 — contrato do diagnóstico de processo,338

Import real de classifyManagedProcessDiagnostic: constructor retorna função e __proto__
retorna objeto no baseline;7controles passam e2regressões falham. Object.hasOwn no catálogo
restaura código textual fechado;9/9 testes passam, inclusive10filtros conhecidos e serialização
da cadeia de erro. Não há prova de entrada remota alcançável nos graphs fixos doFFmpeg; não
é evidência de exploração, prototype pollution ou vazamento ocorrido em homologação.
Sem mídia, Redis/provider, mudança de isolamento/env/schema ou alteração de filas.
`/tmp/lectum-338-v05-{baseline,final}.log`. Dois testes existentes exercitam processosNode
locais de timeout/stdout/preabort; os novos casos são puros, não simulam integraçãoFFmpeg.

### Validação338 — histórico e catálogo de notificações

BA03: literal da consulta extraído sem alteração antes do baseline;2falhas/4controles.
Remover active=true apenas do vínculo alvo permite histórico de conta inativa no Admin;
permanece filtro de perfil/usuário não excluídos, papel psicólogo e dois IDs exatos.6/6
contratos puros do where, sem banco: não afirmar consultaHTTP de conta suspensa validada.
Mount administrativo mantém adminAuth central. Nenhuma conta foi suspensa para a prova.

BR05: título do registro automático usa metadata/props/catálogo existentes. Object.hasOwn
evita executar construtor/métodos herdados como builders.16/16 com i18n real, sem provider,
sem alterar ordem de precedência, limite120 ou aliases. Não se enviou notificação/campanha.
Helpers extraídos perto de seus consumidores, sem import de repository/Prisma runtime em testes.
Artefatos focais em`/tmp/lectum-task178-ba03-br05-338`, com snapshots de extração, baseline
e replay isolado. Parent revisou os seis arquivos modificados na integração.

`pnpm check` aprovado:758 testes (216frontend/435backend/53Admin/48video/6versão).
Builds backend/video aprovados. Imagens reais amd64 construídas com lock congelado:
- backend338:`sha256:52fc9b9c3fa6780d8ba3c2d5ad57fa628c23ed8377afc95d23bc3c6b666eddfe`;
- video338:`sha256:f7af3b15e2da8b028d862abab5b963d2c2087056224553dccd98c7adf9a21a56`.
Video9/9 testes compilados na imagem final, sem rede, hostenv, mounts ou banco; apenas/tmp
temporário gravável para os controles de processoNode. Não rodouFFmpeg/Redis/provider real.
Logs`/tmp/lectum-338-{root-check,backend-build,video-build,backend-docker,video-docker,
video-container-tests}.log`. Frontend/Admin sem alteração deUI/rotas; apenas bump sincronizado.

Complemento338:22/22 testes backend compilados na imagem final, rede none, filesystem
read-only e/tmp temporário; i18n real/local. Sem entrypoint/migrations/DB/env do host.
`/tmp/lectum-338-backend-container-tests.log`. Baseline conjunto BA03/BR05:9falhas/13controles.
FREEZE6SHA conferido e agente encerrado. Readlist em/tmp registra ranges e revisões; apenas
leitura integral com SHA coincidente (ou original integral+diff do repository) entrou no ledger.
Ledger1386; base3121:1437lidos inicialmente/5parciais/1679não revisados.13entradas novas no
ledger não equivalem a13novos arquivos base:4sãohelpers/testes recém-criados e há arquivos
previamente classificados integralmente na base mas ausentes do ledger adicional.

### Pós-deploy338 e reanálise de votos

Commitc1228c2c publicado emhomolog. Versões backend/frontend/Admin338 confirmadas às17:08:58UTC
em11/09;smoke final18/18 às17:10:25UTC. Health/ready200, gates401 e redirecionamentos,
feed/diretório público, imagem otimizada, versão semcache/noindex e loginvazioPT-BR. Operador
confirmou pelo backend VIDEO_PROCESSING_SERVICE_CHECK_OK:authvalid,readinessready,
serviceVersion0.1.338,transportprivate_network. Não equivale a encode/download/reprodução.
Logs/JSON:/tmp/lectum-338-smoke-final.log e/tmp/lectum-audit-338-smoke-homolog.json.
Primeiro smoke15/18 era versão337 em rollout, não falha funcional. Auditoria de dependências
--prod nos5escopos sem avisos conhecidos, sem garantir ausência total de vulnerabilidades.

Admin após338:reload da conta dedicada ativa,10eventos e filtroConta criada1preservados.
Capturas100native e101legacy diferem em mecanismo/dimensões; não usar para afirmar paridade
pixel-a-pixel nem atribuir scrollbars a338. Não alteramos status de conta nem testamos inativa.

BR08:leitura completa do writer PostEngagementRepository e serviço media-actions confirmou
que vote rejeita qualquer valor diferente de±1 antes do repository;desfazer conserva valor e
marca deleted=true. Validator aceita inteiro genericamente, mas serviço exige±1. Leitura Admin
sem filtrovalue teria descrição errada se existisse registro0ativo; ocorrência não demonstrada.
Nenhum voto/banco acessado para inventar caso. Não classificar como incidente reproduzido.

### V06 — cobertura anunciada pelo script de vídeo

Mensagem final constante extraída mecanicamente;2falhas de formato/3controles no baseline.
Após patch5/5:4testes de formatter real e1regressão de composição estática. Marca de cancelamento
só muda após a asserção de estado canceled no ramo opcional. Ausência do caso imprime
NÃO TESTADO, não OK. Demais asserções e requisições do E2E preservadas. ScriptE2E NÃO executado;
não afirmar teste de Redis, FFmpeg, HTTP ou cancelamento real por estes cinco testes.
Artefatos:/tmp/lectum-task178-v06-339. Runner video inclui novos testes de script no check.

### V02 — timeout de sondagem,339

Confirmada classificação incorreta nos catches locais/remotos de probe. Baseline original
11/11 existente; depois da extração mecânica,3regressões falham e19controles passam. Helper
classifyVideoProbeError reutiliza classes reais: timeout vira processing_failed/retryable;
aborted continua canceled; erros de mídia, JSON, schema e output inválido seguem permanentes.
As duas validações de saída preservam retryable ao encapsular o erro, sem alterar validação
de codec, tamanho, dimensões, headers, protocolo ou prazos. Resultado focal22/22.

Parent revisou os dois arquivos completos, classe de erro, worker e fila. Freeze dos dois
arquivos confere com início dos checks. No worker, prazo global é por tentativa e continua
com precedência própria; fila mantém attempts/backoff existentes. Isso é rastreamento de
código, não execução BullMQ/Redis. Novos11testes são contratos puros com classes/JSON/Zod
reais; controles de processo preexistentes executam Node, não FFmpeg/ffprobe. Nenhuma mídia,
provider ou fila publicada foi manipulada. Fonte/testes em /tmp/lectum-task178-v02-339.

Leituras consolidadas com SHA atual: ledger1389; base3121 com1438leituras iniciais,5parciais
e1678não revisados. Só1arquivo adicional da base ganhou cobertura;2helpers novos não entram
na base. Releituras não contadas como arquivos novos. Auditoria integral permanece aberta.

Validação339: pnpm check passou774testes (6versão,216frontend,435backend,53Admin,64video),
sem erros de Biome/TypeScript. Build video aprovado e imagem amd64 construída com lock
congelado: sha256:c17770f1f16ad1ffe0227600a7515adc30515a2269799f00087f355c5f0451df.
22/22 testes probe/process compilados passaram nessa imagem, rede none, filesystem read-only,
/tmp efêmero, sem hostenv/volumes/banco/provider. E2E não executado. Source freeze conferido
após checks; agente encerrado. Sóvideo possui mudanças de runtime; demais apps apenas bump.
Sem UI/rotas alteradas, não há nova validação visual alegada.
Logs:/tmp/lectum-339-{root-check,video-build,video-docker,video-container-tests}.log.
Bump339 único. Publicação/smoke a executar depois do push; última prova privada338.


## Continuação340 — CP2/CP3, dimensões e documentos legais

Publicação339 confirmada pelo integrador em11/09 às17:35UTC:18/18smoke, backend/frontend/Admin339,
health/ready200. Última confirmação do operador do vídeo privado continua338, não inferir339/340.

### CP2 — snapshots dos cards

Três cards reutilizam hook restrito a viewer/alvo, com reconciliação de campos escalares e
identidade de operação. Props novas prevalecem sem ação pendente; recibos/callbacks de outro
alvo não afetam o atual. Sem mudança de layout, autorização, transporte ou toggle do backend.
13/13 testes reais de funções/SSR/composição e11transições ReactDOM/StrictMode no Browser local.
Prova vermelha adicional: fragmentos exatos de estado extraídos mecanicamente dos três cards
originais mantêm4/5/5 quando props mudam para9. Isso não equivale à montagem dos cards inteiros.
Harness efêmero sem endpoints falsos, sem dados persistentes, usando React instalado e hook real.
Builder retorna somente MUI por essa interface, sem QuickCopy Lectum acessível; consultadas as
imagens locais Feed Comunidade/Posts Salvos, mantendo referência mobile-first, sem redesenho.
Build local público da comunidade carregou título porSSR, mas exibiu falha de conexão após
hidratação. Limite de prova registrado: não foi integração local autenticada bem-sucedida nem
validação Safari/Android. Não houve desativação de controles do browser/servidor para prosseguir.
Artefatos locais: /tmp/lectum-task178-cp2-340, Browser3340; build em /tmp/lectum-340-frontend-final-build.log.

### CP3 — rollback e recibos por alvo

Callbacks de produção extraídos para factories locais sem mudar mutationFn; AST compara
baseline com código original. QueryClient real/caches efêmeros, sem rede/DB/provider mockado.
Baseline original88testes:27passam/61falham. Primeiro helper:72passam/16falham em lifecycle.
Após proteger identidade Query no commit e herança do rollback:88/88. Integrador adicionou18
casos de recibo de outro post/tipo/resposta:18falharam antes do guard; final106/106 após patch.
Um controle tinha recibo incompleto e passou a usar os identificadores já exigidos pelo DTO;
não foi relaxada asserção. Recusa encerra a própria operação e preserva invalidação/refetch.

Rollback altera só campos próprios e conserva outros votos/saves/conteúdo/paginação/descendentes.
Operações antigas e caches recriados não recebem estado anterior. Quatro testes incluem192
ordens de três operações; não contabilizar192 como testes separados. Sem protocolo novo de
ordenação no servidor: refetch continua autoridade; não alegar sincronização entre abas/HTTP.
Artefatos: /tmp/lectum-task178-cp3-340 e /tmp/lectum-340-cp3-{receipt-before,final}.log.

### V03 — saída social dentro da configuração

Baseline6renders:1passa/5falham; caso720x1280 gerava1080x1920 e o próprio probe o rejeitava.
Escala final completa conserva9:16 em dimensões pares dentro dos tetos; defaults sem mudança.
11contratos de argumentos ×8variantes e6renders FFmpeg/ffprobe reais com/sem áudio/assets,
preset standard/portable e limites720x1280/720x1920/1080x1000/719x1279/240x240/default.
Casos reais validam também rejeição por limites menores de dimensões e bytes; controles de
segurança do probe preservados. Canvas intermediário continua1080x1920: não prometer redução
proporcional de memória/CPU nem qualidade/SAR adicional não medida.

Imagem integrada340 amd64 construída do source/lock:1043eba113410a8bf9be4b3cb475526ec08178e043d8d23f2d5f01ec0b98db08.
17/17 testes compilados executados da própria imagem, sem montar dist externo; rede none,
filesystem read-only, tmpfs256MiB, memória2GiB,2CPUs,pids512. Tentativa anterior com pids128:
14/17passaram; três renders com assets falharam ao abrir encoder. A repetição mudou sópids;
isola diferença de orçamento, não demonstra causa interna/thread exata. Não elevar limites
de produção ou alterar runtime para esconder a falha. Compose vigente não define esse teto128.
Host semdrawtext pula6renders; imagem340 executa os6, sem skips. Não éjob BullMQ/Redis/Stream.
Logs:/tmp/lectum-340-video-{docker,container-tests,container-tests-512}.log.

### Legal — requisito externo confirmado, não parecer jurídico

Minutas v0.1 em _product/legal e checklists de aprovação pendentes. Cadastro registra aceite
provisório em user_background; isso não comprova documento final publicado nem ausência total
de aceite. TASK41 prevê páginas estáticas/links, não editor jurídico no Admin/SEO. GETs reais
em /termos-de-servico e /politica-de-privacidade de homolog retornaram404. Podem existir textos
aprovados fora do workspace; aprovação/URLs solicitadas ao responsável. Nenhuma minuta foi
publicada nem versões históricas de aceite alteradas. Bloqueio de recomendação de produção.

Leituras atuais deduplicadas por path+hash:99paths conferidos nesta integração,23novos da base.
Inventário original3121:1461leitura inicial,5parcial,1655pendente. Ledger1431linhas. Revisões
antigas/saída truncada/dados node_modules não contados como arquivos novos. Cinco fontes CP3:
freeze integral do executor mais patch de recibo revisado pelo parent, proveniência explícita.
As apps continuam independentes; sem migration/env/package novo, nenhum dado publicado tocado.

Validação integrada340: pnpm check exit0,910testes (6versão,335frontend,435backend,53Admin,
81video):904aprovados/6skipsdrawtext no host; esses6 executados com sucesso na imagem340.
Frontend build otimizado e check finais aprovados; vídeo build/imagem integrado aprovado.
check:dependencies nos cinco escopos sem vulnerabilidade conhecida. Uma execução inicial do
frontend encontrou2warnings de estilo, corrigidos; não foram suprimidos checks. Recibos dos
cards também conferem os identificadores. Bump340 único, sem segunda execução em retry.
Smoke340 somente após publicação; não concluir essa etapa por intenção.


Pós-deploy340 (11/09,18:23UTC):18/18smoke aprovados; backend/frontend/Admin340 ehealth/ready200.
ChecksVercel frontend/Admin concluídos. Vídeo privado não consultado pelo integrador.
Browser390x844, conta profissional de auditoria: post anônimo dedicado útil0→1/save0→1,
reload eSalvos conservaramambos; resposta salva útil0→1 eMeus posts/Respostas confirmou1.
Desfeito voto da resposta pela segunda lista, mantendo seu savepreexistente. Isso éfluxo
normalreal, não prova defalha concorrenteHTTP, múltiplasabas ouSafari/aparelhosreais.

Novo CP4: apósreload authed, conviteCriesuaconta permaneceu;fechar→Perfilconfirmoumesmaconta
semnovo login. Captura03 em/tmp/lectum-audit-340-browser, investigação341 aberta antesdefecho.
Falha local de conexão: GETpúblicocomOriginlocalhost:3000 não recebeuallow-origin;
mesmoGETcomOriginhomologrecebeuallow-origincorreto. CompatívelcombloqueioCORS local;
nãoampliadapolítica publicada para permitirtestesnematribuídocomcertezaerrononavegador.

Estado final das mutações de teste340: post anônimo restaurado a útil0/salvo0 e recarregado;
resposta própria restaurada a útil0. Salvos preexistentes preservados; nenhum post/resposta
ou histórico apagado. Screenshot05 confirma post restaurado. Evidências temporárias em
/tmp/lectum-audit-340-browser/NOTES.md e capturas02–05, sem credenciais/documentos pessoais.

### Continuação341 — CP4 e leitura das migrations

CP4 demonstrado por fonte e contratos reais: convite antigo podia sobreviver à recuperação
anônimo→autenticado; callbacks0/250ms não tinham cleanup completo nem guard de identidade atual.
Não foi demonstrado qual trigger exato originou a captura340, nem perda de sessão.
Modal/lifecycle extraídos preservam JSX/copy/handlers, gates, redirects e intents por AST.
Opener consulta authref; timers são cancelados; prompt obsoleto é descartado e oculto.

Baseline36:16pass/20fail; final36/36. São34 contratos locais (SSR, callbacks e timers reais)
e2 verificações estáticas de wiring, não36fluxos de Browser. Hook/view reais sob ReactDOM
StrictMode passaram6transições no Browser local: oferta anônima, autenticação, descarte,
logout sem ressuscitar oferta, nova ação anônima protegida, autenticação novamente.
Captura real salva e inspecionada:/tmp/lectum-task178-cp4-341/browser/result.png.
Harness usa estados controlados, não simula auth/API/provider nem equivale ao fluxo completo.
Frontend check371/371 e build otimizado aprovados; hashes dos4arquivos conferidos após build.
Relatório/baseline/final/AST:/tmp/lectum-task178-cp4-341/. Publicação341 ainda não creditada.

Leitura lateral Socrates:96migrationsSQL +migration_lock,3061linhas em20chunks sem truncamento.
97/97hashes conferidos. Relatório/readlist:/tmp/lectum-task178-migrations-341/.
Nenhum novo defeito vigente confirmado. Invariantes: IDs usuário/perfil não intercambiáveis;
unique inclui soft-delete; target/FKs não substituem validação de domínio; cascatas físicas
não equivalem à exclusão lógica. Backfills históricos não devem ser reexecutados como rotina
retomável. Fonte não prova migrations aplicadas, ausência de duplicatas, locks ou banco íntegro.
Sem SQL/Prisma/rede/DB/reset; histórico Latin-1 preservado sem editar migration aplicada.

Integração341 de leitura:121paths atuais conferidos,100novas leituras da base (97migrations
+3outros), ledger1534linhas. Base3121:1561integrais iniciais,5parciais,1555pendentes.
Revisões antigas e manifests alterados não creditados por hash desatualizado; parciais e
saídas truncadas não promovidas a integrais. Não equivale a cobertura funcional integral.

Validação integrada341: pnpm check aprovado,946testes (940pass/6skips drawtext do host).
Os6renders já executados com sucesso na imagem340; vídeo não mudou neste patch de runtime.
O guard inicial sinalizou a palavra em dois comentários de teste; redação esclarecida sem
alterar testes, relaxar scanner ou introduzir substituições. Verificação AST final aprovada.
Bump341 executado uma única vez. Sem nova env/migration ou publicação de produção.

Pós-deploy341:commit632566df enviado a homolog, hooks aprovados. Smoke11/09 às18:50:32UTC:
18/18, backend/frontend/Admin341, health/ready200, versões públicas sem cache/noindex.
Vercel frontend/Admin success. Evidência:/tmp/lectum-audit-341-smoke-homolog.json.
Browser nova aba21 em390x844: convites indevidos ausentes em recargas/rolagem; Perfil
confirmou mesma conta profissional sem novo login. Nenhuma mutação de dados neste reteste.
Capturas antes/depois em/tmp/lectum-task178-cp4-341/browser/, todas inspecionadas.
A captura apósEnd confirmou final da lista; reload voltou ao topo. Não contar como reprodução
da mesma restauração de scroll/timing do defeito anterior. Contratos locais cobrem a transição.
Durante rollout houve sessão indisponível→retry→comunidade indisponível; reload após backend341
recuperou conteúdo. Não isolar causa sem rede/logs; anotado emNOTES.md, sem esconder incidente.
Vídeo privado ainda só confirmado338 pelo operador, não inferido das versões públicas.

## Continuação342 — pré-publicação

Branch homolog/HEAD anterior632566df. Código congelado das laterais e integrado pelo parent.
Sem nova env/package/migration, sem reset/seed/provider/mutação persistida para estes testes.

- Datas FE341-03: baseline publicado341 no Browser, limpar data+Aplicar substituía consulta por
  erro. Fontes finais14/14 (RHF/Zod reais, SSR e wiring separados); Browser local390 e1280,
  inválido mantém editor/consulta, cancelar preserva filtro, válido aplica uma vez.
- Anexos FE341-02: baseline5pass/2fail, final7/7; única linha de produção removida é tabIndex=-1.
  Browser real: Tab/Shift+Tab, Enter/Space, mouse e disabled; itens do contrato apenas locais.
  Asset é SVG existente servido pelo localhost; caminho relativo inicial não resolvia para o
  item stored, corrigido só no harness com URL local absoluta. Não é bug novo de upload.
- Retenção FE341-01: baseline13fail/2controles, final35/35; eixo original 0/50/100 calculava
  6/43,33/80,67. Browser local com SVG real390: cliques0/50/100 corretos; setas/Home/End;
  locked fora do Tab e Enter/Space sem seek. Desktop1280 clique central49,66% (pixel inteiro).
  Preservação AST do SVG exceto ref e dos demais componentes/playback conferida.
- Scanner: baseline24fail/8pass; final32/32, grafo vídeo116arestas antes ignoradas. Não houve
  ciclo existente demonstrado. A varredura automática do grafo não é leitura manual.
- Root check1034testes:1028pass/6skips drawtext conhecidos, frontend427/427, build otimizado
  frontend aprovado, sem source maps. Bump342 executado uma única vez e check:version aprovado.

Evidências locais: /tmp/lectum-task178-analytics-dates-342, /tmp/lectum-task178-media-keyboard-342,
/tmp/lectum-task178-retention-342, /tmp/lectum-task178-cycle-342; relatórios/freeze/readlists.
Capturas nativas salvas e arquivos exatos inspecionados. Contrato em /tmp/lectum-ui-342/browser
usa componentes, React e CSS reais; sem substituir autenticação, API, dados ou plano.

Leituras:68fontes frontend/10070linhas e12scripts raiz/1606linhas, mais fontes focais. Merge
por path+hash, deduplicando suportes/releituras e recusando versões antigas:101paths atuais
conferidos,82novas leituras da base. Total1643iniciais/5parciais/1473pendentes na base3121,
1622linhas no ledger. Hash base original do inventário preservado; não confundir com revisão
corrente. TASK178 não concluída; publicação342 e smoke registrados separadamente após deploy.

## Continuação343 — controller contenteditable

Fonte original integral, depois diff final revisado; baseline Browser real, sem APIs/módulos
substituídos. disabled+readOnly aceitava X e alterava RHF; mesmo input produziu exceção local
inputType.startsWith. Não afirmar que o app expôs stack em toast: o harness capturou erro JS.
Palavra de200caracteres expandia editor1885px com parent360/min-width:auto; CSS min-w-0
restabeleceu360px. Output diagnóstico do harness também precisava quebra de linha e foi
corrigido apenas em /tmp; não é correção de produto nem prova do layout autenticado.

Final:14/14 testes reais de política, React/RHF SSR e wiring estático explicitamente separado.
Sem fabricar baseline automatizado contra módulo inexistente. Browser: disabled/readOnly
juntos e isolados preservam Texto inicial após X/Enter/colagem; ativo aceita X+nova linha+
linha2;205As viram200; digitação excedente é barrada; Backspace+Z mantém200. Uma leitura AX
diff-only inicialmente pareceu falha; AX completo confirmou o valor, não houve falha real.
Mobile390:campo360/client358/scroll358. Desktop1280:campo398/client396/scroll396 e length200.
Capturas nativas salvas e arquivos exatos vistos em /tmp/lectum-task178-contenteditable-343:
baseline-disabled,final-disabled,final-long-text,final-desktop. final-limit é evidência
intermediária com overflow, não sucesso final. Sem Safari/iOS/Android reais ou fluxo IME.

Root pnpm check exit0:1048testes,1042pass/6skips drawtext do host; frontend441/441. Build
frontend otimizado exit0, sem source maps. Logs /tmp/lectum-343-root-check.log e
/tmp/lectum-343-frontend-build.log. Bump343 executado uma vez antes desses checks.
Nenhum novo package/env/migration/operação de provider/DB. Publicação343 não creditada ainda.

Parent:17configs +4env.example (somente exemplos) +5fontes antes parciais lidos integralmente,
mais2novos helpers/testes.28paths atuais por hash,26da base; nenhuma revisão antiga aceita.
Base3121:1669iniciais,0parciais,1452pendentes; ledger1650. Readlist/merge/contagem em
/tmp/lectum-343-parent-readlist.json e /tmp/lectum-343-coverage.json. Trabalhos parciais dos
agentes Admin/backend não integrados. Hipóteses sem uso/falha (oneOfRequired0/false e i18n)
não promovidas a bugs corrigidos. Arquivos privados AGENTS/CLAUDE do usuário preservados.

### Deploy342 e novo baseline administrativo

Operador mostrou Done05f1506d. Curl11/09 às19:43UTC confirmou backend342,/health e/ready200;
frontend/Admin ainda341. Python urllib com user-agent padrão recebeu HTTPError no backend,
enquanto curl respondeu200; não classificar como queda sem separar cliente/edge. Primeiro
loop curl local falhou por variável zsh chamada path alterar PATH; corrigido para ep, sem
modificação remota. Não é falha do produto. Aguardando statusVercel; não atribuir Done aos3apps.

Admin /comunidades autenticado341: all→De vazio e Até válido. Clicar Até, Up, Tab removeu
DashboardContent inteiro, inclusive campos; só erro Selecione um período válido permaneceu.
Tentar novamente recuperou all. A342-03 confirmado, pendente patch posterior; apenas estado
local/consultasGET. Capturas /tmp/lectum-task178-admin-dates-343/{baseline,error}.png vistas.
Separado do FE341-03 no frontend. Não operar M1, dados de terceiros ou testes destrutivos.

## Publicação343 e regressão autenticada de342

aaf0dddf9ebd08635c85bde3ce29a59e9cc1158d enviadohomolog.18/18smoke às19:53:57UTC11/09,
backend/frontend/Admin343,health/ready200. Primeiroprobe após push:17/18, apenasbackend342;
segundo confirmou convergência. Vídeo privado segue última prova338, não inferir343.
Browser21em390, conta profissionaldedicada: estado Sessãoindisponível préreload; reload
recuperou sessão semnovo login. Nãoatribuircausa ao deploy semtraces. Datas: apagar parte de
Início+Aplicar manteve popover/erroPTBR/dados; cancelarcomTodooperíodo descarta; reabrir inicia
válido;Aplicar mostra loading e conclui semerro; restauradoTodooperíodo. Captura343-empty
em/tmp/lectum-task178-analytics-dates-342 salva/vista. Semmutação; contalivre semvídeo.
Retenção agora exibeslider disabled coerente comsemvídeo; não éprova deplayback real.

## Continuação344 — A342-03

BaselineAdmin341registrada anteriormente; patch separa selected/applied nohook adjacente
use-dashboard-period e ligaquery/rótulo/controlador nativo ao estado correto. Nada noJSX dos
campos,API,cachekeys oumétricas mudou. Extrairhandlers permitiu8testes deestado comReactSSR
real (atualização no própriorender para exercitar useState/handlers),mais1wiringestático.
Não substituirReact,DOM,API/query ouvalidadores. Não chamar testesSSR deintegração/Browser.
9/9 finais; primeiro loaderlocal falhou porfileURL passada aresolveCJS, corrigido parapath.
Primeirotypecheck pegoureferênciaonRetry ao antigo handler após extração; corrigida e
adicionada asserção dewiring. Ambosdiagnósticos eramlocais, nunca forampublicados.

Browserlocal390: editarAté+blur comDe vazio mantém all query/valid=true, erro noscontroles;
presetmês limpaerro/aplica mês; alterarAté e focarDe nãoaplica; sair dogrupo aplica01–10/09.
Desktop1280 mantémtrêscontroles nalinha. Capturasexatas vistasem/tmp/lectum-task178-admin-period-344:
mobile-invalid.png e desktop-final.png. desktop-valid.png écapturaintermediária comviewport
antigo durante transição, não prova final nembugproduto. Apenascontrato semAPI; reteste
remoto344 pendente. UsadosCSS/ícones/componentes reais, semnovo pacote, semBuilderdisponível.

Admincheck62/62 ebuildotimizado aprovados,30manifests de rotas sincronizados,sem sourcemaps.
Rootcheck1057:1051pass/6skipsdrawtext conhecidos. Logs /tmp/lectum-344-{admin-check-final,
admin-build,root-check}.log. Bump344uma vez/check:versionOK; semenv/banco/package/provider.

### Leitura lateralAdmin275 e triagem

Socrates leu275alvos congelados em58.723linhas/229chunks e1suporte. Chunk75–78 inicialmente
truncado/omitido foi relido integralmente;15entregas iniciais descartadas. Freeze05f1506d e
SHA inicial preservados; cliente mudouparent344 e recebeu revisão dadiferença pelo parent.
Report/readlist/ranges/notas:/tmp/lectum-task178-admin-pending-342. Hashs dosalvosinalterados
conferidos antesintegração. Merge279pathscorrentes/275novasleiturasbase; clientcongeladoantigo
recusado, fontefinalparent aceita separadamente. Ledger1927;base1944iniciais/1177pendentes.
SemUI/remoto,provider ouM1 poragente; não creditar imports como leitura ou fontecomoautoridade.

Achados pendentes, salvoA342-03 confirmadoBrowser/corrigidolocal:
- A342-01/P2: resetcomunidade apósavatar apagadrafttextual; mecanismo fonte, uploadnãotestado.
- A342-02/P2: regras sóreordenam porponteiro, semequivalente teclado; persistêncianãotestada.
- A342-04/P2: SearchBox keyedporquery.q perde identidade/foco emlistas pacientes/psicólogos;
  lateral de correção iniciada separada344, sem dar crédito antesvalidação.
- A342-05/P2: expansorTagField/setasPublicationsPagination semnome acessível; SSR/Browserpendente.
- A342-06/P2: badgePosts somacliquesReplies também; semafirmardados publicados incorretos.
- A342-07/P3: donuttráfego coloreíndice pósfiltrozeros,legendapréfiltro; correspondênciaincorreta.
- A342-08/P2: drawermobile semcontençãoTab/inert; confirmarBrowser e corrigirlifecycle existente.
- A342-09/P3: agregadoComunidades/Vídeo soma total masherdabreakdown sóprimeirafonte.
Prioridadeproposta efonteexata no relatório; nenhumP1 confirmado nestaleitura. Hipótesesde
sucessoparcial de mutations,idiomas,fallbacks deestatísticas e semanticscores dependemcontrato;
nãopromover aincidenteprovado. Documentoslegais aprovados,aparelhos reais efluxosrestantes
continuam pendentes; nãohá liberação paraproprodução.

## Publicação344 / leitura backend339

466897df13ff4fcb266c18cccbe582b11528ae6e enviadohomolog. Segundo smoke344:18/18,
backend/frontend/Admin344,health/ready200. Primeiro:Admin344 eoutros343 durante rollout.
Arquivo /tmp/lectum-audit-344-smoke-homolog.json contém timestamp exato. Adminpublicado:
all→AtéUp comDe vazio mantémcontroles/dados; após sairdogrupo aparece erro local. Presetmês
recupera semreload; custom01–10/09aplica e carrega; Todooperíodo restaurado ao final.
Captura homolog-invalid.png em /tmp/lectum-task178-admin-period-344 salva/vista. A largura
capturada doAdmin foi aproximadamente991px, não390: override do contrato local não deve ser
atribuído a essa aba. Browserlocal390/1280 é prova mobile separada; aparelhos reais pendentes.

Bacon:339fontes backend/61.372linhas e15suportes/1.120linhas integralmente lidos;600eventos
manuais com recuperação de saídas truncadas, ranges/hashes conferidos. AST/index não foram
contabilizados como leitura; nenhum módulo operacional/provider/DB/HTTP executado. Freeze342,
verificaçãofinal344 às20:01:35UTC,339hashsinalterados; report mencionava conferência343 anterior.
Parent integrou354paths porhash antes de iniciar C13:339novasleiturasbase,ledger2269;
base2283iniciais/0parciais/838pendentes. /tmp/lectum-task178-backend-pending-342 contémREPORT,
readlist,not-read,final-verification efile-flow-map; relatório longo lido emsegmentos após
truncamento inicial. Não fazer passar exemplos de fórmulas/interleavings por testes executados.

C17 requer distinguir registro ativo e identidade do titular, não explorar conta alheia nem
aplicar mudança arbitrária de aprovação. Triagem de specs/ADRs separada emcurso. C20 permanece
somente fonte, sem operação/payload de exploração ou execução/reconstrução de M1.
C13 local345 centraliza máscara já existente na auditoria pessoal; não copia CPF de ninguém,
não altera CPF completo do formulário autorizado nem decideaprovação.4testespuros aprovados,
sequências repetidas intencionalmente inválidas/sem documentos de pessoas. Build/check pendentes.
Fila rastreável em AUDITORIA-2026-09-11-PENDENCIAS.md; nenhum dos demais mecanismos vira
correção concluída por estar listado. Auditoria permanece emandamento.

Triagem C17: 27 arquivos/5.417 linhas completos com hashes conferidos; 16 novas leituras
na base após deduplicação global. Base 2.299 iniciais, 822 pendentes; ledger 2.287 com os
helpers C13. Relatório /tmp/lectum-task178-cfp-trust-345/REPORT.md distingue aprovação do
registro de prova de titularidade: não há KYC especificado. C17-A (compatibilidade) e C17-B
(trava de identidade em outra escrita) são mecanismos de fonte, P2 proposto, sem exploração
remota ou alteração de aprovação. Fila atualizada; matching/ambiguidade exige decisão.

345: o primeiro check/build identificou import.meta no novo teste CPF incompatível com o
backend CommonJS. Corrigido para resolve(__dirname, ...), sem excluir testes do build.
Bump 0.1.344 → 0.1.345 executado uma única vez; validações finais em andamento.

345 validação local final: rootcheck1078 =1072pass/6skips drawtext conhecidos; frontend441,
backend439, Admin79 e video81 (75pass/6skips). Builds backend e Admin otimizados aprovados,
30 manifests de route groups sincronizados. Os 17 contratos de busca importam React/hook
reais e timers nativos; não substituem DOM/API. O primeiro patch duplicava coordenação;
revisão parent pediu hook em admin/src/hooks e wrappers adjacentes só de markup. Essa é a
versão validada. Readlist final contém7fontes completas, histórico de versões rejeitado
por SHA na integração; ledger2291, base2299/822 inalterada.

Browser local final de busca: viewport390, pacientes mantém AX17 após debounce e continua
digitação sem reclicar, limpar aplica vazio. URLs externas sincronizam campo; voltar/avançar
com draft pendente e histórico de mesmo q não dispara busca tardia (count3 preservado).
Desmontar antes do debounce também conserva count3. Psicólogos em1280 mantém AX21 e aceita
continuação sem reclicar. Capturas em /tmp/lectum-task178-admin-search-345. Harness usa os
componentes reais/histórico nativo, sem API; não equivale à navegação Next autenticada.

345: commit900b4454 publicado em homolog; hook pre-push aprovado (71,67s). Primeira sondagem
pública encontrou versões frontend/Admin344 e HTTPError no backend sem registrar o status;
não inferir causa. GETs curl posteriores /health e /ready devolveram200. Smokes em andamento.

Gauss concluiu224/224 ADRs (17.427linhas), freeze11/09 20:03UTC e conferência20:21UTC sem
drift. Parent leu relatório em segmentos após truncamento, integrou222 novas leituras na
base (dois já cobertos): base2521/600, ledger2513. Fontes interpretadas como decisões históricas,
não incidentes runtime. Conflitos/lacunas constam na fila, sem alterar aprovações ou cobranças.

A342-08: BrowserAdmin344 em~991px, menu abre focandoFechar. Tab12 alcançaSair; Tab13 alcança
Abrirmenu atrás; Tab14 chegaàbusca atrás dooverlay. Nenhuma ativação deSair/CRUD. Captura
baseline-focus-escaped.png em /tmp/lectum-task178-admin-menu-346 salva/vista; Escape fechou.
Gauss implementa correção focal346, enquanto parent valida publicação345.

Publicação345 confirmada em 2026-09-11T20:31:48.797027+00:00: 5/5 GETs via curl padrão, semcookies/segredos,
backend/frontend/Admin0.1.345; /health e /ready200; rotasdeversão semcache/noindex. Não
confundir essa sondagem com suítefuncional18 anterior. Pythonurllib recebeu403 no backend,
mas curl padrão200; diferença de cliente não foi diagnosticada como falha da aplicação nem
contornada com credencial. Backend /ping também DYNAMIC/no-store e cache-bust345.

Admin345 autenticado: psicólogos mantém AX9 após q=Auditoria e q=Auditoria Lectum; pacientes
mantém AX8 após q=Auditoria Lectum e continuação Teste, sem reclicar. FiltroAuditoria restaurado.
Captura homolog-psychologists-345.png salva/vista e comparada combaseline no mesmo viewport991:
mesmo layout/dados, agora foco/caret permanecem. Primeiro screenshottimeoutCDP recuperou em
uma repetição; não classificar como falha do produto. Navegação Next de histórico emvoo ainda
não é integralmente certificada por esses testes. Serviço privado vídeo não foi sondado daqui.

Mendel concluiu225/225 ADRs (24.771linhas), 74entregas completas e hashes conferidos.
Parent leu relatório completo emdoissegmentos; integrou215 novas leituras na base após
deduplicação. Base2736iniciais/0parciais/385pendentes; ledger2728. Decisões de identidade,
privacidade, contatos, analytics e retenção são lacunas documentais, não incidentes provados.

Responsável respondeu à pergunta de semântica do selo: registro ativo aprovado, sem
promessa de comprovação de identidade. Decisão registrada no ADR0496 e na fila. Não é
autorização para enfraquecer ownership, validação do resultado ou proteção cadastral.

## 346 — menu, data civil e suporte documental

Rootcheck1096 (1090pass/6skipsdrawtext), Admin86/86 e backend450/450; builds ambos passaram.
Logs locais: /tmp/lectum-346-root-check.log, /tmp/lectum-346-admin-build.log e
/tmp/lectum-346-backend-build.log. Não houve migration, nova env ou package.
C24: /tmp/lectum-task178-registration-date-346/report.md, freeze/ranges finais; 11 testes
em UTC, Asia/Tokyo e America/Sao_Paulo. Referência explícita, sem relógio global falso.
Reprodução com comparador antigo:6/11falharam; manhã08h agora aceita data de hoje.

A342-08: fonte anterior e patch preservam SidebarContent e51classNames;7testes são de
wiring estático, não DOM. Browser local usa hook real isolado sem API/sessão nem shell
completo: Tab/ShiftTab ciclam, Escape fecha apenas topo e devolve foco, busca atrás mantém
preservar. Aninhado testado em1280; ciclo simples também390. Capturas vistas:
/tmp/lectum-task178-admin-menu-346/local-focus-cycle.png e local-mobile-cycle.png.
Prova completa de resize/navegação e comportamento publicado ainda pendente.

Frontend suporteSocrates:26fontes integrais dos31alvos, incluindoJSON22340linhas. Cinco
SVGs têm XML lido e raster base64 ainda sem inspeção visual nesta integração; não contar
como leitura integral. Relatório /tmp/lectum-task178-frontend-support-345/report.md lido
pelo parent. READMEtemplate divergente e limites dos contratos separados de bugs atuais.

## Publicação346 e leituras adicionais

Commit a4fc2219 publicado emhomolog; push/hook aprovados. Smoke5/5GETs públicos em
11/09/2026às20:57:16UTC: backendhealth/ready200, backend/frontend/Admin0.1.346; Next
no-store/noindex. /tmp/lectum-audit-346-smoke-curl-homolog.json. Serviço privado de vídeo
não consultado nesta etapa; última evidência operacional fornecida pelo usuário0.1.338.

BrowserAdmin346: Tab percorreu todos os14passos com retorno de Sair para Fechar; ShiftTab
fez o inverso; fundo não aparece na árvore enquanto menu aberto. Escape devolve foco ao
gatilho e mantém q=Auditoria. Resize1280 fecha menu/restaura gatilho desktop; voltar390não
reabre. LinkVisãogeral fecha menu; voltar retorna à busca sem reabertura. Filtro existente
preserva ciclo Fechar/Aplicar e Escape devolve ao botãoFiltros, sem aplicar alterações.
Capturas /tmp/lectum-task178-admin-menu-346/homolog-mobile-before.png, after.png,
after-375.png e homolog-desktop-resize.png. Antes375×812, primeirodepois390×844; refeita
comparação375×812. Visual mantém tokens/conteúdo; a remoção da barra vertical pelo lock
de documento libera15px antes ocupados no Browser desktop emulado. Não confundir com
redesign; não é prova de Safari/iPhone/Android físico. Nenhuma conta ou aprovação editada.

Leituras Gauss39backend/8.832linhas, Mendel25admin-raiz/2.530linhas e adendoSocrates5SVGs:
relatórios lidos pelo parent e hashes conferidos. SVGs têm XML+11slotsPNG(9rastersúnicos)
visualmente inspecionados; base64não lido literalmente e composiçãoSVG não renderizada.
Arquivos alterados depois do freeze têm leitura anterior+diff parent separado. Metadados
sozinhos nunca promovidos a leitura. Relatórios /tmp/lectum-task178-backend-support-346,
/tmp/lectum-task178-admin-root-support-346 e /tmp/lectum-task178-frontend-support-345.

LeituraBacon172tasks finalizada:54.419linhas/502chunks;172hashes preservados até20:59:55UTC.
Parent leu REPORT.md integral e deduplicou com leiturasanteriores;168novosda base nesta
integração. DoDREADME e avisoTASK42 foram corrigidos depois, com baseline+diff rastreado.
Os seisachados são documentais, não prova de execução remota; statusCompletedhistórico
não vira aprovação atual de TASK178. Fonte /tmp/lectum-task178-product-tasks-345/.

## 347 — controles acessíveis e catálogos

A342-05:7testes reais (SSR/estado/handlers +wiring) passaram; baseline3pass4fail.
O testscriptAdmin executa o arquivo com[id] via node direto: --test nessepath havia
selecionadozerotestes, que nãofoicontadocomoaprovação. Declarações originais extraídaspor
AST, hooksReactreais, Lucide/cn, sem bootstrap/API/auth/provider. Browserlocal390/1280:
Especialidades mantémnome ao abrir/fechar; TabEnterseleciona, Removernomeado, disabled
ocultaopções e anunciacolapsado; páginas1→3limite→2 comnomes/estado/aplicação preservados.
Dadosdasopções são entradasunitárias, não dadospersistidos nem integraçãomockada.
Capturasvistas local-mobile.png e local-desktop.png em/tmp/lectum-task178-admin-labels-347.
Primeiracapturaapósresize tinha bitmapantigo; descartada e refeita após estabilizar1280.

D2: catálogos9valorescada, nenhumachave/serviço/contrato alterado. Tradutori18next/Zod/
normalizadorreais20/20; baseline1pass19failincluiexpectativasdecopy,não19vulnerabilidades.
Gateway já era filtrado; novacopyrecuperaorientaçãosegura. SMTP/scheduler/configuração/
canalinternoe softdelete têmcallersrastreadosemfonte, nenhumarotaouaçãoexecutada.
Mutual/exactcompatibilidade não temcallerprodutoatualdemonstrado; teste nãofabricaissue.
Fonte /tmp/lectum-task178-public-messages-347/report.md, readlist,freeze.

347 validação global:1123 testes,1117pass/6skips conhecidos drawtext. Admin93/93 (86+7), backend470/470. Builds Admin/backend aprovados; logs /tmp/lectum-347-{root-check,admin-build,backend-build}.log. Sem env/migration/package. Nova env não necessária. Publicação e reteste autenticado pendentes neste commit.
