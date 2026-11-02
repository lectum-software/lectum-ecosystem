# Revisão das minutas v0.3

**Estado em 02/11/2026: rascunhos locais, não publicados e sem aprovação jurídica.** Este registro não substitui assessoria jurídica. A revisão editorial não é a versão do aplicativo nem a numeração de documento no banco.

## Direção adotada

Regra de publicação confirmada pelo responsável: pacientes publicam somente textos; a publicação de mídias é exclusiva de psicólogos com assinatura profissional vigente. As minutas foram ajustadas para não sugerir permissão de publicação de imagens ou vídeos a pacientes. Essa delimitação trata de conteúdo publicado, não elimina a descrição dos dados de avatar/autenticação e não define, por si só, o destino de mídias anteriores após o fim da assinatura.

Por solicitação do responsável, as minutas públicas descrevem fornecedores por categorias, sem listar marcas de infraestrutura, autenticação, conferência ou pagamento. O inventário interno mantém as referências Google, Mercado Pago, InfoSimples e Cloudflare Stream/R2, sujeitas à confirmação da operação efetiva. WhatsApp como canal de contato e Instagram/TikTok/YouTube como destinos da divulgação permanecem explícitos: não são apresentados como inventário técnico de fornecedores.

Segredo de negócio não foi tratado como dispensa geral de transparência. Preservar o atendimento a pedidos sobre destinatários do compartilhamento e validar as divulgações obrigatórias de transferências internacionais antes da publicação. Não prometer que categorias sempre substituem a identificação das entidades. Referências: [ANPD, direitos dos titulares](https://www.gov.br/anpd/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/semana-da-protecao-de-dados-2022/semana-da-protecao-de-dados-pessoais-2022-papel-da-anpd-direitos-dos-titulares-e-funcao-da-ouvidoria) e [Resolução ANPD 19/2024](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024).

Os dois documentos permanecem comuns aos públicos, com regras gerais e trechos explicitamente exclusivos dos psicólogos. Habilitação no CRP, sigilo profissional, assinatura e autorização promocional foram separados; a autorização não abrange conteúdo de pacientes. Esta revisão é documental e não implementa novos controles de autorização ou seleção de mídia no produto.

Textos originais, organizados por decisões do usuário: conta, conteúdo, assinatura, exclusão, dados e direitos. Retiradas repetições, regras de lojas de aplicativos e cláusulas sem relação com o site. Dados empresariais foram fornecidos pelo responsável; não houve consulta cadastral à Receita.

A preferência de não criar garantia comercial adicional foi respeitada. Isso não elimina direitos obrigatórios: quando aplicável à relação, o art. 49 do CDC disciplina arrependimento na contratação à distância. A minuta preserva os direitos legais sem anunciar uma promoção comercial de reembolso. Não publicar cláusula de renúncia nem tratar todo assinante profissional como automaticamente excluído da proteção do consumidor. [CDC, texto atualizado da Câmara](https://www2.camara.leg.br/legin/fed/lei/1990/lei-8078-11-setembro-1990-365086-normaatualizada-pl.html).

## Referências de grandes plataformas

| Referência oficial | Contribuição para a redação | Limitação |
|---|---|---|
| [Meta: explicação sobre seus Termos](https://about.fb.com/news/2019/06/updating-our-terms/) | Separar propriedade do conteúdo e permissão necessária para operar o serviço. | Publicação histórica de 2019, não confirmação integral dos Termos atuais de Facebook ou Instagram. |
| [Termos do Facebook](https://www.facebook.com/legal/terms), [Termos do Instagram](https://help.instagram.com/581066165581870) e [Política da Meta](https://www.facebook.com/privacy/policy/) | Referências solicitadas, a completar antes de afirmar comparação integral. | Acesso retornou login/bloqueio ou erro 429; não foi possível ler o texto vigente por essa ferramenta. |
| [Termos do TikTok, região ROW](https://www.tiktok.com/legal/page/row/terms-of-service/pt-BR) | Estrutura de conta, conduta, conteúdo e encerramento. | A versão retornada indica setembro de 2020. Não foi tratada como prova das regras atuais de todas as regiões; a política brasileira não pôde ser aberta. |
| [Termos do YouTube para o Brasil](https://www.youtube.com/static?gl=BR&hl=pt&template=terms) | Identificar o serviço, obrigações de publicação e limites da licença. | O retorno foi uma tradução inglesa de cortesia datada de 2022; não foram transpostas cláusulas específicas dos EUA. |
| [Política de Privacidade do Google](https://policies.google.com/privacy?hl=pt-BR) | Separar dados, finalidades, compartilhamento, escolhas e conservação. | Não importar o inventário de produtos ou publicidade do Google como se existisse na Lectum. |
| [TikTok: uso comercial de música](https://support.tiktok.com/pt_BR/business-and-creator/creator-and-business-accounts/commercial-use-of-music-on-tiktok?lang=en) | A licença de música de um vídeo precisa ser compatível com publicidade. | Ter um vídeo disponível em uma rede não demonstra autorização para anúncios em outras. |

As referências inspiram a organização, não fornecem um modelo de conformidade para a Lectum. Não copiar licenças ilimitadas, arbitragem estrangeira, regras para menores ou serviços inexistentes.

## Correspondência com a implementação local

| Regra | Evidência no repositório | Consequência |
|---|---|---|
| Exclusão do conteúdo autoral e fila de mídia | TASK-309; backend/src/modules/account-deletion/content.ts e media-cleanup.ts | Não prometer apagamento físico simultâneo em todos os prestadores. Não remover respostas de terceiros junto com o conteúdo do autor. |
| Benefícios até a data final paga | TASK-309 e ADR-0670 | Cancelamento da renovação não equivale a exclusão; retirar a regra antiga de perda imediata do plano. |
| Data e versão da manifestação | TASK-310; frontend/src/components/legal/use-form.tsx | Aceite de Termos, ciência da Política e maioridade não comprovam por si autorização promocional específica. |
| Dados profissionais sensíveis | backend/src/modules/api/private/psychologist/free-profile/repositories/support/profile-response.ts | Raça/cor e religião precisam entrar no inventário e na avaliação de fundamento/necessidade. |
| Localização aproximada | backend/src/modules/api/public/analytics/location-capture/use-cases/services.ts | Endpoint padrão ipapi não comprova contratação ou ativação em produção. Não afirmar coleta de GPS. |
| Conferência profissional | backend/src/modules/api/private/psychologist/cfp/providers/InfoSimplesCfpProvider.ts | Identificar a integração; não equiparar a consulta a certificação clínica ou verificação documental geral. |
| Upload de vídeo de apresentação | backend/src/modules/api/private/psychologist/free-profile/use-cases/services/profile-video-policy.ts | Existe controle por plano. A minuta não promete exclusão ou permanência de todas as modalidades de mídia após expiração sem auditoria específica. |

TASK-309 foi publicada na versão 0.1.771, com Backend e Frontend confirmados em produção. TASK-310 permanece local. A TASK-311 reforça os bloqueios de publicação e cadastro: 18 testes Backend, 13 testes Admin e integração PostgreSQL isolada passaram. O rollout do cadastro e da primeira publicação deve ser coordenado; a interface atual da TASK-310 desabilita cadastro sem o par publicado, e clientes antigos não enviam todas as confirmações.

## Apuração técnica da TASK-311

- `frontend/src/components/analytics/storage.ts`: identificador de visitante em localStorage, sem TTL no mecanismo; identificador de sessão em sessionStorage.
- `frontend/src/utils/analytics-session.ts`: controles de atribuição, localização e associação da sessão; função de reinício remove as chaves de sessão, não os eventos já enviados.
- `backend/src/operations/video-assets/retention-arguments.ts`: operação de inventário/listagem com confirmação de ambiente, não comprovação de um ciclo de descarte de backups.
- Não foi encontrada, nos arquivos consultados, comprovação da região real do servidor ou da configuração atual de backups. Solicitadas capturas restritas a essas configurações, sem segredos.
- Fontes oficiais reconferidas em 02/11/2026: art. 17 da Resolução ANPD 19/2024 para transparência das transferências e guia de cookies da ANPD para escolhas e fundamentos. Não afirmar que o aceite geral resolve cookies ou dados sensíveis.

Os templates locais do Admin agora são gerados a partir das minutas v0.3 por
`scripts/sync-legal-draft-templates.mjs`, mantendo marcadores e bloqueio de publicação.
Produção continua sem documentos cadastrados, conforme captura fornecida.

## Pontos que impedem publicação

### Respostas do responsável

- Armazenamento, localização do banco, existência/ciclo de backups e retenção de métricas: o responsável informou que não sabe. Permanecem desconhecidos; não inferir ausência de backup, retenção ilimitada ou localização pelo código.
- A Lectum não oferece opção de aceitar ou recusar métricas não essenciais. Isso descreve o produto atual, não aprova sua adequação.
- Raça/cor e religião são facultativos e serão mantidos. Não houve autorização para remover os campos; falta validar finalidade, visibilidade, fundamento e controles.
- Aprovado permitir pedidos de interrupção de novos usos promocionais dos vídeos em suporte@lectum.com.br. O atendimento cabe à equipe de suporte; não foram definidos prazo, execução operacional ou efeitos sobre campanhas em andamento.
- A equipe de suporte responde aos pedidos de privacidade e às solicitações de revisão de conteúdo removido. Isso não equivale a designação de encarregado.
- Não há advogado ou assessoria jurídica disponível segundo o responsável. Não registrar a redação como juridicamente aprovada nem substituir essa avaliação por uma declaração de conformidade.

### Verificações ainda necessárias

1. **Canal confirmado; encarregado pendente de avaliação:** em 02/11/2026, o responsável autorizou suporte@lectum.com.br para privacidade e pedidos sobre dados pessoais e informou que não há encarregado designado. A confirmação resolve o contato, não comprova dispensa de indicação. Avaliar o enquadramento aplicável ou providenciar a designação e os contatos antes da publicação.
2. **Armazenamento e transferências:** obter prestadores, países/regiões, finalidades, duração e mecanismos efetivos, incluindo banco, backups, mídia e serviços auxiliares. O responsável não conhece esses dados; conferir configurações e documentos dos serviços, sem expor segredos. A regulamentação exige transparência sobre as transferências, não apenas a frase “podemos armazenar no exterior”. [Resolução ANPD 19/2024](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024).
3. **Prazo e descarte:** definir tabela de retenção, ciclos de backups e limpeza de mídia. Não inventar prazos. Antes do rollout, validar a fila, o namespace e a configuração ACCOUNT_MEDIA_CLEANUP_ENABLED; a tentativa imediata e os retries periódicos têm condições diferentes.
4. **Dados sensíveis e métricas:** aprovar fundamentos por operação e reduzir coleta quando necessário. Consentimento genérico não resolve campos de saúde, raça/cor, religião ou inferências sensíveis. Dados comuns e sensíveis têm regimes diferentes; a ciência da Política não é consentimento universal. [LGPD, especialmente arts. 7º, 8º e 11](https://www2.camara.leg.br/legin/fed/lei/2018/lei-13709-14-agosto-2018-787077-normaatualizada-pl.html).
5. **Autorização promocional:** manter a cláusula na Política, como solicitado, mas apresentar seu objeto com destaque e registrar manifestação correspondente no cadastro profissional. A necessidade de autorização válida não implica autorização por vídeo. A obrigatoriedade como condição de cadastro, o prazo, a retirada e seus efeitos precisam de revisão especializada; não inferir licença perpétua nem aceites retroativos. O fluxo atual registra ciência da Política, não um campo específico dessa autorização. Nenhuma campanha fica autorizada por este rascunho.
6. **Pedidos de exclusão e autorização:** o responsável pediu para não detalhar na redação pública a situação específica de republicações da Lectum. Não foi criada exceção silenciosa que permita manter tudo. Definir internamente o atendimento, a duração e o encerramento da licença e validar a transparência necessária antes de publicar. Revogação, eliminação e conservação legal não são intercambiáveis. [ANPD: direitos e pedidos de titulares](https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes).
7. **Atuação internacional:** acesso ao site não confere autorização clínica universal. Revisar regras relevantes dos países efetivamente atendidos; não prometer conformidade automática em toda a América Latina. [CRP-MG: perguntas sobre atuação no exterior](https://crp04.org.br/orientacoes/perguntas-frequentes/).
8. **Operação e aprovação:** confirmar política de moderação/recurso, segurança e atendimento descritas; revisar suficiência da autodeclaração etária; aprovar redação jurídica e conferir aderência antes de publicação no Admin.

## Atualização técnica e decisão do responsável

Em 02/11/2026, a TASK-311 acrescentou localmente a autorização promocional destacada no mesmo checkbox profissional, vinculada à seção 6 da Política. O cadastro por email e o estado cifrado do Google enviam uma manifestação explícita; o banco registra ação, versão, hash e data, sem converter aceites antigos. Pacientes não podem registrar essa ação. Isso atualiza a descrição do fluxo acima, mas não substitui a revisão da cláusula nem autoriza campanhas antes do rollout.

O responsável optou por não fornecer localização e dados de backups. Não repetir a solicitação nem preencher esses fatos por suposição. As marcas dos fornecedores permanecem fora das minutas públicas. A ausência da informação não foi tratada como comprovação de dispensa das medidas de transparência eventualmente aplicáveis, nem como definição de prazo de retenção.

## Próxima etapa

Apurar tecnicamente armazenamento, backups e retenção, sem pedir ao responsável que invente informações que desconhece. Resolver as decisões operacionais e revisar as duas minutas. Depois, ajustar os textos e, se necessário, implementar o registro específico de autorização. Importação no Admin, publicação de versões, novas manifestações e deploy dependem de autorização própria.

Os arquivos históricos v0.1/v0.2 permanecem preservados. Os textos curtos v0.2 não devem ser usados como substitutos das minutas novas. Os templates locais do Admin acompanham a v0.3 pela TASK-311; o Admin publicado ainda não foi atualizado.
