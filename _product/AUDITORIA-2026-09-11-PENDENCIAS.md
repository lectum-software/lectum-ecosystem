# Auditoria — fila de achados e decisões

Não é aprovação para produção. “Fonte” significa mecanismo identificado no código,
não exploração ou incidente observado no ambiente publicado. A lista de correções
já realizadas permanece em [Acompanhamento](AUDITORIA-2026-09-10.md).

## Admin

| ID | Pendência | Evidência / estado |
|---|---|---|
| A342-01 | Upload de avatar pode apagar texto ainda não salvo da comunidade. | Corrigido348; RHF real e Browser local; upload remoto ainda pendente. |
| A342-02 | Reordenação de regras não possui alternativa por teclado. | Corrigido/publicado359; teclado/foco/persistência/reload e restauração da ordem conferidos. Limpeza de uma regra QA temporária aguarda diálogo manual. |
| A342-03 | Editar data incompleta removia os próprios filtros. | Corrigido344; repetido no Admin publicado. |
| A342-04 | Busca perde foco após atualizar a URL. | Corrigido345; foco e continuação da digitação repetidos nas duas listas publicadas. |
| A342-05 | Expansor de campo profissional e setas de publicações sem nome acessível. | Corrigido347; nomes/expandido, teclado/seleção/Cancelar e paginação conferidos no Admin publicado e mobile. |
| A342-06 | Contador de cliques de Posts inclui cliques das Respostas. | Corrigido/publicado350;8/8testes;reteste contaQA,smoke5/5. Nãozero comprovado localmente. |
| A342-07 | Cores de donut e legenda divergem quando há categorias zeradas. | Corrigido/publicado349; seis testes e Browser local/homolog375×812 e1265×889; smoke5/5. |
| A342-08 | Menu mobile permite Tab para conteúdo atrás do modal. | Reproduzido no Admin344: Tab atravessa o menu e alcança a busca atrás do overlay. Corrigido346; contenção/Escape/retorno/resize/histórico repetidos no Admin publicado. |
| A342-09 | Métrica agrupada herda detalhes apenas da primeira origem. | Corrigido/publicado355;12contratos e resumo real conferido sem atribuir origem desconhecida. |

## Backend

| ID | Pendência | Evidência / estado |
|---|---|---|
| C17-A | Confirmação não aplica toda a compatibilidade/inequivocidade documentada. | Fonte; P2 proposto. Definir desambiguação antes de criar bloqueio mais amplo. Não é KYC/IDOR comprovado. |
| C17-B | Confirmação por outro caminho pode substituir CPF/CRP protegido. | Publicado365/cb213570:38cenários PostgreSQL isolados,6testes puros,check/build/revisão/smoke5/5 aprovados. Retry exato e rejeição manual preservados; sem revogar aprovações. Não equivale a E2E de provider. |
| C20 | Normalização estrutural deve evitar acesso a propriedades herdadas. | Fonte; impacto HTTP não comprovado. Nenhum teste/receita de exploração executado. Restrições operacionais anteriores permanecem. |
| C9/C10 | Decisões concorrentes de moderação podem reutilizar contador/snapshot antigo. | Corrigido/publicado358:26cenários PostgreSQL real isolado e4contratos; check/build/Docker e smoke aprovados; sem remoção publicada para testar. |
| C12 | Edição parcial pode regravar campos omitidos a partir de snapshot antigo. | Corrigido/publicado354;22contratos,11cenários PG real;smoke5/5 e ediçãoQA restaurada. Não cobre formulário já obsoleto antes de chegar ao backend. |
| C13 | Campo chamado cpf_masked retornava todos os dígitos. | Corrigido345 com máscara compartilhada; contratos/build aprovados. Endpoint administrativo; nenhum vazamento público demonstrado. |
| C15 | Numerador e denominador de taxa de ação usam conjuntos diferentes de sessões. | Corrigido/publicado360 mantendo base de visualizações;14testes puros/check/build e smoke aprovados. Leitura normal Admin conferida; sem ocorrência publicada acima de100 comprovada. |
| C4-psicólogo | Consulta sem relações elegíveis reutiliza contadores agregados do post. | Corrigido/publicado361;12testes/check/build/smoke aprovados. QA:comentários1→0,demais números preservados. Período filtra criação das publicações, não todas as interações. |
| C4-paciente | Zero de relações no intervalo pode virar contagem acumulada. | Corrigido/publicado362;12testes reais/check/build/smoke e leitura QA aprovados. Consultas temporais e exclusões próprias preservadas. |
| C5 | Atividade pode incluir publicações anteriores ao intervalo. | Publicado364/c4d3aa3e;29testes/check/build/revisão/smoke aprovados. Hoje12/09:22conteúdos preservados;6→0autores ativos,1,2→0ações por profissional. Sem mutações publicadas. |
| C6 | Views por conteúdo podem incluir visitas ao perfil. | Publicado363/5b9511f4;17testes, check/build/revisão/smoke e leitura AX publicados aprovados. Razões corrigidas e dataset histórico/atribuição preservados. |
| C18 | Limite de consultas CFP não reservava a tentativa antes do efeito externo. | Corrigido366; 20 cenários PG reais passaram3vezes, incluindo perfis independentes. Sem consulta paga; publicação pendente. |
| C16 | Despublicação de perfil impede remover a própria relação de follow. | Corrigido/publicado353; dez cenários service/repository em PostgreSQL local real,smoke5/5. Sem E2E autenticado equivalente. |
| C24 | Data de registro de hoje pode ser recusada pela manhã. | Corrigido346; comparação civil em São Paulo, 11 contratos em3fusos e build. |

