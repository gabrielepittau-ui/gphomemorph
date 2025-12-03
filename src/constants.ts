
import { ArchitecturalStyle, AspectRatio, RoomType, MasterShootingStyle } from './types';
import { Layout, Armchair, BedDouble, ChefHat, Utensils, Monitor, Bath, Users, Frame } from 'lucide-react';

// === PRICING CONFIGURATION (USD Estimate) ===
export const PRICING_CONFIG = {
  ANALYSIS_COST: 0.001,       // Cost for gemini-2.5-flash text/vision analysis
  IMAGE_GEN_PRO: 0.040,       // Cost for gemini-3-pro-image-preview
  IMAGE_GEN_FLASH: 0.010,     // Cost for gemini-2.5-flash-image
};

// Common context applied to all styles to ensure architectural quality
const BASE_CONTEXT = "Professional architectural photography of a luxury environment background. The center of the room is strictly empty, reserved for product placement. Background furniture (dining table and chairs, kitchen perceived in a loft, design furniture pieces like bookshelf or sideboards always design) are always present but positioned with coherence and style as only the best interior decorator in the world knows how to do. No clutter. Perfect visual balance and composition. 8k, photorealistic.";

export const STYLES = [
  { 
    id: ArchitecturalStyle.WARM_BRUTALISM, 
    label: "Warm Brutalism (L'Origine)", 
    code: '01',
    description: `${BASE_CONTEXT} Luxury converted loft, raw concrete walls (béton brut), warm walnut wood furniture, black metal and fluted glass partition, dark herringbone parquet, soft cinematic lighting, architectural textures, spacious.`,
    image: 'https://picsum.photos/seed/warmbrut/150/150' 
  },
  { 
    id: ArchitecturalStyle.MONOCHROME_MANSION, 
    label: 'Monochrome Mansion (RH Style)', 
    code: '02',
    description: `${BASE_CONTEXT} RH style interior, Restoration Hardware vibe, monochromatic greige palette, massive scale, reclaimed wood beams, architectural symmetry, heavy linen curtains, rustic-modern grandeur, matte finishes, spectacular chandelier, double height ceiling.`,
    image: 'https://picsum.photos/seed/monochrome/150/150' 
  },
  { 
    id: ArchitecturalStyle.GLASS_PAVILION, 
    label: 'Glass Pavilion', 
    code: '03',
    description: `${BASE_CONTEXT} Cantilevered modern mansion, floor-to-ceiling glass walls, infinity pool view, panoramic scenery, ultra-modern architecture, glossy surfaces, direct sunlight, open plan living, seamless indoor-outdoor flow.`,
    image: 'https://picsum.photos/seed/glasspav/150/150' 
  },
  { 
    id: ArchitecturalStyle.GRAND_HAUSSMANN, 
    label: 'Grand Haussmann', 
    code: '04',
    description: `${BASE_CONTEXT} Haussmann style apartment, high ceilings (4 meters), decorative white moldings (boiserie), intricate herringbone parquet, large vertical french windows, marble fireplace, sophisticated, airy, bright, classic European luxury.`,
    image: 'https://picsum.photos/seed/haussmann/150/150' 
  },
  { 
    id: ArchitecturalStyle.MODERN_FARMHOUSE, 
    label: 'Modern Farmhouse', 
    code: '05',
    description: `${BASE_CONTEXT} Luxury renovated farmhouse, high pitched ceiling with bleached wood beams, white stone walls, resin or stone floor, huge windows replacing barn doors, cozy but expansive, natural linen textures, bright and welcoming.`,
    image: 'https://picsum.photos/seed/farmhouse/150/150' 
  },
  { 
    id: ArchitecturalStyle.SCULPTURAL_ORGANIC, 
    label: 'Sculptural Organic', 
    code: '06',
    description: `${BASE_CONTEXT} Soft minimalism, curved walls, organic architecture, micro-cement floor, monochromatic creamy white palette, arched doorways, sculptural staircase, fluid shapes, no sharp corners, ethereal light, futuristic primitive design.`,
    image: 'https://picsum.photos/seed/organic/150/150' 
  },
  { 
    id: ArchitecturalStyle.MILANESE_ECLECTIC, 
    label: 'Milanese Eclectic', 
    code: '07',
    description: `${BASE_CONTEXT} Milanese design apartment, terrazzo floor (graniglia), rich velvet textures, bold wall colors (teal or terracotta), iconic italian design lamps, mix of vintage and modern, sophisticated, artistic flair, spacious.`,
    image: 'https://picsum.photos/seed/milanese/150/150' 
  },
  { 
    id: ArchitecturalStyle.WABI_SABI_SANCTUARY, 
    label: 'Wabi-Sabi Sanctuary', 
    code: '08',
    description: `${BASE_CONTEXT} High-end wabi-sabi villa, lime wash plaster walls, rough hewn wood beams, earthy tones, beige and sand palette, minimalism, imperfect textures, natural light, peaceful atmosphere, spa-like feeling.`,
    image: 'https://picsum.photos/seed/wabisabi/150/150' 
  },
  { 
    id: ArchitecturalStyle.DARK_TECHNO_LUXURY, 
    label: 'Dark Techno-Luxury', 
    code: '09',
    description: `${BASE_CONTEXT} Dark luxury interior, moody atmosphere, black marble feature wall, smoked glass partitions, dark wood slats, led strip lighting, sleek modernism, reflective surfaces, midnight tones, masculine elegance, high-tech vibe.`,
    image: 'https://picsum.photos/seed/techno/150/150' 
  },
  { 
    id: ArchitecturalStyle.ART_GALLERY_LOFT, 
    label: 'Art Gallery Loft', 
    code: '10',
    description: `${BASE_CONTEXT} Art collector penthouse, museum style interior, stark white walls, gallery lighting, polished concrete floor, minimalistic open space, large abstract art pieces, expansive windows, airy and bright, ultra-clean lines, negative space.`,
    image: 'https://picsum.photos/seed/artgallery/150/150' 
  },
  { 
    id: ArchitecturalStyle.INDUSTRIAL_LOFT, 
    label: 'Industrial Loft', 
    code: '11',
    description: `${BASE_CONTEXT} Authentic converted factory loft, exposed red brick walls (painted or natural), large black iron framed windows, exposed ductwork, cast iron columns, open space, eclectic and raw, high ceilings.`,
    image: 'https://picsum.photos/seed/industrial/150/150' 
  },
  { 
    id: ArchitecturalStyle.SWISS_CONCRETE_VILLA, 
    label: 'Swiss Concrete Villa', 
    code: '12',
    description: `${BASE_CONTEXT} Brutalist luxury villa, smooth exposed concrete walls, floor-to-ceiling frameless glass, polished concrete floors, floating staircase, sharp geometric lines, cold architectural light, rigorous minimalism, Zurich style.`,
    image: 'https://picsum.photos/seed/swiss/150/150' 
  },
  { 
    id: ArchitecturalStyle.ALPINE_LUXURY_CHALET, 
    label: 'Alpine Luxury Chalet', 
    code: '13',
    description: `${BASE_CONTEXT} Modern luxury chalet, double height ceiling, huge triangular windows with mountain view, light larch wood paneling, monumental stone fireplace, warm lighting, snowy exterior visible, cozy and exclusive.`,
    image: 'https://picsum.photos/seed/chalet/150/150' 
  },
  { 
    id: ArchitecturalStyle.MEDITERRANEAN_RIVIERA, 
    label: 'Mediterranean Riviera', 
    code: '14',
    description: `${BASE_CONTEXT} Modern mediterranean villa, organic architecture, rough white plaster walls, stone niches, light irregular stone floor, pergola shadows, sunlight, coastal luxury, relaxing atmosphere, holiday vibe.`,
    image: 'https://picsum.photos/seed/mediterranean/150/150' 
  }
];

