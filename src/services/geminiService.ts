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
        let w = (widthPercent / 100) * img.width;
        let h = (heightPercent / 100) * img.height;
        let x = (xPercent / 100) * img.width;
        let y = (yPercent / 100) * img.height;

        const expansionW = w * expandContext;
        const expansionH = h * expandContext;

        x = x - expansionW;
        y = y - expansionH;
        w = w + (expansionW * 2);
        h = h + (expansionH * 2);

        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x + w > img.width) w = img.width - x;
        if (y + h > img.height) h = img.height - y;

        // Set higher resolution for crop to help AI see details
        canvas.width = 1536; 
        canvas.height = (h / w) * 1536;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
        }

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
    if (tileCount <= 1) return base64;

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const size = 2048;
                canvas.width = size;
                canvas.height = size;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Could not get canvas context for tiling"));
                    return;
                }

                const tileW = size / tileCount;
                const tileH = size / tileCount;

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

// === CLIENT SIDE INPAINTING COMPOSITOR ===
// This function strictly enforces the mask by overlaying the original image 
// onto the generated image wherever the mask is black.
const blendGeneratedWithOriginal = async (originalB64: string, generatedB64: string, maskB64: string): Promise<string> => {
  return new Promise((resolve) => {
    const original = new Image();
    const generated = new Image();
    const mask = new Image();
    
    let loaded = 0;
    const onLoaded = () => {
      loaded++;
      if (loaded === 3) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = original.width;
            canvas.height = original.height;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) { 
                resolve(generatedB64);
                return; 
            }

            // 1. Draw Original Image (Base)
            ctx.drawImage(original, 0, 0);

            // 2. Prepare the Generated Image masked
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = original.width;
            tempCanvas.height = original.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            if (!tempCtx) {
                resolve(generatedB64);
                return;
            }

            // Draw generated image
            tempCtx.drawImage(generated, 0, 0, original.width, original.height);

            // Apply Mask (Keep generated only where mask is white)
            tempCtx.globalCompositeOperation = 'destination-in';
            tempCtx.drawImage(mask, 0, 0, original.width, original.height);

            // 3. Composite Generated onto Original
            ctx.drawImage(tempCanvas, 0, 0);

            resolve(canvas.toDataURL('image/jpeg', 0.95).split(',')[1]);
        } catch (e) {
            console.error("Blending failed", e);
            resolve(generatedB64);
        }
      }
    };

    original.onerror = () => resolve(generatedB64);
    generated.onerror = () => resolve(generatedB64);
    mask.onerror = () => resolve(generatedB64);

    original.onload = onLoaded;
    generated.onload = onLoaded;
    mask.onload = onLoaded;

    original.src = `data:image/jpeg;base64,${originalB64}`;
    generated.src = `data:image/jpeg;base64,${generatedB64}`;
    mask.src = `data:image/png;base64,${maskB64}`;
  });
};

async function retryOperation<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const msg = error.message || "";
      if (msg.includes("503") || msg.includes("429") || msg.includes("overloaded") || msg.includes("fetch failed")) {
        const delay = 1500 * Math.pow(2, i);
        console.warn(`Tentativo ${i + 1} fallito. Riprovo in ${delay}ms...`, msg);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// Function to detect furniture
export const detectFurniture = async (
  imageBase64: string, 
  mimeType: string
): Promise<{ items: DetectedItem[], cost: number }> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key mancante.");

  return retryOperation(async () => {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { text: "Analizza questa immagine. Elenca i mobili e oggetti principali (es. Divano, Tavolo, Lampada). Restituisci SOLO un array JSON di stringhe: [\"Divano\", \"Tavolo\"]." },
            { inlineData: { data: imageBase64, mimeType: mimeType } },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      });

      let text = response.text || "[]";
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      let items: any[] = [];
      try { items = JSON.parse(text); } catch (e) { items = ["Elementi rilevati"]; }
      
      if (!Array.isArray(items)) items = ["Elementi rilevati"];

      const detected = items.map((label: any, index: number) => ({
        id: `item-${index}`,
        label: String(label),
        selected: true, 
        notes: ''
      }));

      return { items: detected, cost: PRICING_CONFIG.ANALYSIS_COST };
    } catch (error) {
      console.error("Detection Error:", error);
      throw error;
    }
  });
};

