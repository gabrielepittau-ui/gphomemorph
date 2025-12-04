
export enum ArchitecturalStyle {
  WARM_BRUTALISM = 'Warm Brutalism',
  MONOCHROME_MANSION = 'Monochrome Mansion',
  GLASS_PAVILION = 'Glass Pavilion',
  GRAND_HAUSSMANN = 'Grand Haussmann',
  MODERN_FARMHOUSE = 'Modern Farmhouse',
  SCULPTURAL_ORGANIC = 'Sculptural Organic',
  MILANESE_ECLECTIC = 'Milanese Eclectic',
  WABI_SABI_SANCTUARY = 'Wabi-Sabi Sanctuary',
  DARK_TECHNO_LUXURY = 'Dark Techno-Luxury',
  ART_GALLERY_LOFT = 'Art Gallery Loft',
  INDUSTRIAL_LOFT = 'Industrial Loft',
  SWISS_CONCRETE_VILLA = 'Swiss Concrete Villa',
  ALPINE_LUXURY_CHALET = 'Alpine Luxury Chalet',
  MEDITERRANEAN_RIVIERA = 'Mediterranean Riviera'
}

export enum MasterShootingStyle {
  FRONTAL_MASTER_SHOT = 'Frontal Master Shot',
  CLASSIC_THREE_QUARTER = 'Classic Three-Quarter View',
  HERO_SHOT_PREMIUM = 'Hero Shot Premium',
  TOPDOWN_FLAT_LAY = 'Topdown Flat Lay',
  MACRO_DETAIL = 'Macro Detail Ultra Close-up',
  ARCHITECTURAL_WIDE = 'Architectural Wide Shot',
  SOFT_MINIMAL = 'Soft Minimal Capture',
  CINEMATIC_CONTRAST = 'Cinematic High Contrast',
  HASSELBLAD_CLEAN = 'Hasselblad Medium Format Clean',
  LEICA_GLOW = 'Leica Summilux Glow',
  SOLVE_SUNDSBO_SCULPTING = 'Sølve Sundsbø Soft Sculpting',
  NICK_KNIGHT_GLOSS = 'Nick Knight Hyper-Gloss',
  DIOR_SOFT_AURA = 'Dior Beauty Soft Aura',
  APPLE_PRODUCT_CLEAN = 'Apple Product Ultra Clean',
  MOODY_NORDIC = 'Moody Nordic Shadowplay',
  ARCHITECTURAL_HARD_LIGHT = 'Architectural Hard Light Minimal',
  RH_SOURCEBOOK_AESTHETICS = 'RH Sourcebook Aesthetics'
}

export enum AspectRatio {
  RATIO_1_1 = '1:1',
  RATIO_16_9 = '16:9',
  RATIO_4_3 = '4:3',
  RATIO_3_4 = '3:4',
  RATIO_9_16 = '9:16'
}

export enum RoomType {
  LIVING_ROOM = 'Living Room',
  BEDROOM = 'Bedroom',
  KITCHEN = 'Kitchen',
  DINING_ROOM = 'Dining Room',
  OFFICE = 'Office',
  BATHROOM = 'Bathroom',
  ART_DECOR = 'Art Decor'
}

export enum AppMode {
  RESTYLING = 'Restyling Completo',
  EDITING = 'Smart Edit (Modifica Puntuale)',
  VIRTUAL_STAGING = 'Virtual Staging (Composizione Prodotti)'
}

export enum DetailShotAngle {
  MACRO_STRAIGHT = 'Macro Frontale',
  THREE_QUARTER = 'Angolo 3/4 (Dinamico)',
  TOP_DOWN = 'Dall\'Alto (Flat Lay)',
  LOW_ANGLE = 'Dal Basso (Monumentale)'
}

export interface DetectedItem {
  id: string;
  label: string;
  selected: boolean;
  notes: string;
}

export interface AddedItem {
  id: string;
  label: string;
  detail: string; // Color, material, or specific person description
}

export interface ProductAsset {
  id: string;
  file?: File;
  previewUrl: string;
  label: string; // e.g., "Bed", "Nightstand"
  base64?: string;
}

// NEW: Material Interface
export interface MaterialOption {
  id: string;
  label: string;
  category: 'Fabric' | 'Wood' | 'Stone' | 'Metal' | 'Paint';
  prompt: string; // Technical description
}

export interface GenerationConfig {
  mode: AppMode;
  style: ArchitecturalStyle;
  shootingStyle: MasterShootingStyle;
  ratio: AspectRatio;
  itemsToLock: DetectedItem[];
  addedItems: AddedItem[]; 
  productAssets?: ProductAsset[]; 
  selectedMaterials?: MaterialOption[]; // NEW: List of selected materials
  customPrompt?: string; 
  maskBase64?: string; 
  seed?: number;
}

export interface GeneratedImage {
  url: string;
  config: GenerationConfig;
}

export interface DetailPoint {
  id: string;
  cropRect: {
    x: number; // Percent
    y: number; // Percent
    width: number; // Percent
    height: number; // Percent
  };
  shotAngle: DetailShotAngle; 
  description?: string; 
  textureReference?: string; // Base64
  textureTiling?: number; // 1 to 10 scale factor
  url?: string;
  loading: boolean;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  previewUrl: string; // Original image
  generatedImage: string; // Result
  config: GenerationConfig;
  detectedItems: DetectedItem[];
  addedItems: AddedItem[];
}