export const MASTER_SHOOTING_STYLES = [
  { id: MasterShootingStyle.FRONTAL_MASTER_SHOT, label: 'Frontal Master', code: 'A', description: 'Inquadratura frontale simmetrica, bilanciata, tipica delle riviste di architettura.' },
  { id: MasterShootingStyle.CLASSIC_THREE_QUARTER, label: 'Classic 3/4', code: 'B', description: 'Angolazione a 45 gradi per mostrare profondità e disposizione della stanza.' },
  { id: MasterShootingStyle.HERO_SHOT_PREMIUM, label: 'Hero Shot', code: 'C', description: 'Angolo basso, grandangolo moderato, rende lo spazio imponente e lussuoso.' },
  { id: MasterShootingStyle.TOPDOWN_FLAT_LAY, label: 'Topdown', code: 'D', description: 'Vista dall\'alto, ortogonale, ideale per layout e planimetrie arredate.' },
  { id: MasterShootingStyle.MACRO_DETAIL, label: 'Macro Detail', code: 'E', description: 'Focus stretto su texture e materiali, profondità di campo ridotta.' },
  { id: MasterShootingStyle.ARCHITECTURAL_WIDE, label: 'Arch Wide', code: 'F', description: 'Grandangolo spinto ma corretto, abbraccia tutto lo spazio.' },
  { id: MasterShootingStyle.SOFT_MINIMAL, label: 'Soft Minimal', code: 'G', description: 'Luce morbida, ombre quasi assenti, colori pastello e pulizia visiva.' },
  { id: MasterShootingStyle.CINEMATIC_CONTRAST, label: 'Cinematic', code: 'H', description: 'Alto contrasto, luci e ombre drammatiche, atmosfera da film.' },
  { id: MasterShootingStyle.HASSELBLAD_CLEAN, label: 'Hasselblad', code: 'I', description: 'Definizione estrema, colori fedeli, illuminazione da studio high-end.' },
  { id: MasterShootingStyle.LEICA_GLOW, label: 'Leica Glow', code: 'J', description: 'Morbidezza caratteristica, alone luminoso sui punti luce, organico.' },
  { id: MasterShootingStyle.SOLVE_SUNDSBO_SCULPTING, label: 'Sculpting', code: 'K', description: 'Luci che scolpiscono i volumi, artistico e tridimensionale.' },
  { id: MasterShootingStyle.NICK_KNIGHT_GLOSS, label: 'Hyper Gloss', code: 'L', description: 'Colori saturi, superfici riflettenti esaltate, moderno e patinato.' },
  { id: MasterShootingStyle.DIOR_SOFT_AURA, label: 'Soft Aura', code: 'M', description: 'Atmosfera sognante, diffusione, eleganza femminile.' },
  { id: MasterShootingStyle.APPLE_PRODUCT_CLEAN, label: 'Product Clean', code: 'N', description: 'Illuminazione asettica, bianca, perfetta, senza ombre dure.' },
  { id: MasterShootingStyle.MOODY_NORDIC, label: 'Moody Nordic', code: 'O', description: 'Luce naturale laterale, ombre lunghe, atmosfera intima e scura.' },
  { id: MasterShootingStyle.ARCHITECTURAL_HARD_LIGHT, label: 'Hard Light', code: 'P', description: 'Luce solare diretta, ombre nette, geometrico e definito.' },
  { id: MasterShootingStyle.RH_SOURCEBOOK_AESTHETICS, label: 'RH Sourcebook', code: 'Q', description: 'fotografia drammatica e "moody", luce naturale laterale morbida, ombre profonde e decise (chiaroscuro), color grading fortemente desaturato su toni caldi neutri e greige, focus nitidissimo sulle texture materiche (lino belga, legno di recupero, pietra), composizione monumentale e spesso simmetrica, atmosfera di lusso silenzioso e contemplativo.' }
];

