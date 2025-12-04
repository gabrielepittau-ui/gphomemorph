
export enum AspectRatio {
  RATIO_1_1 = '1:1',
  RATIO_16_9 = '16:9',
  RATIO_4_3 = '4:3',
  RATIO_3_4 = '3:4',
  RATIO_9_16 = '9:16'
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
  detail: string;
}

export interface ProductAsset {
  id: string;
  file?: File;
  previewUrl: string;
  label: string;
  base64?: string;
}

export interface MaterialOption {
  id: string;
  label: string;
  category: 'Fabric' | 'Wood' | 'Stone' | 'Metal' | 'Paint';
  prompt: string;
}

export interface GenerationConfig {
  mode: AppMode;
  style: string; // Changed from Enum to string for flexibility
  shootingStyle: string; // Changed from Enum to string
  ratio: AspectRatio;
  itemsToLock: DetectedItem[];
  addedItems: AddedItem[]; 
  productAssets?: ProductAsset[]; 
  selectedMaterials?: MaterialOption[];
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
    x: number;
    y: number;
    width: number;
    height: number;
  };
  shotAngle: DetailShotAngle; 
  description?: string; 
  textureReference?: string;
  textureTiling?: number;
  url?: string;
  loading: boolean;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  previewUrl: string;
  generatedImage: string;
  config: GenerationConfig;
  detectedItems: DetectedItem[];
  addedItems: AddedItem[];
}
