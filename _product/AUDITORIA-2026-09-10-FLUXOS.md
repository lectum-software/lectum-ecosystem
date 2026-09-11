# Auditoria — cobertura funcional em andamento

Não é uma certificação de todos os fluxos. O inventário de rotas é estático; esta matriz
registra ações executadas e lacunas. Testes isolados não substituem o ambiente publicado.

| Fluxo | Evidência executada | Falta / limite |
| --- | --- | --- |
| Login paciente/Admin | Vazio, mensagens PT-BR, sessões reais e acesso privado recusado sem sessão | Google, todos os cenários de expiração em dispositivos reais |
| Cadastro paciente | Cadastro e confirmação reais; controles de senha/código em mobile | Recuperação com entrega real de e-mail até a conclusão |
| Cadastro profissional | Vazio inválido; conta criada, e-mail confirmado, plano grátis e WhatsApp autorizado salvos | CPF/CRP autorizados, CFP, aprovação humana e publicação do perfil |
| Formulário profissional | Obrigatórios recusados em português, foco em CPF e sem overflow horizontal em mobile | Perfil não publicado; visibilidade desmarcada apenas no formulário ainda incompleto |
| Perfil paciente | Campo vazio recusado; edição e logout pela UI | Imagem, limites e todos os estados de falha |
| Credenciais | PostgreSQL/HTTP reais: confirmação, recuperação, troca de e-mail/senha e concorrência | Provedor de e-mail não simulado nem certificado por essas suítes |
| Comunidade/Admin | Comunidade própria criada, formulário vazio recusado, regra criada/editada, filtro sem resultado | Avatar, ordenação/regras múltiplas, desativação/reativação e moderação |
| Indicadores/Admin | Conteúdo próprio e contadores conferidos após recarregar | Atualização em tempo real não foi requisito presumido |
| Regras/Admin | Campo vazio recusado, edição persistida; IDs/rótulos/erro/foco corrigidos e repetidos na .326 publicada | Ordenação e combinações adicionais de regras |
| Seguir comunidade | Comunidade seguida e listada; .327 publicada mantém Seguindo em Salvos | Combinações adicionais de membros/comunidades |
| Post profissional | Vazio inválido, criação textual, edição, listagem própria e detalhe | Mídia exige profissional verificado; não contornado |
| Comentário profissional | Criação, edição e persistência; link direto e listagem própria | Moderação, denúncia e permissões entre contas |
| Resposta aninhada | Criação, cancelar/excluir só a filha; .327 publicada sem filha na lista nem contagem/Ver mais fantasma | Concorrência validada em PG isolado, não carga no ambiente publicado |
| Preservação de resposta profissional | Paciente impedido de excluir seu post respondido; alternativa silenciar e reativar funcionaram | Corridas protegidas na suíte PG; repetição com nova versão publicada |
| Salvos | Post e comentário após reload; segunda conta salva/remove sem afetar a primeira; .327 confirma seguimento e contagem | Combinações adicionais de mídia |
| Votos | Segunda conta vota, alterna positivo/negativo e remove voto no post próprio da auditoria | Concorrência e todos os tipos de resposta |
| Denúncias | Denúncia própria resolvida Improcedente; .327 publicada carrega registro e filtra tipo longo/status; erro e retry testados localmente com PG real | Outras decisões não executadas em terceiros |
| Conteúdo/Admin | Reproduzido erro no filtro de psicólogo não verificado e zero enganoso | Correção e regressão em andamento na continuação .328 |
| Post anônimo | Paciente cria/edita; anonimato e comunidade imutáveis na edição; após logout não há nome/link de autor nem ações de dono | Inspeção pública de mídia/metadados e todos os endpoints por objeto |
| Denúncia anônima | Envio sem sessão encaminha ao login, sem conclusão de denúncia | Autenticação é solicitada somente depois de preencher o modal; possível perda de contexto |
| Leitura anônima | Após logout, post e discussão próprios legíveis; salvar solicita login | Ainda não equivale a todos os tipos de vídeo e comunidades |
| Vídeo/player | Reprodução Stream real e testes de teclado anteriores, registrados nas evidências | Upload e render social após hardening, Safari/iPhone/Android reais |
| Serviço de vídeo | Imagem integral .327: Redis/BullMQ/HTTP/FFmpeg/Range/limpeza reais; operador confirmou .327 privada, autenticação válida e ready pelo backend homolog | Upload/render publicado com Stream/R2 após hardening |
| Histórico financeiro | 13 cenários HTTP/Prisma/PostgreSQL reais na imagem integrada local | Nenhuma cobrança/provider de pagamento executado nesta prova |
| Checkout/cancelamento | Revisão estática; compatibilidade de plano e idempotência de cartão com regressões | Concorrência, resultado incerto e reconciliação financeira não certificados |
| Notificações | Resposta profissional chegou ao paciente; abrir levou ao post e retirou não lida/indicador | Preferências, entrega push, deduplicação e todos os eventos |
| Favoritos/busca/avaliações | Inventário e revisão parcial | Jornada completa entre paciente e profissional verificado |
| Termos/privacidade | Falta de links identificada; documentação a confirmar | Conteúdo oficialmente aprovado; bloqueia recomendação de produção |

