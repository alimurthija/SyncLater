import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useWebSocket } from '@/hooks/use-websocket';
import { 
  XIcon, 
  PenToolIcon, 
  EraserIcon, 
  SquareIcon, 
  CircleIcon, 
  TypeIcon,
  SaveIcon,
  DownloadIcon,
  TrashIcon,
  UndoIcon,
  RedoIcon
} from 'lucide-react';

interface WhiteboardProps {
  meetingId: string;
  onClose: () => void;
}

interface DrawingPoint {
  x: number;
  y: number;
}

interface DrawingPath {
  id: string;
  tool: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text';
  points: DrawingPoint[];
  color: string;
  size: number;
  timestamp: number;
}

interface TextElement {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  timestamp: number;
}

export function Whiteboard({ meetingId, onClose }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>([]);
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
  
  // Tool settings
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser' | 'rectangle' | 'circle' | 'text'>('pen');
  const [brushColor, setBrushColor] = useState('#3b82f6');
  const [brushSize, setBrushSize] = useState(3);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputPosition, setTextInputPosition] = useState({ x: 0, y: 0 });
  const [textInputValue, setTextInputValue] = useState('');
  
  // Collaboration
  const [collaborators, setCollaborators] = useState<Array<{
    userId: string;
    name: string;
    isDrawing: boolean;
  }>>([]);
  
  const { send, on } = useWebSocket();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set up canvas
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    const context = canvas.getContext('2d');
    if (!context) return;

    context.scale(2, 2);
    context.lineCap = 'round';
    context.strokeStyle = brushColor;
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    contextRef.current = context;

    // Set up WebSocket listeners for collaboration
    const unsubscribeFunctions: (() => void)[] = [];

    unsubscribeFunctions.push(on('whiteboard-drawing', (data: any) => {
      if (data.meetingId === meetingId && data.userId !== 'current-user-id') {
        handleRemoteDrawing(data.drawingData);
      }
    }));

    unsubscribeFunctions.push(on('whiteboard-collaborator', (data: any) => {
      if (data.meetingId === meetingId) {
        setCollaborators(prev => {
          const filtered = prev.filter(c => c.userId !== data.userId);
          return [...filtered, {
            userId: data.userId,
            name: data.name,
            isDrawing: data.isDrawing
          }];
        });
      }
    }));

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, [meetingId, on]);

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = brushColor;
      contextRef.current.lineWidth = brushSize;
    }
  }, [brushColor, brushSize]);

  const handleRemoteDrawing = (drawingData: any) => {
    // Handle remote user's drawing
    if (drawingData.type === 'path') {
      drawPath(drawingData.path);
    } else if (drawingData.type === 'text') {
      addTextElement(drawingData.textElement);
    }
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);

    if (activeTool === 'text') {
      setTextInputPosition(coords);
      setShowTextInput(true);
      return;
    }

    if (!contextRef.current) return;

    setIsDrawing(true);
    const newPath: DrawingPath = {
      id: `path-${Date.now()}-${Math.random()}`,
      tool: activeTool,
      points: [coords],
      color: brushColor,
      size: brushSize,
      timestamp: Date.now()
    };
    setCurrentPath(newPath);

    contextRef.current.beginPath();
    contextRef.current.moveTo(coords.x, coords.y);

    // Broadcast start of drawing to other users
    send({
      type: 'whiteboard-collaborator',
      meetingId,
      data: {
        userId: 'current-user-id',
        name: 'Current User',
        isDrawing: true
      }
    });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current || !currentPath) return;

    const coords = getCanvasCoordinates(e);
    const updatedPath = {
      ...currentPath,
      points: [...currentPath.points, coords]
    };
    setCurrentPath(updatedPath);

    if (activeTool === 'eraser') {
      contextRef.current.globalCompositeOperation = 'destination-out';
    } else {
      contextRef.current.globalCompositeOperation = 'source-over';
      contextRef.current.strokeStyle = brushColor;
    }

    contextRef.current.lineWidth = brushSize;
    contextRef.current.lineTo(coords.x, coords.y);
    contextRef.current.stroke();
  };

  const finishDrawing = () => {
    if (!isDrawing || !currentPath) return;

    setIsDrawing(false);
    
    // Add to drawing paths and save state for undo
    setDrawingPaths(prev => {
      const newPaths = [...prev, currentPath];
      setUndoStack(prevUndo => [...prevUndo, { paths: prev, texts: textElements }]);
      setRedoStack([]);
      return newPaths;
    });

    // Broadcast drawing to other users
    send({
      type: 'whiteboard-drawing',
      meetingId,
      data: {
        type: 'path',
        path: currentPath,
        userId: 'current-user-id'
      }
    });

    send({
      type: 'whiteboard-collaborator',
      meetingId,
      data: {
        userId: 'current-user-id',
        name: 'Current User',
        isDrawing: false
      }
    });

    setCurrentPath(null);
    if (contextRef.current) {
      contextRef.current.beginPath();
    }
  };

  const drawPath = (path: DrawingPath) => {
    if (!contextRef.current) return;

    const ctx = contextRef.current;
    ctx.beginPath();
    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.size;

    if (path.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    if (path.points.length > 0) {
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
    }
  };

  const addTextElement = (textElement: TextElement) => {
    setTextElements(prev => [...prev, textElement]);
    
    if (contextRef.current) {
      contextRef.current.fillStyle = textElement.color;
      contextRef.current.font = `${textElement.size}px Arial`;
      contextRef.current.fillText(textElement.text, textElement.x, textElement.y);
    }
  };

  const handleTextInput = () => {
    if (!textInputValue.trim()) {
      setShowTextInput(false);
      setTextInputValue('');
      return;
    }

    const textElement: TextElement = {
      id: `text-${Date.now()}-${Math.random()}`,
      x: textInputPosition.x,
      y: textInputPosition.y,
      text: textInputValue,
      color: brushColor,
      size: brushSize * 6, // Scale up for readability
      timestamp: Date.now()
    };

    addTextElement(textElement);

    // Save state for undo
    setUndoStack(prev => [...prev, { paths: drawingPaths, texts: textElements }]);
    setRedoStack([]);

    // Broadcast text to other users
    send({
      type: 'whiteboard-drawing',
      meetingId,
      data: {
        type: 'text',
        textElement,
        userId: 'current-user-id'
      }
    });

    setShowTextInput(false);
    setTextInputValue('');
  };

  const clearCanvas = () => {
    if (!contextRef.current) return;
    
    // Save current state for undo
    setUndoStack(prev => [...prev, { paths: drawingPaths, texts: textElements }]);
    setRedoStack([]);
    
    // Clear canvas and reset states
    const canvas = canvasRef.current;
    if (canvas) {
      contextRef.current.fillStyle = 'white';
      contextRef.current.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    setDrawingPaths([]);
    setTextElements([]);
    
    // Broadcast clear to other users
    send({
      type: 'whiteboard-clear',
      meetingId,
      data: { userId: 'current-user-id' }
    });
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    
    const previousState = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, { paths: drawingPaths, texts: textElements }]);
    setUndoStack(prev => prev.slice(0, -1));
    
    setDrawingPaths(previousState.paths);
    setTextElements(previousState.texts);
    
    redrawCanvas(previousState.paths, previousState.texts);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    
    const nextState = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, { paths: drawingPaths, texts: textElements }]);
    setRedoStack(prev => prev.slice(0, -1));
    
    setDrawingPaths(nextState.paths);
    setTextElements(nextState.texts);
    
    redrawCanvas(nextState.paths, nextState.texts);
  };

  const redrawCanvas = (paths: DrawingPath[], texts: TextElement[]) => {
    if (!contextRef.current || !canvasRef.current) return;
    
    // Clear canvas
    contextRef.current.fillStyle = 'white';
    contextRef.current.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Redraw all paths
    paths.forEach(path => drawPath(path));
    
    // Redraw all text
    texts.forEach(textElement => {
      contextRef.current!.fillStyle = textElement.color;
      contextRef.current!.font = `${textElement.size}px Arial`;
      contextRef.current!.fillText(textElement.text, textElement.x, textElement.y);
    });
  };

  const saveWhiteboard = () => {
    // In a real app, this would save to the backend
    console.log('Saving whiteboard:', { paths: drawingPaths, texts: textElements });
  };

  const exportWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `whiteboard-${meetingId}-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const tools = [
    { id: 'pen', icon: PenToolIcon, label: 'Pen' },
    { id: 'eraser', icon: EraserIcon, label: 'Eraser' },
    { id: 'rectangle', icon: SquareIcon, label: 'Rectangle' },
    { id: 'circle', icon: CircleIcon, label: 'Circle' },
    { id: 'text', icon: TypeIcon, label: 'Text' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="whiteboard-modal">
      <Card className="w-full max-w-7xl mx-4 h-[95vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="gradient-text">Digital Whiteboard</CardTitle>
          
          <div className="flex items-center space-x-4">
            {/* Drawing Tools */}
            <div className="flex bg-muted rounded-lg p-1">
              {tools.map((tool) => {
                const IconComponent = tool.icon;
                return (
                  <Button
                    key={tool.id}
                    variant={activeTool === tool.id ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTool(tool.id as any)}
                    className="p-2"
                    title={tool.label}
                    data-testid={`tool-${tool.id}`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </Button>
                );
              })}
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={undo}
                disabled={undoStack.length === 0}
                data-testid="button-undo"
              >
                <UndoIcon className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={redo}
                disabled={redoStack.length === 0}
                data-testid="button-redo"
              >
                <RedoIcon className="w-4 h-4" />
              </Button>
            </div>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onClose}
              data-testid="button-close-whiteboard"
            >
              <XIcon className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col">
          {/* Canvas Area */}
          <div className="flex-1 relative bg-white rounded-lg overflow-hidden border">
            <canvas
              ref={canvasRef}
              className={`w-full h-full cursor-${activeTool === 'eraser' ? 'grab' : 'crosshair'}`}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={finishDrawing}
              onMouseLeave={finishDrawing}
              data-testid="whiteboard-canvas"
            />
            
            {/* Collaboration Indicators */}
            <div className="absolute top-4 right-4 space-y-2">
              {collaborators.map(collaborator => (
                <div
                  key={collaborator.userId}
                  className={`flex items-center space-x-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm ${
                    collaborator.isDrawing ? 'animate-pulse' : ''
                  }`}
                  data-testid={`collaborator-${collaborator.userId}`}
                >
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>{collaborator.name} {collaborator.isDrawing ? 'is drawing' : 'joined'}</span>
                </div>
              ))}
            </div>
            
            {/* Text Input */}
            {showTextInput && (
              <div
                className="absolute bg-white border border-border rounded p-2 shadow-lg"
                style={{
                  left: textInputPosition.x,
                  top: textInputPosition.y,
                  transform: 'translate(-50%, -100%)'
                }}
                data-testid="text-input-overlay"
              >
                <Input
                  type="text"
                  placeholder="Enter text..."
                  value={textInputValue}
                  onChange={(e) => setTextInputValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleTextInput();
                    } else if (e.key === 'Escape') {
                      setShowTextInput(false);
                      setTextInputValue('');
                    }
                  }}
                  onBlur={handleTextInput}
                  autoFocus
                  className="w-48"
                  data-testid="text-input-field"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Press Enter to confirm, Escape to cancel
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Label htmlFor="color" className="text-sm">Color:</Label>
                <Input
                  id="color"
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="w-12 h-8 p-1 border rounded"
                  data-testid="input-brush-color"
                />
              </div>
              
              <div className="flex items-center space-x-2 min-w-[120px]">
                <Label htmlFor="size" className="text-sm">Size:</Label>
                <Slider
                  id="size"
                  min={1}
                  max={20}
                  step={1}
                  value={[brushSize]}
                  onValueChange={(values) => setBrushSize(values[0])}
                  className="flex-1"
                  data-testid="slider-brush-size"
                />
                <span className="text-sm text-muted-foreground w-8">{brushSize}</span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={saveWhiteboard}
                data-testid="button-save-whiteboard"
              >
                <SaveIcon className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button
                variant="outline"
                onClick={exportWhiteboard}
                data-testid="button-export-whiteboard"
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button
                variant="destructive"
                onClick={clearCanvas}
                data-testid="button-clear-whiteboard"
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
