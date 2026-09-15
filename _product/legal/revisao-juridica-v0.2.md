# Checklist de revisão jurídica e factual — Lectum — Minutas v0.2

**Preparação e consulta de fontes:** 12/09/2026.
**Estado:** rascunhos completos para revisão; nenhum documento publicado, ativado ou aceito por esta execução.
**Escopo:** subtarefa documental autorizada da TASK178; somente arquivos no diretório legal. Não é relatório global de auditoria, parecer jurídico, aprovação de produção ou atestado de conformidade.

## 1. Decisões confirmadas e limites desta entrega

- [x] Confirmada a branch `homolog` antes da escrita.
- [x] Lidas as instruções da raiz, a TASK-41, as minutas v0.1 e as notas de privacidade relevantes.
- [x] Produzidos Termos e Política completos em português brasileiro, não apenas índices.
- [x] Usuário autorizou placeholders legíveis entre colchetes para edição no Admin **somente como RASCUNHOS em homologação**.
- [x] Usuário confirmou **contas a partir de 18 anos completos, por autodeclaração, sem verificação documental**. Não se admite cadastro autônomo de menores nesta versão. A regra de conta é distinta do público atendido por psicólogos em sua atividade profissional.
- [x] Explicitado que métricas podem ser guardadas durante o plano gratuito e que a consulta completa do painel é benefício pago, sem vincular direitos LGPD a pagamento.
- [x] Explicitado que o selo trata de registro consultado e associado ao perfil, não de identidade civil ou chancela do CFP.
- [x] Pesquisa normativa restrita a fontes oficiais brasileiras utilizadas como fundamento.
- [x] Preservadas as minutas v0.1 como histórico editorial; não devem ser usadas para importar a revisão atual.
- [ ] Importação no Admin e implementação de versionamento/aceite real: a executar pela tarefa principal, não realizada nesta subtarefa.
- [ ] Conferência técnica do fluxo de autodeclaração de 18 anos: a executar pela tarefa principal; a confirmação do requisito não prova implementação.
- [ ] Aprovação factual, operacional e jurídica para uma futura publicação: pendente.

Não foram lidos, comparados por hash ou editados os arquivos de instrução do Admin excluídos pelo solicitante. Não houve leitura de relatórios globais de auditoria ou execução dos itens expressamente fora do escopo. Não foram usados dados de usuários, bancos, cookies, credenciais ou configurações do ambiente. A inspeção foi estática, em arquivos-fonte pertinentes. Não houve chamada a providers de produção, importação no Admin, edição de código, schema, migration, manifests, tasks ou ADRs, nem commit, bump ou push.

## 2. Documentos da revisão

| Documento | Uso |
|---|---|
| [Termos de Serviço v0.2](/Users/rezende/Desktop/lectum-ecosystem/_product/legal/termos-de-servico-v0.2.md) | Minuta contratual completa. O cabeçalho e a nota interna mantêm explícita a ausência de vigência. |
| [Política de Privacidade v0.2](/Users/rezende/Desktop/lectum-ecosystem/_product/legal/politica-de-privacidade-v0.2.md) | Minuta completa, com inventário de operações, bases propostas e complementos factuais de retenção e transferência. |
| [Textos curtos v0.2](/Users/rezende/Desktop/lectum-ecosystem/_product/legal/textos-curtos-legais-v0.2.md) | Propostas de avisos e manifestações distintas; não autoriza ativação de fluxos. |

`v0.2` é a revisão editorial dos arquivos, não uma versão jurídica já vigente. `[VERSAO_TERMOS]` e `[VERSAO_POLITICA]` devem corresponder ao documento efetivamente aprovado e apresentado ao usuário, não à versão do aplicativo.

## 3. Evidência do produto usada na redação

A evidência demonstra o desenho observado no código, **não** contratos com terceiros, recursos efetivamente ativados em produção, funcionamento ponta a ponta ou conformidade. Não inferir país de hospedagem, retenção, parceiro ou política comercial a partir de uma variável ou default.

