import { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  Upload,
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crop,
  X,
  GripVertical,
  Loader2,
  ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import AdminLayout from '@/components/layouts/AdminLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { toast } from 'sonner';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface CropArea {
  id: string;
  x: number; // in canvas pixels
  y: number;
  width: number;
  height: number;
  pageNum: number;
  dataUrl?: string;
  label: string;
}

interface CropFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function AdminPaperCrop() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [pdfDoc, setPdfDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [fileName, setFileName] = useState('');
  const [isRendering, setIsRendering] = useState(false);

  // Crop frame (persists across crops)
  const [cropFrame, setCropFrame] = useState<CropFrame | null>(null);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [isResizingCrop, setIsResizingCrop] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });

  // Crops collected
  const [crops, setCrops] = useState<CropArea[]>([]);
  const [isMakingCrop, setIsMakingCrop] = useState(false);

  const renderPage = useCallback(async (doc: pdfjs.PDFDocumentProxy, pageNum: number, sc: number) => {
    if (!canvasRef.current) return;
    setIsRendering(true);
    try {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: sc });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      if (overlayRef.current) {
        overlayRef.current.width = viewport.width;
        overlayRef.current.height = viewport.height;
      }
      await page.render({ canvasContext: ctx, viewport }).promise;
    } finally {
      setIsRendering(false);
    }
  }, []);

  useEffect(() => {
    if (pdfDoc) renderPage(pdfDoc, currentPage, scale);
  }, [pdfDoc, currentPage, scale, renderPage]);

  // Draw crop frame overlay
  useEffect(() => {
    if (!overlayRef.current) return;
    const canvas = overlayRef.current;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!cropFrame) return;

    const { x, y, width, height } = cropFrame;

    // Darken outside
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.clearRect(x, y, width, height);

    // Border
    ctx.strokeStyle = 'hsl(220 90% 56%)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Corner handles
    const hs = 8;
    ctx.fillStyle = 'white';
    const corners = [
      [x, y], [x + width - hs, y], [x, y + height - hs], [x + width - hs, y + height - hs],
      [x + width / 2 - hs / 2, y], [x + width / 2 - hs / 2, y + height - hs],
      [x, y + height / 2 - hs / 2], [x + width - hs, y + height / 2 - hs / 2],
    ];
    corners.forEach(([cx, cy]) => {
      ctx.fillRect(cx, cy, hs, hs);
      ctx.strokeRect(cx, cy, hs, hs);
    });

    // Size label
    ctx.fillStyle = 'hsl(220 90% 56%)';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${Math.round(width)} × ${Math.round(height)}`, x + 4, y - 6);
  }, [cropFrame]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }
    const arrayBuffer = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    setPdfDoc(doc);
    setTotalPages(doc.numPages);
    setCurrentPage(1);
    setFileName(file.name);
    setCrops([]);
    setCropFrame(null);
    toast.success(`Loaded: ${file.name} (${doc.numPages} pages)`);
  };

  const getCanvasPos = (e: React.MouseEvent) => {
    const canvas = overlayRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const getResizeHandle = (pos: { x: number; y: number }, frame: CropFrame): string => {
    const hs = 12;
    const { x, y, width, height } = frame;
    const inX = (px: number) => pos.x >= px - hs / 2 && pos.x <= px + hs / 2;
    const inY = (py: number) => pos.y >= py - hs / 2 && pos.y <= py + hs / 2;
    if (inX(x) && inY(y)) return 'nw';
    if (inX(x + width) && inY(y)) return 'ne';
    if (inX(x) && inY(y + height)) return 'sw';
    if (inX(x + width) && inY(y + height)) return 'se';
    if (inX(x + width / 2) && inY(y)) return 'n';
    if (inX(x + width / 2) && inY(y + height)) return 's';
    if (inX(x) && inY(y + height / 2)) return 'w';
    if (inX(x + width) && inY(y + height / 2)) return 'e';
    return '';
  };

  const getCursor = (e: React.MouseEvent) => {
    if (!cropFrame) return 'crosshair';
    const pos = getCanvasPos(e);
    const handle = getResizeHandle(pos, cropFrame);
    if (handle) return `${handle}-resize`;
    const { x, y, width, height } = cropFrame;
    if (pos.x >= x && pos.x <= x + width && pos.y >= y && pos.y <= y + height) return 'move';
    return 'crosshair';
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!overlayRef.current) return;
    const pos = getCanvasPos(e);

    if (cropFrame) {
      const handle = getResizeHandle(pos, cropFrame);
      if (handle) {
        setIsResizingCrop(true);
        setResizeHandle(handle);
        setDragStart(pos);
        return;
      }
      const { x, y, width, height } = cropFrame;
      if (pos.x >= x && pos.x <= x + width && pos.y >= y && pos.y <= y + height) {
        setIsDraggingCrop(true);
        setDragStart({ x: pos.x - x, y: pos.y - y });
        return;
      }
    }

    // Start drawing new crop
    setIsDrawing(true);
    setDrawStart(pos);
    setCropFrame(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!overlayRef.current) return;
    const pos = getCanvasPos(e);

    if (isDrawing) {
      const x = Math.min(pos.x, drawStart.x);
      const y = Math.min(pos.y, drawStart.y);
      const w = Math.abs(pos.x - drawStart.x);
      const h = Math.abs(pos.y - drawStart.y);
      setCropFrame({ x, y, width: w, height: h });
      return;
    }

    if (isDraggingCrop && cropFrame) {
      const canvas = overlayRef.current;
      const nx = Math.max(0, Math.min(pos.x - dragStart.x, canvas.width - cropFrame.width));
      const ny = Math.max(0, Math.min(pos.y - dragStart.y, canvas.height - cropFrame.height));
      setCropFrame({ ...cropFrame, x: nx, y: ny });
      return;
    }

    if (isResizingCrop && cropFrame) {
      const canvas = overlayRef.current;
      let { x, y, width, height } = cropFrame;
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      setDragStart(pos);

      if (resizeHandle.includes('e')) width = Math.max(20, Math.min(width + dx, canvas.width - x));
      if (resizeHandle.includes('s')) height = Math.max(20, Math.min(height + dy, canvas.height - y));
      if (resizeHandle.includes('w')) { const nx = Math.max(0, x + dx); width = width - (nx - x); x = nx; }
      if (resizeHandle.includes('n')) { const ny = Math.max(0, y + dy); height = height - (ny - y); y = ny; }
      if (width > 10 && height > 10) setCropFrame({ x, y, width, height });
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setIsDraggingCrop(false);
    setIsResizingCrop(false);
  };

  const makeCrop = async () => {
    if (!cropFrame || !canvasRef.current) return;
    if (cropFrame.width < 5 || cropFrame.height < 5) {
      toast.error('Crop area too small');
      return;
    }
    setIsMakingCrop(true);
    try {
      const src = canvasRef.current;
      const tmp = document.createElement('canvas');
      tmp.width = Math.round(cropFrame.width);
      tmp.height = Math.round(cropFrame.height);
      const ctx = tmp.getContext('2d')!;
      ctx.drawImage(src, cropFrame.x, cropFrame.y, cropFrame.width, cropFrame.height, 0, 0, tmp.width, tmp.height);
      const dataUrl = tmp.toDataURL('image/png');
      const newCrop: CropArea = {
        id: Date.now().toString(),
        x: cropFrame.x,
        y: cropFrame.y,
        width: cropFrame.width,
        height: cropFrame.height,
        pageNum: currentPage,
        dataUrl,
        label: `crop_${crops.length + 1}_p${currentPage}`,
      };
      setCrops(prev => [...prev, newCrop]);
      toast.success(`Crop ${crops.length + 1} saved!`);
    } finally {
      setIsMakingCrop(false);
    }
  };

  const removeCrop = (id: string) => {
    setCrops(prev => prev.filter(c => c.id !== id));
  };

  const downloadZip = async () => {
    if (crops.length === 0) { toast.error('No crops to download'); return; }
    const zip = new JSZip();
    crops.forEach((crop, i) => {
      const base64 = crop.dataUrl!.split(',')[1];
      zip.file(`${String(i + 1).padStart(3, '0')}_${crop.label}.png`, base64, { base64: true });
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${fileName.replace('.pdf', '') || 'crops'}_crops.zip`);
    toast.success(`Downloaded ${crops.length} crop(s)`);
  };

  const fitToView = async () => {
    if (!pdfDoc || !containerRef.current) return;
    const page = await pdfDoc.getPage(currentPage);
    const vp = page.getViewport({ scale: 1 });
    const containerW = containerRef.current.clientWidth - 40;
    const newScale = containerW / vp.width;
    setScale(Math.max(0.5, Math.min(3, newScale)));
  };

  const clearAll = () => {
    setPdfDoc(null);
    setTotalPages(0);
    setCurrentPage(1);
    setFileName('');
    setCrops([]);
    setCropFrame(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')!;
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    if (overlayRef.current) {
      const ctx = overlayRef.current.getContext('2d')!;
      ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-4 max-w-screen-2xl mx-auto">
        <AdminPageHeader
          title="Paper Crop Tool"
          description="Upload a PDF, draw crop frames, and export cropped areas as images"
        />

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
          <Button onClick={() => fileInputRef.current?.click()} variant="outline">
            <Upload className="w-4 h-4 mr-2" /> Upload PDF
          </Button>

          {pdfDoc && (
            <>
              <div className="flex items-center gap-1 border rounded-lg px-2 h-9">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => Math.max(0.3, s - 0.25))}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm w-14 text-center">{Math.round(scale * 100)}%</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => Math.min(4, s + 0.25))}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={fitToView}>
                <Maximize2 className="w-4 h-4 mr-1" /> Fit
              </Button>

              <div className="flex items-center gap-1 border rounded-lg px-2 h-9">
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>‹</Button>
                <span className="text-sm">Page {currentPage} / {totalPages}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>›</Button>
              </div>

              <div className="flex-1" />

              <Button
                onClick={makeCrop}
                disabled={!cropFrame || isMakingCrop}
                className="gap-2"
              >
                {isMakingCrop ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crop className="w-4 h-4" />}
                Make Crop
              </Button>

              <Button
                onClick={downloadZip}
                disabled={crops.length === 0}
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Download ZIP ({crops.length})
              </Button>

              <Button variant="ghost" size="sm" onClick={clearAll} className="text-destructive hover:text-destructive">
                <X className="w-4 h-4 mr-1" /> Clear All
              </Button>
            </>
          )}
        </div>

        {!pdfDoc ? (
          <Card
            className="border-2 border-dashed cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
              <Upload className="w-12 h-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">Click to upload a PDF paper</p>
                <p className="text-sm text-muted-foreground mt-1">Draw crop frames on the rendered pages, then export as PNG images</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-4">
            {/* PDF Canvas */}
            <div className="flex-1 min-w-0">
              <div
                ref={containerRef}
                className="relative overflow-auto border rounded-xl bg-muted/30 max-h-[75vh]"
              >
                {isRendering && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/60">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                )}
                <div className="relative inline-block">
                  <canvas ref={canvasRef} className="block" />
                  <canvas
                    ref={overlayRef}
                    className="absolute inset-0"
                    style={{ cursor: cropFrame ? 'crosshair' : 'crosshair' }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={(e) => {
                      if (overlayRef.current) {
                        overlayRef.current.style.cursor = getCursor(e);
                      }
                      handleMouseMove(e);
                    }}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  />
                </div>
              </div>
              {cropFrame && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Crop frame: {Math.round(cropFrame.width)} × {Math.round(cropFrame.height)} px — drag to move, drag handles to resize
                </p>
              )}
            </div>

            {/* Crops sidebar */}
            <div className="w-64 flex-shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Cropped Images</p>
                <Badge variant="secondary">{crops.length}</Badge>
              </div>

              {crops.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8 gap-2">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground text-center">Draw a frame and click "Make Crop"</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                  {crops.map((crop, idx) => (
                    <Card key={crop.id} className="overflow-hidden">
                      <CardContent className="p-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <GripVertical className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs font-mono text-muted-foreground">#{idx + 1}</span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0">p{crop.pageNum}</Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-destructive"
                            onClick={() => removeCrop(crop.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        <img
                          src={crop.dataUrl}
                          alt={crop.label}
                          className="w-full rounded border object-contain max-h-32"
                        />
                        <p className="text-[10px] text-muted-foreground truncate">{crop.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {crops.length > 0 && (
                <Button className="w-full" onClick={downloadZip}>
                  <Download className="w-4 h-4 mr-2" />
                  Download ZIP ({crops.length})
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
