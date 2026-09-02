export interface ResultadoPaginado<T> {
  data: T[];
  meta: {
    total: number;
    pagina: number;
    tamanhoPagina: number;
    totalPaginas: number;
  };
}