| Tema | Evidência estática relevante | Consequência editorial |
|---|---|---|
| Páginas legais e dependências editoriais | [TASK-41](/Users/rezende/Desktop/lectum-ecosystem/_product/tasks/TASK-41-paginas-legais-termos-privacidade.md), minutas v0.1 e [notas de privacidade](/Users/rezende/Desktop/lectum-ecosystem/_product/PRIVACY-NOTES.md) | TASK-41 não comprova aprovação jurídica. Seu escopo original excluía aceite versionado; a ampliação solicitada agora será implementada pela execução principal. |
| Público e funcionamento | Trechos pertinentes de [arquitetura](/Users/rezende/Desktop/lectum-ecosystem/_product/tasks/ARCHITECTURE.md), [modelo documental do produto](/Users/rezende/Desktop/lectum-ecosystem/_product/tasks/DATA-MODEL.md) e [packages](/Users/rezende/Desktop/lectum-ecosystem/_product/tasks/PACKAGES.md) | Marketplace de descoberta de psicólogos e pacientes/interessados, comunidades e quatro aplicações separadas. Não transformar o processamento de vídeo em promessa de teleconsulta. |
| Cadastro e aceite legado | [Formulário de paciente](/Users/rezende/Desktop/lectum-ecosystem/frontend/src/app/auth/register/patient/use-form.tsx) | Havia identificador de termos provisório no código inspecionado. Checkbox ou versão provisória não comprova aceite do conteúdo v0.2. Não migrar esse histórico como concordância retroativa. |
| Registro profissional | [Validação de consulta](/Users/rezende/Desktop/lectum-ecosystem/backend/src/modules/api/private/psychologist/cfp/validator/index.ts), [provider](/Users/rezende/Desktop/lectum-ecosystem/backend/src/modules/api/private/psychologist/cfp/providers/InfoSimplesCfpProvider.ts) e [serviço de consulta/confirmação](/Users/rezende/Desktop/lectum-ecosystem/backend/src/modules/api/private/psychologist/cfp/use-cases/services.ts) | Critérios como CPF, nome, registro e UF; resultados externos e seleção de resultado ativo. Não há fundamento para equiparar isso à identidade de quem controla a conta. |
| Recorrência e dados financeiros | [Adapter Mercado Pago](/Users/rezende/Desktop/lectum-ecosystem/backend/src/modules/billing/payment-gateway/MercadoPagoAdapter.ts) e [endereço de faturamento](/Users/rezende/Desktop/lectum-ecosystem/backend/src/modules/api/private/psychologist/billing/address/validator/index.ts) | Recorrência mensal, token e e-mail de pagador, dados de cobrança e endereço. Não inventar plano anual, preço, trial, multa ou calendário de estorno. |
| Cancelamento | [Serviço da assinatura](/Users/rezende/Desktop/lectum-ecosystem/backend/src/modules/api/private/psychologist/billing/subscription/use-cases/services.ts) e [repositório da assinatura](/Users/rezende/Desktop/lectum-ecosystem/backend/src/modules/api/private/psychologist/billing/subscription/repositories/SubscriptionRepository.ts) | Confirma cancelamento no gateway, marca cancelada, limpa fim do período e restaura gratuito. Não afirmar acesso garantido até fim do ciclo. Saldo de período pago exige decisão comercial/jurídica. |
| Eventos | [Navegação](/Users/rezende/Desktop/lectum-ecosystem/backend/src/modules/api/public/analytics/page-view/DTOs/IPageViewTrackingDTO.ts), [ações](/Users/rezende/Desktop/lectum-ecosystem/backend/src/modules/api/public/analytics/action/DTOs/IImportantActionDTO.ts), [atenção](/Users/rezende/Desktop/lectum-ecosystem/backend/src/modules/api/public/analytics/content-attention/DTOs/IContentAttentionDTO.ts), [vídeo](/Users/rezende/Desktop/lectum-ecosystem/backend/src/modules/api/public/analytics/content-video-watch/DTOs/IContentVideoWatchDTO.ts) | Eventos contêm identificadores e contexto. Descrever atenção estimada, reprodução, repetição, conclusão, origens e cliques; não chamar o banco de anônimo. |
| Identidade analítica e região | [Armazenamento do navegador](/Users/rezende/Desktop/lectum-ecosystem/frontend/src/components/analytics/storage.ts), [captura](/Users/rezende/Desktop/lectum-ecosystem/frontend/src/components/analytics/location-capture.tsx), [resolução de localização](/Users/rezende/Desktop/lectum-ecosystem/backend/src/modules/api/public/analytics/location-capture/use-cases/services.ts) e [dados persistíveis](/Users/rezende/Desktop/lectum-ecosystem/backend/src/modules/api/public/analytics/location-capture/DTOs/ILocationCaptureDTO.ts) | Visitante persistente, sessão e associação à conta; cidade/UF/país, sem coordenadas/IP bruto no registro de localização. IP pode ser enviado a prestador externo. Não generalizar ausência de IP a toda a infraestrutura. |
| Painel pago e histórico gratuito | [Consulta de indicadores](/Users/rezende/Desktop/lectum-ecosystem/backend/src/modules/api/private/psychologist/analytics/repositories/queries/PsychologistAnalyticsSummaryRepository.ts), [serviço](/Users/rezende/Desktop/lectum-ecosystem/backend/src/modules/api/private/psychologist/analytics/use-cases/services.ts) e [interface do painel](/Users/rezende/Desktop/lectum-ecosystem/frontend/src/app/app/professional/analytics/logic.tsx) | Cálculo do histórico e modo `full`/`preview`; a UI condiciona exibição completa ao benefício. Não se certificou isolamento de dados ou o contrato financeiro do painel. Não confundir histórico consultável com prazo aprovado de guarda. |
| Mídias e derivados | Referências a Stream/R2 na política de packages, [armazenamento de perfil](/Users/rezende/Desktop/lectum-ecosystem/backend/src/modules/profile-media/public-storage.ts), [contratos dos jobs](/Users/rezende/Desktop/lectum-ecosystem/video/src/domain/jobs/contracts.ts) e [render social](/Users/rezende/Desktop/lectum-ecosystem/video/src/infra/ffmpeg/social-share.ts) | Stream, R2 e FFmpeg/ffprobe com compressão e composição de texto/identificação em arquivos. Ferramenta FFmpeg não é empresa receptora. Não prometer desaparecimento de arquivos já exportados. |
| Exclusão e autenticação | [Serviço de conta](/Users/rezende/Desktop/lectum-ecosystem/backend/src/modules/api/private/account/use-cases/services.ts) e [interface de exclusão](/Users/rezende/Desktop/lectum-ecosystem/frontend/src/components/account/account-delete-section.tsx) | Há confirmação/reautenticação e impedimento no fluxo automático para assinatura bloqueante. Não afirmar eliminação total ou imediata nem negar canal alternativo de direitos LGPD. |

