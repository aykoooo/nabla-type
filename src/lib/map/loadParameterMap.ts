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
  if (buf.byteLength < 24) {
    throw new Error(
      `Parameter map header too small: ${buf.byteLength} bytes (expected at least 24)`
    );
  }
  const dv = new DataView(buf);
  const width = dv.getUint32(0, true);
  const height = dv.getUint32(4, true);
  const fMin = dv.getFloat32(8, true);
  const fMax = dv.getFloat32(12, true);
  const kMin = dv.getFloat32(16, true);
  const kMax = dv.getFloat32(20, true);
  const expectedPayload = width * height;
  if (buf.byteLength < 24 + expectedPayload) {
    throw new Error(
      `Parameter map payload too small: ${buf.byteLength - 24} bytes (expected ${expectedPayload} for ${width}x${height})`
    );
  }
  const pixels = new Uint8Array(buf, 24, expectedPayload);
  return { width, height, fMin, fMax, kMin, kMax, pixels };
}
