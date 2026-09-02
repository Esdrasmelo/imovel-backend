import { GlueApiBaseScraper } from "../GlueApiBaseScraper.ts";
import type { AreaDeBusca } from "../../../../domain/busca/value-objects/AreaDeBusca.ts";

const DOMINIO = "www.vivareal.com.br";

export class VivaRealScraper extends GlueApiBaseScraper {
  readonly fonteNome = "vivareal";
  protected readonly portalName = "VIVAREAL";

  constructor(area: AreaDeBusca) {
    super(DOMINIO, DOMINIO, area);
  }
}
