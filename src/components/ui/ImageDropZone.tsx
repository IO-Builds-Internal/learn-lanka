import { useRef, useState, useCallback, useEffect } from 'react';
import { Upload, Loader2, ClipboardPaste } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageDropZoneProps {
  onFile: (file: File) => void;
  uploading?: boolean;
  label?: string;
  className?: string;
  listenPaste?: boolean; // attach paste listener to window
}

const ImageDropZone = ({ onFile, uploading = false, label = 'Drop, paste or click to upload', className, listenPaste = false }: ImageDropZoneProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    onFile(file);
  }, [onFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  // Global paste listener
  useEffect(() => {
    if (!listenPaste) return;
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) handleFile(file);
          break;
        }
      }
    };
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, [listenPaste, handleFile]);

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={cn(
        'flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer transition-colors select-none',
        isDragging ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50',
        className,
      )}
    >
      {uploading ? (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      ) : (
        <>
          <div className="flex items-center gap-2 mb-1">
            <Upload className="w-5 h-5 text-muted-foreground" />
            <ClipboardPaste className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="text-xs text-muted-foreground text-center px-3">{label}</span>
          <span className="text-[10px] text-muted-foreground/60 mt-0.5">Drag & drop · Paste (Ctrl+V) · Click</span>
        </>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        e.target.value = '';
      }} />
    </div>
  );
};

export default ImageDropZone;
