import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const fontes = [
  { nome: "vivareal", tipo: "API", urlBase: "https://glue-api.vivareal.com/v2/listings" },
  { nome: "zapimoveis", tipo: "API", urlBase: "https://glue-api.zapimoveis.com.br/v2/listings" },
  { nome: "mrv", tipo: "SCRAPING", urlBase: "https://www.mrv.com.br" },
  { nome: "planeta", tipo: "HIBRIDO", urlBase: "https://www.construtoraplaneta.com.br" },
  { nome: "mendesortega", tipo: "SCRAPING", urlBase: "https://www.mendesortega.com.br" },
];

async function main() {
  for (const fonte of fontes) {
    await prisma.fonteDados.upsert({
      where: { nome: fonte.nome },
      update: { tipo: fonte.tipo, urlBase: fonte.urlBase },
      create: fonte,
    });
    console.log(`fonte registrada: ${fonte.nome}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
