'use client';

import { useState } from 'react';
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
import { Sparkles, Loader2, Key, AlertCircle, CheckCircle2, Wand2 } from 'lucide-react';
import { useAiClient, mapAIErrorToUserMessage, AiProviderId } from '@/shared/lib/ai';
import {
  AiRefinementSchema,
  type AiRefinement,
} from '@/domains/projects/schemas/ai-refine.schema';
import { useApplyAiRefinement } from '@/domains/projects/hooks/useProjects';
import { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';

export const SURGICAL_REFINEMENT_SYSTEM_INSTRUCTION = `Eres un copiloto y asesor experto en gestión de proyectos.
Tu objetivo es analizar un proyecto existente con sus tareas y subtareas actuales, y aplicar las mejoras e instrucciones solicitadas por el usuario de forma quirúrgica y NO DESTRUCTIVA.

REGLAS OBLIGATORIAS:
1. NUNCA borres ni reemplaces tareas existentes que el usuario ya tenga.
2. Si el usuario solicita nuevas tareas, devuélvelas en la propiedad "newTasks" con sus subtareas correspondientes si aplica.
3. Si el usuario solicita desglosar o agregar subtareas a tareas existentes, identifica el "taskId" exacto de la tarea existente y devuélvelo en "newSubtasksForExistingTasks" con su lista de títulos en "subtaskTitles".
4. Si el usuario solicita mejorar, reescribir o añadir una descripción, devuélvela en "updatedDescription". Si no se solicitó cambiar la descripción, omite esta propiedad o déjala como string opcional.
5. Provee un "summary" conciso (máximo 300 caracteres) explicando exactamente qué mejoras se aplicaron (ej: "Se añadieron 3 tareas de testing y 2 subtareas a Diseño UI").

DEBES responder OBLIGATORIAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "summary": "Breve resumen de las mejoras aplicadas",
  "updatedDescription": "Descripción mejorada (opcional)",
  "newTasks": [
    {
      "title": "Nombre de la nueva tarea",
      "subtasks": ["Subtarea 1", "Subtarea 2"]
    }
  ],
  "newSubtasksForExistingTasks": [
    {
      "taskId": "id_de_la_tarea_existente",
      "subtaskTitles": ["Nueva subtarea A", "Nueva subtarea B"]
    }
  ]
}

No incluyas explicaciones adicionales ni texto fuera del objeto JSON.`;

interface RefineTaskInfo {
  _id: Id<'tasks'> | string;
  title: string;
  isCompleted: boolean;
  subtasks?: Array<{ id: string; title: string; isCompleted: boolean }>;
}

interface RefineProjectWithAiModalProps {
  projectId: Id<'projects'>;
  projectName: string;
  projectDescription?: string;
  tasks: RefineTaskInfo[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RefineProjectWithAiModal({
  projectId,
  projectName,
  projectDescription,
  tasks,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSuccess,
}: RefineProjectWithAiModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = setControlledOpen || setInternalOpen;

  const [prompt, setPrompt] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { provider, setProvider, apiKey, setApiKey, hasApiKey, generateStructured } = useAiClient();
  const { mutate: applyRefinement } = useApplyAiRefinement();

  const handleSaveApiKey = () => {
    if (inputKey.trim()) {
      setApiKey(inputKey.trim());
      setShowConfig(false);
      toast.success(`API Key de ${provider === 'gemini' ? 'Google Gemini' : 'Groq'} guardada`);
    }
  };

  const handleToggleConfig = () => {
    if (!showConfig) {
      setInputKey(apiKey || '');
    }
    setShowConfig((prev) => !prev);
  };

  const handleProviderChange = (newProvider: AiProviderId) => {
    setProvider(newProvider);
    setErrorMessage(null);
    setInputKey('');
  };

  const handleRefine = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const activeInstruction = prompt.trim();
    if (!activeInstruction) {
      setErrorMessage('Ingresa qué mejoras o tareas deseas agregar a tu proyecto');
      return;
    }

    const currentKey = inputKey.trim() || apiKey.trim();
    if (!currentKey) {
      setShowConfig(true);
      setErrorMessage(`Se requiere una API Key de ${provider === 'gemini' ? 'Google Gemini' : 'Groq'} para continuar.`);
      return;
    }

    if (currentKey !== apiKey) {
      setApiKey(currentKey);
    }

    setIsGenerating(true);

    try {
      // 1. Construir prompt contextual del proyecto actual
      const tasksContext = tasks.length > 0
        ? tasks
            .map(
              (t) =>
                `- [ID: ${t._id}] "${t.title}" (${t.isCompleted ? 'Completada' : 'Pendiente'}${
                  t.subtasks && t.subtasks.length > 0
                    ? `, Subtareas existentes: ${t.subtasks.map((s) => s.title).join(', ')}`
                    : ''
                })`
            )
            .join('\n')
        : '(Aún no hay tareas creadas)';

      const contextualPrompt = `PROYECTO ACTUAL:
Nombre: ${projectName}
Descripción actual: ${projectDescription || '(Sin descripción)'}
Tareas y subtareas actuales:
${tasksContext}

INSTRUCCIÓN DE MEJORA DEL USUARIO:
${activeInstruction}`;

      // 2. Invocar AI Gateway con schema defensivo Zod
      const refinementResult: AiRefinement = await generateStructured(
        contextualPrompt,
        AiRefinementSchema,
        SURGICAL_REFINEMENT_SYSTEM_INSTRUCTION
      );

      // 3. Ejecutar mutación atómica en Convex
      applyRefinement(
        {
          projectId,
          updatedDescription: refinementResult.updatedDescription,
          newTasks: refinementResult.newTasks,
          newSubtasksForExistingTasks: refinementResult.newSubtasksForExistingTasks,
        },
        {
          onSuccess: () => {
            setIsGenerating(false);
            setIsOpen(false);
            setPrompt('');
            toast.success(refinementResult.summary || 'Proyecto enriquecido con IA con éxito');
            onSuccess?.();
          },
          onError: (err) => {
            setIsGenerating(false);
            const userMsg = err.message || 'Error al aplicar los cambios en la base de datos';
            setErrorMessage(userMsg);
            toast.error(userMsg);
          },
        }
      );
    } catch (err: unknown) {
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
            variant="outline"
            className="inline-flex items-center gap-1.5 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 font-medium text-xs px-3 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
            <span>Refinar con IA</span>
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[480px] bg-card border-border text-foreground rounded-2xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Wand2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-foreground text-lg font-bold">
              Copiloto IA: Refinar Proyecto
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            La IA leerá tu proyecto <strong className="text-foreground">&ldquo;{projectName}&rdquo;</strong> ({tasks.length} tareas) y aplicará mejoras quirúrgicas sin borrar tu progreso.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleRefine} className="space-y-4 pt-2">
          {/* Instrucción del usuario */}
          <div className="space-y-2">
            <Label htmlFor="ai-refine-prompt" className="text-xs font-semibold text-foreground">
              ¿Qué deseas agregar o mejorar?
            </Label>
            <Textarea
              id="ai-refine-prompt"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              disabled={isGenerating}
              placeholder="Ej: Agrega subtareas técnicas a la tarea de base de datos y amplía la descripción con métricas de éxito"
              rows={3}
              className="bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground text-xs rounded-xl focus-visible:ring-primary focus-visible:ring-2 resize-none"
              autoFocus
            />
            {/* Sugerencias rápidas */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] text-muted-foreground self-center mr-1">Sugerencias:</span>
              {[
                'Agregar subtareas detalladas a las tareas existentes',
                'Añadir tareas de Testing, QA y Despliegue',
                'Mejorar descripción con objetivos y alcance',
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

          {/* Configuración BYOK */}
          <div className="border border-border/60 rounded-xl p-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Key className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Proveedor & Clave (BYOK)</span>
              </div>
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleToggleConfig}
                className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
              >
                {showConfig || !hasApiKey ? 'Ocultar' : 'Cambiar Clave'}
              </button>
            </div>

            {/* Selector de proveedor */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] text-muted-foreground">Motor:</span>
              <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => handleProviderChange('gemini')}
                  className={`px-2 py-0.5 text-[11px] rounded-md font-medium transition-colors cursor-pointer ${
                    provider === 'gemini'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Google Gemini
                </button>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => handleProviderChange('groq')}
                  className={`px-2 py-0.5 text-[11px] rounded-md font-medium transition-colors cursor-pointer ${
                    provider === 'groq'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Groq (GPT-OSS)
                </button>
              </div>
            </div>

            {hasApiKey && !showConfig && (
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Clave configurada en tu navegador para {provider === 'gemini' ? 'Gemini' : 'Groq'}</span>
              </div>
            )}

            {(showConfig || !hasApiKey) && (
              <div className="mt-2.5 space-y-2 animate-in fade-in duration-150">
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder={provider === 'gemini' ? 'AIzaSy...' : 'gsk_...'}
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    disabled={isGenerating}
                    className="bg-background border-border text-foreground text-xs rounded-xl h-8 placeholder:text-muted-foreground"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isGenerating || !inputKey.trim()}
                    onClick={handleSaveApiKey}
                    className="h-8 text-xs rounded-xl border-border hover:bg-muted"
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Mensaje de error */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Botones de acción */}
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
                  <span>Aplicando mejoras...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5 mr-2 text-amber-300" />
                  <span>Aplicar Mejoras con IA</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
