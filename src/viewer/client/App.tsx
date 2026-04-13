import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Icon } from '@iconify/react';
import Lottie from 'lottie-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Attachment {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  ext?: string;
  children?: Attachment[];
}

export default function App() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    // Check localStorage for saved theme, default to 'dark'
    return (localStorage.getItem('explorer-theme') as 'dark' | 'light') || 'dark';
  });

  // Persist theme to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('explorer-theme', theme);
  }, [theme]);
  const [search, setSearch] = useState("");
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<Attachment | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [dialog, setDialog] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    type: 'alert' | 'confirm' | 'prompt'; 
    value?: string;
    onClose: (result?: string | boolean) => void; 
  }>({ isOpen: false, title: '', message: '', type: 'alert', onClose: () => {} });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAttachments();
  }, []);

  // System UI Helpers
  const showAlert = (message: string, title = "System") => {
    return new Promise(resolve => {
      setDialog({ isOpen: true, title, message, type: 'alert', onClose: () => {
        setDialog(prev => ({ ...prev, isOpen: false }));
        resolve(true);
      }});
    });
  };

  const showConfirm = (message: string, title = "Confirmation") => {
    return new Promise<boolean>(resolve => {
      setDialog({ isOpen: true, title, message, type: 'confirm', onClose: (res) => {
        setDialog(prev => ({ ...prev, isOpen: false }));
        resolve(!!res);
      }});
    });
  };

  const showPrompt = (message: string, defaultValue = "", title = "Input Needed") => {
    return new Promise<string | null>(resolve => {
      setDialog({ isOpen: true, title, message, type: 'prompt', value: defaultValue, onClose: (res) => {
        setDialog(prev => ({ ...prev, isOpen: false }));
        resolve(typeof res === 'string' ? res : null);
      }});
    });
  };

  const fetchAttachments = async () => {
    try {
      const res = await fetch("/api/attachments");
      const data = await res.json();
      
      const addExt = (items: Attachment[]): Attachment[] => {
        return items.map(item => ({
          ...item,
          ext: item.type === 'file' ? '.' + item.name.split('.').pop()?.toLowerCase() : undefined,
          children: item.children ? addExt(item.children) : []
        }));
      };
      
      setAttachments(addExt(data));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentLevel = useMemo(() => {
    let items = currentPath.reduce((acc, part) => {
      const found = acc.find(a => a.name === part);
      return found?.children || [];
    }, attachments);

    if (search) {
      items = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
    }

    // Sort: directories first, then alphabetically
    return [...items].sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'directory' ? -1 : 1;
    });
  }, [currentPath, attachments, search]);

  const handleItemClick = (e: React.MouseEvent, item: Attachment) => {
    e.stopPropagation();
    const newSelected = new Set(selectedPaths);
    
    if (e.ctrlKey || e.metaKey) {
      if (newSelected.has(item.path)) newSelected.delete(item.path);
      else newSelected.add(item.path);
    } else if (e.shiftKey && selectedPaths.size > 0) {
      newSelected.add(item.path);
    } else {
      newSelected.clear();
      newSelected.add(item.path);
    }
    setSelectedPaths(newSelected);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const pathQuery = currentPath.join("/");
    try {
      const res = await fetch(`/api/upload?path=${encodeURIComponent(pathQuery)}`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) fetchAttachments();
    } catch (err) {
      showAlert("Upload failed", "Error");
    }
  };

  const createFolder = async () => {
    const name = await showPrompt("Enter folder name:", "", "New Folder");
    if (!name) return;
    const path = [...currentPath, name].join("/");
    try {
      const res = await fetch("/api/mkdir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      if (res.ok) fetchAttachments();
      else showAlert("Failed to create folder. It might already exist.", "Error");
    } catch (err) {
      showAlert("An unexpected error occurred", "Error");
    }
  };

  return (
    <div className={`flex h-screen flex-col bg-[var(--bg)] transition-colors duration-500 ${theme}`} onClick={() => setSelectedPaths(new Set())}>
      {/* Windows 11 Header */}
      <div className="flex items-center space-x-4 p-3 px-6 glass-nav z-10">
        <div className="flex items-center space-x-2 mr-4">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
             <Icon icon="logos:pwa" width={16} />
          </div>
          <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-[var(--text)] to-[var(--text-dim)] bg-clip-text text-transparent">Project Studio Explorer</span>
        </div>

        <div className="flex-1 flex items-center space-x-2">
           <div className="flex items-center space-x-1">
             <NavBtn icon="lucide:arrow-left" disabled={currentPath.length === 0} onClick={() => setCurrentPath(currentPath.slice(0, -1))} />
             <NavBtn icon="lucide:arrow-up" onClick={() => setCurrentPath([])} />
           </div>

           <div className="flex-1 flex items-center h-9 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 space-x-2 transition focus-within:ring-2 focus-within:ring-blue-500/40 focus-within:bg-[var(--bg)]">
             <Icon icon="lucide:folder" className="text-amber-500" width={16} />
             <div className="flex items-center text-xs overflow-hidden">
                <button className="breadcrumb-item" onClick={() => setCurrentPath([])}>Attachments</button>
                {currentPath.map((segment, i) => (
                  <React.Fragment key={segment}>
                    <Icon icon="lucide:chevron-right" width={12} className="mx-0.5 opacity-30" />
                    <button className="breadcrumb-item truncate max-w-[120px]" onClick={() => setCurrentPath(currentPath.slice(0, i + 1))}>{segment}</button>
                  </React.Fragment>
                ))}
             </div>
           </div>

           <div className="flex-1 max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 flex items-center space-x-2 focus-within:ring-2 focus-within:ring-blue-500/30 transition-all">
            <Icon icon="lucide:search" width={16} className="text-[var(--text)] opacity-40" />
            <input 
              type="text" 
              placeholder="Search folder"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-xs font-bold px-2 text-[var(--text)] placeholder:text-[var(--text)]/30"
            />
          </div>
        </div>
      </div>

      {/* Ribbon / Toolbar */}
      <div className="flex items-center space-x-2 p-2 px-6 bg-[var(--bg)]/80 backdrop-blur-md border-b border-[var(--border)] scrollbar-hide overflow-x-auto">
         <ToolbarBtn icon="lucide:plus" label="New" onClick={createFolder} color="text-blue-500" />
         <div className="h-6 w-[1px] bg-[var(--border)] mx-2"></div>
         <ToolbarBtn icon="lucide:upload" label="Upload" onClick={() => fileInputRef.current?.click()} />
         
         {selectedPaths.size === 1 && (
           <ToolbarBtn 
             icon="lucide:edit-3" 
             label="Rename" 
             onClick={async () => {
                const path = Array.from(selectedPaths)[0];
                const parts = path.split('/');
                const oldName = parts[parts.length - 1];
                const newName = await showPrompt("Enter new name:", oldName, "Rename Item");
                if (newName && newName !== oldName) {
                  const newPath = [...parts.slice(0, -1), newName].join('/');
                  const res = await fetch("/api/rename", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ oldPath: path, newPath }),
                  });
                  if (res.ok) {
                    fetchAttachments();
                    setSelectedPaths(new Set());
                  } else {
                    showAlert("Failed to rename item", "Error");
                  }
                }
             }} 
           />
         )}

         {selectedPaths.size > 0 && (
            <ToolbarBtn 
              icon="lucide:trash-2" 
              label="Delete" 
              color="text-red-500"
              onClick={async () => {
                const confirmed = await showConfirm(`Are you sure you want to delete ${selectedPaths.size} item(s)? This action cannot be undone.`, "Danger Zone");
                if (confirmed) {
                  try {
                    const res = await fetch("/api/delete", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ paths: Array.from(selectedPaths) }),
                    });
                    
                    if (res.ok) {
                      fetchAttachments();
                      setSelectedPaths(new Set());
                    } else {
                      showAlert("Failed to delete one or more items.", "Error");
                    }
                  } catch (err) {
                    showAlert("An error occurred during deletion.", "Error");
                  }
                }
              }} 
            />
         )}

         <div className="flex-1"></div>

         <ToolbarBtn icon={theme === 'dark' ? "lucide:sun" : "lucide:moon"} label={theme === 'dark' ? "Light" : "Dark"} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
         
         <div className="flex items-center space-x-1 p-1 bg-[var(--surface-hover)] rounded-lg">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 px-3 rounded-md shadow-sm transition ${viewMode === 'grid' ? 'text-blue-500 bg-[var(--bg)] shadow-md' : 'opacity-50 hover:opacity-100'}`}
            >
              <Icon icon="lucide:layout-grid" width={16} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 px-3 rounded-md shadow-sm transition ${viewMode === 'list' ? 'text-blue-500 bg-[var(--bg)] shadow-md' : 'opacity-50 hover:opacity-100'}`}
            >
              <Icon icon="lucide:list" width={16} />
            </button>
         </div>

         <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 mica-surface border-r border-[var(--border)] overflow-y-auto p-3 space-y-4">
          <SidebarSection label="Quick access">
             <SidebarItem icon="lucide:star" label="Favorites" />
             <SidebarItem icon="lucide:clock" label="Recent" />
          </SidebarSection>
          
          <SidebarSection label="This PC">
             <SidebarItem 
              icon="lucide:hard-drive" 
              label="Attachments" 
              active={currentPath.length === 0}
              onClick={() => setCurrentPath([])} 
              color="text-blue-500"
             />
             <div className="mt-2 space-y-1">
               {attachments.filter(a => a.type === 'directory').map(dir => (
                  <TreeItem 
                    key={dir.path} 
                    item={dir} 
                    depth={1}
                    currentPath={currentPath}
                    onNavigate={(p: string[]) => setCurrentPath(p)}
                   />
               ))}
             </div>
          </SidebarSection>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 relative custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentPath.join("/")}
              initial={{ opacity: 0, scale: 0.98, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 1.02, x: -20 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }} 
              className={viewMode === 'grid' 
                ? "grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4"
                : "flex flex-col space-y-1"
              }
            >
              {currentLevel.map((item) => (
                <motion.div 
                   layout
                   key={item.path}
                   onClick={(e) => handleItemClick(e, item)}
                   onDoubleClick={() => item.type === 'directory' ? setCurrentPath([...item.path.split('/')]) : setPreviewItem(item)}
                   className={`explorer-card group flex items-center transition-all ${
                     viewMode === 'grid' 
                       ? "flex-col p-4 text-center aspect-square justify-center" 
                       : "flex-row p-2 text-left space-x-4 h-12"
                   } ${selectedPaths.has(item.path) ? 'active-selection' : 'hover:bg-[var(--surface-hover)]'}`}
                >
                  <div className={viewMode === 'grid' ? "w-full flex-1 mb-2 relative flex items-center justify-center p-2 rounded-xl bg-black/5 dark:bg-white/5 overflow-hidden" : "w-8 h-8 flex-shrink-0"}>
                    <AssetIcon item={item} scale={viewMode === 'list' ? 0.4 : 0.8} />
                  </div>
                  <div className={viewMode === 'list' ? "flex-1 flex items-center justify-between" : "w-full"}>
                    <span className={`leading-tight line-clamp-2 px-1 max-w-full font-bold text-[var(--text)] ${viewMode === 'grid' ? 'text-[13px]' : 'text-sm'}`} title={item.name}>
                      {item.name}
                    </span>
                    {viewMode === 'list' && item.size && (
                      <span className="text-[11px] text-white font-normal mr-4 whitespace-nowrap">{Math.round(item.size / 1024)} KB</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
          
          {currentLevel.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full opacity-100 mt-20 text-[var(--text)]">
              <Icon icon="lucide:folder-open" width={80} strokeWidth={1} />
              <p className="text-base mt-4 font-outfit">Empty folder</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-8 border-t border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md flex items-center px-6 text-[12px] font-bold text-[var(--text)] space-x-8">
        <div className="flex items-center space-x-2">
           <span>{currentLevel.length} items</span>
        </div>
        {selectedPaths.size > 0 && (
          <>
            <div className="h-4 w-[1px] bg-[var(--border)]"></div>
            <span className="text-blue-500 font-bold">{selectedPaths.size} item{selectedPaths.size > 1 ? 's' : ''} selected</span>
          </>
        )}
      </div>

      {/* System Dialog */}
      <AnimatePresence>
        {dialog.isOpen && (
          <div className="fixed inset-0 z-[100] custom-dialog-backdrop flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              className="dialog-window glass-nav"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-2 font-outfit text-[var(--text)]">{dialog.title}</h3>
              <p className="text-sm text-[var(--text)] mb-6 leading-relaxed">{dialog.message}</p>
              
              {dialog.type === 'prompt' && (
                <input 
                  autoFocus
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 text-sm mb-6 outline-none focus:ring-2 focus:ring-blue-500/40 transition text-[var(--text)]" 
                  value={dialog.value}
                  onChange={e => setDialog({ ...dialog, value: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter') dialog.onClose(dialog.value);
                    if (e.key === 'Escape') dialog.onClose(false);
                  }}
                />
              )}
              
              <div className="flex justify-end space-x-3">
                {(dialog.type === 'confirm' || dialog.type === 'prompt') && (
                  <button 
                    className="px-5 py-2 rounded-lg text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition text-[var(--text)]"
                    onClick={() => dialog.onClose(false)}
                  >
                    Cancel
                  </button>
                )}
                <button 
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-600/20 transition"
                  onClick={() => dialog.onClose(dialog.type === 'prompt' ? dialog.value : true)}
                >
                  {dialog.type === 'confirm' ? 'Delete' : 'OK'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-6 md:p-12"
            onClick={() => setPreviewItem(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="bg-[var(--bg)] mica-surface p-6 md:p-8 rounded-[32px] window-shadow border border-[var(--border)] w-fit h-fit min-w-[320px] md:min-w-[700px] max-w-[92vw] max-h-[92vh] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-500/10 rounded-2xl">
                      <Icon icon="lucide:file" className="text-blue-500" width={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold font-outfit truncate max-w-[200px] md:max-w-md text-[var(--text)]">{previewItem.name}</h2>
                      <p className="text-[10px] uppercase tracking-widest font-black text-[var(--text-dim)]">File Preview</p>
                    </div>
                 </div>
                 <button onClick={() => setPreviewItem(null)} className="p-3 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all hover:rotate-90 text-[var(--text)]">
                    <Icon icon="lucide:x" width={20} />
                 </button>
              </div>

              <div className="flex-1 min-h-[300px] rounded-[24px] bg-black/5 dark:bg-black/80 overflow-hidden relative border border-[var(--border)] flex flex-col">
                 <BigPreview item={previewItem} />
              </div>

              <div className="mt-8 flex items-center justify-between">
                 <div className="space-y-1">
                    <p className="text-[var(--text-dim)] font-bold uppercase tracking-widest text-[10px]">Location</p>
                    <p className="font-medium text-xs text-[var(--text)] truncate max-w-[200px] md:max-w-md">attachments/{previewItem.path}</p>
                 </div>
                 <button 
                   onClick={() => {
                    const assetUrl = `/attachments/${previewItem.path.split('/').map(segment => encodeURIComponent(segment)).join('/')}`;
                    window.open(assetUrl, '_blank');
                  }}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-sm font-bold shadow-xl shadow-blue-600/30 transition-all hover:scale-105 active:scale-95"
                 >
                    Download
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TreeItem({ item, depth, currentPath, onNavigate }: any) {
  const fullPath = currentPath.join('/');
  const isDescendant = fullPath.startsWith(item.path);
  const [expanded, setExpanded] = useState(isDescendant);
  const hasChildren = item.children?.some((c: any) => c.type === 'directory');
  const isActive = fullPath === item.path;

  // Keep expanded state in sync with external navigation
  useEffect(() => {
    if (isDescendant) setExpanded(true);
  }, [isDescendant]);

  return (
    <div className="flex flex-col">
       <button 
        onClick={() => {
          onNavigate(item.path.split('/'));
          if (hasChildren) setExpanded(!expanded);
        }}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-[13px] transition group border border-transparent ${isActive ? 'bg-blue-500/10 text-blue-500 font-bold border-blue-500/20' : 'hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text)]'}`}
        style={{ paddingLeft: `${depth * 10 + 12}px` }}
      >
        <div className="w-4 h-4 flex items-center justify-center">
          {hasChildren && (
            <Icon 
              icon="lucide:chevron-right" 
              width={10} 
              className={`transition-transform duration-200 text-[var(--text)] opacity-40 ${expanded ? 'rotate-90' : ''}`} 
            />
          )}
        </div>
        <Icon 
          icon={item.type === 'directory' ? (expanded ? "lucide:folder-open" : "lucide:folder") : "lucide:file"} 
          width={16} 
          className={isActive ? 'text-blue-500' : 'text-[var(--text)] opacity-60 group-hover:text-amber-500 group-hover:opacity-100'} 
        />
        <span className="truncate flex-1 text-left text-[var(--text)]">{item.name}</span>
      </button>

      {expanded && hasChildren && (
        <div className="flex flex-col">
          {item.children.filter((c: any) => c.type === 'directory').map((child: any) => (
            <TreeItem 
              key={child.path} 
              item={child} 
              depth={depth + 1} 
              currentPath={currentPath}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NavBtn({ icon, disabled, onClick }: any) {
  return (
    <button 
      disabled={disabled}
      onClick={onClick}
      className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg disabled:opacity-10 transition-all active:scale-90 text-[var(--text)]"
    >
      <Icon icon={icon} width={20} />
    </button>
  );
}

function ToolbarBtn({ icon, label, onClick, color = "" }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center space-x-2 px-4 py-2 hover:bg-[var(--surface-hover)] rounded-lg transition-all text-xs font-bold group ${color} hover:shadow-sm text-[var(--text)]`}
    >
      <Icon icon={icon} width={18} className="group-active:scale-90 transition transform" />
      <span>{label}</span>
    </button>
  );
}

function SidebarSection({ label, children, className = "" }: any) {
  return (
    <div className={className}>
       <div className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-dim)]">{label}</div>
       <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, color = "" }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs transition-all border border-transparent ${active ? 'bg-[var(--bg)] border-[var(--border)] shadow-md' : 'hover:bg-white/5'}`}
    >
      <Icon icon={icon} width={18} className={color || (active ? 'text-blue-500' : 'text-[var(--text)] opacity-60 group-hover:opacity-100')} />
      <span className={active ? 'font-black text-[var(--text)]' : 'text-[var(--text)] font-semibold group-hover:text-blue-500'}>{label}</span>
    </button>
  );
}

function AssetIcon({ item, scale = 1 }: { item: Attachment; scale?: number }) {
  const [lottieData, setLottieData] = useState<any>(null);
  const isLottie = item.ext === '.json';

  useEffect(() => {
    if (isLottie && scale > 0.5) { // Only fetch for grid view or larger scales
      const assetUrl = `/attachments/${item.path.split('/').map(segment => encodeURIComponent(segment)).join('/')}`;
      fetch(assetUrl)
        .then(res => res.json())
        .then(data => {
            if (data.v || data.ip || data.op) setLottieData(data);
        })
        .catch(() => {});
    }
  }, [item.path, isLottie, scale]);

  if (item.type === 'directory') {
    return (
      <div className="relative group">
        <Icon icon="lucide:folder" width={Math.round(84 * scale)} className="text-amber-500/90 group-hover:text-amber-400 transition-colors drop-shadow-md" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
           <Icon icon="lucide:folder-open" width={Math.round(32 * scale)} className="text-white/20" />
        </div>
      </div>
    );
  }

  if (isLottie && lottieData) {
    return (
      <div className="w-full h-full flex items-center justify-center overflow-hidden bg-black/10 dark:bg-white/5 rounded-lg border border-white/5">
        <Lottie animationData={lottieData} loop={true} className="w-full h-full" style={{ width: '100%', height: '100%' }} />
      </div>
    );
  }

  const isImage = ['.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp'].includes(item.ext || '');
  const isAudio = ['.mp3', '.wav', '.ogg', '.m4a'].includes(item.ext || '');

  if (isImage) {
    const assetUrl = `/attachments/${item.path.split('/').map(segment => encodeURIComponent(segment)).join('/')}`;
    return (
      <div className="relative group overflow-hidden rounded-lg shadow-lg border border-white/5 bg-[var(--surface)]">
        <img src={assetUrl} className="object-cover w-full h-full transform group-hover:scale-110 transition-transform duration-500" style={{ width: 80 * scale + 'px', height: 80 * scale + 'px' }} alt="" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
           <Icon icon="lucide:maximize" className="text-white opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all" width={16} />
        </div>
      </div>
    );
  }

  if (isLottie) return <Icon icon="lucide:layers" width={Math.round(64 * scale)} className="text-purple-500/80" />;
  if (isAudio) return <Icon icon="lucide:music" width={Math.round(64 * scale)} className="text-emerald-500/80" />;
  if (item.ext === '.md') return <Icon icon="lucide:file-text" width={Math.round(64 * scale)} className="text-blue-400" />;

  return (
    <div className="relative">
      <Icon icon="lucide:file" width={Math.round(64 * scale)} className="opacity-30" />
      <span className="absolute inset-0 flex items-center justify-center font-black text-[8px] opacity-40 uppercase tracking-tighter mt-2">{item.ext?.replace('.', '')}</span>
    </div>
  );
}

function BigPreview({ item }: { item: Attachment }) {
  const [lottieData, setLottieData] = useState<any>(null);
  const [mdContent, setMdContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (item.ext === '.json') {
      const assetUrl = `/attachments/${item.path.split('/').map(segment => encodeURIComponent(segment)).join('/')}`;
      fetch(assetUrl)
        .then(res => res.json())
        .then(data => {
            if (data.v || data.ip || data.op) setLottieData(data);
            setLoading(false);
        })
        .catch(() => {
          setLottieData(null);
          setLoading(false);
        });
    } else if (item.ext === '.md') {
       const assetUrl = `/attachments/${item.path.split('/').map(segment => encodeURIComponent(segment)).join('/')}`;
       fetch(assetUrl)
        .then(res => res.arrayBuffer())
        .then(buffer => {
            const decoder = new TextDecoder('utf-8');
            let text = decoder.decode(buffer);
            if (text.includes('\u0000')) {
                const utf16Decoder = new TextDecoder('utf-16');
                text = utf16Decoder.decode(buffer);
            }
            setMdContent(text);
            setLoading(false);
        })
        .catch(() => {
          setMdContent("Error loading markdown");
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [item]);

  const isImage = ['.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp'].includes(item.ext || '');
  const isAudio = ['.mp3', '.wav', '.ogg', '.m4a'].includes(item.ext || '');

  const assetUrl = `/attachments/${item.path.split('/').map(segment => encodeURIComponent(segment)).join('/')}`;

  if (loading) return <div className="animate-pulse flex items-center justify-center space-x-2 text-blue-500 font-bold"><Icon icon="lucide:loader-2" className="animate-spin" /><span>Loading Preview...</span></div>;

  if (item.ext === '.json' && lottieData) {
    return (
        <div className="w-full h-full flex items-center justify-center p-4 bg-transparent max-w-[500px] max-h-[500px] mx-auto overflow-hidden">
            <Lottie animationData={lottieData} loop={true} style={{ width: '100%', height: '100%' }} />
        </div>
    );
  }

  if (isImage) return <img src={assetUrl} className="object-contain max-h-[80vh] max-w-full rounded-xl shadow-2xl transition-all duration-700" style={{ margin: 'auto' }} alt="" />;
  
  if (isAudio) return (
     <div className="flex flex-col items-center justify-center p-20 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-[40px] border border-white/5 w-full">
        <div className="w-32 h-32 bg-blue-500/20 rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/20">
          <Icon icon="lucide:music" width={64} className="text-blue-500 animate-pulse" />
        </div>
        <audio controls autoPlay src={assetUrl} className="w-full max-w-md shadow-lg rounded-full" />
        <p className="mt-6 text-xs font-bold opacity-30 uppercase tracking-[0.2em]">{item.name}</p>
     </div>
  );

  if (item.ext === '.md') {
    return (
      <div className="w-full h-full overflow-y-auto bg-[var(--bg)] p-8 md:p-12 markdown-body text-left scroll-smooth custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{mdContent}</ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full opacity-30 p-12 text-center">
        <Icon icon="lucide:file-warning" width={64} className="mb-6 opacity-40" />
        <h3 className="text-lg font-bold font-outfit">No Preview Possible</h3>
        <p className="text-sm italic mt-1">Binary or unsupported file format: {item.ext || 'unknown'}</p>
    </div>
  );
}
