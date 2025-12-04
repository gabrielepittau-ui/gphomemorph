
import { AspectRatio } from './types';
import { Armchair, BedDouble, ChefHat, Utensils, Monitor, Bath, Frame } from 'lucide-react';
import presets from './config/presets.json';

// === PRICING CONFIGURATION ===
export const PRICING_CONFIG = {
  ANALYSIS_COST: presets.pricing.analysis,
  IMAGE_GEN_PRO: presets.pricing.imageGenPro,
  IMAGE_GEN_FLASH: presets.pricing.imageGenFlash,
};

// === STYLES (Loaded from JSON) ===
export const STYLES = presets.styles.map(s => ({
    ...s,
    // Add base context to description dynamically
    description: `${presets.baseContext} ${s.description}`,
    // Placeholder image logic kept for compatibility
    image: `https://picsum.photos/seed/${s.id}/150/150`
}));

export const MASTER_SHOOTING_STYLES = presets.shootingStyles;

export const MATERIALS = presets.materials as any[]; // Type cast for flexibility

export const ASPECT_RATIOS = [
  { id: AspectRatio.RATIO_16_9, label: '16:9 Landscape' },
  { id: AspectRatio.RATIO_4_3, label: '4:3 Standard' },
  { id: AspectRatio.RATIO_1_1, label: '1:1 Square' },
  { id: AspectRatio.RATIO_3_4, label: '3:4 Portrait' },
  { id: AspectRatio.RATIO_9_16, label: '9:16 Story' }
];

const ICON_MAP: Record<string, any> = {
    "Armchair": Armchair,
    "BedDouble": BedDouble,
    "ChefHat": ChefHat,
    "Utensils": Utensils,
    "Monitor": Monitor,
    "Bath": Bath,
    "Frame": Frame
};

export const ROOM_TYPES = presets.roomTypes.map(r => ({
    ...r,
    icon: ICON_MAP[r.icon] || Armchair
}));

export const ROOM_ADDONS = presets.roomAddons as Record<string, string[]>;