| Hidratação da sessão | .331: SSR real + Browser local com PG/sessão/revogação; homolog390/1280 público e privado390 sem mismatch | Outros guards/replay de intents e dispositivos reais não cobertos |
| Metadados de SEO | Baseline .330 confirma concorrência defeituosa;18 cenários PG reais da .332 passam; .332 Admin lista9 páginas sem salvar e smoke16/16 | UI completa e regra de canônico/global pendentes |

## Limites operacionais

- Somente homologação e dados de auditoria; nenhuma exclusão em massa, reset ou cobrança real.
- WhatsApp autorizado foi salvo sem envio de OTP nesse fluxo. A conta aguarda dados profissionais
  autorizados; não inventar CPF, CRP ou aprovação. Não publicar o perfil de auditoria.
- Browser conectado não comprova Safari ou Android/iPhone reais. Viewport de 390px comprova apenas
  o layout naquele motor de navegação.
- Cenários concorrentes usam PostgreSQL/Redis reais descartáveis. Dados de teste não permanecem
  no produto nem substituem integrações externas.
- Screenshots 38–48 e logs sanitizados acompanham as evidências; não versionar senhas, códigos,
  tokens, respostas privadas ou dados de outras pessoas.

Provas adicionais: screenshots 49 (erro de denúncias), 50 (controllers corrigidos publicados)
e 51 (post anônimo após logout). A denúncia de teste foi encerrada sem penalizar ninguém;
nenhum conteúdo de terceiros foi alterado.


### Atualização local .328

- Preferências: GET real falho → erro sem formulário → retry → opt-outs preservados → PUT/reload.
  Prova Browser mobile e PG local, não entrega dos canais nem permissão nativa do navegador.
- Conteúdo Admin: oito filtros, vazio legítimo, erro real de rede e recuperação;390/1280px.
- Perfil: limites PT-BR e link com DDD preservado; três seletores abertos por Enter sem upload.
  Capa de vídeo, processamento/render, publicação e dados profissionais reais ainda pendentes.
- Modal de denúncia: falha visual59 corrigida localmente no recorte .329 descrito abaixo.

### Atualização local — denúncias .329

- Post, comentário, filha e tela dedicada da conversa: foco inicial, Escape/Cancelar/X e retorno
  ao gatilho correto. Tab/Shift+Tab não alcançam controles do app ao fundo; o Chromium permite
  passagem pelo chrome do navegador (activeElement BODY), não confundir com foco no fundo.
- Select nativo: Space abre; primeiro Escape fecha apenas opções; segundo fecha denúncia.
- Falha real de rede preserva texto/alerta; retorno da rede permite persistência real no PG.
  Duas denúncias locais próprias (pai/filha), nenhuma denúncia publicada a terceiros.
- Móvel390 e desktop1280 conferidos. Safari/iOS, teclado virtual, navegação SPA com modal
  aberto e sobreposição de modais legados continuam pendentes; SSR não certifica esses casos.
- Checkout: revisão somente-leitura confirmou riscos de tentativa incerta, recuperação sem ID
  remoto e uso de evento bruto no histórico. Sem cobrança/HTTP ao gateway e sem patch financeiro.

### Novas lacunas estáticas rastreadas

AF1–AF3/AF5 (conta/avaliações) e C01–C07 (moderação/comunidades) permanecem pendentes.
M2/M3 foi publicado .333 com108 verificações PG/HTTP; upload físico e dispositivos reais
continuam pendentes. AF4 tem correção local .334: schema/Form reais e Browser390/1280,
sem afirmar recebimento do e-mail ou reset completo. PF1–PF3 (WhatsApp/CFP/modalidade)
têm novas evidências estáticas, sem confirmação de dados persistidos/provider.

## Continuação336 — controles profissionais e leituras de comunidades/Admin

