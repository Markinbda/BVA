import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type DrawingEvent = React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>;

interface DrillWhiteboardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDrawing: string;
  showTemplate: boolean;
  onShowTemplateChange: (show: boolean) => void;
  onSave: (drawing: string) => void;
}

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const TEMPLATE_IMAGE_SRC = "/whiteboard/volleyball-court-template.svg";
const MARKER_RADIUS = 16;

interface Marker {
  id: string;
  x: number;
  y: number;
  color: string;
}

const MARKER_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#111827", "#ec4899"];

const getPoint = (event: DrawingEvent, canvas: HTMLCanvasElement) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  let clientX = 0;
  let clientY = 0;

  if ("touches" in event && event.touches.length > 0) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else if ("changedTouches" in event && event.changedTouches.length > 0) {
    clientX = event.changedTouches[0].clientX;
    clientY = event.changedTouches[0].clientY;
  } else {
    const mouseEvent = event as React.MouseEvent<HTMLCanvasElement>;
    clientX = mouseEvent.clientX;
    clientY = mouseEvent.clientY;
  }

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });

const isCanvasEmpty = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 0) return false;
  }
  return true;
};

const DrillWhiteboardModal = ({
  open,
  onOpenChange,
  initialDrawing,
  showTemplate,
  onShowTemplateChange,
  onSave,
}: DrillWhiteboardModalProps) => {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  const [strokeColor, setStrokeColor] = useState("#ef4444");
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const markerColorById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const marker of markers) map[marker.id] = marker.color;
    return map;
  }, [markers]);

  useEffect(() => {
    if (!open) return;

    setMarkers([]);

    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;

    const drawCtx = drawCanvas.getContext("2d");
    if (!drawCtx) return;

    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

    if (!initialDrawing) return;

    const img = new Image();
    img.onload = () => {
      drawCtx.drawImage(img, 0, 0, drawCanvas.width, drawCanvas.height);
    };
    img.src = initialDrawing;
  }, [open, initialDrawing]);

  useEffect(() => {
    if (!draggingMarkerId) return;

    const onPointerMove = (event: PointerEvent) => {
      const point = toCanvasCoords(event.clientX, event.clientY);
      if (!point) return;

      setMarkers((prev) => prev.map((marker) => (marker.id === draggingMarkerId ? { ...marker, ...point } : marker)));
    };

    const onPointerUp = () => {
      setDraggingMarkerId(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [draggingMarkerId]);

  const toCanvasCoords = (clientX: number, clientY: number) => {
    const board = boardRef.current;
    if (!board) return null;

    const rect = board.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const y = ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
    return {
      x: Math.max(MARKER_RADIUS, Math.min(CANVAS_WIDTH - MARKER_RADIUS, x)),
      y: Math.max(MARKER_RADIUS, Math.min(CANVAS_HEIGHT - MARKER_RADIUS, y)),
    };
  };

  const addMarker = (color: string, x = CANVAS_WIDTH / 2, y = CANVAS_HEIGHT / 2) => {
    setMarkers((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        x,
        y,
        color,
      },
    ]);
  };

  const drawSegment = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;

    const ctx = drawCanvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = isEraser ? 14 : 4;
    ctx.strokeStyle = strokeColor;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  };

  const startDrawing = (event: DrawingEvent) => {
    event.preventDefault();
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const point = getPoint(event, canvas);
    setIsDrawing(true);
    lastPointRef.current = point;
  };

  const moveDrawing = (event: DrawingEvent) => {
    event.preventDefault();
    if (!isDrawing || !lastPointRef.current) return;

    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const point = getPoint(event, canvas);
    drawSegment(lastPointRef.current, point);
    lastPointRef.current = point;
  };

  const endDrawing = () => {
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  const clearDrawing = () => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;

    const ctx = drawCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    setMarkers([]);
  };

  const handlePaletteDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const color = event.dataTransfer.getData("text/plain");
    if (!color) return;

    const point = toCanvasCoords(event.clientX, event.clientY);
    if (!point) return;
    addMarker(color, point.x, point.y);
  };

  const startMarkerDrag = (markerId: string) => {
    setDraggingMarkerId(markerId);
  };

  const saveDrawing = async () => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;

    if (isCanvasEmpty(drawCanvas) && markers.length === 0) {
      onSave("");
      return;
    }

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = CANVAS_WIDTH;
    exportCanvas.height = CANVAS_HEIGHT;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) return;

    exportCtx.fillStyle = "#ffffff";
    exportCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (showTemplate) {
      try {
        const templateImage = await loadImage(TEMPLATE_IMAGE_SRC);
        exportCtx.drawImage(templateImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      } catch {
        // If template image fails to load, proceed with drawing layer and markers.
      }
    }

    exportCtx.drawImage(drawCanvas, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (const marker of markers) {
      exportCtx.beginPath();
      exportCtx.arc(marker.x, marker.y, MARKER_RADIUS, 0, Math.PI * 2);
      exportCtx.fillStyle = marker.color;
      exportCtx.fill();
      exportCtx.lineWidth = 2;
      exportCtx.strokeStyle = "#111827";
      exportCtx.stroke();
    }

    onSave(exportCanvas.toDataURL("image/png"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Drill Whiteboard</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
          <Button type="button" variant={!isEraser ? "default" : "outline"} size="sm" onClick={() => setIsEraser(false)}>
            Pen
          </Button>
          <Button type="button" variant={isEraser ? "default" : "outline"} size="sm" onClick={() => setIsEraser(true)}>
            Eraser
          </Button>
          <input
            type="color"
            value={strokeColor}
            onChange={(event) => setStrokeColor(event.target.value)}
            className="h-9 w-12 cursor-pointer rounded border"
            aria-label="Pen color"
          />
          <Button type="button" variant="outline" size="sm" onClick={clearDrawing}>
            Clear
          </Button>
          <div className="flex items-center gap-2 border-l pl-2">
            <span className="text-xs text-muted-foreground">Pick/Drop circles:</span>
            {MARKER_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                draggable
                onDragStart={(event) => event.dataTransfer.setData("text/plain", color)}
                onClick={() => addMarker(color)}
                aria-label={`Add ${color} marker`}
                className="h-6 w-6 rounded-full border border-slate-400"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Label htmlFor="modal-template-switch" className="text-xs sm:text-sm">Show Template</Label>
            <Switch
              id="modal-template-switch"
              checked={showTemplate}
              onCheckedChange={onShowTemplateChange}
            />
          </div>
        </div>

        <div
          ref={boardRef}
          className="relative w-full overflow-hidden rounded-md border bg-white"
          style={{ aspectRatio: "16 / 9" }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handlePaletteDrop}
        >
          <img
            src={TEMPLATE_IMAGE_SRC}
            alt="Volleyball court template"
            className={`absolute inset-0 h-full w-full object-contain ${showTemplate ? "block" : "hidden"}`}
            draggable={false}
          />
          <canvas
            ref={drawCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="absolute inset-0 h-full w-full touch-none"
            onMouseDown={startDrawing}
            onMouseMove={moveDrawing}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
            onTouchStart={startDrawing}
            onTouchMove={moveDrawing}
            onTouchEnd={endDrawing}
          />
          <div className="pointer-events-none absolute inset-0">
            {markers.map((marker) => (
              <div
                key={marker.id}
                onPointerDown={() => startMarkerDrag(marker.id)}
                className="pointer-events-auto absolute cursor-grab rounded-full border-2 border-slate-900"
                style={{
                  left: `${(marker.x / CANVAS_WIDTH) * 100}%`,
                  top: `${(marker.y / CANVAS_HEIGHT) * 100}%`,
                  width: `${(MARKER_RADIUS * 2 * 100) / CANVAS_WIDTH}%`,
                  height: `${(MARKER_RADIUS * 2 * 100) / CANVAS_HEIGHT}%`,
                  transform: "translate(-50%, -50%)",
                  backgroundColor: markerColorById[marker.id],
                }}
              />
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={saveDrawing}>Save Whiteboard</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DrillWhiteboardModal;
