# Documentos legais — Lectum

Este diretório guarda minutas para revisão jurídica, não documentos automaticamente publicados ou vigentes.

## Status

As minutas editoriais atuais são **v0.2**, preparadas em **12/09/2026**, e permanecem **RASCUNHOS, sem aprovação jurídica e sem efeito de aceite**.

O usuário autorizou importar e editar esses textos **somente como rascunhos no Admin de homologação**, inclusive com tokens legíveis como `[CNPJ]` e `[ENDERECO_EMPRESARIAL]`. Os campos pendentes **não impedem salvar rascunhos nem desenvolver a interface interna**. A publicação real continua condicionada ao preenchimento factual, à correspondência com o produto e ao registro de revisão jurídica.

A política de produto confirmada é **contas somente a partir de 18 anos completos, por autodeclaração, sem verificação documental**. Isso é distinto do público atendido pelos psicólogos em sua atividade profissional. A autodeclaração não comprova documentalmente a idade; a suficiência jurídica desse método exige revisão especializada.

## Arquivos

- [Termos de Serviço v0.2](/Users/rezende/Desktop/lectum-ecosystem/_product/legal/termos-de-servico-v0.2.md): minuta completa atual para revisão e futura importação como rascunho.
- [Política de Privacidade v0.2](/Users/rezende/Desktop/lectum-ecosystem/_product/legal/politica-de-privacidade-v0.2.md): minuta completa atual, incluindo operações de dados, métricas no gratuito, fornecedores, retenção e direitos.
- [Textos curtos legais v0.2](/Users/rezende/Desktop/lectum-ecosystem/_product/legal/textos-curtos-legais-v0.2.md): avisos e manifestações separados, sem autorização para ativá-los automaticamente.
- [Checklist de revisão v0.2](/Users/rezende/Desktop/lectum-ecosystem/_product/legal/revisao-juridica-v0.2.md): evidência estática do produto, fontes oficiais brasileiras, limitações, tokens a preencher, decisões pendentes e handoff documental ao Admin/aceite.

Os arquivos v0.1 foram preservados como histórico editorial. Não são a referência atual para importação; suas copies de aceite amplo e demais redações foram revistas na v0.2.

## Regras

- Permitir campos entre colchetes enquanto o estado for **rascunho**. Não inventar dados empresariais, contatos, países, contratos ou prazos.
- Não publicar versão vigente com tokens, notas internas ou revisão jurídica pendente, nem mesmo por uma importação automática em homologação.
- Salvar/importar não publica, não concede vigência, não comprova consentimento e não altera aceites anteriores.
- `v0.2` é revisão editorial, não versão jurídica vigente ou versão do aplicativo. As versões de documentos apresentados devem ser identificadas e preservadas pela implementação própria.
- A redação foi preparada para revisão especializada, sem atuação como advogado ou promessa de conformidade absoluta. Somente fontes oficiais brasileiras fundamentam a pesquisa jurídica; o checklist registra limitações de acesso integral a algumas fontes.
- Se houver mudança em dados, fornecedores, assinaturas, mídias, analytics, cookies, notificações, IA ou fluxos profissionais, revisar texto e operação antes dos novos efeitos.
- A [TASK-41](/Users/rezende/Desktop/lectum-ecosystem/_product/tasks/TASK-41-paginas-legais-termos-privacidade.md) permanece referência das páginas; a extensão de versionamento, Admin e manifestações explícitas foi implementada na TASK-178 (0.1.369).
- Nenhum documento foi publicado automaticamente. Os testes de publicação/aceite usam apenas entradas explicitamente sem efeito jurídico em banco local descartável; não são documentos ou aceites de homologação/produção.

## Uso no Admin

1. Abra **Configurações → Documentos legais**.
2. Escolha **Nova minuta** do tipo desejado. O editor abre o texto completo com marcadores; ainda não está salvo.
3. Preencha os dados ou salve com marcadores como **rascunho**. A revisão editorial v0.2 não equivale ao número sequencial da versão no banco.
4. Após revisão factual/jurídica, remova os marcadores, confira a leitura e publique por ação explícita.
5. Documento publicado fica imutável. Para alterar, crie uma nova versão a partir dele.
6. Consulte o histórico de aceite/ciência da versão; uma publicação posterior solicita nova manifestação no aplicativo.

## Adoção compatível

- O frontend novo exige declaração de 18 anos nos cadastros manual e Google. Para clientes antigos durante o rollout, a API tolera ausência da nova flag somente enquanto não houver o par Termos/Privacidade publicado; declaração falsa é sempre rejeitada. Publicar o par ativa a exigência de declaração também na API.
- Usuários existentes não recebem evidência presumida. A solicitação de atualização usa documentos publicados e três confirmações desmarcadas. Adiar/fechar/navegar não registra aceite nem bloqueia a gestão de direitos da conta.
- Sem documentos aprovados publicados, as páginas indicam indisponibilidade; essa compatibilidade temporária não é autorização para lançamento em produção.