- Recuperação335 publicada, versões/gates17/17; envio/entrega de e-mail não comprovados.
- Contato: conversor/schema compartilhados; testes reais locais, sem enviar WhatsApp.
- CFP: gate local de sessão confirmado; card pending SSR e composição estática; confirmação
  do registro real/erro ainda pendentes de identidade autorizada, sem bypass.
- Modalidade presencial/híbrida/online: helper real coberto; não alterada publicação do perfil.
- Comunidades/posts:86 fontes novas; CP1 teclado, CP2 sincronização props e CP3 rollback
  registrados, sem publicação/voto/save remoto neste recorte.
- Admin:63 fontes novas de resumo, campanhas, pacientes/psicólogos; contratos/achados BA/BR
  registrados como fonte-only, sem e-mail, suspensão de conta ou alteração persistida.

## Continuação337 — formulários e resumo administrativo

- Telefone: preservação nacional com país e fallback legado; testes SSR reais, sem contato.
- Anonimato: button/RHF/schema e handler preservam intenção; Tab/Space/toque reais pendentes.
- Menu de resposta/comentário: copy corrigida; exclusão, silenciamento e restrições intactos.
- Resumo Admin: categorias canônicas recebem gravidade prevista; não muda moderação automática.
- Pacientes/notificações: rótulos/notas PT-BR, fallback textual robusto; sem mutação persistida.
- Suspensão: tipo de entrada alinhado; regra HTTP e duração permitida inalteradas.
- Health/ready336200 e16/16smoke confirmados;337local731testes e Docker17/17 sem rede aprovados.

### Continuação338 — limites da prova administrativa

Admin autenticado, conta dedicada à auditoria: busca nominal retorna1registro; abasGeral/
Atividades carregam10eventos. FiltroConta criada reduz a1evento, sem alterar cadastro/status.
Captura100 em/tmp, viewport real991px; não equivale aSafari/iPhone nem prova de conta inativa.
A conta permaneceuativa. Patch BA03 remove condiçãoactive=true exclusivamente na consulta
do histórico administrativo, conservando IDs, papel, exclusão lógica e mount com adminAuth.
Teste do where não é consulta real de banco nem autorização nova para sessões de usuário.

Na lista com1registro apareceu concordância plural “1 psicólogos encontrados”; detalhe de
assinatura gratuita repete “Plano Plano Gratuito”. Achados visuais menores registrados, sem
reclassificar como erro de dados ou incluir correção não implementada neste commit.

### Continuação339 — evidência de processamento

-338:quatro versões alinhadas,smokeHTTP18/18 e conexão privada autenticada/pronta; nãoencodeE2E.
-V06:relatório de execução distingue cancelamento opcional não executado, sem remover asserções.
-BR08:serviço de voto já restringe±1;risco de dado legado0 não demonstrado,nenhuma mutação feita.
- V02: timeout interno da análise passa a falha operacional repetível; fluxo conserva cancelamento,
  rejeição de mídia inválida e validação de saída. Contratos puros aprovados, retry real pendente.


### Continuação340 — interações, render e legal

- CP2: cards de comunidade/minhas respostas/salvos reconciliam props e operação local;13contratos
  e11transições reais de hook no Browser; cards inteiros autenticados ainda não comprovados aqui.
- CP3: falhas concorrentes não repõem documento/lista inteira; query recriada e recibo de outro
  alvo protegidos.106contratos reais de QueryClient, não tráfego autenticado ou persistência.
- V03:17testes compilados na imagem340 com6renders reais respeitam limites da configuração.
  Orçamento pids128 falhou em3assets;512 passou, sem inferir comportamento da máquina publicada.
- Legal: minutas não aprovadas; aceite provisório existe; URLs previstas404. Não publicar texto
  incompleto nem regravar histórico; requisito externo impede recomendar produção.
- Comunidade no build local: SSR carregou título, hidratação terminou em falha de conexão.
  Registrar limitação e validar publicação, sem desativar segurança para simular integração.
- Homolog339:18/18smoke público. Vídeo privado ainda comprovado pelo operador somente na338.

### Repetição publicada340/341

- Comunidade340: voto/salvamento de post dedicado persistiram após recarregar e em Salvos;
  voto em resposta salva apareceu também em Minhas respostas. Ações desfeitas pela UI,
  salvos preexistentes preservados. Fluxo normal, sem alegar concorrência HTTP publicada.
- CP4 corrigido341: nova aba mobile390, recargas/rolagem e retorno ao Perfil sem convite
  indevido nem novo login. Sessão real; nenhum novo voto/save/post ou dado pessoal enviado.
  Reload da ferramenta retorna ao topo: não comprovou restauração de scroll ou Safari.
