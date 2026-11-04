import type { PlateColors } from "@/lib/types";

// Palette déterministe pour l'illustration d'assiette.
// Chaque recette reçoit toujours les mêmes couleurs, dérivées de son identifiant.

const PALETTES: PlateColors[] = [
  { tint: "#FFF3E0", base: "#F5E6CC", top: "#D84315" },
  { tint: "#E8F5E9", base: "#C8E6C9", top: "#2E7D32" },
  { tint: "#FFF8E1", base: "#FFECB3", top: "#F57F17" },
  { tint: "#FCE4EC", base: "#F8BBD0", top: "#C62828" },
  { tint: "#E0F2F1", base: "#B2DFDB", top: "#00695C" },
  { tint: "#FBE9E7", base: "#FFCCBC", top: "#BF360C" },
  { tint: "#F3E5F5", base: "#E1BEE7", top: "#6A1B9A" },
  { tint: "#E3F2FD", base: "#BBDEFB", top: "#1565C0" },
  { tint: "#FFFDE7", base: "#FFF9C4", top: "#F9A825" },
  { tint: "#EFEBE9", base: "#D7CCC8", top: "#4E342E" },
];

function hashSimple(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function couleursAssiette(recipeId: string): PlateColors {
  return PALETTES[hashSimple(recipeId) % PALETTES.length];
}
