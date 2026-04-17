import { useEffect, useRef, useState } from "react";
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

const drawCourtTemplate = (ctx: CanvasRenderingContext2D) => {
  const w = CANVAS_WIDTH;
  const h = CANVAS_HEIGHT;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, w, h);

  const marginX = 70;
  const marginY = 48;
  const courtW = w - marginX * 2;
  const courtH = h - marginY * 2;

  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 3;
  ctx.strokeRect(marginX, marginY, courtW, courtH);

  const netX = marginX + courtW / 2;
  ctx.beginPath();
  ctx.moveTo(netX, marginY);
  ctx.lineTo(netX, marginY + courtH);
  ctx.stroke();

  const attackOffset = courtW / 6;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(netX - attackOffset, marginY);
  ctx.lineTo(netX - attackOffset, marginY + courtH);
  ctx.moveTo(netX + attackOffset, marginY);
  ctx.lineTo(netX + attackOffset, marginY + courtH);
  ctx.stroke();

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("VOLLEYBALL WHITEBOARD", marginX, 28);
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#334155";
  ctx.fillText("Left Side", marginX + 10, marginY + 18);
  ctx.fillText("Right Side", netX + 10, marginY + 18);
};

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
  const templateCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  const [strokeColor, setStrokeColor] = useState("#ef4444");
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const templateCanvas = templateCanvasRef.current;
    if (!templateCanvas) return;

    const ctx = templateCanvas.getContext("2d");
    if (!ctx) return;

    drawCourtTemplate(ctx);
  }, [open]);

  useEffect(() => {
    if (!open) return;

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
  };

  const saveDrawing = () => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;

    if (isCanvasEmpty(drawCanvas)) {
      onSave("");
      return;
    }

    onSave(drawCanvas.toDataURL("image/png"));
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
          <div className="ml-auto flex items-center gap-2">
            <Label htmlFor="modal-template-switch" className="text-xs sm:text-sm">Show Template</Label>
            <Switch
              id="modal-template-switch"
              checked={showTemplate}
              onCheckedChange={onShowTemplateChange}
            />
          </div>
        </div>

        <div className="relative w-full overflow-hidden rounded-md border bg-white" style={{ aspectRatio: "16 / 9" }}>
          <canvas
            ref={templateCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className={`absolute inset-0 h-full w-full ${showTemplate ? "block" : "hidden"}`}
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