## Hipóteses que exigem rastreio antes de mudar regras

- Universo histórico de membros, origem de tráfego, coortes e scores (C1/C2/C7/C8/C11).
- C3/C14/C19 corrigidos366: fuso e resumo/CRP atuais testados; WhatsApp20 e registro38 cenários PG aprovados; publicação pendente.
- C21/C22 corrigidos366: 42 testes novos +14base aprovados; min0 tem consumidores ativos. CPF/max0/condições genéricas cobertos como contrato, sem alegar exploração publicada.
- Métricas de mentoria e filtros de eventos próprios no ranking (C23/C25).
- Sucesso parcial de mutations encadeadas, idiomas, fallback de slices e listas administrativas.

### Decisões CFP ainda necessárias

Responsável confirmou em11/09/2026: o selo indica registro ativo aprovado, sem promessa de
comprovar identidade do titular. Não introduzir KYC nesta auditoria. Definir desambiguação
de múltiplos registros, garantia dos filtros do provider
(C17-A). Precedência decidida em12/09:reprovação manual só é revertida por nova revisão humana. Nome editável não comprova identidade.
Não é necessário introduzir KYC para corrigir a sobrescrita de campos já protegidos (C17-B).

## Decisões documentais a reconciliar com o código atual

ADRs não são prova de incidente. Lote B completo (224 arquivos) apontou:

| Tema | Decisão/evidência ainda necessária |
|---|---|
| Aprovação profissional | Precedência de rejeição humana, evidência CFP anterior e cortesia (ADR0251/0436; C17). |
| Visualizar como | Confirmar que leituras reparadoras não alteram negócio sob a promessa read-only (ADR0405/0460). |
| Privacidade | Prazos/acessos/descarte de snapshots de moderação e analytics vinculáveis, com decisão aprovada (ADR0270/0325). |
| Cobrança | Política para preços legados e significado de desativar a régua frente à graça temporal (ADR0406/0459). |
| Métricas | Distinguir zero observado, medição ausente e posição desconhecida; preservar ressalvas de atribuição (ADR0397/0402/0385). |
| Operação | Confirmar limites de réplicas/schedulers, vídeo maior que200MB e QA real; histórico não prova deploy atual (ADR0418/0495). |
| Notificações | Reconciliar preferências/consentimento e significado de sent com os fluxos atuais (ADR0304/0450). |

Template de ADR e complemento0441 atualizados346 para incluir vídeo sem apagar sua decisão histórica. Padrão atual: cinco manifests, quatro aplicações.

Outras tensões documentais do lote A (225 arquivos): política de exposição do telefone no
link wa.me; identidade/pseudônimo por canal de notificação; retirada de conteúdo sensível
após exclusão da conta; finalidade/retenção e associação de analytics em dispositivo
compartilhado; DTOs administrativos com campos invisíveis; contrato legado de nascimento.
Fontes principais: ADR0022/0147,0098,0113/0141,0229,0240,0217. Necessário rastrear código
atual antes de classificar como bug. Permissões e valores históricos não comprovam estado atual.

## Dependências de conclusão

- Documentos legais aprovados e links acessíveis no cadastro.
- Completar leitura dos arquivos restantes e fluxos funcionais ainda não executados.
- Testes Safari/iOS/Android reais e integrações autorizadas de pagamento, identidade e vídeo.
- Rotacionar credenciais de auditoria ao final; não copiar senhas ou tokens para estes documentos.

Fontes e rastreio: relatórios laterais e hashes citados em
[Evidências](AUDITORIA-2026-09-10-EVIDENCIAS.md) e
[Leituras](AUDITORIA-2026-09-11-LEITURAS.tsv). Prioridades podem mudar após reprodução.

