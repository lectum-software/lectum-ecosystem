# ADR-0567 - Header compacto na comunidade

## Status

Aceito.

## Contexto

O usuario pediu a mesma passagem entre header principal e identidade compacta
ja utilizada no perfil do psicologo, agora com seguir comunidade.

## Decisao

Compor o CommunityHeader existente com uma barra sticky de altura visual 4rem,
sem acrescentar altura ao fluxo. A margem inferior compensa apenas o gap-4 do
grid da pagina. IntersectionObserver observa a linha de avatar/seguir; a barra
aparece quando essa linha sai pelo topo, em qualquer sentido de rolagem, como
no perfil. Nao introduzir listener de direcao de scroll ou portal fixed.

Reutilizar CommunityLogo com tamanho compacto e CommunityFollowButton hero.
Ambos os botoes recebem following, membershipPending e onToggleFollow da
mesma view, preservando mutacoes, bloqueio de repeticao e conversao de visitantes.
Barra oculta usa aria-hidden e inert. O wrapper e desmontado durante a busca
contextual e reiniciado por slug; nenhum estado de participacao e duplicado.

## Consequencias

Layout e identidade consistentes com o perfil, sem alterar o fluxo de seguir.
Validar limites de scroll, nomes longos, busca, estados de participacao e telas
estreitas. Sem dependencia, env, migration ou mudanca de backend. Publicacao
somente apos autorizacao; implementacao e validacao locais.
