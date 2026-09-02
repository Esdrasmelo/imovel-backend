-- CreateTable
CREATE TABLE "imoveis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "fonteId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "url" TEXT NOT NULL,
    "urlImagens" TEXT,
    "preco" REAL,
    "precoPorM2" REAL,
    "valorCondominio" REAL,
    "tipoImovel" TEXT NOT NULL,
    "tipoNegocio" TEXT NOT NULL,
    "statusConstrucao" TEXT,
    "areaUtil" REAL,
    "areaTotal" REAL,
    "quartos" INTEGER,
    "suites" INTEGER,
    "banheiros" INTEGER,
    "vagas" INTEGER,
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT NOT NULL DEFAULT 'Sorocaba',
    "estado" TEXT NOT NULL DEFAULT 'SP',
    "latitude" REAL,
    "longitude" REAL,
    "nomeEmpreendimento" TEXT,
    "construtora" TEXT,
    "aceitaFinanciamento" BOOLEAN,
    "codigoImovel" TEXT,
    "dataPublicacao" DATETIME,
    "dataAtualizacao" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "imoveis_fonteId_fkey" FOREIGN KEY ("fonteId") REFERENCES "fontes_dados" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fontes_dados" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "urlBase" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "execucoes_coleta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fonteId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "iniciadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadoEm" DATETIME,
    "totalEncontrados" INTEGER NOT NULL DEFAULT 0,
    "totalNovos" INTEGER NOT NULL DEFAULT 0,
    "totalAtualizados" INTEGER NOT NULL DEFAULT 0,
    "totalErros" INTEGER NOT NULL DEFAULT 0,
    "mensagemErro" TEXT,
    CONSTRAINT "execucoes_coleta_fonteId_fkey" FOREIGN KEY ("fonteId") REFERENCES "fontes_dados" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "imoveis_cidade_tipoImovel_tipoNegocio_idx" ON "imoveis"("cidade", "tipoImovel", "tipoNegocio");

-- CreateIndex
CREATE INDEX "imoveis_preco_idx" ON "imoveis"("preco");

-- CreateIndex
CREATE INDEX "imoveis_bairro_idx" ON "imoveis"("bairro");

-- CreateIndex
CREATE INDEX "imoveis_statusConstrucao_idx" ON "imoveis"("statusConstrucao");

-- CreateIndex
CREATE INDEX "imoveis_construtora_idx" ON "imoveis"("construtora");

-- CreateIndex
CREATE UNIQUE INDEX "imoveis_fonteId_externalId_key" ON "imoveis"("fonteId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "fontes_dados_nome_key" ON "fontes_dados"("nome");

-- CreateIndex
CREATE INDEX "execucoes_coleta_fonteId_iniciadoEm_idx" ON "execucoes_coleta"("fonteId", "iniciadoEm");
