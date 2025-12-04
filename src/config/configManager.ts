import defaultPresets from './presets.json';

const CONFIG_KEY = 'gphomemorph_config_v1';

// Type for the full config structure matching presets.json
export interface AppConfig {
  pricing: typeof defaultPresets.pricing;
  baseContext: string;
  styles: Array<{ id: string; label: string; code: string; description: string; image?: string }>;
  shootingStyles: Array<{ id: string; label: string; code: string; description: string }>;
  roomTypes: Array<{ id: string; label: string; icon: string }>;
  roomAddons: Record<string, string[]>;
  materials: Array<{ id: string; label: string; category: string; prompt: string }>;
}

export const ConfigManager = {
  // Load config: Try LocalStorage first, fall back to JSON default
  load(): AppConfig {
    try {
      const stored = localStorage.getItem(CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Basic validation: check if 'styles' exists
        if (parsed.styles && Array.isArray(parsed.styles)) {
          return { ...defaultPresets, ...parsed }; // Merge to ensure new keys from default exist
        }
      }
    } catch (e) {
      console.error("Failed to load config from storage", e);
    }
    return defaultPresets as AppConfig;
  },

  // Save config to LocalStorage
  save(config: AppConfig) {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      // Optional: Trigger a reload or event if needed, but for now we rely on App state
    } catch (e) {
      console.error("Failed to save config", e);
      alert("Errore nel salvataggio della configurazione (LocalStorage pieno?)");
    }
  },

  // Reset to default JSON
  reset() {
    localStorage.removeItem(CONFIG_KEY);
    window.location.reload(); // Force reload to apply defaults
  },

  // Export as JSON file
  exportToFile(config: AppConfig) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "gphomemorph_config.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  },

  // Import from JSON file
  importFromFile(file: File): Promise<AppConfig> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (!json.styles || !json.materials) throw new Error("Invalid Config Format");
          this.save(json);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      };
      reader.readAsText(file);
    });
  }
};