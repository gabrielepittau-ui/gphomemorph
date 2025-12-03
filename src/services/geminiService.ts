
import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig, DetectedItem, AppMode, DetailShotAngle } from "../types";
import { STYLES, MASTER_SHOOTING_STYLES, PRICING_CONFIG } from "../constants";

// Helper to get API Key safely (Vite or Process)
const getApiKey = (): string => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env.VITE_API_KEY || "";
    }
  } catch (e) {
    // Ignore error if import.meta is not available
  }
  
  try {
    // @ts-ignore
    return process.env.API_KEY || "";
  } catch (e) {
    return "";
  }
};

// Helper to convert File to Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

// Helper to Crop Image for Detail Shot
const cropBase64Image = async (base64: string, xPercent: number, yPercent: number, widthPercent: number, heightPercent: number, expandContext: number = 0.4): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        
        // Calculate crop in pixels
        let w = (widthPercent / 100) * img.width;
        let h = (heightPercent / 100) * img.height;
        let x = (xPercent / 100) * img.width;
        let y = (yPercent / 100) * img.height;

        // EXPAND CONTEXT logic
        const expansionW = w * expandContext;
        const expansionH = h * expandContext;

        x = x - expansionW;
        y = y - expansionH;
        w = w + (expansionW * 2);
        h = h + (expansionH * 2);

        // Clamp to boundaries
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x + w > img.width) w = img.width - x;
        if (y + h > img.height) h = img.height - y;

        // Set high res output for the crop to ensure quality input for AI
        canvas.width = 1024; 
        canvas.height = (h / w) * 1024;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
        }

        // Draw the cropped portion scaled up
        ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);
        
        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        resolve(croppedDataUrl.split(',')[1]);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = (e) => reject(e);
    img.src = `data:image/jpeg;base64,${base64}`;
  });
};

// Helper to Tile Texture Image
const tileBase64Image = async (base64: string, tileCount: number): Promise<string> => {
    // If tiling is 1 or less, return original
    if (tileCount <= 1) return base64;

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                // Create a reasonably large canvas for the tiled texture (max 2048 to be safe and high res)
                const size = 2048;
                canvas.width = size;
                canvas.height = size;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Could not get canvas context for tiling"));
                    return;
                }

                // Calculate width of each tile
                const tileW = size / tileCount;
                const tileH = size / tileCount;

                // Loop to draw tiles
                for (let x = 0; x < tileCount; x++) {
                    for (let y = 0; y < tileCount; y++) {
                        ctx.drawImage(img, x * tileW, y * tileH, tileW, tileH);
                    }
                }

                const tiledDataUrl = canvas.toDataURL('image/jpeg', 0.95);
                resolve(tiledDataUrl.split(',')[1]);
            } catch (e) {
                reject(e);
            }
        };
        img.onerror = (e) => reject(e);
        img.src = `data:image/jpeg;base64,${base64}`;
    });
};

// Safe error stringify
const safeStringify = (obj: any) => {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
};

// Retry helper for 503 errors and transient issues
async function retryOperation<T>(operation: () => Promise<T>, maxRetries: number = 4): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      const errString = safeStringify(error);
      const msg = error.message || "";
      
      const isRetryable = 
        error.status === 503 || 
        error.code === 503 || 
        error.status === 429 || 
        error.code === 429 ||
        msg.includes("503") || 
        msg.includes("UNAVAILABLE") ||
        msg.includes("cancelled") || 
        msg.includes("fetch failed") ||
        msg.includes("context") ||
        errString.includes("cancelled") ||
        errString.includes("UNAVAILABLE");

      if (isRetryable) {
        const baseDelay = 2000 * Math.pow(2, i);
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;
        
        console.warn(`Attempt ${i + 1} failed with transient error. Retrying in ${Math.round(delay)}ms...`, msg);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  throw lastError;
}

