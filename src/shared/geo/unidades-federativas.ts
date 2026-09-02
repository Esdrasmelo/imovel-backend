import { slugify } from "../utils/slug.ts";

const NOME_DA_UF: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapa",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceara",
  DF: "Distrito Federal",
  ES: "Espirito Santo",
  GO: "Goias",
  MA: "Maranhao",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Para",
  PB: "Paraiba",
  PR: "Parana",
  PE: "Pernambuco",
  PI: "Piaui",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondonia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "Sao Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

export function nomeDaUf(uf: string): string {
  return NOME_DA_UF[uf.toUpperCase()] ?? uf;
}

export function slugDaUf(uf: string): string {
  return slugify(nomeDaUf(uf));
}