## Suporte frontend — leitura345 integrada346

FS345-01: READMEfrontend ainda template, sem fluxo pnpm/homolog/promoção; corrigir em escopo
documental. FS345-G01/G02: regex de fonte e doubles de plataforma não certificam Browser,
Next/PWA/gesto/cookies; manter cobertura funcional separada. FS345-H01: SVGs inline grandes
(sem medidaLCP/consumo, não bug de performance confirmado). FS345-Q01: catálogo cidades
sem origem editorial no próprio JSON; não inferir desatualização nem modificar valores
persistidos sem fonte. CincoSVGs aguardam inspeção raster; não ler base64 como pixels.

C24 corrigido346 e validado em11testes/3fusos; sem regravar registros ou executar CFP.
A342-08 corrigido localmente346, aguardando reteste publicado; A345-01 singular idem.

## Suporte346 integrado347

- DOC01: duas instruções antigas omitiam vídeo; parent alinhou QUATROapps/CINCOmanifests.
- DATA01: três formas no JSONdepaíses usam stringundefined como id. Rastrear consumidor
  antes de inferir associação errada; não redefinir nomenclatura geopolítica automaticamente.
- D1Swagger: catálogo parcial/desalinhado (securitynome/casos, AND/OR, pathsExpress,
  OpenAPI3.1/nullable/required, corpos, transporteCookie, fluxosfaltantes). Não é prova
  de falta de autorização atual; corrigir gerador/documento com escopo/teste próprios.
- D2copybackend: defeitos Zod e texto técnico em triagem347; conflito vídeoGratuito/Pro
  exige caller/regra vigente, não simplificar inventando entitlement.
- D3templatee-mail: slotHTML/URL/fonteexterna exigem procedência/sanitização/privacidade;
  nenhum payload/XSS comprovado nem envio executado. Testelogo não cobre esseslimites.
- D4contratos: vídeoHTTPsubstituto,multipartparser,cookies/view-as/sanitização são unitários;
  não certificar DB/providers/Browsers com sua contagem. D5legadosOAuth, preferência
  selodeexperiência e docs operacionais pedem interpretação; receitas ficam inertes.

A342-08 passou no BrowserAdmin346 (ciclo completo/Escape/resize/navegação/retorno e
regressão do filtro existente). A342-05 confirmado também emBrowser345 para expansores
Especialidades/Abordagens sem nome; correção347 emandamento, nenhuma edição salva.

## Novas confirmações locais/Browser346 (sem edição persistida)

A348-01/P2: Cancelar da identidade de comunidade não descarta rascunho. Parent abriu apenas
Auditoria Lectum — Homologação, acrescentou texto no nome e clicou Cancelar; rascunho
permaneceu no input e header continuou no valor persistido. Reload descartou a edição,
nenhumSalvar/upload acionado. Fonte: DetailContent passa onDone noop emtabdados e
CommunityEditForm delega Cancelar a esse callback semreset. Capturas em
/tmp/lectum-task178-community-draft-348/cancel-before.png e cancel-draft-preserved.png.
Tratar junto de A342-01resetapósavatar, preservando submit e sincronizaçãoRHF.

DATA01 promovido de hipótese para mecanismo concreto de fonte: os dois WorldCountryMap
(pacientes/location-map.tsx e trafego/components/location.tsx) usam id como key React e
chavecountriesByMapId. A resolução por nome pode obter uma das trêsformasidundefined;
o mesmo item pode então colorir as outrasduas. Não há evidência de dados afetados em
homolog. Corrigir identificador interno de forma/associação sem alterar nomes, fronteiras,
ISO de API ou dados persistidos; testar dataset real e componentes. Ainda não implementado.

## Tasks históricas — fonte integral345 integrada347

DOC1DoDREADME omitevídeo corrigido347; DOC2TASK42recebe apontadoràreintroduçãoTASK176,
semrestaurarpipeline antigo. DOC3TASK70(espelhosem66/67/68): checkboxmutaçãopersistida
excede evidência descrita de guards/checks; buscar evidência posterior semexecutarações
proibidas e separar implementação deintegração. DOC4MRRTASK62 intervalodofiltro vsrótulo
Todooperíodo pedecontratocanônico, não deduzir errofinanceiroatual. DOC5TASK72/91zero
mostrado para atribuiçãoausente é decisãohistórica; nãoreconstruirtráfego, revisarsemântica
viva. DOC6TASK74mantémpendênciaretençãodescarte/copycrise/validaçãoprofissionaljurídica,
aindaqueCompleted. Registrar responsável/decisão, nãopresumiraprovação.

## Fontes de produto PDF — leitura integral, não certificação