// Function to detect furniture in the image (Italian Output)
export const detectFurniture = async (
  imageBase64: string, 
  mimeType: string
): Promise<{ items: DetectedItem[], cost: number }> => {
  return retryOperation(async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: getApiKey() });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            {
              text: "Analizza questa immagine di interni. Elenca tutti i mobili distinti, grandi elettrodomestici e principali elementi decorativi visibili (es. 'Divano', 'Tavolino', 'Lampadario', 'Letto', 'Armadio', 'Tappeto'). Restituisci SOLO un array JSON di stringhe semplici in italiano. Esempio output: [\"Divano\", \"Tavolo\"]. Non usare oggetti, solo stringhe.",
            },
            {
              inlineData: {
                data: imageBase64,
                mimeType: mimeType,
              },
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      let text = response.text || "[]";
      // Sanitization
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      let items: any[] = [];
      try {
          items = JSON.parse(text);
      } catch (e) {
          // Fallback if strict JSON parsing fails, try to extract list items via regex
          const matches = text.match(/"([^"]+)"/g);
          if (matches) {
             items = matches.map(m => m.replace(/"/g, ''));
          } else {
             items = ["Arredi", "Strutture"];
          }
      }
      
      // Strict validation to ensure we have a flat array of strings
      if (!Array.isArray(items)) {
          // Attempt to fix if it returned an object wrapper like { items: [...] }
          if (items && typeof items === 'object') {
              const values = Object.values(items).find(v => Array.isArray(v));
              if (values) items = values as any[];
              else items = ["Elementi rilevati"];
          } else {
              items = ["Elementi rilevati"];
          }
      }

      const detected = items.map((label: any, index: number) => {
        let labelStr = "Elemento";
        
        if (typeof label === 'string') {
          labelStr = label;
        } else if (typeof label === 'object' && label !== null) {
          labelStr = label.label || label.name || label.item || label.text || safeStringify(label);
        } else {
          labelStr = String(label);
        }
        
        if (labelStr.startsWith('"') && labelStr.endsWith('"')) {
            labelStr = labelStr.slice(1, -1);
        }

        return {
          id: `item-${index}`,
          label: labelStr,
          selected: true, 
          notes: ''
        };
      });

      return { items: detected, cost: PRICING_CONFIG.ANALYSIS_COST };

    } catch (error) {
      console.error("Detection Error (will retry if transient):", error);
      throw error;
    }
  }).catch((finalError) => {
    console.error("Final Detection Error after retries:", finalError);
    return { 
      items: [
        { id: '1', label: 'Arredamento Principale', selected: true, notes: '' },
        { id: '2', label: 'Illuminazione & Decorazioni', selected: true, notes: '' },
      ],
      cost: 0 // Failed call implies 0 cost usually
    };
  });
};