export const ASPECT_RATIOS = [
  { id: AspectRatio.RATIO_16_9, label: '16:9 Landscape' },
  { id: AspectRatio.RATIO_4_3, label: '4:3 Standard' },
  { id: AspectRatio.RATIO_1_1, label: '1:1 Square' },
  { id: AspectRatio.RATIO_3_4, label: '3:4 Portrait' },
  { id: AspectRatio.RATIO_9_16, label: '9:16 Story' }
];

export const ROOM_TYPES = [
  { id: RoomType.LIVING_ROOM, label: 'Soggiorno', icon: Armchair },
  { id: RoomType.BEDROOM, label: 'Camera', icon: BedDouble },
  { id: RoomType.KITCHEN, label: 'Cucina', icon: ChefHat },
  { id: RoomType.DINING_ROOM, label: 'Pranzo', icon: Utensils },
  { id: RoomType.OFFICE, label: 'Ufficio', icon: Monitor },
  { id: RoomType.BATHROOM, label: 'Bagno', icon: Bath },
  { id: RoomType.ART_DECOR, label: 'Quadri', icon: Frame }
];

// Unified list for Living Room and Bedroom based on user request
const COMMON_LIVING_BEDROOM_ADDONS = [
  'Piante',
  'Tappeto', 
  'Lampade design', 
  'Cuscini arredo', 
  'Coffee table', 
  'Human',
  'Specchio grande', 
  'Plaid'
];

export const ROOM_ADDONS: Record<RoomType, string[]> = {
  [RoomType.LIVING_ROOM]: COMMON_LIVING_BEDROOM_ADDONS,
  [RoomType.BEDROOM]: COMMON_LIVING_BEDROOM_ADDONS,
  [RoomType.KITCHEN]: ['Erbe aromatiche', 'Vaso frutta', 'Tagliere legno', 'Utensili rame', 'Macchina caffè'],
  [RoomType.DINING_ROOM]: ['Centrotavola', 'Candele', 'Lampadario scultoreo', 'Vaso fiori', 'Tappeto'],
  [RoomType.OFFICE]: ['Lampada tavolo', 'Libreria', 'Organizer', 'Pianta scrivania', 'Poltrona ergonomica'],
  [RoomType.BATHROOM]: ['Set spa', 'Candele', 'Piante umidità', 'Cesto vimini', 'Specchio led'],
  [RoomType.ART_DECOR]: ['Astratto materico', 'Tela grande formato', 'Minimalista', 'Fotografia B&N', 'Opera geometrica', 'Dittico moderno']
};