- Durante rollout341 houve indisponibilidade de sessão e depois comunidade; reload após
  backend341/health/ready200 recuperou conteúdo. Causa não isolada, não ocultada pelo smoke.
-341:18/18smoke; backend/frontend/Admin341. Vídeo privado segue pendente de prova posterior338.

## Analytics e edição de mídia — continuação342

- Baseline de período inválido reproduzido no frontend341 autenticado. Patch com formulário
  RHF/Zod/controllers testado localmente; repetição publicada342 ainda pendente.
- Tab/Shift+Tab e ativação de remoção de anexos testados em componente real com assets locais.
  Não equivale a persistir uma edição de post, enviar um arquivo nem moderar conteúdo.
- Slider de retenção e geometria nativa testados em390/1280; duração controlada e curva vazia
  não são métricas de usuário. Reprodução paga/Stream continua pendente de requisito real.
- Novos88testes registrados no check:14datas+7anexos+35retenção+32scanner. Não substituir
  critérios de fluxo remoto por SSR, AST ou contratos puros.

### Continuação343 — campos e período administrativo

- Contenteditable compartilhado: fonte integral + Browser local RHF/DOM/CSS reais, bloqueios
  disabled/readOnly, beforeinput sem inputType, paste/nova linha/teto/remoção e palavra longa.
  Validado390/1280; não equivale a publicar/editar post autenticado ou comprovar todos os IMEs.
- Admin Comunidades /comunidades341: reproduzido A342-03, edição de Até com De vazio remove
  filtros e exige Tentar novamente. Restaurado all; nenhuma mutação persistida. Correção pendente.
- Backend342 confirmado pelo /ping; interfaces341 ainda não comprovam regressões342 publicadas.
- Leitura inicial1669/3121 não é cobertura funcional;1452arquivos ainda pendentes.

### Continuação344 — Admin e confirmação343

- Admin275fontes lidas: comunidades, moderação, campanhas/notificações, pacientes, psicólogos,
  tráfego, callers/requests/types, shell/paginação/video e filtros. Não são275fluxos executados.
- NovefindingsA342-01..09; apenas03 reproduzido remotamenteatéaqui, demais mecanismos de fonte.
- DatasAdmin: teste local realpreservaappliedall durante custominválido, presetlimpaerro;
  blurentreinputs nãoaplica, saída dogrupo aplica; guard/rótulo usadosnaclientreal porwiring.
- Analyticsprofissional343 autenticado: inválido fica noeditor;cancelar/validar recuperam
  semerro global. Todooperíodo restaurado; contatestelivre/semvídeo,nãocertificarplaybackpago.
- Smoke343:18/18, trêsappspúblicas343,health/ready200;últimaprova privada vídeo338.
- Base1944/3121leiturasiniciais,1177pendentes. Fonte/SSR/Browser/pós-deploy separados.


## Conferências348–351 publicadas

- ComunidadeQA: Salvar normaliza o nome, bloqueia os campos durante envio; Cancelar restaura
  últimos valores e limpa erro. Nome original restaurado. Upload de avatar + rascunho
  continua aguardando teste manual; a aba reservada não foi recarregada.
- Tráfego349:0pacientes/4psicólogos com arco e legenda coerentes; nativo375×812/1265×889.
- Formatos350: cliques Posts/Respostas separados;8regressões reais,comparação local;
  reteste autenticado da contaQA1post/2respostas com0cliques sem regressão. Caso nãozero
  não foi fabricado no ambiente publicado.
- Avisos351: região PT-BR no frontend e região/botão no toast de sucesso realAdmin.
  Teclado e clique para fechamento comprovados localmente em991×964/390×844; nãoSafari.
- Gates públicos de348–351: backend/frontend/Admin alinhados em cada release,health/ready200.
  Nenhuma inferência sobre versão de vídeo privado, assinatura, CFP ou dados de terceiros.


C16/353: seguir/desseguir validado em service/repository/Prisma reais num PostgreSQL
descartável local (dez cenários, incluindo concorrência e isolamento por paciente).
Não foram alteradas publicações de profissionais reais para reproduzir o problema.
Rota/middleware autenticado não substituídos: cobertura HTTP específica continua limitada.


C12/354:22contratos de deltas e11cenários repository/PG real em imagem imutável aprovados.
Concorrência de gravação/histórico,omissão de seleções e rollback provados somente no
laboratório isolado. HTTP autenticado e formulário já obsoleto não equivalem a essa prova.