export const generateInteriorDesign = async (
  imageBase64: string,
  config: GenerationConfig,
  mimeType: string = "image/jpeg"
): Promise<{ image: string, cost: number }> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  // === SMART EDIT MODE LOGIC ===
  if (config.mode === AppMode.EDITING) {
     const prompt = `
       You are an expert interior design editor and product retoucher.
       TASK: Modify ONLY specific elements of the provided image based on the user's request, while keeping the rest of the room PIXEL-PERFECT IDENTICAL.
       
       USER REQUEST: "${config.customPrompt}"
       
       STRICT RULES:
       1. **OBJECT IDENTITY PRESERVATION**: If the user asks to modify a specific part of an object (e.g., "change the armrest", "change feet", "add piping"), you MUST PRESERVE the rest of the object exactly as it is. Do NOT generate a different sofa/table/bed just to change a detail.
       2. Change ONLY what is described in the User Request.
       3. Do NOT change the camera angle, lighting, or other furniture unless specifically asked.
       4. The result must be photorealistic and blend perfectly with the existing environment.
       5. If adding an object (like a lamp), ensure it casts correct shadows.
     `;

     return executeGeneration(ai, prompt, imageBase64, mimeType, config, []);
  }

  // === VIRTUAL STAGING MODE (COMPOSITE) ===
  if (config.mode === AppMode.VIRTUAL_STAGING && config.productAssets && config.productAssets.length > 0) {
      const assetsList = config.productAssets.map((p, idx) => `${idx + 1}. ${p.label}`).join("\n");
      
      const prompt = `
      You are a World-Class Interior Stylist and Virtual Stager.
      
      INPUTS:
      - Main Image: An empty or partially furnished room (The Environment).
      - Additional Images: Specific product shots (The Assets).
      
      TASK:
      Compose a photorealistic room by placing the provided ASSETS into the ENVIRONMENT.
      
      ASSETS TO PLACE:
      ${assetsList}
      
      INSTRUCTIONS:
      1. PERSPECTIVE MATCHING: You must infer the perspective/vanishing point of the room and rotate/scale the assets to fit naturally.
      2. COMPOSITION: Arrange the furniture harmoniously. 
         - A Bed should go against a suitable wall.
         - Nightstands go next to the bed.
         - Wardrobes go against larger walls.
      3. LIGHTING INTEGRATION: The assets must cast shadows on the floor/walls consistent with the room's light source.
      4. STYLE HARMONY: If the room needs other elements (rugs, lamps) to look complete, generate them to match the style of the assets.
      
      OUTPUT:
      A finalized, fully furnished interior photo.
      `;

      // Construct parts array: Prompt + Room + Asset Images
      const parts: any[] = [
          { text: prompt },
          { inlineData: { data: imageBase64, mimeType: mimeType } } // The Room
      ];

      // Append all assets
      for (const asset of config.productAssets) {
          if (asset.base64) {
              parts.push({ inlineData: { data: asset.base64, mimeType: "image/png" } });
          }
      }

      return executeGenerationMultiModal(ai, parts, config);
  }

  // === RESTYLING MODE LOGIC (Original) ===
  const lockedItems = config.itemsToLock.filter(i => i.selected);
  const removedItems = config.itemsToLock.filter(i => !i.selected).map(i => i.label).join(", ");
  const strictLockItems = lockedItems.filter(i => !i.notes || i.notes.trim().length === 0);
  const modifiedLockItems = lockedItems.filter(i => i.notes && i.notes.trim().length > 0);
  const strictLockNames = strictLockItems.map(i => i.label).join(", ");
  
  const modificationInstructions = modifiedLockItems
    .map(i => `- For the "${i.label}": Keep the exact shape and position, but change appearance to: ${i.notes}`)
    .join("\n");
  
  // Parse Added Items with Details
  const additionsList = config.addedItems && config.addedItems.length > 0 
    ? config.addedItems.map(item => item.detail ? `${item.label} (Style/Color: ${item.detail})` : item.label).join(", ") 
    : "";

  const styleObj = STYLES.find(s => s.id === config.style);
  const styleDescription = styleObj ? styleObj.description : config.style;
  const styleName = styleObj ? styleObj.label : config.style;

  const shootingStyleObj = MASTER_SHOOTING_STYLES.find(s => s.id === config.shootingStyle);
  const shootingStyleDescription = shootingStyleObj ? shootingStyleObj.description : config.shootingStyle;

  const prompt = `
    You are an expert interior design photo editor. Your task is to RESTYLE the room environment while PRESERVING specific furniture.
    
    TARGET STYLE: "${styleName}"
    STYLE DESCRIPTION: ${styleDescription}

    MASTER SHOOTING STYLE:
    ${shootingStyleDescription}
    (Apply this photographic aesthetic strictly).

    === PRIORITY 1: STRICT PRESERVATION ===
    Objects to keep PIXEL-PERFECT: [${strictLockNames || "None"}]
    RULES: DO NOT change color, material, texture, or shape.

    === PRIORITY 2: MODIFIED OBJECTS ===
    ${modificationInstructions || "No modified objects."}

    === PRIORITY 3: ENVIRONMENT & REMOVALS ===
    REMOVE: [${removedItems || "None"}].
    REDESIGN walls, floors, ceiling, windows, rugs to match "${styleName}".
    
    === PRIORITY 4: ADDITIONS ===
    Add these elements naturally: [${additionsList || "None"}]

    OUTPUT REQUIREMENT:
    - Photorealistic 4K render.
    - Seamless blending.
    - Maintain exact camera angle.
    ${config.customPrompt ? `ADDITIONAL USER REQUESTS: ${config.customPrompt}` : ''}
  `;

  return executeGeneration(ai, prompt, imageBase64, mimeType, config, []);
};

// Helper for Generation execution (Single Image Input)
async function executeGeneration(ai: GoogleGenAI, prompt: string, imageBase64: string, mimeType: string, config: GenerationConfig, extraParts: any[] = []): Promise<{ image: string, cost: number }> {
    const parts = [
        { text: prompt },
        { inlineData: { data: imageBase64, mimeType: mimeType } },
        ...extraParts
    ];
    return executeGenerationMultiModal(ai, parts, config);
}

// Helper for Multi-Modal Generation execution (Flexible Inputs)
async function executeGenerationMultiModal(ai: GoogleGenAI, parts: any[], config: GenerationConfig): Promise<{ image: string, cost: number }> {
    const extractImage = (response: any) => {
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image data found in response");
  };

  try {
    return await retryOperation(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: parts,
        },
        config: {
          seed: config.seed,
          imageConfig: {
            aspectRatio: config.ratio,
            imageSize: "4K",
          },
        },
      });
      return { image: extractImage(response), cost: PRICING_CONFIG.IMAGE_GEN_PRO };
    }, 3);
  } catch (error) {
    console.warn("Gemini Pro failed, attempting fallback to Flash Image...", error);
    // Note: Flash might handle multi-image differently or worse, but fallback logic remains
    return await retryOperation(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: parts,
        },
        config: {
          seed: config.seed,
          imageConfig: {
            aspectRatio: config.ratio,
          },
        },
      });
      return { image: extractImage(response), cost: PRICING_CONFIG.IMAGE_GEN_FLASH };
    }, 3);
  }
}

