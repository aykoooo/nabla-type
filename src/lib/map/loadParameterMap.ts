export interface ParameterMapData {
  width: number;
  height: number;
  fMin: number;
  fMax: number;
  kMin: number;
  kMax: number;
  pixels: Uint8Array;
}

export async function loadParameterMap(url: string): Promise<ParameterMapData> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to load parameter map: ${response.status} ${response.statusText}`
    );
  }
  const buf = await response.arrayBuffer();
  const dv = new DataView(buf);
  const width = dv.getUint32(0, true);
  const height = dv.getUint32(4, true);
  const fMin = dv.getFloat32(8, true);
  const fMax = dv.getFloat32(12, true);
  const kMin = dv.getFloat32(16, true);
  const kMax = dv.getFloat32(20, true);
  const pixels = new Uint8Array(buf, 24);
  return { width, height, fMin, fMax, kMin, kMax, pixels };
}
