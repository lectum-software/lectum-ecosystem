Nos estamos desenvolvendo um novo sistema focado em psicólogos e pacientes, estamos utilizando atualmente as pastas:
- /Users/rezende/Desktop/lectum-ecosystem/backend
- /Users/rezende/Desktop/lectum-ecosystem/frontend

Ambas fazem parte de um mesmo repositório para facilitar o desenvolvimento mas não devem ser tratadas como um "monorepo" em produção.

Historicamente, a pasta `/Users/rezende/Desktop/lectum-ecosystem/sample` foi usada apenas como referência inicial de arquitetura. A fonte ativa de execução agora é `_product/tasks/README.md`, `ARCHITECTURE.md`, `PACKAGES.md`, `PROTO-INVENTORY.md` e os ADRs.

# Design e protótipos

Utilize Builder/Quick Copy quando disponível no cliente, com o Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`.

As telas exportadas estão em `/Users/rezende/Desktop/lectum-ecosystem/_product/proto` e devem ser tratadas como referência visual de produto, não como código final nem como qualidade final da aplicação.

# Contexto

- O Sistema frontend e backend conta com uma estrutura inicial base para que não haja perdas de contextos nem elaborações do zero sem fundamentos. Por isso trouxemos de maneira funcional a funcionalidade de login do sistema. Ignorando qualquer conceito de design pre existente.
- De agora em diante o sistema será desenvolvido por não-devs, então tudo deve seguir o principio de spec-driven-development.

# Tarefa

Você deverá popular a pasta /Users/rezende/Desktop/lectum-ecosystem/_product/tasks com as tarefas que vem ser executadas pelo usuário em conjunto com a IA de maneira sequencial. Para isso deveremos seguir algumas regras

## Regras

- Cada task deve ser auto-suficiente, ou seja ela precisa ter total contexto para ser executada separadamente.
- Não há necessidade de quebrar em pequenas tasks pois o usuário não é desenvolvedor para validar o processo gradual, ele consegue apenas vem em tela de a execução foi concluída e funcional 
- As tasks nunca devem utilizar mocks em nenhum momento, o usuário não saberá distinguir isso em ambiente de produção. Portanto caso precisa de um requisito pré-execução, comunique o usuario sempre antes de executar a task.
- Uma skill/agente executor das tarefas deve ser configurado (uma única vez) após isso o usuário utilizará desse mecanismo para desenvolver as próximas tarefas.
- Cada task dve contar com critérios de aceite bem definidos, pois o a própria IA deverá marcar de [] para [x] cada um dos critérios, quando concluídos.
- As primeiras tasks devem fazer referencia ao setup do projeto em termos de design, o frontend que temos hoje não é o ideal e foge totalmente dos padrões
- A história do produto esta descrita em: /Users/rezende/Desktop/lectum-ecosystem/_product/Fluxogramas do Produto.pdf
/Users/rezende/Desktop/lectum-ecosystem/_product/Lectum PRD.pdf. Utilize para entender o fluxo.
- É recomendado que as tasks sigam o mesmo nome da tela exportada/protótipo, assim o usuário que está desenvolvendo consegue se situar de qual tela será utilizada.
- Ações pendentes do usuário como por exemplo: gateway de pagamento, bucket de armazenamento, devem estar em uma primeira task pós design (apenas uma). Onde o usuário devera registrar suas decisões. Nesse caso a tarefa como implementação de pagamento deverá ser agnostica ao projeto pois assim não ficamos presos a decisÕes
- Utilize sempre Builder/protótipos exportados como base visual
- Caso necessário utilize o conceito de épico/task, assim você poderá quebrar em arquvos menores de execução para não prejudicar a janela de contexto da aplicação
- Não utilize a pasta "sample" como referência direta na task, salvo quando a própria task citar expressamente uma referência técnica específica. Ela não deve ser considerada fonte ativa geral do executor.

## Skill/Agent

- A Skill deve realizar o commit a cada task, o usuário é leigo em aspectos técnicos
- O Usuário não saberá executar comandos em terminal
- A skill deve sempre registrar um documento /Users/rezende/Desktop/lectum-ecosystem/adrs para cada decisão e execução importante, mantendo um contexto. O Adr pode e deve fazer vinculo com a task que o deu origem, salvo ADRs que fazem ferencia a correções de bugs e etc

## Referencias

- Existem algumas referencias de descrição para features em: /Users/rezende/Desktop/cms-action/planuze/.tasks. Porém, há muito que melhorar no detalhamento dessas tasks, eu considero que elas possuem uma boa estrutura mas um contexto muito pobre para um usuário não desenvolvedor


# Melhorias

- Após a criação das Tasks, preciso que faça 3 loops de interação sobre as tasks criadas buscando melhorar o contexto e melhorar a descrição. Não apenas crie as tarefas, volte e as verifique.
Nosso foco no momento não é velocidade na criação dos documentos de execução e sim a qualidade e pontencial de execução desacoplado de cada épico
- Antes de iniciar, faça uma busca (web ou similiar), de quais as melhores práticas para um desenvolvimento com IA orientado a tarefas e quais as estruturas para trabalhar com Codex no VSCode seguindo o padrão de pastas e informações de `.codex`. e Enriqueça o máximo possível nosso workspace.
- Caso encontre regras de ouro válidas que não estão listadas, inclua nas tarefas essas diretrizes e arquiteturas.

Data atual para fins de pesquisa 02/06/2026