## 4. Fontes oficiais brasileiras e aplicação

As fontes abaixo foram consultadas nesta execução. Datas de página, notícia e ato normativo são coisas distintas: a data de atualização de uma página não altera, sozinha, a vigência da norma. Guias orientativos não são leis. O jurídico deve reconferir a redação vigente e as decisões aplicáveis antes da publicação, especialmente se esta ocorrer depois da revisão editorial.

### F01 — LGPD

[Lei nº 13.709/2018 — texto compilado, Planalto](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm).

Referências relevantes: arts. 5º e 6º (categorias, finalidade, necessidade e transparência); 7º a 11 (bases, consentimento e dados sensíveis); 14 (menores); 15 a 20 (término e direitos); 33 a 36 (transferências); 37 a 41 (governança/encarregado); 46 a 48 (segurança/incidentes). A consulta foi ao texto compilado, inclusive alterações ali indicadas em 2026, não apenas à publicação original.

Aplicação: separar dado comum de sensível, não usar legítimo interesse para saúde, não equiparar pseudonimização a anonimização, não condicionar direitos a plano. Para acesso e confirmação, distinguir resposta simplificada imediata e declaração completa em até quinze dias; não inventar prazo universal para todos os pedidos. A publicação de informação pelo titular não torna livre seu reaproveitamento para qualquer finalidade.

### F02 — CDC

[Lei nº 8.078/1990 — texto compilado, Planalto](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm).

Referências: arts. 6º, 14, 20, 30, 31, 35, 39, 42, 46 a 49, 51 e 54, conforme o caso. Aplicação: informação antes da contratação, vinculação da oferta, responsabilidade e vedação de cláusulas abusivas; arrependimento de sete dias nas hipóteses do art. 49 e restituição legal. Não presumir exclusão do CDC porque o assinante é psicólogo. A caracterização concreta da relação e o saldo pago no cancelamento exigem análise.

### F03 — Comércio eletrônico

[Decreto nº 7.962/2013, Planalto](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm).

Aplicação: identificação do fornecedor, endereço e contatos, condições da oferta, oportunidade de corrigir erro, confirmação e disponibilização do contrato, atendimento eletrônico e facilitação do arrependimento. O art. 4º prevê confirmação imediata do recebimento de demandas e manifestação em até cinco dias. É referência normativa de atendimento quando aplicável, não prova de um SLA já implementado pela Lectum; validar capacidade operacional antes de anunciar prazos comerciais.

### F04 — Marco Civil da Internet

[Lei nº 12.965/2014, Planalto](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm).

Aplicação: privacidade, sigilo e acesso a registros, especialmente arts. 7º, 10, 15, 16 e 22. A guarda de seis meses do art. 15 tem requisitos de enquadramento e objeto específico; não é prazo genérico para analytics, publicações ou prontuários. Não publicar cláusula que condicione toda remoção ou responsabilidade a ordem judicial sem considerar legislação especial e o entendimento atual do STF.

### F05 — STF: responsabilidade por conteúdo de terceiros

