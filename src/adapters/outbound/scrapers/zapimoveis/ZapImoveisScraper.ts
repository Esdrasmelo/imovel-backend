import { GlueApiBaseScraper } from "../GlueApiBaseScraper.ts";
import type { AreaDeBusca } from "../../../../domain/busca/value-objects/AreaDeBusca.ts";

const DOMINIO = "www.zapimoveis.com.br";

export class ZapImoveisScraper extends GlueApiBaseScraper {
  readonly fonteNome = "zapimoveis";
  protected readonly portalName = "ZAP";

  constructor(area: AreaDeBusca) {
    super(DOMINIO, DOMINIO, area);
  }
}
