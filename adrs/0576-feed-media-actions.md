# ADR-0576 - Midia antes dos controles no post profissional do feed

## Status

Aceito.

## Contexto

O PostCard compartilhado por inicio e comunidade colocava a barra de interacoes
antes da midia em todos os casos. O usuario pede controles depois do anexo nos
posts de psicologos, sem alterar a disposicao de perguntas de pacientes.

## Decisao

Compor o bloco de midia existente uma vez e posiciona-lo antes ou depois da
unica CommunityActionBar conforme autor psicologo e presenca de anexo.
Usar ordenacao real do DOM, nao CSS order: a sequencia de foco acompanha a
sequencia visual. Manter CTA unido a midia e os handlers originais intactos.

## Consequencias

Video, imagem e carrossel seguem a mesma regra. Pacientes com resposta
profissional e profissionais sem midia mantem a ordem anterior. Perfis e
Minhas Publicacoes ja usam midia antes da barra; nao precisam mudar.
Sem API, migration, env ou dependencia. Testar markup por matriz e geometria
dos feeds reais no browser, alem da regressao de controles existentes.
