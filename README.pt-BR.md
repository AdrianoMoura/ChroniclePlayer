# Chronicle

[English](README.md)

> **YouTube, antes do algoritmo.**

*Um cliente de YouTube para desktop que resgata a experiência de abrir o YouTube e simplesmente ver os canais que você escolheu seguir.*

<p align="center">
  <em><img src="https://raw.githubusercontent.com/AdrianoMoura/ChroniclePlayer/refs/heads/main/screenshot.png"/></em>
</p>

## Download

Baixe a versão mais recente para a sua plataforma: **[Última release](https://github.com/AdrianoMoura/ChroniclePlayer/releases/latest)**

---

## Por que o Chronicle existe

Criei o Chronicle porque percebi que não gostava mais de abrir o YouTube.

Em vez de ver os criadores que eu escolhi seguir intencionalmente, era imediatamente confrontado com um fluxo interminável de recomendações competindo pela minha atenção. Mesmo quando eu sabia exatamente o que queria assistir, precisava lutar contra uma página inicial projetada para me convencer do contrário.

Eu queria algo mais simples.

Abrir o aplicativo.

Ver todos os novos vídeos das minhas inscrições.

Assistir ao que me interessa.

Fechar.

Nada mais.

O Chronicle é o aplicativo que eu queria usar todos os dias, então eu o construí.

Uso o Chronicle diariamente desde o início do desenvolvimento, ajustando continuamente pequenas interações, removendo atritos e experimentando funcionalidades até que a experiência fizesse sentido para mim. Cada melhoria vem de realmente viver com o produto, e não de projetá-lo apenas na teoria.

Minha esperança é que o que funciona bem para mim também seja útil para pessoas que sentem falta da experiência do YouTube de antes dos algoritmos de recomendação se tornarem o centro da plataforma.

---

## O que o Chronicle é

O Chronicle **não** é um substituto do YouTube.

É um cliente diferente para consumir o YouTube.

Suas inscrições são apresentadas em ordem estritamente cronológica, agrupadas em **Hoje**, **Ontem**, **Esta semana** e **Anteriores**.

Não existe:

* feed inicial algorítmico
* motor de recomendação
* conteúdo infinito depois que você está em dia
* autoplay levando a vídeos não relacionados

Quando não há vídeos novos, o Chronicle simplesmente informa que você está em dia.

E é isso.

Sempre que quiser algo específico, você ainda pode:

* pesquisar em todo o YouTube
* abrir qualquer URL do YouTube
* assistir vídeos usando o player oficial do YouTube
* apoiar criadores exatamente como faria normalmente

O Chronicle remove as escolhas do algoritmo.

Nunca remove as suas.

---

## Filosofia

O princípio norteador do Chronicle é:

> **Agência, não austeridade.**

O objetivo não é tornar o YouTube menor.

O objetivo é devolver o controle ao usuário.

Toda funcionalidade é avaliada com uma pergunta simples:

> **Quem está no comando?**

Se a resposta for "o usuário", ela pertence ao produto.

Se a resposta for "o algoritmo", provavelmente não pertence.

---

## Funcionalidades

A funcionalidade atual inclui:

* Feed cronológico de inscrições
* Múltiplas contas do YouTube
* Lives e Premieres no feed (indicador de "ao vivo", chat ao vivo, "iniciado há X")
* Rastreamento de lido / não lido
* Ignorar vídeos (com desfazer)
* Favoritos
* Assistir mais tarde, com sugestão de "próximo" quando um vídeo termina
* Playlists locais — suas próprias coleções, com reordenação por arrastar e soltar
* Busca completa no YouTube
* Abrir qualquer URL do YouTube
* Navegação por teclado
* Banco de dados SQLite local
* Exportação em JSON
* Filtro opcional de Shorts
* Cache local para navegação offline e inicialização instantânea

Veja o **[Guia do usuário](docs/guide.md)** (em inglês) para um passo a passo completo — o feed, o player, a busca, as configurações e todos os atalhos de teclado.

---

## Princípios centrais

### Local first

Tudo vive na sua máquina.

O Chronicle armazena seus dados em um banco SQLite local. Não existem servidores do Chronicle.

O cache existe apenas para deixar o aplicativo mais rápido — ele nunca deve mudar o comportamento do aplicativo.

Buscar e filtrar deve sempre parecer que você está falando diretamente com o YouTube.

---

### Privacidade em primeiro lugar

O Chronicle não coleta:

* telemetria
* analytics
* estatísticas de uso
* relatórios de erro
* rastreamento

Nada é enviado para lugar nenhum.

Nunca.

---

### Suas credenciais, sua cota

O Chronicle é distribuído **sem credenciais do Google embutidas**.

Em vez disso, você cria seu próprio projeto gratuito no Google Cloud durante o onboarding.

Isso significa que:

* você é dono da sua cota de API
* você controla suas credenciais
* não existe uma chave de API compartilhada que possa ser revogada para todo mundo

O aplicativo foi projetado para ser extremamente econômico no uso de cota. Uma atualização normal custa apenas algumas unidades da cota diária gratuita do Google.

---

### Sem mecânicas de engajamento

O Chronicle evita intencionalmente mecânicas projetadas para maximizar o tempo de tela.

Não há loops de recomendação.

Não há feeds infinitos.

Não há "você também pode gostar".

Quando você está em dia, o aplicativo simplesmente informa isso.

---

### Shorts são decisão sua

Shorts ficam **visíveis por padrão**, porque fazem parte da produção de muitos criadores.

No entanto, se você não quiser vê-los no feed de inscrições, há uma única configuração que os oculta completamente.

O Chronicle não toma essa decisão por você.

Shorts aparecem no feed como qualquer outro vídeo novo.

Não existe um feed infinito separado de Shorts nem uma interface de deslizar (swipe).

---

## Construído com IA

O Chronicle foi desenvolvido usando ferramentas modernas de IA para programação.

Prefiro ser transparente sobre isso. Se você vê isso como algo positivo ou negativo, a decisão é sua. Se desenvolvimento assistido por IA não é a sua praia, tudo bem — o código-fonte está aqui.

Este projeto é, de muitas formas, um experimento de **vibe coding** para mim.

Isso não significa que a IA escreveu o aplicativo sozinha.

O desenvolvimento segue um fluxo orientado por especificações. As funcionalidades são primeiro projetadas e documentadas como especificações que descrevem o comportamento desejado, as restrições e a justificativa. Essas especificações são então implementadas por agentes de IA, revisadas, testadas e refinadas antes de se tornarem parte do aplicativo.

Toda decisão arquitetural, decisão de produto, trade-off e decisão final de implementação é, em última instância, minha.

Uso IA da mesma forma que uso um compilador, um depurador, documentação ou uma IDE: como uma ferramenta que me ajuda a construir software mais rápido — não como um substituto para engenharia de software.

O produto em si — sua filosofia, comportamento, decisões de UX e inúmeros refinamentos — vem de usar o Chronicle todos os dias, perceber atritos e iterar continuamente sobre a experiência.

Em vez de substituir a engenharia de software, a IA me permite passar mais tempo projetando o produto e menos tempo escrevendo código repetitivo. Mais importante, ela tornou este projeto possível. Sem essas ferramentas, o Chronicle provavelmente teria permanecido apenas mais uma ideia na minha lista pessoal de projetos sempre crescente.

---

## Status do projeto

O Chronicle está atualmente em pré-lançamento, mas já é a minha forma principal de usar o YouTube.

O desenvolvimento é guiado pelos documentos em `.specs/`, onde a arquitetura, o roadmap, as decisões de design e a visão de longo prazo são mantidos junto com o código.

Sempre que a implementação e a especificação divergem, a especificação é atualizada como parte da mesma mudança.

---

## Instalação

Os releases empacotados atualmente não são assinados.

Isso afeta apenas a primeira execução.

### Linux

Baixe o AppImage.

```bash
chmod +x Chronicle.AppImage
./Chronicle.AppImage
```

Sem instalação.

Sem necessidade de acesso root.

### macOS

Baixe o DMG.

Arraste o Chronicle para Applications.

Na primeira execução, o Gatekeeper pode avisar que o aplicativo não é assinado. Clique com o botão direito → **Abrir**, ou permita em **Ajustes do Sistema → Privacidade e Segurança**.

Necessário apenas uma vez.

### Windows

Execute o instalador.

O SmartScreen pode exibir **"O Windows protegeu seu PC."**

Clique em **Mais informações** e depois em **Executar assim mesmo**.

Necessário apenas uma vez.

O Chronicle verifica periodicamente o GitHub em busca de novos releases (isso pode ser desativado nas Configurações). Ele não baixa nem instala atualizações automaticamente, pelo menos por enquanto.

---

## Rodando a partir do código-fonte

Requisitos:

* Node.js 22+
* npm

```bash
git clone <repository>
cd ChroniclePlayer
npm install
npm run dev
```

Na primeira execução, o Chronicle guia você na criação do seu próprio projeto no Google Cloud e das credenciais OAuth.

O processo geralmente leva cerca de cinco minutos e só precisa ser feito uma vez.

Instruções detalhadas também estão disponíveis em `docs/setup.md`.

Comandos úteis de desenvolvimento:

```bash
npm run typecheck
npm run lint
npm test

CHRONICLE_FIXTURES=1 npm run dev
```

---

## Seus dados

Seus dados pertencem a você.

* Banco de dados SQLite local
* Segredos armazenados no gerenciador de credenciais do seu sistema operacional, quando disponível
* Exportação em JSON com um clique
* Exclusão completa dos dados locais
* Tokens OAuth revogados ao sair da conta

Você pode inspecionar seu banco de dados com qualquer visualizador de SQLite.

Nada fica escondido atrás de formatos proprietários.

---

## Documentos de design

O Chronicle é especificado antes de ser implementado.

O diretório `.specs/` contém:

* Visão do produto
* Não-objetivos
* Arquitetura
* Decisões de design
* Roadmap

Esses documentos evoluem junto com o código para que implementação e intenção permaneçam alinhadas.

---

## Licença

TBD
