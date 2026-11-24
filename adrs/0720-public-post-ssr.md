# ADR-0720 - Hidratar a interface publica de publicacoes

Status: Aceito; validado localmente em 2026-11-24

## Contexto

O HTML inicial contem metadados mas nao o corpo da publicacao nem respostas.
Transcricoes de respostas geram VideoObject sem miniatura e data.

## Decisao

Reutilizar as leituras anonimas existentes e a interface atual com HydrationBoundary
por requisicao. Nao encaminhar credenciais. Nao criar uma copia oculta exclusiva
para buscadores. Manter texto integral e transcricoes dentro dos controles reais.
Dados personalizados devem ser revalidados no navegador.

## Consequencias

A renderizacao inicial depende da API publica. Falhas nao devem publicar conteudo
privado nem produzir metadados inventados. Paginacao e URLs de respostas devem
continuar respeitando os limites e a disponibilidade da API.

URLs estaveis de capa/conteudo revalidam a associacao publica e redirecionam para
a midia autorizada, sem cache. O JSON-LD inclui data real, descricao e miniatura;
campos novos opcionais permitem rollout backend antes de frontend. A primeira
pagina de oito respostas permanece o limite da hidratacao da discussao.

Integracao local usa PostgreSQL real e roteador compilado, com registros temporarios
e chave RSA efemera. Midia do provider deve ser conferida no smoke de producao;
o teste de assinatura local nao demonstra disponibilidade externa.
