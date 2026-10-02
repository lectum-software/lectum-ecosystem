# TASK-211 — Menu desktop de criar post e perfil do psicólogo

Data: 2026-10-02

## Contexto

O perfil do psicólogo não deve exibir a opção "Avaliações feitas", pois essa ação pertence ao fluxo do paciente. No desktop, a ação principal de criar post precisa ganhar presença no menu lateral, alinhada ao botão central do mobile.

## Escopo

- Remover "Avaliações feitas" apenas do menu de perfil do psicólogo.
- Manter a entrada de avaliações do paciente.
- Substituir visualmente o item de Favoritos no menu lateral desktop por "Criar post".
- Reutilizar o mesmo fluxo do botão `+` mobile para abrir a modal sobre a página atual ou acionar conversão quando o usuário não estiver autenticado.

## Fora de escopo

- Alterações de backend, banco, permissões ou contratos de API.
- Remover a página de favoritos, que permanece acessível pelo perfil.

## Validação

- Teste direcionado de navegação/composição de post.
- Check de versionamento.
- Check completo do frontend.