PRD Draft e Fluxos completos em25páginas (Bacon/347, integrado348) reforçam seis distinções:
1. Registro encontrado não equivale a registro ativo aprovado; selo atual CFP/humano, sem KYC.
2. Notificação de downvote diverge entre fontes; não assumir permissão de expor votante.
3. Ramos de plano/erros incompletos não autorizam cobrar gratuito ou aprovar por cartão válido.
4. Reputação/ranking não certifica atendimento ou resultado clínico; fórmula atual precisa fonte.
5. Enunciados LGPD/criptografia não demonstram consentimento, retenção ou conformidade jurídica.
6. Metas de disponibilidade/busca/backup não têm protocolo completo de aceite nesses PDFs.
Preços, gates e receitas históricas não serão restaurados a partir do Draft. Relatório de
agosto também é evidência histórica, não conclusão da auditoria atual.

A348-02: erro temporário ao carregar catálogos de edição profissional exibiu título
“Não foi possível carregar o psicólogo”, embora o perfil já estivesse carregado. Retry
recuperou opções reais; ajustar contexto do erro sem afirmar falha persistente ou perda de dados.

## Lockfiles — leitura concluída, verificação operacional separada

L347-01: alinhar documentação da matriz real Node/TS/Biome por app; engines transitivas
podem ser mais restritas que o piso declarado de Next. Tipos Node não são runtime.
L347-02: revisar intenção de overrides independentes (js-yaml, brace-expansion etc.); root
não protege automaticamente instalações separadas. Drift sozinho não comprova CVE.
L347-03: scmp transitivo de Twilio está marcado deprecated; manutenção, sem alegação de exploração.
L347-04: locks não mostram execução de lifecycle, conteúdo de binários/bundles nem configuração
de telemetria. Não concluir coleta de dados pela mera presença de um SDK.
L347-05: metadado engines de concat-stream é não padronizado; efeito do gerenciador não validado.
Nenhum pacote alterado nem recomendação de upgrade automático; relatório fonte347 congelado.

## Referências visuais históricas (PV01–PV07)

85imagens lidas; relatório /tmp/lectum-task178-proto-347/report.md. Garantias absolutas
de privacidade/exclusão, audiência de denúncias, finalidade do endereço, cortesia e
definições de métricas são insumos de comparação, não vulnerabilidades atuais comprovadas.
Copy da aplicação deve obedecer à spec/política vigente, não copiar promessas da imagem.
Selo já decidido: registro ativo aprovado, sem comprovação de titularidade. Conversas
pessoais das referências não foram reproduzidas. MP4 tem inspeção técnica parcial,
sem cobertura audiovisual integral; não há alegação de todos os arquivos/fluxos concluídos.

A348-01: corrigido e repetido no Admin348; Cancelar/Salvar/normalização/pending e limpeza
de erro passaram. Nome QA restaurado após gravação e reload. Avatar+rascunho pendente manual.
A349-02: botão acessível de fechar toast usa “Close toast” no Admin; rastrear configuração
Sonner para PT-BR, sem tratar idioma do controle nativo do navegador como copy de produto.

A349-02 corrigido351 em amboslayouts:3testesporapp,SSR e BrowserlocalAdmin/front. Publicação pendente.
C17-B: nova pergunta enviada sobre rejeição humana versus reconfirmação CFP; nenhuma mudança em aprovação.


A349-02: publicado351; região PT-BR no frontend apósreload e aviso real de sucesso noAdmin
com Fechar notificação. Teste local confirmou fechamento;smoke5/5. Sem alteração funcional
adicional no registro352. Lista C17 e demais lacunas continuam abertas, sem promessa KYC.

A342-09: correção355 implementada;12contratos e Browserlocal móvel/desktop aprovados.
Baseline real354:22cliques e breakdown herdado de10. Reteste publicado pendente.

A342-09: publicado e conferido355. DATA01: corrigido356nos dois mapas,12testes reais de
componentes/dataset e comparação local aprovados;reteste publicado pendente,semdados afetados confirmados no ar.


DATA01:publicado356,mapa de tráfego conferido; colisões cobertas nos componentes reais locais.
A348-02:corrigido357,contratos/callbackunitário/Browserlocal/check/build passados;reteste normal apósdeploy pendente.

A348-02:publicado357;catálogo real e Cancelar conferidos,sem escrever dados. Estado de erro fica coberto localmente.

C9/C10:358 publicado(80721abd),5GETs e leitura normal QA aprovados. Cenários transacionais
26/26 em PostgreSQL descartável; não houve decisão concorrente HTTP no ambiente publicado.
A342-02:359 em implementação; baseline real e referência visual registrados. Uma regra
QA359 temporária foi adicionada pelo formulário normal para testar ordem e depois remover.
