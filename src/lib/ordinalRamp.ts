// Tangga warna satu hue (merah aksen situs) dari terang ke gelap, untuk opsi
// yang punya urutan. Parameternya sudah divalidasi dengan pemeriksa palet
// dataviz (--ordinal, di atas kartu putih) untuk 2-7 langkah: kecerahan
// menurun rata, selisih antarlangkah >= 0.06, ujung terang >= 2:1.
const HUE = 25.8;
const L_LIGHT = 0.775;
const L_DARK = 0.38;
const MAX_STEPS = 7;
/** Dipakai untuk semua batang kalau opsinya lebih dari 7 (langkahnya jadi terlalu rapat). */
export const UNIFORM_BAR = '#b65a53';

const gamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function oklchToHex(L: number, C: number, H: number) {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return (
    '#' +
    rgb
      .map((v) => Math.round(Math.min(1, Math.max(0, gamma(v))) * 255).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** n warna dari terang (opsi pertama) ke gelap (opsi terakhir). */
export function ordinalRamp(n: number): string[] {
  if (n <= 0) return [];
  if (n > MAX_STEPS) return Array(n).fill(UNIFORM_BAR);
  if (n === 1) return [UNIFORM_BAR];
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return oklchToHex(L_LIGHT - (L_LIGHT - L_DARK) * t, 0.09 + 0.06 * t, HUE);
  });
}
