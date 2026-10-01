# ADR-0546 - Publicar na navegacao mobile e dica compartilhada

Status: Accepted. Data: 2026-10-01. Task: TASK-201.

## Contexto

O FAB sobrepoe videos e a orientacao de publicar depende de autenticacao.
Campanhas podem levar novos visitantes diretamente para uma comunidade.
O usuario aprovou + central, Favoritos dentro do Perfil, barra fixa e manutencao
literal do texto atual da dica, sem repetir entre feed e comunidades.

## Decisao

Reutilizar a acao central do PrivateTemplate em todas as barras mobile, dentro
dos limites da barra. Feed/comunidade fornecem seu handler e destino contextual;
demais paginas usam criacao no feed com o mesmo fluxo de conversao para anonimos.
Manter sidebar/FAB desktop. Remover ocultacao por scroll; navigationHidden continua
sob controle do modo imersivo existente. Barra oculta fica inert.

Favoritos permanece em /app/favoritos, mas aparece no menu do Perfil abaixo dos
posts, para ambos os papeis. A rota passa a selecionar Perfil na barra mobile.

Uma preferencia local da dica e compartilhada entre contextos, com historico
anonimo e historico por conta. Historico anonimo concluido impede repeticao apos
login e e conciliado com has_seen_community_post_tip pela API ja existente.
Conclusao de conta nao marca historico anonimo nem outra conta do navegador.
Persistir ao exibir, dispensar ou ativar criar post, preservando o criterio atual
de exibicao unica. Nao consumir a dica com documento oculto. Falha de storage
mantem deduplicacao em memoria; recarga pode repetir se nenhum storage funcionar.
Psicologos autenticados continuam excluidos desta dica de paciente; papel Redux
antigo sem token nao exclui visitantes anonimos.

## Consequencias

Sem contrato, banco, dependencia ou env nova. O texto nao muda por campanha ou
comunidade. Nao sao implementadas novas campanhas, eventos de marketing ou
politicas de repeticao. Sem login, lembranca limitada ao navegador/origem.
Validacao inclui storage indisponivel, historico por conta, markup/rotas,
mobile/tablet/desktop, rolagem e criacao anonima sem publicar conteudo real.
