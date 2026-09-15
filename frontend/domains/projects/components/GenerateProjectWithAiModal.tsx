'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Sparkles, Loader2, Key, AlertCircle, CheckCircle2, PlusCircle } from 'lucide-react';
import {
  generateProjectWithAi,
  getStoredApiKey,
  setStoredApiKey,
  mapAIErrorToUserMessage,
} from '@/shared/lib/ai/gemini-client';
import { useCreateProjectWithTasks } from '@/domains/projects/hooks/useProjects';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface GenerateProjectWithAiModalProps {
  trigger?: React.ReactNode;
  onSuccess?: (project: { _id: string; name: string }) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onFallbackManual?: () => void;
}

export function GenerateProjectWithAiModal({
  trigger,
  onSuccess,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onFallbackManual,
}: GenerateProjectWithAiModalProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = setControlledOpen || setInternalOpen;

  const [prompt, setPrompt] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutate: createProjectWithTasks } = useCreateProjectWithTasks();

  // Cargar API Key de localStorage al abrir
  useEffect(() => {
    if (isOpen) {
      const stored = getStoredApiKey();
      if (stored) {
        setApiKey(stored);
        setHasSavedKey(true);
        setShowKeyInput(false);
      } else {
        setHasSavedKey(false);
        setShowKeyInput(true);
      }
      setErrorMessage(null);
    }
  }, [isOpen]);

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      setStoredApiKey(apiKey.trim());
      setHasSavedKey(true);
      setShowKeyInput(false);
      toast.success('API Key guardada localmente (BYOK)');
    }
  };

  const handleManualFallback = () => {
    setIsOpen(false);
    if (onFallbackManual) {
      onFallbackManual();
    } else {
      router.push('/projects');
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const activePrompt = prompt.trim();
    if (!activePrompt) {
      setErrorMessage('Ingresa una descripción o idea para tu proyecto');
      return;
    }

    const activeApiKey = apiKey.trim() || getStoredApiKey();
    if (!activeApiKey) {
      setShowKeyInput(true);
      setErrorMessage('Se requiere una Google Gemini API Key para generar con IA.');
      return;
    }

    // Persistir clave en localStorage (BYOK)
    setStoredApiKey(activeApiKey);
    setHasSavedKey(true);

    setIsGenerating(true);

    try {
      // 1. Llamada directa al LLM desde el cliente con intercepción y validación obligatoria
      const aiProject = await generateProjectWithAi({
        prompt: activePrompt,
        apiKey: activeApiKey,
      });

      // 2. Ejecución de la mutación atómica de Convex
      createProjectWithTasks(
        {
          name: aiProject.projectName,
          description: aiProject.description,
          tasks: aiProject.tasks,
        },
        {
          onSuccess: (created) => {
            setIsGenerating(false);
            setIsOpen(false);
            setPrompt('');
            onSuccess?.(created);
          },
          onError: (err) => {
            setIsGenerating(false);
            const userMsg = err.message || 'Error al guardar el proyecto en la base de datos';
            setErrorMessage(userMsg);
            toast.error(userMsg);
          },
        }
      );
    } catch (err: unknown) {
      // Intercepción tipada de errores (429, timeout, red, invalid-json/ZodError)
      setIsGenerating(false);
      const { message: friendlyMessage } = mapAIErrorToUserMessage(err);
      setErrorMessage(friendlyMessage);
      toast.error(friendlyMessage);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isGenerating && setIsOpen(open)}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button
            type="button"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-primary hover:opacity-90 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 animate-pulse text-amber-300" />
            <span>✨ Generar con IA</span>
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[480px] bg-card border-border text-foreground rounded-2xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <DialogTitle className="text-foreground text-lg font-bold">
              Generar Proyecto con IA
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Describe tu idea o meta y la IA creará el proyecto completo con su desglose de tareas ordenadas automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleGenerate} className="space-y-4 pt-2">
          {/* Prompt input */}
          <div className="space-y-2">
            <Label htmlFor="ai-prompt" className="text-xs font-semibold text-foreground">
              ¿Qué proyecto deseas construir?
            </Label>
            <Textarea
              id="ai-prompt"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              disabled={isGenerating}
              placeholder="Ej: Campaña de marketing en 3 semanas para el lanzamiento de una app SaaS"
              rows={3}
              className="bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground text-xs rounded-xl focus-visible:ring-primary focus-visible:ring-2 resize-none"
              autoFocus
            />
            {/* Chips de sugerencias rápidas */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] text-muted-foreground self-center mr-1">Sugerencias:</span>
              {[
                'Campaña de marketing en 3 semanas',
                'Lanzamiento MVP SaaS',
                'Rediseño de onboarding',
              ].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setPrompt(sug)}
                  className="text-[10px] bg-muted hover:bg-muted/80 text-foreground/80 px-2 py-0.5 rounded-lg border border-border transition-colors cursor-pointer"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Configuración BYOK API Key */}
          <div className="border border-border/60 rounded-xl p-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Key className="w-3.5 h-3.5 text-muted-foreground" />
                <span>API Key (BYOK en localStorage)</span>
              </div>
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
              >
                {showKeyInput ? 'Ocultar' : hasSavedKey ? 'Cambiar Clave' : 'Configurar Clave'}
              </button>
            </div>

            {hasSavedKey && !showKeyInput && (
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>API Key configurada en tu navegador (privada y segura)</span>
              </div>
            )}

            {showKeyInput && (
              <div className="mt-2.5 space-y-2 animate-in fade-in duration-150">
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={isGenerating}
                    className="bg-background border-border text-foreground text-xs rounded-xl h-8 placeholder:text-muted-foreground"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isGenerating || !apiKey.trim()}
                    onClick={handleSaveApiKey}
                    className="h-8 text-xs rounded-xl border-border hover:bg-muted"
                  >
                    Guardar
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Tu clave nunca se envía a servidores de backend. Se llama al LLM directo desde tu navegador.
                </p>
              </div>
            )}
          </div>

          {/* Mensaje de error con opción de fallback manual */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
              <div className="pt-1 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleManualFallback}
                  className="text-xs h-7 rounded-lg border-amber-500/30 hover:bg-amber-500/20 text-foreground"
                >
                  <PlusCircle className="w-3 h-3 mr-1.5" />
                  Crear proyecto manualmente
                </Button>
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isGenerating}
              onClick={() => setIsOpen(false)}
              className="flex-1 border-border text-foreground/80 hover:bg-muted text-xs rounded-xl h-9"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-medium text-xs rounded-xl h-9 shadow-md shadow-purple-500/20 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  <span>Generando con IA...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-2 text-amber-300" />
                  <span>Generar Proyecto</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
