# ADR-0727 - Primeiro desenho do perfil

## Decisao

Aplicar line-clamp na biografia recolhida desde o primeiro render. A medicao posterior
determina apenas a necessidade do controle de expansao, nao a altura inicial do texto.
Isso evita a transicao de biografia integral para recolhida que desloca o video abaixo.

Usar o otimizador existente do Next para capa e avatar HTTPS e carregar a capa sem lazy.
Manter o fallback HTTP local e as dimensoes fixas existentes. Nao mudar a politica global
de imagens nem forcar download antecipado do video inteiro para melhorar a nota.

Contraste das acoes usa primary-strong; disponibilidade usa verde escuro no tema claro
e verde claro no escuro. Alteracoes ficam restritas ao perfil.

## Limites

O perfil ainda depende de carregamento cliente e o poster Stream de resolucao assinada.
Nao ha promessa de LCP abaixo de 2,5s ou CLS zerado sem nova medicao.
