import type { AreaDeBusca } from "../domain/busca/value-objects/AreaDeBusca.ts";
import type { TipoNegocio } from "../domain/imovel/enums/TipoNegocio.ts";

export interface ParametrosDeColeta {
  area: AreaDeBusca;
  tipoNegocio: TipoNegocio;
  precoMaximo?: number;
}

export const PARAMETROS_DE_COLETA = "ParametrosDeColeta";
