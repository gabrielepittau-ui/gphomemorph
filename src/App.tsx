import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Image as ImageIcon, Download, Sparkles, RefreshCw, X, AlertCircle, ScanEye, CheckSquare, Square, Edit3, ArrowRight, Palette, LayoutTemplate, Layers, Zap, Camera, Plus, Armchair, BarChart3, Building, Users, Target, Briefcase, FileText, TrendingUp, TrendingDown, MapPin, DollarSign, Clock, Copy, Loader2, Check, UserPlus, ZoomIn, Crosshair, MousePointer2, MoveUpRight, Type, Send, Video, ChevronRight, FileImage, Grid3X3, Coins, Frame, Save, FolderOpen, Package, Trash2 } from 'lucide-react';
import { ArchitecturalStyle, AspectRatio, GenerationConfig, DetectedItem, MasterShootingStyle, RoomType, AppMode, AddedItem, DetailPoint, DetailShotAngle, ProductAsset } from './types';
import { STYLES, ASPECT_RATIOS, MASTER_SHOOTING_STYLES, ROOM_TYPES, ROOM_ADDONS } from './constants';
import { fileToBase64, generateInteriorDesign, detectFurniture, generateDetailShot } from './services/geminiService';

const App: React.FC = () => {
  // State
  const [apiKeyReady, setApiKeyReady] = useState<boolean>(false);
  
  // === APP CONFIG STATE ===
  const [appMode, setAppMode] = useState<AppMode>(AppMode.RESTYLING);
  const [sessionCost, setSessionCost] = useState<number>(0);

  // === DESIGN MODE STATE ===
  const [file, setFile] = useState<File | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [loadingStage, setLoadingStage] = useState<string>('Inizializzazione...');
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Generation Parameters
  const [selectedStyle, setSelectedStyle] = useState<ArchitecturalStyle>(ArchitecturalStyle.WARM_BRUTALISM);
  const [selectedShootingStyle, setSelectedShootingStyle] = useState<MasterShootingStyle>(MasterShootingStyle.FRONTAL_MASTER_SHOT);
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>(AspectRatio.RATIO_16_9);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [currentRoomType, setCurrentRoomType] = useState<RoomType>(RoomType.LIVING_ROOM);
  
  // New: Added Items with Details
  const [addedItems, setAddedItems] = useState<AddedItem[]>([]);
  
  // New: Product Assets for Virtual Staging
  const [productAssets, setProductAssets] = useState<ProductAsset[]>([]);

  // === CONSISTENCY STATE ===
  const [activeGenerationConfig, setActiveGenerationConfig] = useState<GenerationConfig | null>(null);

  // === EXPORT VARIATIONS STATE ===
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [selectedExportRatios, setSelectedExportRatios] = useState<AspectRatio[]>([]);
  const [variationResults, setVariationResults] = useState<{ratio: AspectRatio, url: string, loading: boolean}[]>([]);
  const [isProcessingVariations, setIsProcessingVariations] = useState<boolean>(false);

  // === DETAIL PHOTOGRAPHER MODE STATE ===
  const [showDetailMode, setShowDetailMode] = useState<boolean>(false);
  const [detailPoints, setDetailPoints] = useState<DetailPoint[]>([]);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Interaction State for Viewfinder
  const [cropRect, setCropRect] = useState<{x: number, y: number, width: number, height: number} | null>(null); // In Pixels for display
  const [viewfinderSize, setViewfinderSize] = useState<number>(150); // Default square size
  const [mousePos, setMousePos] = useState<{x: number, y: number} | null>(null);

  // New: Temp point state for Input Dialog
  const [tempDetailPoint, setTempDetailPoint] = useState<{xPercent: number, yPercent: number, widthPercent: number, heightPercent: number, pixelX: number, pixelY: number} | null>(null);
  const [detailDescription, setDetailDescription] = useState<string>('');
  const [selectedDetailAngle, setSelectedDetailAngle] = useState<DetailShotAngle>(DetailShotAngle.THREE_QUARTER);
  
  // New: Texture Reference State
  const [tempTextureFile, setTempTextureFile] = useState<File | null>(null);
  const [tempTexturePreview, setTempTexturePreview] = useState<string | null>(null);
  const [tempTextureTiling, setTempTextureTiling] = useState<number>(1); // Default 1x (Macro)

  // Setup API Key
  const checkApiKey = useCallback(async () => {
    let envKey = "";
    
    // 1. Try Vite Env (Safe access)
    try {
        // @ts-ignore
        if (import.meta && import.meta.env) {
            // @ts-ignore
            envKey = import.meta.env.VITE_API_KEY;
        }
    } catch (e) {}

    // 2. Try Process Env (Safe access only if defined)
    if (!envKey) {
        try {
            // @ts-ignore
            if (typeof process !== 'undefined' && process.env) {
                // @ts-ignore
                envKey = process.env.API_KEY;
            }
        } catch (e) {}
    }

    if (envKey) {
        setApiKeyReady(true);
        return;
    }

    // 3. Fallback to AI Studio (Sandbox)
    // @ts-ignore
    if (window.aistudio) {
      // @ts-ignore
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setApiKeyReady(hasKey);
    }
  }, []);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  const handleSelectKey = async () => {
    // @ts-ignore
    if (window.aistudio) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      checkApiKey();
    } else {
        alert("In locale devi configurare il file .env con VITE_API_KEY=la_tua_chiave");
    }
  };

  const addToSessionCost = (amount: number) => {
    setSessionCost(prev => prev + amount);
  };

  // === SAVE & LOAD PROJECT LOGIC ===
  const handleSaveProject = () => {
      if (!file || !previewUrl) return;

      const projectData = {
          version: "2.1",
          timestamp: Date.now(),
          originalFileName,
          previewUrl,
          generatedImage,
          config: activeGenerationConfig ? activeGenerationConfig : {
              mode: appMode,
              style: selectedStyle,
              shootingStyle: selectedShootingStyle,
              ratio: selectedRatio,
              itemsToLock: detectedItems,
              addedItems: addedItems,
              productAssets: productAssets.map(p => ({...p, file: undefined})), // exclude file object
              customPrompt: customPrompt,
              seed: undefined 
          },
          detectedItems,
          addedItems,
          detailPoints,
      };

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
          const base64File = reader.result;
          const fullProjectData = {
              ...projectData,
              originalImageBase64: base64File
          };
          
          const blob = new Blob([JSON.stringify(fullProjectData)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Project_${originalFileName}_${Date.now()}.gphm`; 
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      };
  };

  const handleLoadProject = (projectFile: File) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
          try {
              const text = e.target?.result as string;
              const data = JSON.parse(text);
              
              if (data.originalImageBase64) {
                  // Reconstruct File object
                  const res = await fetch(data.originalImageBase64);
                  const blob = await res.blob();
                  const reconstructedFile = new File([blob], data.originalFileName + "_restored", { type: blob.type });
                  
                  setFile(reconstructedFile);
                  setPreviewUrl(data.originalImageBase64); // Base64 works as src
                  setOriginalFileName(data.originalFileName);
                  
                  // Restore State
                  if (data.config) {
                      setAppMode(data.config.mode || AppMode.RESTYLING);
                      setSelectedStyle(data.config.style || ArchitecturalStyle.WARM_BRUTALISM);
                      setSelectedShootingStyle(data.config.shootingStyle || MasterShootingStyle.FRONTAL_MASTER_SHOT);
                      setSelectedRatio(data.config.ratio || AspectRatio.RATIO_16_9);
                      setCustomPrompt(data.config.customPrompt || '');
                      setActiveGenerationConfig(data.config);
                  }
                  
                  setDetectedItems(data.detectedItems || []);
                  setAddedItems(data.addedItems || []);
                  setGeneratedImage(data.generatedImage || null);
                  setDetailPoints(data.detailPoints || []);
                  
                  // Reset UI
                  setError(null);
                  setVariationResults([]);
              }
          } catch (err) {
              console.error("Failed to load project", err);
              setError("Impossibile caricare il file di progetto. Formato non valido.");
          }
      };
      reader.readAsText(projectFile);
  };


  // === DESIGN HANDLERS ===
  const processFile = async (selectedFile: File) => {
    // Check if it's a project file
    if (selectedFile.name.endsWith('.gphm') || selectedFile.type === 'application/json') {
        handleLoadProject(selectedFile);
        return;
    }

    // INCREASED LIMIT TO 20MB
    if (selectedFile.size > 20 * 1024 * 1024) {
      setError("File troppo grande. Per favore carica un'immagine inferiore a 20MB.");
      return;
    }
    
    setFile(selectedFile);
    const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
    setOriginalFileName(nameWithoutExt);

    setGeneratedImage(null);
    setActiveGenerationConfig(null); 
    setError(null);
    setDetectedItems([]);
    setAddedItems([]);
    setVariationResults([]);
    setDetailPoints([]);
    
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    if (apiKeyReady) {
      await analyzeImage(selectedFile);
    }
  };

  const analyzeImage = async (imageFile: File) => {
    setIsAnalyzing(true);
    try {
      const base64 = await fileToBase64(imageFile);
      const { items, cost } = await detectFurniture(base64, imageFile.type);
      setDetectedItems(items);
      addToSessionCost(cost);
    } catch (err) {
      console.error(err);
      setError("Impossibile analizzare l'immagine. Riprova.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      await processFile(event.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const clearImage = () => {
    setFile(null);
    setOriginalFileName('');
    setPreviewUrl(null);
    setGeneratedImage(null);
    setActiveGenerationConfig(null);
    setDetectedItems([]);
    setAddedItems([]);
    setProductAssets([]); // Clear assets
    setVariationResults([]);
    setDetailPoints([]);
    setError(null);
    setProgress(0);
    setAppMode(AppMode.RESTYLING);
  };

  const toggleItemSelection = (id: string) => {
    setDetectedItems(prev => prev.map(item => 
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  };

  const updateItemNotes = (id: string, notes: string) => {
    setDetectedItems(prev => prev.map(item => 
      item.id === id ? { ...item, notes } : item
    ));
  };
  
  // === NEW ADDED ITEMS LOGIC ===
  const toggleAddedItem = (itemLabel: string) => {
    setAddedItems(prev => {
      const exists = prev.find(i => i.label === itemLabel);
      if (exists) {
        return prev.filter(i => i.label !== itemLabel);
      } else {
        return [...prev, { id: `add-${Date.now()}-${Math.random()}`, label: itemLabel, detail: '' }];
      }
    });
  };

  const updateAddedItemDetail = (label: string, detail: string) => {
    setAddedItems(prev => prev.map(item => 
      item.label === label ? { ...item, detail } : item
    ));
  };

  // === VIRTUAL STAGING LOGIC ===
  const handleProductUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const previewUrl = URL.createObjectURL(file);
          const base64 = await fileToBase64(file);
          
          setProductAssets(prev => [
              ...prev, 
              { 
                  id: `prod-${Date.now()}`, 
                  file, 
                  previewUrl, 
                  base64,
                  label: "Nuovo Prodotto" 
              }
          ]);
      }
  };

  const removeProductAsset = (id: string) => {
      setProductAssets(prev => prev.filter(p => p.id !== id));
  };

  const updateProductLabel = (id: string, label: string) => {
      setProductAssets(prev => prev.map(p => p.id === id ? { ...p, label } : p));
  };


  const startProgressSimulation = () => {
    setProgress(0);
    setLoadingStage('Analisi geometrica...');
    if (progressInterval.current) clearInterval(progressInterval.current);

    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        let increment = 0;
        if (prev < 30) increment = 2;
        else if (prev < 60) increment = 0.5;
        else if (prev < 85) increment = 0.2;
        else if (prev < 95) increment = 0.05;
        
        const newProgress = Math.min(prev + increment, 98);
        
        let modeLabel = 'Applicazione stile...';
        if (appMode === AppMode.EDITING) modeLabel = 'Modifica puntuale...';
        if (appMode === AppMode.VIRTUAL_STAGING) modeLabel = 'Composizione prodotti...';

        if (newProgress > 10 && newProgress < 30) setLoadingStage(modeLabel);
        if (newProgress > 30 && newProgress < 50) setLoadingStage(appMode === AppMode.VIRTUAL_STAGING ? 'Armonizzazione luci...' : 'Integrazione elementi...');
        if (newProgress > 50 && newProgress < 75) setLoadingStage('Rendering volumetrico...');
        if (newProgress > 75) setLoadingStage('Finitura 4K...');

        return newProgress;
      });
    }, 100);
  };

  const handleGenerateDesign = async () => {
    if (!file || !apiKeyReady) return;

    setIsGenerating(true);
    setVariationResults([]); 
    setDetailPoints([]); // Clear details on new gen
    setError(null);
    startProgressSimulation();

    try {
      const base64 = await fileToBase64(file);
      const seed = Math.floor(Math.random() * 2147483647);
      
      const config: GenerationConfig = {
        mode: appMode,
        style: selectedStyle,
        shootingStyle: selectedShootingStyle,
        ratio: selectedRatio,
        itemsToLock: detectedItems,
        addedItems: addedItems,
        productAssets: productAssets,
        customPrompt: customPrompt,
        seed: seed 
      };

      const { image, cost } = await generateInteriorDesign(base64, config, file.type);
      
      addToSessionCost(cost);

      if (progressInterval.current) clearInterval(progressInterval.current);
      setProgress(100);
      setLoadingStage('Completato!');
      
      setTimeout(() => {
        setGeneratedImage(image);
        setActiveGenerationConfig(config);
        setIsGenerating(false);
      }, 400);

    } catch (err: any) {
      console.error(err);
      if (progressInterval.current) clearInterval(progressInterval.current);
      setIsGenerating(false);
      
      if (err && err.message && err.message.includes("Requested entity was not found")) {
        setError("Errore API Key. Per favore seleziona nuovamente la tua chiave.");
        setApiKeyReady(false);
      } else {
        setError("Generazione fallita. Il servizio potrebbe essere sovraccarico, riprova tra poco.");
      }
    }
  };

  const handleDownload = (url: string, ratio?: string) => {
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      const styleCode = STYLES.find(s => s.id === selectedStyle)?.code || '00';
      const shotCode = MASTER_SHOOTING_STYLES.find(s => s.id === selectedShootingStyle)?.code || 'X';
      const ratioSuffix = ratio ? `_${ratio.replace(':', '-')}` : '';
      const finalName = `GP${originalFileName}${styleCode}${shotCode}${ratioSuffix}.png`;
      link.download = finalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // === EXPORT VARIATIONS ===
  const openExportModal = () => {
    const currentRatio = activeGenerationConfig?.ratio || selectedRatio;
    const available = ASPECT_RATIOS.filter(r => r.id !== currentRatio).map(r => r.id);
    setSelectedExportRatios(available);
    setShowExportModal(true);
  };

  const toggleExportRatio = (ratio: AspectRatio) => {
    setSelectedExportRatios(prev => 
      prev.includes(ratio) ? prev.filter(r => r !== ratio) : [...prev, ratio]
    );
  };

  const generateVariations = async () => {
    if (!file || selectedExportRatios.length === 0 || !activeGenerationConfig) return;
    setIsProcessingVariations(true);
    const initialResults = selectedExportRatios.map(ratio => ({ ratio, url: '', loading: true }));
    setVariationResults(initialResults);

    try {
      const base64 = await fileToBase64(file);
      for (const ratio of selectedExportRatios) {
        try {
          const config: GenerationConfig = {
            ...activeGenerationConfig,
            ratio: ratio,
          };
          const { image, cost } = await generateInteriorDesign(base64, config, file.type);
          addToSessionCost(cost);
          setVariationResults(prev => prev.map(item => item.ratio === ratio ? { ...item, url: image, loading: false } : item));
        } catch (error) {
           console.error(`Failed to generate ratio ${ratio}`, error);
           setVariationResults(prev => prev.map(item => item.ratio === ratio ? { ...item, loading: false } : item));
        }
      }
    } catch (err) {
      console.error("Batch process error", err);
    } finally {
      setIsProcessingVariations(false);
    }
  };

  // === DETAIL VIEWFINDER LOGIC ===
  const getCoords = (e: React.MouseEvent) => {
    if (!imageRef.current) return { x: 0, y: 0 };
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x, y, width: rect.width, height: rect.height };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (tempDetailPoint) return; // Freeze if dialog open
    
    const coords = getCoords(e);
    setMousePos({ x: coords.x, y: coords.y });
    
    // Update Crop Rect (Centered on mouse)
    if (coords.x >= 0 && coords.x <= coords.width && coords.y >= 0 && coords.y <= coords.height) {
        setCropRect({
            x: coords.x - (viewfinderSize / 2),
            y: coords.y - (viewfinderSize / 2),
            width: viewfinderSize,
            height: viewfinderSize
        });
    }
  };
  
  const handleWheel = (e: React.WheelEvent) => {
      if (tempDetailPoint) return;
      // Adjust viewfinder size
      const delta = e.deltaY > 0 ? -10 : 10;
      setViewfinderSize(prev => Math.max(50, Math.min(prev + delta, 400)));
  };

  const handleClick = (e: React.MouseEvent) => {
      if (tempDetailPoint || !cropRect || !imageRef.current) return;
      
      const { width, height } = getCoords(e);
      
      // Calculate Percentages
      const xPercent = (cropRect.x / width) * 100;
      const yPercent = (cropRect.y / height) * 100;
      const wPercent = (cropRect.width / width) * 100;
      const hPercent = (cropRect.height / height) * 100;

      setTempDetailPoint({
          xPercent, yPercent, widthPercent: wPercent, heightPercent: hPercent,
          pixelX: cropRect.x + cropRect.width / 2,
          pixelY: cropRect.y + cropRect.height
      });
      setDetailDescription('');
      setSelectedDetailAngle(DetailShotAngle.THREE_QUARTER);
      setTempTextureFile(null);
      setTempTexturePreview(null);
      setTempTextureTiling(1);
  };

  const handleTextureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files[0]) {
         const file = e.target.files[0];
         setTempTextureFile(file);
         const url = URL.createObjectURL(file);
         setTempTexturePreview(url);
     }
  };

  const removeTexture = () => {
      setTempTextureFile(null);
      setTempTexturePreview(null);
      setTempTextureTiling(1);
  };

  const cancelDetailShot = () => {
      setTempDetailPoint(null);
      setDetailDescription('');
      removeTexture();
  };

  const confirmDetailShot = async () => {
    if (!tempDetailPoint || !generatedImage) return;

    let textureBase64: string | undefined = undefined;
    if (tempTextureFile) {
        try {
            textureBase64 = await fileToBase64(tempTextureFile);
        } catch (e) {
            console.error("Texture processing failed", e);
        }
    }

    const newPoint: DetailPoint = {
      id: Date.now().toString(),
      cropRect: { 
          x: tempDetailPoint.xPercent, 
          y: tempDetailPoint.yPercent, 
          width: tempDetailPoint.widthPercent, 
          height: tempDetailPoint.heightPercent 
      },
      shotAngle: selectedDetailAngle,
      description: detailDescription,
      textureReference: textureBase64,
      textureTiling: tempTextureTiling, // PASSING TILING FACTOR
      loading: true
    };

    setDetailPoints(prev => [...prev, newPoint]);
    const rect = { x: tempDetailPoint.xPercent, y: tempDetailPoint.yPercent, width: tempDetailPoint.widthPercent, height: tempDetailPoint.heightPercent };
    setTempDetailPoint(null); // Close input

    try {
      const base64 = generatedImage.split(',')[1];
      const { image, cost } = await generateDetailShot(
          base64, 
          rect, 
          selectedDetailAngle, 
          detailDescription,
          newPoint.textureReference,
          newPoint.textureTiling
      );
      
      addToSessionCost(cost);
      
      setDetailPoints(prev => prev.map(p => 
        p.id === newPoint.id ? { ...p, loading: false, url: image } : p
      ));
    } catch (err) {
      console.error("Detail generation failed", err);
      setDetailPoints(prev => prev.map(p => 
        p.id === newPoint.id ? { ...p, loading: false } : p
      ));
    }
  };

  // === RENDER ===
  if (!apiKeyReady) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F5F7]">
        <div className="max-w-md w-full text-center space-y-6 bg-white p-10 rounded-3xl border border-gray-100 shadow-xl">
          <div className="w-20 h-20 bg-[#8B0000] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-200">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl tracking-tight">
            <span className="font-bold text-black">GP</span>
            <span className="font-bold text-[#8B0000]">HOME</span>
            <span className="font-normal text-black">MORPH</span>
          </h1>
          <p className="text-gray-500 font-medium leading-relaxed">Design d'interni ad alta fedeltà.<br/>Configura il file .env con la tua API Key.</p>
          <button onClick={handleSelectKey} className="w-full py-4 px-6 bg-[#8B0000] hover:bg-[#660000] text-white rounded-full font-semibold transition-all shadow-lg">Seleziona API Key (Solo Cloud)</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-gray-900 flex flex-col md:flex-row font-sans selection:bg-[#8B0000] selection:text-white">
      
      {/* FULL SCREEN LOADING OVERLAY */}
      {isGenerating && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="text-[120px] leading-none font-light text-slate-800 tracking-tighter tabular-nums">
            {Math.round(progress)}%
          </div>
          <div className="w-64 h-1.5 bg-gray-100 rounded-full mt-8 mb-6 overflow-hidden">
             <div 
               className="h-full bg-[#8B0000] transition-all duration-300 ease-out" 
               style={{ width: `${progress}%` }}
             />
          </div>
          <h2 className="text-xl font-bold tracking-widest text-black uppercase mb-2">GENERAZIONE RENDER</h2>
          <p className="text-gray-400 font-medium text-sm">{loadingStage}</p>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-full md:w-[380px] bg-white border-r border-gray-200 h-auto md:h-screen overflow-y-auto z-10 p-6 flex flex-col gap-8 shadow-[4px_0_24px_rgba(0,0,0,0.01)] scroll-smooth">
        
        {/* Header */}
        <div className="space-y-4">
            <div className="flex items-center gap-3 pb-2 justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center shadow-md">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-xl tracking-tight">
                        <span className="font-bold text-black">GP</span>
                        <span className="font-bold text-[#8B0000]">HOME</span>
                        <span className="font-normal text-black">MORPH</span>
                    </h1>
                </div>
                {/* SESSION COST INDICATOR */}
                <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                    <div className="w-5 h-5 bg-[#8B0000]/10 rounded-full flex items-center justify-center">
                        <Coins className="w-3 h-3 text-[#8B0000]" />
                    </div>
                    <span className="text-xs font-bold font-mono text-gray-700">${sessionCost.toFixed(3)}</span>
                </div>
            </div>
        </div>

        {/* MODE SELECTOR */}
        <div className="flex flex-col gap-1.5 p-1 bg-gray-100 rounded-xl">
             <div className="flex gap-1.5">
                <button 
                    onClick={() => setAppMode(AppMode.RESTYLING)}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${appMode === AppMode.RESTYLING ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Restyling
                </button>
                <button 
                    onClick={() => setAppMode(AppMode.EDITING)}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${appMode === AppMode.EDITING ? 'bg-white text-[#8B0000] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Edit
                </button>
             </div>
             <button 
                onClick={() => setAppMode(AppMode.VIRTUAL_STAGING)}
                className={`w-full py-2 text-[10px] font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2 ${appMode === AppMode.VIRTUAL_STAGING ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                <Package className="w-3 h-3" /> Virtual Staging (Prodotti)
             </button>
        </div>

        {/* SIDEBAR CONTENT */}
        <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-8">
            
            {/* If Edit Mode -> Simplified UI */}
            {appMode === AppMode.EDITING && (
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                    <h3 className="text-[#8B0000] font-bold text-sm mb-2 flex items-center gap-2">
                        <Edit3 className="w-4 h-4"/> Modalità Modifica Puntuale
                    </h3>
                    <p className="text-xs text-red-800/70 mb-4 leading-relaxed">
                        L'immagine rimarrà invariata, eccetto per le modifiche richieste qui sotto.
                    </p>
                    <textarea
                        className="w-full bg-white border border-red-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#8B0000] outline-none h-32"
                        placeholder="Es: Sostituisci la lampada sul comodino con una lampada moderna in ottone..."
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                    />
                </div>
            )}

            {/* If Virtual Staging Mode -> Product Library UI */}
            {appMode === AppMode.VIRTUAL_STAGING && (
                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                        <h3 className="text-blue-700 font-bold text-sm mb-2 flex items-center gap-2">
                            <Package className="w-4 h-4"/> Libreria Prodotti
                        </h3>
                        <p className="text-xs text-blue-800/70 mb-4 leading-relaxed">
                            Carica le foto dei prodotti (scontornati o su fondo bianco) che vuoi inserire nella stanza.
                        </p>
                        
                        {/* Product Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {productAssets.map((product) => (
                                <div key={product.id} className="relative group bg-white rounded-xl border border-blue-100 overflow-hidden shadow-sm hover:shadow-md transition-all">
                                    <div className="aspect-square p-2">
                                        <img src={product.previewUrl} className="w-full h-full object-contain" />
                                    </div>
                                    <div className="p-2 border-t border-gray-50">
                                        <input 
                                            type="text" 
                                            value={product.label}
                                            onChange={(e) => updateProductLabel(product.id, e.target.value)}
                                            className="w-full text-[10px] font-bold text-center bg-transparent outline-none focus:text-blue-600"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => removeProductAsset(product.id)}
                                        className="absolute top-1 right-1 bg-white/90 p-1 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            
                            {/* Upload Button */}
                            <div className="aspect-square bg-white border-2 border-dashed border-blue-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors">
                                <label className="cursor-pointer flex flex-col items-center w-full h-full justify-center">
                                    <Plus className="w-6 h-6 text-blue-400 mb-1" />
                                    <span className="text-[10px] font-bold text-blue-400">Aggiungi</span>
                                    <input type="file" accept="image/*" onChange={handleProductUpload} className="hidden" />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* If Restyling Mode -> Full UI */}
            {appMode === AppMode.RESTYLING && file && (
            <>
            <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5" /> Elementi Rilevati
                    </label>
                    {isAnalyzing && <span className="text-[10px] text-[#8B0000] font-bold uppercase animate-pulse">Analisi...</span>}
                </div>

                <div className="space-y-2">
                <div className="max-h-[200px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {detectedItems.map((item) => (
                    <div key={item.id} className={`p-3 rounded-xl border transition-all duration-200 ${item.selected ? 'bg-white border-[#8B0000]' : 'bg-gray-50 border-transparent opacity-60'}`}>
                    <div className="flex items-start gap-3">
                        <button onClick={() => toggleItemSelection(item.id)} className="mt-0.5 focus:outline-none">
                        {item.selected ? <div className="w-5 h-5 bg-[#8B0000] rounded-md flex items-center justify-center"><CheckSquare className="w-3.5 h-3.5 text-white" /></div> : <div className="w-5 h-5 border-2 border-gray-200 bg-white rounded-md"></div>}
                        </button>
                        <div className="flex-1 space-y-2">
                        <span className={`text-sm font-semibold tracking-tight ${item.selected ? 'text-gray-900' : 'text-gray-500 line-through'}`}>{item.label}</span>
                        {item.selected && (
                            <input
                                type="text"
                                placeholder="Note (es. 'legno scuro')"
                                value={item.notes}
                                onChange={(e) => updateItemNotes(item.id, e.target.value)}
                                className="bg-gray-50 w-full rounded-md px-2 py-1 text-xs outline-none border border-transparent focus:border-red-200"
                            />
                        )}
                        </div>
                    </div>
                    </div>
                ))}
                </div>
                </div>

                {/* ADDITIONS SECTION with DETAILS */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5" /> Arricchisci Scena
                </label>
                
                {/* Category Toggles */}
                <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
                    {ROOM_TYPES.map((room) => {
                    const Icon = room.icon;
                    return (
                        <button key={room.id} onClick={() => { setCurrentRoomType(room.id); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase border ${currentRoomType === room.id ? 'bg-[#8B0000] text-white border-[#8B0000]' : 'bg-white text-gray-500 border-gray-200'}`}>
                        <Icon className="w-3 h-3" /> {room.label}
                        </button>
                    );
                    })}
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-1 gap-2">
                    {ROOM_ADDONS[currentRoomType].map((itemLabel) => {
                        const addedItem = addedItems.find(i => i.label === itemLabel);
                        const isSelected = !!addedItem;
                        return (
                            <div key={itemLabel} className={`rounded-lg border transition-all duration-200 ${isSelected ? 'bg-red-50 border-[#8B0000] shadow-sm' : 'bg-gray-50 border-transparent'}`}>
                                <button onClick={() => toggleAddedItem(itemLabel)} className="w-full text-left px-3 py-2 text-xs font-medium flex justify-between items-center text-gray-700">
                                    <span>{itemLabel}</span>
                                    {isSelected ? <Check className="w-3 h-3 text-[#8B0000]" /> : <Plus className="w-3 h-3 text-gray-400" />}
                                </button>
                                {isSelected && (
                                    <div className="px-3 pb-2 pt-0">
                                        <input 
                                            type="text" 
                                            placeholder="Dettagli (colore, materiale, tipo...)"
                                            value={addedItem.detail}
                                            onChange={(e) => updateAddedItemDetail(itemLabel, e.target.value)}
                                            className="w-full text-xs bg-white border border-red-100 rounded px-2 py-1.5 focus:outline-none focus:border-[#8B0000] text-gray-600 placeholder-red-200"
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                </div>
            </div>
            </>
            )}

            {/* STYLE SELECTOR (Available in Restyling & Staging) */}
            {appMode !== AppMode.EDITING && (
                <div className="space-y-4">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2"><Palette className="w-3.5 h-3.5" /> Stile</label>
                    <div className="grid grid-cols-1 gap-2">
                        {STYLES.map((style) => (
                        <button key={style.id} onClick={() => setSelectedStyle(style.id)} className={`w-full px-4 py-3 rounded-xl text-sm font-semibold border text-left flex items-center gap-3 ${selectedStyle === style.id ? 'bg-[#8B0000] text-white border-[#8B0000] shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
                            <span className="font-mono w-6 opacity-60">{style.code}</span> {style.label}
                        </button>
                        ))}
                    </div>
                </div>
            )}

            {/* SHOOTING SELECTOR (Always Available) */}
            <div className="space-y-4">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2"><Camera className="w-3.5 h-3.5" /> Shooting</label>
                <div className="grid grid-cols-1 gap-2">
                    {MASTER_SHOOTING_STYLES.map((style) => (
                    <button key={style.id} onClick={() => setSelectedShootingStyle(style.id)} className={`w-full px-4 py-3 rounded-xl text-left border ${selectedShootingStyle === style.id ? 'bg-gray-900 text-white border-gray-900 shadow-lg' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
                        <div className="flex items-center gap-3"><span className="font-mono w-6 text-xs opacity-60">{style.code}</span><span className="text-sm font-bold uppercase">{style.label}</span></div>
                    </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Prompt Extra</label>
                <textarea className="w-full bg-gray-50 border border-transparent rounded-2xl p-4 text-sm focus:bg-white focus:ring-2 focus:ring-[#8B0000] outline-none h-20" placeholder="Note aggiuntive..." value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} />
            </div>
            
            {/* Common Ratios */}
            <div className="space-y-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2"><LayoutTemplate className="w-3.5 h-3.5" /> Formato</label>
            <div className="flex flex-wrap gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                <button key={ratio.id} onClick={() => setSelectedRatio(ratio.id)} className={`px-3 py-2 text-[11px] font-bold uppercase rounded-lg border ${selectedRatio === ratio.id ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-500'}`}>
                    {ratio.label.split(' ')[0]}
                </button>
                ))}
            </div>
            </div>

        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col h-full md:h-screen overflow-hidden bg-[#F5F5F7]">
            {/* Top Bar */}
            <header className="h-16 bg-white/70 backdrop-blur-xl border-b border-gray-200/50 flex items-center justify-between px-8 z-20 sticky top-0">
                <div className="flex items-center gap-3 text-xs font-semibold tracking-wide">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 text-[#8B0000]">
                        <span>GP HomeMorph</span>
                        <ArrowRight className="w-3 h-3 text-gray-300" />
                        <span>{appMode === AppMode.EDITING ? 'Smart Edit' : appMode === AppMode.VIRTUAL_STAGING ? 'Virtual Staging' : 'Restyling'}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                   {generatedImage && (
                       <>
                       <button onClick={handleSaveProject} className="text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-full shadow-sm flex items-center gap-2">
                           <Save className="w-3.5 h-3.5" /> Salva Progetto
                       </button>
                       <button onClick={() => setShowDetailMode(true)} className="text-xs font-bold text-white bg-black hover:bg-gray-800 px-4 py-2 rounded-full shadow-md flex items-center gap-2">
                           <ZoomIn className="w-3 h-3" /> MODE FOTOGRAFO
                       </button>
                       </>
                   )}
                   <button onClick={clearImage} className="text-xs font-semibold text-gray-500 hover:text-red-500 transition-colors px-4 py-2 rounded-lg">Reset</button>
                </div>
            </header>

            {/* Workspace */}
            <div className="flex-1 p-6 md:p-8 overflow-y-auto flex items-center justify-center custom-scrollbar">
                {!file ? (
                    <div className="w-full max-w-xl h-[400px] border border-dashed border-gray-300 rounded-[2rem] flex flex-col items-center justify-center bg-white hover:bg-gray-50 hover:border-[#8B0000] cursor-pointer group shadow-sm transition-all" onDragOver={handleDragOver} onDrop={handleDrop}>
                        <input type="file" accept="image/*, application/json, .gphm" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full" />
                        <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Upload className="w-8 h-8 text-[#8B0000]" /></div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Carica Foto o Progetto</h3>
                        <p className="text-xs text-gray-400 mt-2 font-medium">Trascina qui l'immagine o un file .gphm</p>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col gap-6 max-w-[1600px] mx-auto">
                        {error && <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3"><AlertCircle className="w-5 h-5" /><span className="text-sm font-medium">{error}</span></div>}

                        <div className="flex flex-col gap-12 w-full pb-24">
                            {/* Original */}
                            <div className="w-full flex flex-col gap-3">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">
                                    {appMode === AppMode.VIRTUAL_STAGING ? 'Stanza Vuota / Ambiente' : 'Originale'}
                                </span>
                                <div className="relative w-full h-[50vh] bg-white rounded-[2rem] overflow-hidden shadow-lg border border-gray-100">
                                    {previewUrl && <img src={previewUrl} alt="Original" className="w-full h-full object-contain p-2" />}
                                    {isAnalyzing && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center"><ScanEye className="w-10 h-10 text-[#8B0000] animate-pulse" /></div>}
                                </div>
                            </div>

                            {/* Generated */}
                            <div className="w-full flex flex-col gap-3">
                                <div className="flex justify-between items-center px-2">
                                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Risultato</span>
                                    {generatedImage && (
                                        <div className="flex gap-2">
                                            <button onClick={openExportModal} className="text-[10px] font-bold text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-full flex items-center gap-1.5"><Copy className="w-3 h-3" /> VARIANTI</button>
                                            <button onClick={() => generatedImage && handleDownload(generatedImage)} className="text-[10px] font-bold text-white bg-[#8B0000] px-4 py-1.5 rounded-full flex items-center gap-1.5"><Download className="w-3 h-3" /> SALVA JPG</button>
                                        </div>
                                    )}
                                </div>
                                <div className="relative w-full h-[75vh] bg-white rounded-[2rem] overflow-hidden border border-dashed border-gray-200 shadow-sm flex items-center justify-center">
                                    {generatedImage ? <img src={generatedImage} alt="Generated" className="w-full h-full object-contain p-2" /> : !isGenerating && <div className="text-center opacity-40"><ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" /><p className="text-sm font-semibold">Pronto a generare</p></div>}
                                </div>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <div className="hidden md:flex justify-center pb-4">
                            <button onClick={handleGenerateDesign} disabled={!file || isGenerating || isAnalyzing} className={`px-12 py-4 rounded-full font-bold text-base shadow-xl transition-all flex items-center gap-3 ${!file || isGenerating || isAnalyzing ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#8B0000] text-white hover:bg-[#660000]'}`}>
                                {isGenerating ? 'Elaborazione...' : <><Sparkles className="w-5 h-5" /> 
                                {appMode === AppMode.EDITING ? 'Applica Modifiche' : appMode === AppMode.VIRTUAL_STAGING ? 'Componi Stanza' : 'Genera Design'}
                                </>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
      </main>

      {/* EXPORT MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Esporta Formati</h2>
              <button onClick={() => setShowExportModal(false)}><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="mb-8">
                <div className="flex flex-wrap gap-3">
                  {ASPECT_RATIOS.filter(r => r.id !== activeGenerationConfig?.ratio).map((ratio) => {
                    const isDone = variationResults.some(r => r.ratio === ratio.id && r.url);
                    return <button key={ratio.id} onClick={() => !isProcessingVariations && !isDone && toggleExportRatio(ratio.id)} disabled={isProcessingVariations || isDone} className={`px-5 py-3 rounded-xl font-bold text-sm border-2 ${selectedExportRatios.includes(ratio.id) ? 'border-[#8B0000] bg-red-50 text-[#8B0000]' : 'border-gray-100 bg-white'} ${isDone ? 'bg-green-50 border-green-200 text-green-700' : ''}`}>{isDone && <Check className="w-4 h-4 mr-2 inline" />}{ratio.label}</button>;
                  })}
                </div>
              </div>
              {!isProcessingVariations && selectedExportRatios.length > 0 && variationResults.every(r => r.url) === false && (
                <button onClick={generateVariations} className="bg-black text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-lg mb-8">Avvia Batch</button>
              )}
              {isProcessingVariations && <div className="mb-8 p-4 bg-red-50 rounded-xl text-[#8B0000] flex items-center gap-2"><Loader2 className="animate-spin w-5 h-5"/> Generazione in corso...</div>}
              {variationResults.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    {variationResults.map((res) => (
                       <div key={res.ratio} className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 group">
                           {res.loading ? <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-gray-300" /></div> : res.url && (
                               <>
                               <img src={res.url} className="w-full h-full object-cover" />
                               <button onClick={() => handleDownload(res.url, res.ratio)} className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"><Download className="w-4 h-4" /></button>
                               </>
                           )}
                       </div>
                    ))}
                  </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DETAIL PHOTOGRAPHER OVERLAY */}
      {showDetailMode && generatedImage && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col md:flex-row select-none">
              {/* Main Canvas */}
              <div 
                  className="flex-1 relative flex items-center justify-center p-8 bg-black overflow-hidden cursor-crosshair" 
                  ref={containerRef}
                  onMouseMove={handleMouseMove}
                  onWheel={handleWheel}
                  onClick={handleClick}
              >
                  <div className="relative inline-block shadow-2xl rounded-sm ring-1 ring-gray-700">
                      <img 
                          ref={imageRef}
                          src={generatedImage} 
                          alt="Master Shot" 
                          className="max-h-[85vh] object-contain pointer-events-none" 
                      />
                      
                      {/* Live Viewfinder (Only when not inputting) */}
                      {!tempDetailPoint && cropRect && (
                          <div 
                            className="absolute border-2 border-white shadow-[0_0_20px_rgba(0,0,0,0.5)] z-20 pointer-events-none"
                            style={{ 
                                left: cropRect.x, 
                                top: cropRect.y, 
                                width: cropRect.width, 
                                height: cropRect.height,
                            }}
                          >
                             {/* Rule of Thirds Grid */}
                             <div className="absolute w-full h-px bg-white/30 top-1/3 left-0"></div>
                             <div className="absolute w-full h-px bg-white/30 top-2/3 left-0"></div>
                             <div className="absolute h-full w-px bg-white/30 left-1/3 top-0"></div>
                             <div className="absolute h-full w-px bg-white/30 left-2/3 top-0"></div>
                             
                             {/* Corners */}
                             <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white"></div>
                             <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white"></div>
                             <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white"></div>
                             <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white"></div>
                          </div>
                      )}

                      {/* Markers for existing shots */}
                      {detailPoints.map(p => (
                          <div 
                            key={p.id}
                            className="absolute bg-white/10 border border-white/40 pointer-events-none"
                            style={{ 
                                left: `${p.cropRect.x}%`, 
                                top: `${p.cropRect.y}%`, 
                                width: `${p.cropRect.width}%`,
                                height: `${p.cropRect.height}%` 
                            }}
                          >
                              {p.loading && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#8B0000] animate-spin" /></div>}
                              {!p.loading && <div className="absolute -top-3 -right-3 w-6 h-6 bg-[#8B0000] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">✓</div>}
                          </div>
                      ))}

                      {/* INPUT POPUP FOR DETAIL CONTEXT */}
                      {tempDetailPoint && (
                          <div 
                              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#1A1A1A] border border-gray-700 p-6 rounded-2xl shadow-2xl z-[100] w-96 animate-in fade-in zoom-in-95"
                              onClick={(e) => e.stopPropagation()} 
                          >
                              <h4 className="text-white text-xs font-bold uppercase mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                                  <Camera className="w-4 h-4 text-[#8B0000]" /> Configura Scatto
                              </h4>
                              
                              <div className="space-y-4">
                                  {/* Subject Description */}
                                  <div className="space-y-1">
                                      <label className="text-[10px] uppercase font-bold text-gray-500">Soggetto</label>
                                      <input 
                                          autoFocus
                                          type="text"
                                          className="w-full bg-[#0A0A0A] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-[#8B0000] outline-none placeholder-gray-600"
                                          placeholder="Es. Tessuto cuscino, Venature legno..."
                                          value={detailDescription}
                                          onChange={(e) => setDetailDescription(e.target.value)}
                                          onKeyDown={(e) => e.key === 'Enter' && confirmDetailShot()}
                                      />
                                  </div>

                                  {/* Camera Angle Selector */}
                                  <div className="space-y-1">
                                      <label className="text-[10px] uppercase font-bold text-gray-500">Angolazione Camera</label>
                                      <div className="grid grid-cols-2 gap-2">
                                          {[
                                              { id: DetailShotAngle.THREE_QUARTER, label: '3/4 Dinamico' },
                                              { id: DetailShotAngle.MACRO_STRAIGHT, label: 'Frontale' },
                                              { id: DetailShotAngle.TOP_DOWN, label: 'Dall\'Alto' },
                                              { id: DetailShotAngle.LOW_ANGLE, label: 'Dal Basso' },
                                          ].map((angle) => (
                                              <button 
                                                  key={angle.id}
                                                  onClick={() => setSelectedDetailAngle(angle.id as DetailShotAngle)}
                                                  className={`text-[10px] py-2 rounded-lg font-bold transition-all border ${selectedDetailAngle === angle.id ? 'bg-[#8B0000] border-[#8B0000] text-white' : 'bg-[#0A0A0A] border-gray-700 text-gray-400 hover:border-gray-50'}`}
                                              >
                                                  {angle.label}
                                              </button>
                                          ))}
                                      </div>
                                  </div>

                                  {/* TEXTURE UPLOAD */}
                                  <div className="space-y-1 pt-2 border-t border-white/10">
                                       <label className="text-[10px] uppercase font-bold text-gray-500 flex justify-between">
                                           <span>Reference Tessuto (Opzionale)</span>
                                           {tempTextureFile && <button onClick={removeTexture} className="text-red-500 hover:text-red-400">Rimuovi</button>}
                                       </label>
                                       
                                       {!tempTextureFile ? (
                                           <div className="relative group">
                                               <div className="w-full h-16 border border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-[#8B0000] hover:text-[#8B0000] transition-colors cursor-pointer bg-[#0A0A0A]">
                                                   <Upload className="w-4 h-4 mb-1" />
                                                   <span className="text-[10px]">Carica macro tessuto</span>
                                               </div>
                                               <input 
                                                   type="file" 
                                                   accept="image/*" 
                                                   className="absolute inset-0 opacity-0 cursor-pointer"
                                                   onChange={handleTextureUpload}
                                                />
                                           </div>
                                       ) : (
                                           <div className="flex gap-2">
                                               <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-600 bg-gray-800">
                                                   <img src={tempTexturePreview || ''} className="w-full h-full object-cover" />
                                               </div>
                                               <div className="flex-1 space-y-2 pt-1">
                                                   {/* TILING SLIDER */}
                                                   <div className="flex justify-between items-center text-[9px] text-gray-400 uppercase font-bold">
                                                       <span>Densità Trama</span>
                                                       <span className="text-[#8B0000]">x{tempTextureTiling}</span>
                                                   </div>
                                                   <input 
                                                      type="range" 
                                                      min="1" 
                                                      max="10" 
                                                      step="1"
                                                      value={tempTextureTiling}
                                                      onChange={(e) => setTempTextureTiling(parseInt(e.target.value))}
                                                      className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#8B0000]"
                                                   />
                                                   <div className="flex justify-between text-[8px] text-gray-500 font-medium">
                                                       <span>Macro (1:1)</span>
                                                       <span>Micro (Fitta)</span>
                                                   </div>
                                               </div>
                                           </div>
                                       )}
                                  </div>
                              </div>

                              <div className="flex justify-end gap-2 mt-6">
                                  <button onClick={cancelDetailShot} className="px-4 py-2 rounded-lg text-xs font-bold text-gray-400 hover:text-white">Annulla</button>
                                  <button onClick={confirmDetailShot} className="px-4 py-2 rounded-lg text-xs font-bold bg-white text-black hover:bg-gray-200 flex items-center gap-2 shadow-lg">
                                      SCATTA FOTO <Camera className="w-3 h-3"/>
                                  </button>
                              </div>
                              {/* Triangle Arrow */}
                              <div className="absolute -top-2 left-1/2 -ml-2 w-4 h-4 bg-[#1A1A1A] border-t border-l border-gray-700 transform rotate-45"></div>
                          </div>
                      )}


                      <div className="absolute top-4 left-4 bg-black/60 text-white px-4 py-2 rounded-lg backdrop-blur-md text-sm font-medium border border-white/10 pointer-events-none z-30 flex items-center gap-3">
                          <MousePointer2 className="w-4 h-4" />
                          <span>Seleziona Soggetto</span>
                          <span className="w-px h-4 bg-white/20"></span>
                          <div className="flex items-center gap-1"><span className="text-gray-400 text-xs">SCROLL</span> <span className="text-xs">Zoom</span></div>
                      </div>
                  </div>
              </div>

              {/* Sidebar Results */}
              <div className="w-full md:w-[320px] bg-[#0A0A0A] border-l border-white/10 flex flex-col z-50">
                  <div className="p-4 border-b border-white/10 flex justify-between items-center">
                      <h3 className="text-white font-bold flex items-center gap-2"><Camera className="w-5 h-5 text-[#8B0000]" /> Rullino Dettagli</h3>
                      <button onClick={() => setShowDetailMode(false)} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                      {detailPoints.length === 0 && (
                          <div className="text-center text-gray-500 py-10 px-4">
                              <p className="text-sm">Nessun dettaglio scattato.</p>
                              <p className="text-xs mt-2 text-gray-600">Usa il mirino per inquadrare un soggetto e scattare nuove foto artistiche.</p>
                          </div>
                      )}
                      {detailPoints.slice().reverse().map((point) => (
                          <div key={point.id} className="bg-[#1A1A1A] rounded-xl overflow-hidden border border-white/5 group">
                              <div className="aspect-[4/3] relative">
                                  {point.loading ? (
                                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                                          <Loader2 className="w-6 h-6 text-[#8B0000] animate-spin mb-2" />
                                          <span className="text-[10px] uppercase font-bold text-gray-500">Sviluppo in corso...</span>
                                      </div>
                                  ) : point.url ? (
                                      <>
                                      <img src={point.url} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                          <button onClick={() => point.url && handleDownload(point.url, `detail_${point.id}`)} className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all">
                                              SCARICA
                                          </button>
                                      </div>
                                      </>
                                  ) : (
                                      <div className="absolute inset-0 flex items-center justify-center text-red-500 text-xs">Errore</div>
                                  )}
                              </div>
                              <div className="p-3 bg-[#111] flex flex-col gap-1">
                                  <div className="flex justify-between items-center">
                                      <span className="text-[9px] font-bold text-[#8B0000] bg-red-900/20 px-1.5 py-0.5 rounded">{point.shotAngle}</span>
                                      {point.textureReference && (
                                          <div className="flex items-center gap-1 text-[9px] text-gray-400">
                                              <Grid3X3 className="w-3 h-3"/> 
                                              <span>x{point.textureTiling || 1}</span>
                                          </div>
                                      )}
                                  </div>
                                  {point.description && (
                                      <p className="text-[11px] text-white font-medium truncate">"{point.description}"</p>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default App;