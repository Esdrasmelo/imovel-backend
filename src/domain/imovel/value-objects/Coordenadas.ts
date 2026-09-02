export class Coordenadas {
  private constructor(
    public readonly latitude: number,
    public readonly longitude: number,
  ) {}

  static criar(
    latitude: number | null | undefined,
    longitude: number | null | undefined,
  ): Coordenadas | null {
    if (latitude == null || longitude == null) return null;
    if (latitude < -90 || latitude > 90) return null;
    if (longitude < -180 || longitude > 180) return null;
    return new Coordenadas(latitude, longitude);
  }
}