export const generateInteriorDesign = async (
  imageBase64: string,
  config: GenerationConfig,
  mimeType: string = "image/jpeg"
): Promise<{ image: string, cost: number }> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key mancante.");
  const ai = new GoogleGenAI({ apiKey });

  // === MATERIAL PROMPT BUILDING ===
  const materialPrompts = config.selectedMaterials && config.selectedMaterials.length > 0
      ? `\n=== STRICT MATERIAL PALETTE ===\nUse ONLY these materials for relevant objects:\n${config.selectedMaterials.map(m => `- ${m.prompt}`).join("\n")}\n`
      : "";

  // 1. EDIT MODE PROMPT (STRICT MASKING & COMPOSITING)
  if (config.mode === AppMode.EDITING) {
     let prompt = "";
     
     if (config.maskBase64) {
         // CASE A: User Painted a Mask (Specific Edit)
         prompt = `
         ROLE: Expert Photo Retoucher & Product Designer.
         TASK: Modify ONLY the masked area. 
         
         USER REQUEST: "${config.customPrompt}"
         
         INPUTS:
         - Image 1: Original.
         - Image 2: Mask (White = Edit, Black = Protect).
         
         RULES:
         1. Edit ONLY pixels corresponding to the White Mask.
         2. DO NOT TOUCH the black area. 
         3. Blend lighting perfectly.
         ${materialPrompts}
         `;
     } else {
         // CASE B: Global Edit (No Mask) - DANGEROUS FOR HALLUCINATIONS
         // We must lock the geometry strictly.
         prompt = `
         ROLE: High-End Colorist & Lighting Director.
         TASK: Adjust the atmosphere or specific details WITHOUT changing the 3D model of the furniture.
         
         USER REQUEST: "${config.customPrompt}"
         
         STRICT GEOMETRY LOCK:
         1. The furniture (Sofa, Tables, Chairs) MUST remain EXACTLY the same shape and design.
         2. DO NOT REPLACE FURNITURE MODELS.
         3. You are adjusting Colors, Materials, Lighting, or Framing ONLY.
         4. If the user asks for "Zoom" or "Angle change", crop the existing pixels, DO NOT invent a new room.
         
         ${materialPrompts}
         `;
     }
     
     const parts: any[] = [
         { text: prompt },
         { inlineData: { data: imageBase64, mimeType: mimeType } } 
     ];
     
     if (config.maskBase64) {
         parts.push({ inlineData: { data: config.maskBase64, mimeType: "image/png" } });
     }
     
     const result = await executeGenerationWithFallback(ai, prompt, imageBase64, mimeType, config, config.maskBase64 ? [{ inlineData: { data: config.maskBase64, mimeType: "image/png" } }] : []);

     // CLIENT SIDE COMPOSITING (Only if mask exists)
     if (config.maskBase64) {
        try {
            const blendedImage = await blendGeneratedWithOriginal(imageBase64, result.image.split(',')[1], config.maskBase64);
            return { image: `data:image/jpeg;base64,${blendedImage}`, cost: result.cost };
        } catch (e) {
            console.error("Blending failed, returning raw AI output", e);
            return result;
        }
     }

     return result;
  }

  // 2. VIRTUAL STAGING
  if (config.mode === AppMode.VIRTUAL_STAGING && config.productAssets && config.productAssets.length > 0) {
      const assetsList = config.productAssets.map((p, idx) => `${idx + 1}. ${p.label}`).join("\n");
      const prompt = `Virtual Staging Task. Place these assets into the room: ${assetsList}. Match perspective and lighting.${materialPrompts}`;
      const parts: any[] = [{ text: prompt }, { inlineData: { data: imageBase64, mimeType: mimeType } }];
      for (const asset of config.productAssets) {
          if (asset.base64) parts.push({ inlineData: { data: asset.base64, mimeType: "image/png" } });
      }
      return executeGenerationMultiModalWithFallback(ai, parts, config);
  }

  // 3. RESTYLING PROMPT
  const styleObj = STYLES.find(s => s.id === config.style);
  const styleDescription = styleObj ? styleObj.description : config.style;
  const styleName = styleObj ? styleObj.label : config.style;

  const shootingObj = MASTER_SHOOTING_STYLES.find(s => s.id === config.shootingStyle);
  const shootingDescription = shootingObj ? shootingObj.description : config.shootingStyle;

  const prompt = `
    ROLE: High-End Interior Architect.
    TASK: Restyle this room while preserving its structural integrity.
    
    TARGET STYLE: ${styleName}.
    DESCRIPTION: ${styleDescription}.
    PHOTOGRAPHY: ${shootingDescription}.
    
    ${materialPrompts}

    === GEOMETRY LOCK (ANTI-HALLUCINATION) ===
    - CRITICAL: You MUST PRESERVE the exact perspective, room layout, and structural elements (walls, windows, doors, ceiling height).
    - DO NOT move windows. DO NOT change the room shape.
    - DO NOT hallucinate new architectural features not present in the original image unless explicitly asked.
    
    === EXECUTION PLAN ===
    PRESERVE OBJECTS: [${config.itemsToLock.filter(i=>i.selected && !i.notes).map(i=>i.label).join(", ")}].
    RESTYLE OBJECTS: ${config.itemsToLock.filter(i=>i.selected && i.notes).map(i=>`${i.label} -> ${i.notes}`).join("; ")}.
    ADD NEW ELEMENTS: ${config.addedItems.map(i=>i.label + " " + i.detail).join(", ")}.
    
    Output: Photorealistic 4K render.
    ${config.customPrompt ? `EXTRA INSTRUCTIONS: ${config.customPrompt}` : ''}
  `;

  return executeGenerationWithFallback(ai, prompt, imageBase64, mimeType, config, []);
};