[Tema 987 — portal de repercussão geral](https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=987) e [comunicado oficial sobre os aperfeiçoamentos da tese](https://noticias.stf.jus.br/postsnoticias/plataformas-terao-60-dias-para-implementar-medidas-estruturais-decide-stf/).

A indexação oficial consultada registra desdobramentos em 2026, inclusive aperfeiçoamentos e trânsito indicado no Tema 987. Por isso, não foi tratada a notícia de junho de 2025 como retrato definitivo. **Limitação:** as aberturas diretas dessas páginas retornaram erro de acesso; os resultados indexados do próprio STF permitiram identificar os atos, mas não certificar leitura integral dos acórdãos e embargos. A confirmação integral da tese vigente dos Temas 987/533 e do enquadramento da Lectum é pendência jurídica explícita. A minuta adotou deveres de análise e preservou responsabilidade legal sem reproduzir uma tese detalhada não conferida integralmente.

### F06 — ANPD: cookies e tecnologias similares

[Guia orientativo de cookies e proteção de dados pessoais — ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais).

Foi consultado também o PDF ligado pela página: guia de outubro de 2022, versão 1.0; não confundir a atualização da página em 2025 com uma nova edição do guia. Aplicação: inventário, necessidade, transparência e escolhas; localStorage/sessionStorage de analytics não escapam da avaliação por não serem cookies HTTP. Não anunciar “somente essenciais” nem uma central ainda inexistente.

### F07 — ANPD: legítimo interesse

[Guia orientativo de legítimo interesse — ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_legitimo_interesse.pdf) e [apresentação oficial do guia](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-lanca-guia-orientativo-sobre-legitimo-interesse).

Aplicação: finalidade, necessidade, balanceamento e salvaguardas, considerando expectativas do titular e dados não sensíveis. A utilidade comercial das métricas não basta. A hipótese não deve ser aplicada a dados de saúde inferidos para evitar implementar consentimento ou redesenhar a coleta.

### F08 — ANPD: transferências internacionais

[Resolução CD/ANPD nº 19/2024 — texto e retificação de 18/08/2025 indicados pela ANPD](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024).

Aplicação: avaliar o fluxo, os agentes, a base do tratamento e o mecanismo válido; dar transparência sobre finalidade, duração e países. O art. 17 trata de informações públicas e acesso às cláusulas, inclusive prazo de quinze dias nas condições previstas. O prazo transitório de doze meses previsto na resolução não é nova carência a contar da publicação das minutas da Lectum. A página oficial consultada indica retificação e atualização em setembro de 2026.

[Índice oficial de regulamentações da ANPD](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd): consultado para status; registra a Resolução nº 32/2026 sobre adequação da União Europeia. Sua existência não prova adequação de todos os países ou mecanismos de qualquer fornecedor. Verificar a operação concreta e eventual transferência posterior; não presumir contratação de cláusulas já assinadas.

### F09 — ANPD: encarregado

[Resolução CD/ANPD nº 18/2024 — publicação do DOU preservada pelo Ministério da Justiça](https://dspace.mj.gov.br/bitstream/1/13151/2/RES_ANPD_2024_18.pdf).

Aplicação: ato formal de indicação, contato e identidade públicos, atuação, recursos e responsabilidades. Se for encarregado pessoa jurídica, observar também identificação da pessoa natural responsável nos termos do regulamento. Não preencher um nome inventado nem declarar dispensa por porte sem validar todos os requisitos. Eventual dispensa não elimina canal de comunicação com titulares. Status vigente conferido no índice oficial da ANPD.

### F10 — ANPD: incidentes

[Orientações oficiais de comunicação de incidente de segurança](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis), baseadas na Resolução CD/ANPD nº 15/2024, indicada como vigente no índice oficial.

Aplicação: comunicação à ANPD **e** aos titulares quando presentes os requisitos, com regra geral de três dias úteis e disciplina própria de complementação. A página consultada estava atualizada em agosto de 2026. Não confundir incidente com qualquer erro de sistema; não inventar dispensa ou prazo ampliado para a empresa. Responsável operacional e processo precisam ser aprovados.

### F11 — CFP: Código de Ética

[Código de Ética Profissional do Psicólogo — Resolução CFP nº 010/2005, publicação oficial](https://site.cfp.org.br/wp-content/uploads/2012/07/codigo_etica1.pdf).

Aplicação: sigilo e informação profissional, especialmente arts. 9º e 10, 18 a 20; nome/registro, qualificação verdadeira, limites de publicidade, preço como propaganda e promessas de resultado. Rever avaliações, rankings, depoimentos, vídeos e arquivos sociais sem presumir que autorização de imagem afasta deveres éticos. Não confundir mensalidade do software com preço de sessão clínica.

### F12 — CFP: exercício por tecnologias digitais

[Resolução CFP nº 9, de 18/07/2024 — publicação oficial no DOU de 30/07/2024, p. 167](https://pesquisa.in.gov.br/imprensa/servlet/INPDFViewer?captchafield=firstAccess&data=30%2F07%2F2024&jornal=515&pagina=167) e [orientação oficial do CRP-12 sobre atendimento on-line](https://transparencia.cfp.org.br/crp12/pergunta-frequente/atendimentopsicologicoonline/).

Aplicação: deveres no exercício profissional mediado por TDICs e responsabilidade técnica do psicólogo; a orientação oficial informa a revogação das regras anteriores e a desnecessidade do antigo cadastro e-Psi. Não inventar selo e-Psi nem tratar consulta de registro como certificação de identidade. **Limitação:** a publicação do DOU foi localizada e lida no texto indexado oficial, mas sua abertura integral no visualizador falhou; a leitura integral da resolução e a conferência de normas complementares devem integrar a revisão final. A minuta não prescreve protocolo clínico nem reproduz detalhadamente artigos não conferidos.

### F13 — Proteção de menores em ambientes digitais

[Lei nº 15.211/2025 — Estatuto Digital da Criança e do Adolescente, Planalto](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15211.htm).

Aplicação: avaliar acesso provável e proteção mesmo em produto declarado adulto. A decisão de contas 18+ não é evidência de aferição etária suficiente nem afasta automaticamente a lei. Jurídico deve conferir enquadramento, vigência, regulamentos ligados ao texto oficial e efeitos sobre páginas públicas, comunidades e autodeclaração. Esta subtarefa não implementa admissão de menores nem coleta documental de idade.

## 5. Lista objetiva de informações a solicitar ao usuário e aos responsáveis

Não procurar esses dados em credenciais ou bases do ambiente. Os tokens podem permanecer no Admin enquanto o documento for rascunho. Para publicar, todos precisam ser resolvidos com informação real ou substituídos por explicação factual juridicamente aprovada quando a operação não se aplicar.

### 5.1 Identificação, contatos e vigência

| Token | Informação necessária e quem confirma |
|---|---|
| `[RAZAO_SOCIAL]` | Nome empresarial exato da entidade responsável pelo serviço e controladora das operações próprias; usuário/representante legal. Se a estrutura jurídica real não for pessoa jurídica, revisar a qualificação inteira, em vez de inventar CNPJ. |
| `[CNPJ]` | Número da entidade identificada; representante legal. Não substituir por documento pessoal sem nova revisão da qualificação. |
| `[ENDERECO_EMPRESARIAL]` | Endereço empresarial completo para identificação e atendimento; representante legal. Não usar endereço residencial de terceiro ou do workspace. |
| `[EMAIL_SUPORTE]` | Canal real que receberá cadastro, assinatura, cancelamento, arrependimento e reclamações; operação. |
| `[EMAIL_PRIVACIDADE]` | Canal real de direitos, dúvidas e incidentes, acessível sem assinatura e sem conta; operação/encarregado. |
| `[EMAIL_DENUNCIAS]` | Canal real acessível a usuários e não usuários para denúncias de conteúdo, identidade e exposição indevida; operação. Pode coincidir com outro canal se a organização confirmar a capacidade de triagem. |
| `[IDENTIFICACAO_ENCARREGADO]` | Identificação pública de encarregado formalmente designado; representante legal/jurídico. Se houver hipótese válida de dispensa, revisar a cláusula e manter canal de titulares, com fundamento registrado pela tarefa principal. |
| `[CONTATO_ENCARREGADO]` | Meio efetivo e público de contato; não presumir que qualquer e-mail genérico pertence a um encarregado nomeado. |
| `[VERSAO_TERMOS]`, `[VERSAO_POLITICA]` | Identificadores aprovados de documentos; não são versão dos manifests nem um aceite legado. |
| `[DATA_ATUALIZACAO_TERMOS]`, `[DATA_ATUALIZACAO_POLITICA]` | Data real da revisão aprovada, distinta da preparação editorial dos rascunhos. |
| `[DATA_VIGENCIA_TERMOS]`, `[DATA_VIGENCIA_POLITICA]` | Data de vigência deliberada na publicação final, sem efeito retroativo presumido. |

A idade mínima **não é mais campo a perguntar**: 18 anos completos por autodeclaração foi confirmado. Continua pendente somente a validação de implementação e da suficiência jurídica da medida.

### 5.2 Conservação e duração

Para cada prazo, confirmar categoria, finalidade, base, marco inicial, encerramento, preservação por litígio, mecanismo de eliminação/anonimização e execução nos fornecedores. Não preencher todos com o mesmo número.

| Token | Decisão necessária |
|---|---|
| `[PRAZO_RETENCAO_RESIDUAL_CONTA]` | Dados que permanecem após encerramento, por quanto tempo e para qual obrigação ou controvérsia. |
| `[PRAZO_GUARDA_VERIFICACAO]` | Histórico de consulta, resultados e provas mínimas de associação ao perfil, incluindo descarte de dados excessivos. |
| `[PRAZO_DESCARTE_MIDIAS_TEMPORARIAS]` | Janelas de arquivos de trabalho, uploads incompletos, renderizações e exportações; distinguir mídia publicada. |
| `[PRAZO_RETENCAO_ANALYTICS_IDENTIFICAVEL]` | Janela de eventos vinculados a visitante/sessão/conta, inclusive profissional gratuito, e destino ao final. |
| `[DURACAO_IDENTIFICADORES_ANALYTICS]` | Expiração efetiva dos identificadores persistentes no navegador e alinhamento com retenção do backend. |
| `[PRAZO_GUARDA_SEGURANCA]` | Logs/evidências fora da guarda específica do Marco Civil; não misturar com analytics de produto. |
| `[PRAZO_GUARDA_FINANCEIRA]` | Prazos por espécie de documento, conforme obrigações fiscais/contábeis e defesa de direitos; responsável contábil/jurídico. |
| `[PRAZO_GUARDA_SUPORTE]` | Atendimento, denúncias, anexos e prova do exercício de direitos; separar dados sensíveis desnecessários. |
| `[PRAZO_GUARDA_ACEITES]` | Conservação proporcional das manifestações reais e das versões apresentadas; não perpetuar todos os dados de conta. |
| `[CICLO_DESCARTE_BACKUPS]` | Ciclo real de expiração, restrição de acesso e efeitos da restauração sobre dados já eliminados. |

Os seis meses do Marco Civil, sete dias do arrependimento, quinze dias das hipóteses específicas de acesso/cláusulas e três dias úteis de incidente possuem fontes nas seções F01–F10. São deveres com condições próprias, não prazos comerciais inventados ou comprovação de que a operação já os cumpre.

### 5.3 Fornecedores e fluxos internacionais

Solicitar inventário contratual confirmado: entidade jurídica do prestador, serviço e finalidade, países de armazenamento/acesso, duração, suboperadores, papéis, medidas de segurança, forma de exclusão, contatos e mecanismo jurídico quando houver transferência. A consulta deve ocorrer por responsável autorizado, sem revelar credenciais.

Os conjuntos abaixo aparecem na Política; cada token requer informação própria:

- `[PAISES_GOOGLE]`, `[DURACAO_TRATAMENTO_GOOGLE]`, `[MECANISMO_E_AGENTES_GOOGLE]`;
- `[PAISES_MERCADO_PAGO]`, `[DURACAO_TRATAMENTO_MERCADO_PAGO]`, `[MECANISMO_E_AGENTES_MERCADO_PAGO]`;
- `[PAISES_INFOSIMPLES]`, `[DURACAO_TRATAMENTO_INFOSIMPLES]`, `[MECANISMO_E_AGENTES_INFOSIMPLES]`;
- `[PAISES_CLOUDFLARE]`, `[DURACAO_TRATAMENTO_CLOUDFLARE]`, `[MECANISMO_E_AGENTES_CLOUDFLARE]`;
- `[PAISES_INFRAESTRUTURA]`, `[DURACAO_TRATAMENTO_INFRAESTRUTURA]`, `[MECANISMO_E_AGENTES_INFRAESTRUTURA]`;
- `[PAISES_DEMAIS_PRESTADORES]`, `[DURACAO_TRATAMENTO_DEMAIS_PRESTADORES]`, `[MECANISMO_E_AGENTES_DEMAIS_PRESTADORES]`.

O último grupo precisa ser desdobrado por fornecedor efetivo antes de publicar, especialmente localização por IP, e-mail, notificações e observabilidade. Os grupos são instrumentos de revisão, não autorização para omitir destinos reais. Não foram consultadas políticas comerciais de terceiros não oficiais como fonte jurídica nem validados seus contratos nesta execução.

## 6. Decisões jurídicas e operacionais pendentes — sem impedir rascunhos

| Pendência | Aprovação/evidência necessária antes do efeito correspondente |
|---|---|
| Responsável e encarregado | Qualificação real, canais operacionais, indicação formal ou dispensa fundamentada e revisão do texto. Não tratar endereço/e-mail em branco como falta impeditiva à edição de rascunho. |
| Cancelamento e saldo pago | Produto, financeiro e jurídico decidirem como tratar o saldo quando o acesso pago cessa imediatamente; compatibilizar oferta, confirmação de cancelamento, restituição legal e eventual ajuste operacional. Não inventar acesso até fim de ciclo nem política de “sem reembolso”. |
| CDC e atendimento | Qualificação concreta do contrato com profissionais, arrependimento, confirmação, comprovação e solução de reclamações; operacionalizar obrigações antes de publicá-las como recurso disponível. |
| Dados sensíveis em comunidade | Aprovar o que pode ser publicado, base específica, forma de manifestação quando necessária, retirada e tratamento de terceiros. “Aceitar termos” não é consentimento específico de saúde. |
| Analytics, inferências e métricas pagas | Mapear cada evento e vínculo à conta; diferenciar dados comuns e informações que revelem saúde; aprovar base, finalidade, teste de legítimo interesse quando cabível, avaliação de impacto/risco e minimização. A base não deriva do plano pago e a guarda no gratuito não é infinita. |
| Consentimento e cookies | Inventário das tecnologias realmente ativas, controles aplicáveis de recusa/revogação e capacidade de impedir tratamento quando necessário. Não prometer banner/central ainda não implementados. |
| Retenção e eliminação | Aprovar tabela concreta, verificar disponibilidade de descarte/anonimização e atendimento nos destinatários. Não confundir exclusão lógica com eliminação nem tela com banco. |
| Transferências e fornecedores | Conferir contratos, entidades, destinos, suboperadores e mecanismos conforme F08. Não inferir que Stream/R2 ou outra marca armazena exclusivamente no Brasil. |
| Selo e apresentação profissional | Validar texto/visibilidade do limite do selo, correção de associação indevida, publicidade, notas, avaliações, rankings e divulgação de vídeos segundo CFP/CRP. Avaliar com jurídico eventual enquadramento da atividade da empresa perante o Conselho, sem afirmar obrigação ou dispensa não examinada. |
| Conteúdo e moderação | Confirmar canais externos, critérios, medidas urgentes, comunicação e contestação; analisar entendimento atual STF e normas especiais. Não prometer resposta clínica ou monitoramento permanente. |
| 18+ por autodeclaração | Confirmar fluxo afirmativo e distinção entre idade da conta e público de atendimento; analisar acesso provável a páginas públicas e ECA Digital. A decisão de produto está tomada; suficiência jurídica não certificada. |
| Arquivos para compartilhamento | Validar limites da licença, autorização para texto/mídia/imagem de terceiros, deveres de sigilo, identificação profissional e consequências da exportação; não supor que um botão autoriza qualquer uso. |
| Direitos e incidentes | Responsáveis, canais, confirmação proporcional de identidade, prazos legais e resposta a incidentes; não presumir que delegação a fornecedor encerra o dever da Lectum. |

Nenhuma dessas pendências impede salvar, importar ou testar a **interface interna de rascunhos**, conforme autorização do usuário. Elas impedem declarar aprovação, publicar documentos como vigentes ou ativar operações que dependam de condições ainda não cumpridas. Usar homologação não torna fictícios os dados eventualmente existentes nesse ambiente.

## 7. Handoff para versionamento e aceite real — tarefa principal

Diretrizes documentais, sem implementação ou definição de schema nesta subtarefa:

1. Importar apenas os dois textos longos v0.2 como rascunhos editáveis no Admin de homologação. Não selecionar documento ativo, data de vigência efetiva, publicação ou revisão jurídica automaticamente.
2. Permitir salvar e localizar tokens como `[CNPJ]`, sem exigir preenchimento para trabalhar na interface. A prévia deve ser identificada como interna e sem efeito de aceite.
3. Distinguir revisão editorial, aprovação jurídica, publicação/vigência e manifestação do usuário. Um estado não deve implicar automaticamente os demais.
4. Publicar somente após preenchimento factual, correspondência com o produto e revisão jurídica registrada por responsável autorizado. Mudança de conteúdo aprovado deve retornar à revisão cabível, não herdar aprovação indiscriminadamente.
5. Preservar a versão exata de cada documento apresentado e o histórico de versões publicadas. Editar rascunho não pode reescrever o texto de um aceite anterior.
6. Registrar apenas manifestação real, com documento/versão, pessoa autenticada, data/hora e contexto minimamente necessário. Distinguir Termos, ciência da Política, declaração de 18 anos e consentimentos específicos. Não reaproveitar manifestação para finalidade diferente.
7. Não converter flags ou versões provisórias do cadastro, migrações ou ações de administrador em aceite de minutas. Não preencher retrospectivamente consentimentos que não ocorreram.
8. Solicitar nova manifestação quando juridicamente necessária e comunicar mudanças materiais. Recusa deve preservar suporte, cancelamento e direitos de dados, sem exigir assinatura paga.
9. Manter rascunhos e aceites separados por ambiente; nenhum ensaio interno deve gerar prova contratual atribuída a usuário real sem ação dele. Esta orientação não autoriza criar dados pessoais fictícios permanentes, reutilizar credenciais ou manipular contas.
10. A publicação real das minutas não está autorizada nesta entrega. A autorização atual é para preparar documentos e a interface interna; a execução principal deve manter explícitos os critérios finais pendentes.

### Critérios da etapa de rascunhos/interface — não certificados nesta subtarefa

- [ ] Rascunhos v0.2 importados apenas em homologação, sem publicação ou aceite automático.
- [ ] Admin permite edição com tokens e apresenta aviso claro de rascunho.
- [ ] Publicação exige eliminar pendências factuais e registrar revisão jurídica.
- [ ] Edição de rascunho não altera versão publicada nem aceite histórico.
- [ ] Comportamento da interface e dos registros validado pela tarefa principal, sem alegação de revisão jurídica executada por código.

### Critérios para futura publicação jurídica — continuam pendentes

- [ ] Todos os tokens resolvidos com fatos ou explicação juridicamente aprovada.
- [ ] Condições comerciais e cancelamento compatíveis com cobrança, acesso e restituição.
- [ ] Bases, controles de dados sensíveis, analytics e cookies aprovados e compatíveis com a prática.
- [ ] Inventário de fornecedores, destinos e mecanismos de transferência confirmado.
- [ ] Retenção, descarte, atendimento de direitos e incidentes confirmados operacionalmente.
- [ ] Fluxo 18+ e sua avaliação jurídica concluídos, sem equiparar autodeclaração a prova documental.
- [ ] Normas CFP/CRP e tese atual do STF conferidas pelo jurídico, inclusive as fontes com limitações de leitura integral nesta execução.
- [ ] Conteúdo aprovado por responsável jurídico identificado, com data e escopo reais da revisão.
- [ ] Versões e datas de vigência deliberadas; textos internos de rascunho removidos somente nessa etapa.
- [ ] Publicação e coleta de manifestações reais autorizadas em etapa própria, após validações aplicáveis.

## 8. Resumo das alterações em relação às minutas iniciais

- Retirada a equiparação de navegar ou continuar usando a concordância automática com novos documentos.
- Separadas concordância contratual, ciência de privacidade, declaração etária e consentimento por finalidade.
- Incluída a decisão confirmada de 18 anos por autodeclaração, sem estender a proibição ao público que um profissional pode atender fora da conta.
- Esclarecido o limite do selo e da consulta de registro, sem inventar validação documental ou biométrica.
- Detalhados marketplace, comunidades, avaliações, contato externo, recorrência mensal e cancelamento observado.
- Incluídos Stream/R2, processamento FFmpeg/ffprobe e arquivos derivados para compartilhamento, sem prometer teleconsulta ou guarda de prontuário.
- Descritos eventos de analytics, vínculos de visitante/sessão/conta, atenção, reprodução e métricas mantidas durante o plano gratuito com painel pago.
- Corrigido o uso de “anônimo” para identificadores relacionáveis; limitado o enunciado sobre ausência de IP bruto ao registro de localização.
- Excluídas exonerações genéricas de responsabilidade e garantias de conformidade; preservados CDC, LGPD e deveres de moderação.
- Criado inventário objetivo de fatos/prazos/contratos a confirmar, com permissão expressa para manter os campos em rascunhos de homologação.

## 9. Validação documental desta entrega

A revisão consiste em consistência entre os textos, enumeração dos tokens, confronto com trechos de código pertinentes e consulta normativa oficial. Não houve validação jurídica final, uso do Admin, teste de consentimento, teste de provider, build ou smoke test. Esses testes não foram simulados: o escopo executado não alterou aplicações.

Validação local executada: `git diff --check -- _product/legal` sem apontamentos no diff rastreado; conferência dos cinco arquivos entregues em UTF-8, das referências locais existentes e dos domínios oficiais das citações; verificação de que os **42 tokens distintos** estão catalogados neste checklist e de que a idade confirmada não permanece como placeholder. A existência de um link local foi verificada sem ler seu conteúdo adicional. A checagem de domínio não significa que todas as fontes foram lidas integralmente: as limitações das seções F05 e F12 continuam expressas.

As aprovações acima permanecem abertas de propósito. A conclusão da redação não significa conclusão da task principal nem autorização de deploy.
