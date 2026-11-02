# Documentos legais — Lectum

Este diretório guarda minutas para revisão jurídica, não documentos automaticamente publicados ou vigentes.

## Status

As minutas editoriais atuais são **v0.3**, preparadas em **02/11/2026**, e permanecem **RASCUNHOS locais, sem aprovação jurídica, publicação ou efeito de aceite**. Incorporam os dados empresariais fornecidos e as novas regras de assinatura e exclusão, com pendências explícitas para privacidade e autorização promocional.

A autorização histórica de importação da v0.2 era **somente como rascunho no Admin de homologação**. Em 02/11/2026, o responsável autorizou preparar e publicar os novos documentos e aceite em produção. A captura do Admin confirmou zero documentos. Essa autorização não preenche fatos desconhecidos nem comprova revisão jurídica. A v0.3 ainda não foi importada ou publicada.

A política de produto confirmada é **contas somente a partir de 18 anos completos, por autodeclaração, sem verificação documental**. Isso é distinto do público atendido pelos psicólogos em sua atividade profissional. A autodeclaração não comprova documentalmente a idade; a suficiência jurídica desse método exige revisão especializada.

## Arquivos

- [Termos de Uso v0.3](termos-de-servico-v0.3.md): referência editorial atual.
- [Política de Privacidade v0.3](politica-de-privacidade-v0.3.md): referência editorial atual, com proposta de autorização promocional destacada.
- [Revisão v0.3](revisao-juridica-v0.3.md): comparação de referências, evidências e pendências que impedem publicação.

### Histórico v0.2

Os links abaixo são históricos. As regras de cancelamento e exclusão foram revistas na v0.3. O template local do Admin foi sincronizado com a v0.3, preservando os avisos de rascunho e pendências; o Admin de produção ainda não recebeu essa alteração.

- [Termos de Serviço v0.2](termos-de-servico-v0.2.md): minuta anterior, preservada para comparação.
- [Política de Privacidade v0.2](politica-de-privacidade-v0.2.md): inventário anterior e detalhamento histórico das operações de dados.
- [Textos curtos legais v0.2](textos-curtos-legais-v0.2.md): avisos e manifestações anteriores, ainda sujeitos a atualização.
- [Checklist de revisão v0.2](revisao-juridica-v0.2.md): evidências e fontes da revisão anterior.

Os arquivos v0.1 foram preservados como histórico editorial. Não são a referência atual para importação; suas copies de aceite amplo e demais redações foram revistas na v0.2.

## Regras

- Permitir campos entre colchetes enquanto o estado for **rascunho**. Não inventar dados empresariais, contatos, países, contratos ou prazos.
- Não publicar versão vigente com tokens, notas internas ou revisão jurídica pendente, nem mesmo por uma importação automática em homologação.
- Salvar/importar não publica, não concede vigência, não comprova consentimento e não altera aceites anteriores.
- `v0.3` é revisão editorial, não versão jurídica vigente ou versão do aplicativo. As versões de documentos apresentados devem ser identificadas e preservadas pela implementação própria.
- A redação foi preparada para revisão especializada, sem atuação como advogado ou promessa de conformidade absoluta. Somente fontes oficiais brasileiras fundamentam a pesquisa jurídica; o checklist registra limitações de acesso integral a algumas fontes.
- Se houver mudança em dados, fornecedores, assinaturas, mídias, analytics, cookies, notificações, IA ou fluxos profissionais, revisar texto e operação antes dos novos efeitos.
- A [TASK-41](/Users/rezende/Desktop/lectum-ecosystem/_product/tasks/TASK-41-paginas-legais-termos-privacidade.md) permanece referência das páginas; a extensão de versionamento, Admin e manifestações explícitas foi implementada na TASK-178 (0.1.369).
- Nenhum documento foi publicado automaticamente. Os testes de publicação/aceite usam apenas entradas explicitamente sem efeito jurídico em banco local descartável; não são documentos ou aceites de homologação/produção.

## Uso no Admin

O editor de produção ainda pode oferecer o template v0.2. A TASK-311 sincroniza o template local por `node scripts/sync-legal-draft-templates.mjs`; `--check` verifica divergências. Isso não salva registros no Admin nem publica documentos. Não importar o texto antigo como se fosse a v0.3.

1. Abra **Configurações → Documentos legais**.
2. Escolha **Nova minuta** do tipo desejado. O editor abre o texto completo com marcadores; ainda não está salvo.
3. Use a minuta aprovada e preencha os dados, ou salve com marcadores como **rascunho** quando autorizado. A revisão editorial não equivale ao número sequencial da versão no banco.
4. Após revisão factual/jurídica, remova os marcadores, confira a leitura e publique por ação explícita.
5. Documento publicado fica imutável. Para alterar, crie uma nova versão a partir dele.
6. Consulte o histórico de aceite/ciência da versão; uma publicação posterior solicita nova manifestação no aplicativo.

## Adoção compatível

A TASK-309 foi publicada em produção na versão 0.1.771: exclusão de conteúdo e vigência até o fim do período pago. A TASK-310, ainda local, adiciona confirmação no cadastro e data pessoal por versão. Seu rollout precisa ser coordenado com a ativação do par Termos/Privacidade, evitando tanto cadastro bloqueado por falta de documentos quanto rejeição de clientes antigos. Ciência da Política não comprova, por si, autorização promocional; a TASK-311 implementa localmente seu destaque no checkbox profissional e registro específico por versão, sem concessão retroativa. Ainda não houve deploy desse fluxo.

- O frontend novo exige declaração de 18 anos nos cadastros manual e Google. Para clientes antigos durante o rollout, a API tolera ausência da nova flag somente enquanto não houver o par Termos/Privacidade publicado; declaração falsa é sempre rejeitada. Publicar o par ativa a exigência de declaração também na API.
- Usuários existentes não recebem evidência presumida. A solicitação de atualização usa documentos publicados e três confirmações desmarcadas. Adiar/fechar/navegar não registra aceite nem bloqueia a gestão de direitos da conta.
- Sem documentos aprovados publicados, as páginas indicam indisponibilidade; essa compatibilidade temporária não é autorização para lançamento em produção.
