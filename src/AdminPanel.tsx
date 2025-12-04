import React, { useState } from 'react';
import { ConfigManager, AppConfig } from './config/configManager';
import { Save, RotateCcw, Download, Upload, Plus, Trash2, Edit2, Check } from 'lucide-react';

interface AdminPanelProps {
  onClose: () => void;
  onSave: (newConfig: AppConfig) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, onSave }) => {
  const [config, setConfig] = useState<AppConfig>(ConfigManager.load());
  const [activeTab, setActiveTab] = useState<'styles' | 'materials' | 'shooting'>('styles');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Temporary state for the row being edited
  const [editForm, setEditForm] = useState<any>({});

  const handleSave = () => {
    ConfigManager.save(config);
    onSave(config);
    onClose();
  };

  const handleReset = () => {
    if (confirm("Sei sicuro di voler ripristinare le impostazioni di fabbrica? Perderai tutte le modifiche.")) {
      ConfigManager.reset();
    }
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const saveEdit = (section: 'styles' | 'materials' | 'shootingStyles') => {
    setConfig(prev => ({
      ...prev,
      [section]: prev[section].map((item: any) => item.id === editingId ? editForm : item)
    }));
    setEditingId(null);
  };

  const deleteItem = (section: 'styles' | 'materials' | 'shootingStyles', id: string) => {
    if (confirm("Eliminare questo elemento?")) {
      setConfig(prev => ({
        ...prev,
        [section]: prev[section].filter((item: any) => item.id !== id)
      }));
    }
  };

  const addItem = (section: 'styles' | 'materials' | 'shootingStyles') => {
    const newId = `${section.slice(0,3)}_${Date.now()}`;
    const newItem = section === 'styles' 
      ? { id: newId, label: 'Nuovo Stile', code: 'NEW', description: 'Descrizione...' }
      : section === 'materials'
      ? { id: newId, label: 'Nuovo Materiale', category: 'Fabric', prompt: 'Descrizione texture...' }
      : { id: newId, label: 'Nuovo Shooting', code: 'X', description: 'Descrizione...' };
    
    setConfig(prev => ({
      ...prev,
      [section]: [...prev[section], newItem]
    }));
    setEditingId(newId);
    setEditForm(newItem);
  };

  // Render Helpers
  const renderInput = (key: string, label: string, textarea = false) => (
    <div className="mb-2">
      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">{label}</label>
      {textarea ? (
        <textarea 
          value={editForm[key] || ''} 
          onChange={e => setEditForm({...editForm, [key]: e.target.value})}
          className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-xs h-20"
        />
      ) : (
        <input 
          type="text" 
          value={editForm[key] || ''} 
          onChange={e => setEditForm({...editForm, [key]: e.target.value})}
          className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-xs"
        />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 text-white flex flex-col font-sans">
      {/* Header */}
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-[#111]">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold tracking-tight text-white">GP CONFIGURATOR</h2>
          <span className="bg-red-900/30 text-red-400 text-[10px] px-2 py-1 rounded border border-red-900/50">ADMIN MODE</span>
        </div>
        <div className="flex gap-3">
          <button onClick={() => ConfigManager.exportToFile(config)} className="p-2 hover:bg-gray-800 rounded text-gray-400" title="Export JSON"><Download className="w-5 h-5"/></button>
          <label className="p-2 hover:bg-gray-800 rounded text-gray-400 cursor-pointer" title="Import JSON">
            <Upload className="w-5 h-5"/>
            <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && ConfigManager.importFromFile(e.target.files[0]).then(c => setConfig(c))} />
          </label>
          <button onClick={handleReset} className="p-2 hover:bg-red-900/30 text-red-500 rounded" title="Factory Reset"><RotateCcw className="w-5 h-5"/></button>
          <div className="w-px h-6 bg-gray-700 mx-2"></div>
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white text-sm font-bold">Annulla</button>
          <button onClick={handleSave} className="bg-[#8B0000] text-white px-6 py-2 rounded font-bold text-sm hover:bg-red-700 flex items-center gap-2"><Save className="w-4 h-4"/> Salva Modifiche</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Tabs */}
        <div className="w-64 bg-[#161616] border-r border-gray-800 p-4 flex flex-col gap-2">
          <button onClick={() => setActiveTab('styles')} className={`w-full text-left px-4 py-3 rounded text-sm font-bold ${activeTab === 'styles' ? 'bg-[#8B0000] text-white' : 'text-gray-400 hover:bg-gray-800'}`}>Stili Architettonici</button>
          <button onClick={() => setActiveTab('materials')} className={`w-full text-left px-4 py-3 rounded text-sm font-bold ${activeTab === 'materials' ? 'bg-[#8B0000] text-white' : 'text-gray-400 hover:bg-gray-800'}`}>Materiali & Texture</button>
          <button onClick={() => setActiveTab('shooting')} className={`w-full text-left px-4 py-3 rounded text-sm font-bold ${activeTab === 'shooting' ? 'bg-[#8B0000] text-white' : 'text-gray-400 hover:bg-gray-800'}`}>Stili Fotografici</button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-black">
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">{activeTab === 'styles' ? 'Libreria Stili' : activeTab === 'materials' ? 'Libreria Materiali' : 'Stili Fotografici'}</h3>
              <button onClick={() => addItem(activeTab === 'shooting' ? 'shootingStyles' : activeTab)} className="bg-white text-black px-4 py-2 rounded font-bold text-xs hover:bg-gray-200">Nuovo Elemento +</button>
            </div>

            <div className="grid gap-4">
              {config[activeTab === 'shooting' ? 'shootingStyles' : activeTab].map((item: any) => (
                <div key={item.id} className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-all">
                  {editingId === item.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        {renderInput('label', 'Nome')}
                        {activeTab !== 'materials' && renderInput('code', 'Codice Breve')}
                        {activeTab === 'materials' && renderInput('category', 'Categoria (Fabric/Wood/Stone)')}
                      </div>
                      {renderInput(activeTab === 'materials' ? 'prompt' : 'description', activeTab === 'materials' ? 'Prompt Tecnico' : 'Descrizione Prompt', true)}
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingId(null)} className="px-3 py-1 rounded border border-gray-600 text-xs">Annulla</button>
                        <button onClick={() => saveEdit(activeTab === 'shooting' ? 'shootingStyles' : activeTab)} className="px-3 py-1 rounded bg-green-900 text-green-100 border border-green-800 text-xs">Salva</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start cursor-pointer" onClick={() => startEdit(item)}>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-bold text-sm">{item.label}</h4>
                          <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded text-gray-400 font-mono">{item.code || item.category}</span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2">{item.description || item.prompt}</p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteItem(activeTab === 'shooting' ? 'shootingStyles' : activeTab, item.id); }} 
                        className="p-2 text-gray-600 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};