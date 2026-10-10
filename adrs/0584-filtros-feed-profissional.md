# ADR-0584 - Filtros do feed profissional

Data: 2026-10-10
Status: aceito; implementado e validado localmente

## Decisao
Paciente e visitante mantem o feed atual, sem chips de ordenacao. Psicologo tem
Oportunidades como padrao e os mesmos chips/periodos das comunidades.
Oportunidades reutiliza integralmente a elegibilidade e ordenacao da comunidade:
janela temporal atual, exclusao de autores psicologos e prioridades existentes.
Em destaque usa exatamente o feed misto atual do paciente (elegibilidade, ranking,
variacao e paginacao), nao o destaque interno da comunidade. Novos, Mais comentados
e Mais uteis aceitam posts sem resposta ou video e usam o ranking das comunidades.
Busca, comunidade selecionada, escopo e navegacao para responder sao preservados.
O backend decide o acesso aos modos pela identidade autenticada, nunca por query role.
Parametros sort/period opcionais; sem sort preserva featured para clientes antigos.

## Implementacao e validacao
Reutilizar CommunityPostSortChips e funcoes existentes de ranking; sem novos packages.
Mobile-first 390px e desktop. Builder/Quick Copy indisponivel; consultado Feed
Comunidade.jpg e capturas atuais enviadas pelo usuario. Testar isolamento por perfil,
paridade de oportunidades, destaque identico, periodos e paginacao.
A tarefa anterior Salvos (ADR-0583) permanece separada, com validacao de video pendente.

## Deploy
Backend e frontend separados; contrato aditivo, sem migration, env ou job novo.
Publicacao futura: backend antes de frontend para disponibilizar os filtros;
frontend antigo continua recebendo destaque. Rollback do frontend nao exige rollback de dados.
Somente localhost nesta execucao; sem push/deploy autorizado.

## Evidencias locais
- Builds backend e frontend aprovados; cinco manifests em 0.1.618, bump unico e check:version aprovado.
- pnpm check executado: guards e frontend aprovados; testes backend inicialmente afetados por env ausente e timeout de subprocesso. Reexecucao de backend/admin/video check aprovada, injetando somente DATABASE_URL e JWT_SECRET_KEY locais, sem NODE_ENV herdado. Nenhum valor registrado.
- Integracao somente leitura com banco de desenvolvimento existente: 9 oportunidades, 10 novos, 1 destaque; paridade de oportunidades em 7 comunidades, 8 combinacoes de periodos, paginacao e isolamento paciente aprovados. Nenhum seed/mock criado.
- Browser localhost: psicologo autenticado, Oportunidades padrao, troca para destaque (mesmo original profissional elegivel), Novos e Mais uteis/Mes (10 itens). Desktop e mobile 390x844 inspecionados; largura do documento 390px sem overflow. Midias ausentes no banco local nao foram usadas como evidencia de reproducao.
- Frontend novo tolera backend antigo: rejeicao 400 dos novos parametros repete consulta legada e oculta chips indisponiveis, sem rotular destaque como oportunidades. Cache inclui identidade/role e query completa.
- Sem push/deploy; sem mudancas de dados ou configuracao dos provedores.
