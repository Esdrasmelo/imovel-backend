export interface FaixaDePreco {
  min: number;
  max: number | null;
  label: string;
}

export interface ContagemPorFaixa {
  faixa: string;
  quantidade: number;
}

export const FAIXAS_DE_PRECO: readonly FaixaDePreco[] = [
  { min: 0, max: 150_000, label: "Ate R$ 150k" },
  { min: 150_000, max: 200_000, label: "R$ 150k - 200k" },
  { min: 200_000, max: 250_000, label: "R$ 200k - 250k" },
  { min: 250_000, max: 300_000, label: "R$ 250k - 300k" },
  { min: 300_000, max: 350_000, label: "R$ 300k - 350k" },
  { min: 350_000, max: null, label: "Acima de R$ 350k" },
];

export function media(valores: readonly number[]): number | null {
  if (valores.length === 0) return null;
  const soma = valores.reduce((acumulado, valor) => acumulado + valor, 0);
  return soma / valores.length;
}

export function mediana(valores: readonly number[]): number | null {
  if (valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  const temQuantidadePar = ordenados.length % 2 === 0;
  return temQuantidadePar
    ? (ordenados[meio - 1]! + ordenados[meio]!) / 2
    : ordenados[meio]!;
}

export function distribuirPorFaixa(
  valores: readonly number[],
  faixas: readonly FaixaDePreco[] = FAIXAS_DE_PRECO,
): ContagemPorFaixa[] {
  return faixas.map((faixa) => ({
    faixa: faixa.label,
    quantidade: valores.filter((valor) => pertenceAFaixa(valor, faixa)).length,
  }));
}

function pertenceAFaixa(valor: number, faixa: FaixaDePreco): boolean {
  const acimaDoMinimo = valor >= faixa.min;
  const abaixoDoMaximo = faixa.max === null || valor < faixa.max;
  return acimaDoMinimo && abaixoDoMaximo;
}
