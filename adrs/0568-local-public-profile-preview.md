# ADR-0568 - Consulta publica de perfis no localhost

## Status

Aceito.

## Contexto

Autores da amostra publica de videos sao identidades locais inativas sem cadastro
completo. Tornar esses perfis publicados exigiria dados privados ausentes e
enfraqueceria regras reais de publicacao. O usuario autorizou consulta somente
leitura dos demais profissionais e edicao da sua conta de desenvolvimento.

## Decisao

Ponte opt-in scripts/local-public-profiles.cjs, instalada exclusivamente pelo
launcher local com NODE_ENV=development, PORT=3001 e IDs proprios explicitos.
Nao e importada pelo servidor de produto nem ativada por configuracao publicada.
Usa GET anonimo para rotas publicamente acessiveis do diretorio, cache curto em
memoria, origem fixa, parametros permitidos e redirect:error. Nunca encaminha
headers do navegador, cookies, sessao, credenciais, PUT, POST ou DELETE externos.

Mapear IDs publicos aos aliases deterministas da amostra, sem copiar cadastros
privados ou habilitar login. Contrato aditivo read_only desabilita acoes de escrita
na UI; a ponte tambem rejeita mutacoes direcionadas as identidades conhecidas.
Nao confundir esse marcador de UX com autorizacao: o backend real preserva todas
as verificacoes. Referencias de midia sao registradas na allowlist do helper local
existente, sem aceitar URL arbitraria do cliente.

IDs proprios nunca sao consultados remotamente. O editor e a publicacao continuam
dependendo do usuario autenticado e dos requisitos reais do banco de desenvolvimento.
Nenhum CPF, CRP, verificacao CFP, pagamento ou consentimento e inventado.

## Consequencias

Consulta depende da disponibilidade das paginas publicas e pode ficar ate um
minuto defasada pelo cache. Erros sao explicitos; nao ha fallback fake. Favoritos,
avaliacoes e WhatsApp dos perfis de consulta nao constituem testes de escrita.
Sem dependencia nova ou migration. O frontend tolera ausencia de read_only em
qualquer backend antigo. Sem push/deploy nesta task. Rollback: retirar a ponte
do launcher local; nenhuma alteracao persistente nos perfis publicos precisa ser
desfeita. A conta propria pode ser editada no formulario normal, nao via ponte.

O helper de midia local usa scripts/local-media-body.cjs para consumir segmentos
e imagens com limite de 24 MiB, mantendo timeout/cancelamento na cadeia aguardada
da requisicao. Isso substitui a ponte Readable.fromWeb/pipeline anterior apos
TimeoutError nao tratado encerrar o processo de desenvolvimento. Nao alterar o
handler fatal do produto nem silenciar falhas globais para manter o processo vivo.
