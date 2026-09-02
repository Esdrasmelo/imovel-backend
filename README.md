# imovel-backend

Coleta anúncios de imóveis à venda em fontes públicas de uma cidade configurável, normaliza tudo em
um único modelo e expõe uma API de busca com filtros, paginação e estatísticas. Projeto pessoal,
feito para acompanhar o mercado de uma cidade específica sem abrir cinco sites todo dia.

Stack: Bun, TypeScript, Fastify, Prisma com SQLite, Cheerio, tsyringe, Zod, Pino. Testes com o
runner do próprio Bun.

## Como rodar

```bash
bun install
cp .env.example .env
bun run db:migrate
bun run db:seed
bun run dev
```

A documentação OpenAPI fica em `http://localhost:3333/docs`. Para disparar uma coleta:

```bash
curl -X POST http://localhost:3333/api/coleta/executar -H 'content-type: application/json' -d '{}'
curl -X POST http://localhost:3333/api/coleta/executar -H 'content-type: application/json' -d '{"fonte":"vivareal"}'
```

Variáveis de ambiente (`.env.example`):

| Variável | Padrão | Para quê |
| --- | --- | --- |
| `CIDADE`, `ESTADO` | `Sorocaba`, `SP` | Área de busca. É a única fonte da verdade sobre onde coletar; nenhum scraper conhece a cidade por conta própria |
| `PRECO_MAXIMO_COLETA` | vazio | Teto de preço enviado às fontes que aceitam esse filtro. Vazio coleta tudo |
| `DATABASE_URL` | `file:./dev.db` | SQLite local |
| `PORT`, `HOST`, `NODE_ENV` | `3333`, `0.0.0.0`, `development` | |

## Testes

```bash
bun test
bun run typecheck
```

Os testes não tocam rede nem banco. Cada porta tem uma implementação de teste escrita à mão no
próprio arquivo de teste (`ColetaRepositoryEmMemoria`, `ScraperControlado`, `ScraperComRoteiro`,
`BuscaServiceGravador`), o que mantém o teste legível sem framework de mock e deixa claro qual
contrato está sendo exercitado. As rotas HTTP são testadas com `app.inject()` do Fastify, sem subir
servidor.

## Arquitetura

Portas e adaptadores. O domínio e a aplicação não importam nada de infraestrutura; quem conhece
Prisma, Fastify ou o HTML de cada site vive em `adapters/`.

```
src/
  domain/                 entidades, value objects e regras puras
    imovel/               Imovel, Preco, Metragem, Coordenadas, enums
    coleta/               ExecucaoColeta, FonteDados
    busca/                FiltroBusca, AreaDeBusca, estatisticas (media, mediana, faixas)
  ports/
    inbound/              o que a aplicação oferece: BuscaServicePort, ColetaServicePort
    outbound/             o que a aplicação precisa: repositórios e ScraperPort
  application/
    services/             ColetaService, BuscaService
    ParametrosDeColeta    área, tipo de negócio e teto de preço, injetados no serviço
  adapters/
    inbound/http/         Fastify: rotas, plugins, tratamento de erro
    outbound/persistence/ implementações Prisma das portas de repositório
    outbound/scrapers/    um adaptador por fonte, todos sobre BaseScraper
  shared/                 env (Zod), logger, retry, rate limiter, slug, UFs
tests/                    espelha src/
```

O fluxo de uma coleta: `ColetaService` recebe os `ParametrosDeColeta`, pede as fontes ativas ao
repositório, encontra o `ScraperPort` de cada uma pelo nome, checa saúde, coleta, persiste via
`ImovelRepositoryPort` e registra uma `ExecucaoColeta` com status `SUCESSO`, `PARCIAL` ou `ERRO`.

### Fontes

| Fonte | Como coleta |
| --- | --- |
| VivaReal e ZapImóveis | Mesma API JSON do grupo (`glue-api`), mudando apenas domínio e portal. Um adaptador base e duas subclasses de dez linhas |
| Mendes Ortega | HTML paginado, lido com Cheerio |
| Construtora Planeta | REST do WordPress para a listagem, mais a página HTML de cada empreendimento para o que a API não traz |
| MRV | Página de listagem da cidade para descobrir URLs (JSON-LD, links ou sitemap, nessa ordem), depois JSON-LD de cada empreendimento |

Cada scraper declara a própria `PoliticaDeColeta` — intervalo entre requisições, tentativas e teto
de páginas — em vez de passar três números posicionais. `BaseScraper` cuida de paginação, retry com
atraso exponencial e rate limit; a subclasse implementa só `scrapePagina` e `healthCheck`.

## Decisões

**A cidade é configuração, não código.** A versão anterior tinha a cidade escrita em dez lugares:
URL de scraper, fallback de mapper, default de entidade, default de filtro, health check. Hoje ela
entra uma vez, por `CIDADE`/`ESTADO`, vira um `AreaDeBusca` validado no boot e é injetada em quem
precisa. Trocar de cidade é editar o `.env`. O default no schema do Prisma ficou como está porque
mudá-lo exigiria migração sem ganho: a aplicação sempre grava cidade e estado explicitamente.

**Estatísticas são funções puras do domínio.** `media`, `mediana` e `distribuirPorFaixa` recebem
uma lista de preços e devolvem números. O repositório só entrega a lista. Isso tirou o Prisma de
dentro de `BuscaService`, que antes fazia consulta direta ao banco — a única violação da regra de
dependência que existia — e tornou a mediana testável em três linhas. A mediana, aliás, existia na
interface e voltava sempre `null`; agora é calculada.

**Retry e rate limiter recebem o relógio.** `retry` aceita um `sleep` e `RateLimiter` aceita um
`Relogio` com `agora` e `dormir`. Em produção são `Date.now` e `setTimeout`; no teste são funções
que registram quanto se dormiu. Os testes desses dois utilitários rodam em milissegundos e não são
flaky, o que não seria possível com `setTimeout` real.

**Sem comentários no código.** O que precisaria de comentário virou nome: `MENOR_PAGINA_COMPLETA`,
`coletaInteiraJaAconteceu`, `foiBloqueadoPorAntiBot`, `PRECO_SOB_CONSULTA`,
`CONSTRUTORA_OPERA_COM_FINANCIAMENTO`. O raciocínio que não cabe em nome está neste README.

**Dois campos deixaram de mentir.** O mapper da glue-api gravava `acceptExchange` (aceita permuta)
em `aceitaFinanciamento`; agora grava `null`, porque a API não informa financiamento. Os mappers de
construtora gravavam o fim de uma faixa de área em `areaTotal`; agora gravam só a menor área como
`areaUtil` e deixam `areaTotal` nulo, porque faixa de área e área total são coisas diferentes.

**A fonte BRZ foi removida.** Era um scraper que devolvia vazio enquanto o site estivesse fora do
ar. Código morto com promessa de futuro é pior que ausência.

**Bun e SQLite** porque o projeto é de uma pessoa, roda numa máquina e a prioridade é iterar. A
arquitetura de portas existe justamente para que trocar o banco seja um adaptador novo, não uma
reescrita.

## Sobre coletar sites de terceiros

Este projeto é de uso pessoal e educacional. Cada scraper espera entre 2 e 5 segundos entre
requisições, faz no máximo 3 tentativas por página, respeita bloqueios (um 403 encerra a paginação
em vez de insistir) e para de coletar quando a fonte diz que acabou. Os dados coletados ficam num
SQLite local e não são redistribuídos. Antes de apontar este código para outra fonte, leia os termos
de uso dela.