export const generateDetailShot = async (
  fullImageBase64: string,
  rect: { x: number, y: number, width: number, height: number },
  angle: DetailShotAngle,
  description?: string,
  textureReferenceBase64?: string,
  textureTiling: number = 1,
  mimeType: string = "image/jpeg"
): Promise<{ image: string, cost: number }> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  // 1. CROP THE IMAGE WITH CONTEXT
  // Use 60% context to ensure the AI has enough surroundings to generate "bokeh" and background
  const croppedBase64 = await cropBase64Image(fullImageBase64, rect.x, rect.y, rect.width, rect.height, 0.6);

  // 2. DEFINE LIGHTING/ATMOSPHERE (WITHOUT GEOMETRY CHANGES)
  let atmosphereInstruction = "";
  switch (angle) {
    case DetailShotAngle.MACRO_STRAIGHT:
      atmosphereInstruction = "LIGHTING: Direct grazing light to highlight material relief. STYLE: Clinical precision.";
      break;
    case DetailShotAngle.THREE_QUARTER:
      atmosphereInstruction = "LIGHTING: Studio Chiaroscuro. Strong diagonal shadows. STYLE: Dynamic editorial.";
      break;
    case DetailShotAngle.TOP_DOWN:
      atmosphereInstruction = "LIGHTING: Soft diffused skylight. No hard shadows. STYLE: Clean graphic.";
      break;
    case DetailShotAngle.LOW_ANGLE:
      atmosphereInstruction = "LIGHTING: Hero backlight (rim light). STYLE: Monumental.";
      break;
  }

  // 3. DEFINE PROMPT
  const userFocus = description ? `SUBJECT: "${description}"` : "SUBJECT: The main object in the center.";
  
  let prompt = "";
  let parts: any[] = [];

  if (textureReferenceBase64) {
    // === TEXTURE TRANSFER MODE ===
    const processedTextureBase64 = textureTiling > 1 
        ? await tileBase64Image(textureReferenceBase64, textureTiling) 
        : textureReferenceBase64;

    prompt = `
      ROLE: Expert Product Photographer & High-End Retoucher.
      
      INPUTS:
      1. REFERENCE (Image 1): The TRUE GEOMETRY of the object.
      2. MATERIAL (Image 2): The EXACT texture to apply.
      
      TASK: 
      Apply the material from Image 2 onto the object in Image 1, then photograph it with studio quality.
      
      STRICT GEOMETRY LOCK:
      - You are FORBIDDEN from changing the object's shape, folds, design, or proportions.
      - The object in the output must overlap perfectly with the object in Image 1.
      - NO "Creative Re-interpretation". Just High Fidelity Material Mapping.
      
      PHOTOGRAPHIC ENHANCEMENT:
      - ${atmosphereInstruction}
      - Enhance resolution and sharpness.
      - Apply realistic material physics (specularity, roughness) based on Image 2.
      - Use a shallow depth of field (Bokeh) to blur the background, but keep the subject sharp.
      
      OUTPUT: A hyper-realistic, pixel-perfect detail shot.
    `;
    
    parts = [
      { text: prompt },
      { inlineData: { data: croppedBase64, mimeType: "image/jpeg" } }, // Image 1
      { inlineData: { data: processedTextureBase64, mimeType: "image/jpeg" } } // Image 2 (Tiled)
    ];

  } else {
    // === STANDARD DETAIL MODE ===
    prompt = `
      ROLE: Expert Documentary Interior Photographer.
      
      INPUT: A crop of a real physical object.
      ${userFocus}
      
      TASK: 
      Take a High-Resolution Photograph of this EXACT object.
      
      STRICT REALISM RULES:
      1. DO NOT HALLUCINATE NEW SHAPES. The object in the output must be the SAME object as the input.
      2. DO NOT CHANGE THE STYLE. If it's a vintage sofa, keep it vintage. If it's modern, keep it modern.
      3. YOUR JOB IS "UPSCALING" AND "LIGHTING". Not "Redesigning".
      
      PHOTOGRAPHIC EXECUTION:
      - ${atmosphereInstruction}
      - Resolve fine details (texture, dust, imperfections) that are blurry in the input.
      - Lighting: Professional studio quality.
      - Lens: 100mm Macro.
      
      OUTPUT: A true-to-life, high-fidelity photograph of the subject.
    `;
    
    parts = [
      { text: prompt },
      { inlineData: { data: croppedBase64, mimeType: "image/jpeg" } },
    ];
  }

  const extractImage = (response: any) => {
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image data found in response");
  };

  return retryOperation(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: parts,
        },
        config: {
          imageConfig: {
            aspectRatio: "4:3",
            imageSize: "2K",
          },
        },
      });
      return { image: extractImage(response), cost: PRICING_CONFIG.IMAGE_GEN_PRO };
    }, 3);
};