async function executeGenerationWithFallback(ai: GoogleGenAI, prompt: string, imageBase64: string, mimeType: string, config: GenerationConfig, extraParts: any[]): Promise<{ image: string, cost: number }> {
    const parts = [
        { text: prompt },
        { inlineData: { data: imageBase64, mimeType: mimeType } },
        ...extraParts
    ];
    return executeGenerationMultiModalWithFallback(ai, parts, config);
}

async function executeGenerationMultiModalWithFallback(ai: GoogleGenAI, parts: any[], config: GenerationConfig): Promise<{ image: string, cost: number }> {
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
        console.log("Tentativo generazione con Gemini 3 Pro...");
        return await retryOperation(async () => {
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-image-preview',
                contents: { parts },
                config: { seed: config.seed, imageConfig: { aspectRatio: config.ratio, imageSize: "4K" } },
            });
            return { image: extractImage(response), cost: PRICING_CONFIG.IMAGE_GEN_PRO };
        }, 2);
    } catch (error: any) {
        console.warn("Gemini 3 Pro fallito. Provo con Flash...", error.message);
        try {
            return await retryOperation(async () => {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts },
                    config: { seed: config.seed, imageConfig: { aspectRatio: config.ratio } }, 
                });
                return { image: extractImage(response), cost: PRICING_CONFIG.IMAGE_GEN_FLASH };
            }, 2);
        } catch (flashError: any) {
            console.error("Anche Flash fallito.", flashError);
            throw new Error("Servizio momentaneamente non disponibile su tutti i modelli. Riprova.");
        }
    }
}

export const generateDetailShot = async (
  fullImageBase64: string,
  rect: { x: number, y: number, width: number, height: number },
  angle: DetailShotAngle,
  description?: string,
  textureReferenceBase64?: string,
  textureTiling: number = 1
): Promise<{ image: string, cost: number }> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key mancante.");
  const ai = new GoogleGenAI({ apiKey });

  const croppedBase64 = await cropBase64Image(fullImageBase64, rect.x, rect.y, rect.width, rect.height, 0.6);
  
  let prompt = "";

  // === DIVERGE LOGIC BASED ON ANGLE ===
  // 1. MACRO/FRONTAL (Conservative) -> Treat as Upscale
  if (angle === DetailShotAngle.MACRO_STRAIGHT) {
      prompt = `
      ROLE: Forensic Photographer / Image Restorer.
      INPUT: A low-res crop of a specific object.
      TASK: Generate a High-Fidelity 4K Macro shot of THIS EXACT OBJECT.
      
      STRICT RULES:
      1. DO NOT CHANGE THE GEOMETRY. Tracing must match the input perfectly.
      2. DO NOT CHANGE THE STYLE.
      3. Focus on Texture enhancement, Sharpness, and Lighting.
      
      Subject: ${description || "The main object in the crop"}.
      `;
  } 
  // 2. ROTATION/TOP-DOWN (Creative but constrained) -> Treat as 3D Reconstruction
  else {
      prompt = `
      ROLE: 3D Product Visualizer.
      INPUT: Image 1 is the REFERENCE object.
      TASK: Re-visualize THIS EXACT OBJECT from a new angle: ${angle}.
      
      IDENTITY PROTECTION RULES:
      1. You must maintain the exact design identity of the object (e.g. if it's a tufted sofa, keep the tufting pattern identical).
      2. If you rotate the view, extrapolate hidden details based on the visible style. Do not invent unrelated features.
      3. The Context (Background) must match the style of the original room, adapted to the new perspective.
      
      Subject: ${description || "The main object"}.
      `;
  }

  let parts: any[] = [{ text: prompt }, { inlineData: { data: croppedBase64, mimeType: "image/jpeg" } }];

  if (textureReferenceBase64) {
      const tiled = await tileBase64Image(textureReferenceBase64, textureTiling);
      parts.push({ inlineData: { data: tiled, mimeType: "image/jpeg" } });
      prompt += "\nOVERRIDE TEXTURE: Apply the texture from Image 2 to the object in Image 1, keeping the geometry of Image 1.";
      parts[0] = { text: prompt };
  }

  return executeGenerationMultiModalWithFallback(ai, parts, { mode: AppMode.RESTYLING } as any);
};
