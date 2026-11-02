# ADR-0672 - Integridade da ativacao dos documentos legais

Estado: implementacao de codigo validada localmente; rollout autorizado pendente.

## Decisao

Cadastro legado sem IDs permanece compativel durante o rollout, inclusive com
documentos publicados. Nao cria evidencia de aceite; a modal legal solicita os
documentos pendentes apos autenticacao. Quando IDs sao enviados, versoes, hash e
declaracoes sao validados transacionalmente, sem criar aceite parcial.

Notas [PENDENTE: ...] e avisos Markdown de minuta/rascunho/clausula proposta
impedem publicacao tanto na API quanto no Admin. Links normais permanecem validos.
Remover um marcador nao comprova revisao juridica: a confirmacao administrativa
existente continua necessaria e nao sera preenchida por presumida aprovacao.

## Consequencias

Sem dependencia ou variavel nova; a autorizacao profissional exige a expansao
aditiva descrita abaixo. Antes de ativar os documentos,
coordenar clientes e API para nao rejeitar o cadastro enviado por clientes antigos.
Rollback de codigo nao apaga documentos publicados ou aceites existentes.
Autorizacao promocional nao pode ser inferida de simples ciencia da Politica.

## Cadastro profissional

Por decisao posterior do responsavel, o checkbox usa somente "Li e aceito os
Termos de Uso e a Politica de Privacidade", com links para as versoes. A clausula
promocional fica na Politica, sem paragrafo adicional no formulario.
Pacientes nao podem registrar a autorizacao profissional na API.
Email e estado OAuth Google transportam promotional_authorized explicitamente.
O servidor verifica o papel persistido, nao apenas o papel enviado no formulario.

O campo action existente em legal_acceptance registra
privacy_acknowledge_and_promotional_authorize somente para essa manifestacao
explicita; versao, hash e accepted_at permanecem vinculados ao documento.
O campo ausente em clientes antigos registra somente ciencia, nunca autorizacao
promocional. O registro tecnico nao equivale a um checkbox separado.
Ha migration aditiva para ampliar a constraint de action e o trigger existente;
ela preserva as duas acoes anteriores e valida o papel profissional no banco.
Nao ha backfill ou conversao de privacy_acknowledge historico.
Reaceite idempotente nao altera acao ou data ja registradas. O endpoint de ciencia
de usuarios existentes nao concede autorizacao promocional automaticamente.
Este registro nao presume validade juridica da obrigatoriedade nem implementa
gestao de campanhas ou revogacao automatica; pedidos continuam pelo suporte.

Rollout: aplicar migration no Backend antes do novo Frontend. Sem variavel nova.
Constraint e trigger anteriores recusam a nova acao; nao enviar o novo cadastro
antes da expansao. O codigo anterior continua lendo as evidencias; rollback nao
deve restaurar a constraint restritiva nem apagar as novas evidencias.

Maioridade: status autenticado informa evidencia anterior em legal_acceptance ou
adult_declaration do cadastro legado (minimum_age=18, source=registration).
Somente essa evidencia permite omitir a declaracao nas atualizacoes; campos de
aceite dos documentos continuam desmarcados. Ausencia do campo na API antiga
mantem a declaracao, sem inferir maioridade de perfil ou data de nascimento.

Paginas legais sem logo/login, links de rodape ou permalink visivel. URLs
versionadas e historico permanecem. Os documentos v1 ja publicados em producao
sao preservados; minutas locais e templates do Admin nao sao publicados no banco.
