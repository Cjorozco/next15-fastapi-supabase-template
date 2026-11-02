'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { Sparkles, Loader2, Key, AlertCircle, CheckCircle2, PlusCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import {
  generateProjectWithAi,
  mapAIErrorToUserMessage,
} from '@/shared/lib/ai/gemini-client';
import { useAiClient } from '@/shared/lib/ai/useAiClient';
import { AiProviderId } from '@/shared/lib/ai/types';
import { useCreateProjectWithTasks } from '@/domains/projects/hooks/useProjects';
import { AiDraftEditor } from '@/domains/projects/components/AiDraftEditor';
import {
  draftToCreateArgs,
  extractExplicitTitle,
  isDraftDirty,
  projectToDraft,
  type ProjectDraft,
} from '@/domains/projects/lib/ai-draft';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface GenerateProjectWithAiModalProps {
  trigger?: React.ReactNode;
  onSuccess?: (project: { _id: string; name: string }) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onFallbackManual?: () => void;
}

/** What the dialog needs to know about the content to decide how it may be closed. */
interface BodyStatus {
  hasDraft: boolean;
  isDirty: boolean;
  isBusy: boolean;
}
const IDLE_STATUS: BodyStatus = { hasDraft: false, isDirty: false, isBusy: false };

/**
 * Dialog shell. The content lives in `GenerateProjectBody`, which Radix mounts only while
 * the dialog is open, so every open starts on the prompt step with an empty draft. Closing a
 * draft the user has edited asks "¿Descartar borrador?" first.
 */
export function GenerateProjectWithAiModal({
  trigger,
  onSuccess,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onFallbackManual,
}: GenerateProjectWithAiModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = setControlledOpen || setInternalOpen;

  const [status, setStatus] = useState<BodyStatus>(IDLE_STATUS);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const closeModal = useCallback(() => {
    setConfirmingDiscard(false);
    setStatus(IDLE_STATUS);
    setIsOpen(false);
  }, [setIsOpen]);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setIsOpen(true);
      return;
    }
    if (status.isBusy) return;
    if (status.isDirty) {
      setConfirmingDiscard(true);
      return;
    }
    closeModal();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button
            type="button"
            className="inline-flex items-center gap-2 bg-primary hover:opacity-90 text-primary-foreground font-medium text-xs px-4 py-2.5 rounded-xl shadow-md shadow-primary/20 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-primary-foreground" />
            <span>✨ Generar con IA</span>
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className={`${status.hasDraft ? "sm:max-w-[640px]" : "sm:max-w-[480px]"} bg-card border-border text-foreground rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto`}>
        <GenerateProjectBody
          onSuccess={onSuccess}
          onFallbackManual={onFallbackManual}
          onClose={closeModal}
          onStatusChange={setStatus}
          confirmingDiscard={confirmingDiscard}
          onKeepEditing={() => setConfirmingDiscard(false)}
          onDiscard={closeModal}
        />
      </DialogContent>
    </Dialog>
  );
}

interface GenerateProjectBodyProps {
  onSuccess?: (project: { _id: string; name: string }) => void;
  onFallbackManual?: () => void;
  onClose: () => void;
  onStatusChange: (status: BodyStatus) => void;
  confirmingDiscard: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}

/** "¿Descartar borrador?" Sí / No, used when closing or going back would lose edits. */
function DiscardDraftConfirm({
  onDiscard,
  onKeepEditing,
}: {
  onDiscard: () => void;
  onKeepEditing: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-label="Confirmar descartar borrador"
      className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs"
    >
      <span className="text-destructive font-medium flex-1 min-w-32">¿Descartar borrador?</span>
      <Button
        type="button"
        size="sm"
        onClick={onDiscard}
        className="h-8 text-xs rounded-lg bg-destructive text-white hover:bg-destructive/90"
      >
        Sí<span className="sr-only">, descartar el borrador</span>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        autoFocus
        onClick={onKeepEditing}
        className="h-8 text-xs rounded-lg border-border"
      >
        No<span className="sr-only">, seguir editando</span>
      </Button>
    </div>
  );
}

function GenerateProjectBody({
  onSuccess,
  onFallbackManual,
  onClose,
  onStatusChange,
  confirmingDiscard,
  onKeepEditing,
  onDiscard,
}: GenerateProjectBodyProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  // The draft exactly as the AI produced it, to know whether the user changed anything.
  const [initialDraft, setInitialDraft] = useState<ProjectDraft | null>(null);
  const [confirmingEditPrompt, setConfirmingEditPrompt] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const lastRequest = useRef<{ prompt: string; fixedName?: string } | null>(null);

  const { provider, setProvider, apiKey, setApiKey, hasApiKey } = useAiClient();
  const { mutate: createProjectWithTasks } = useCreateProjectWithTasks();

  const handleSaveApiKey = () => {
    if (inputKey.trim()) {
      setApiKey(inputKey.trim());
      setShowConfig(false);
      toast.success(`API Key de ${provider === 'gemini' ? 'Google Gemini' : 'Groq'} guardada localmente (BYOK)`);
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

  const discardToPrompt = () => {
    setConfirmingEditPrompt(false);
    setDraft(null);
    setInitialDraft(null);
    setErrorMessage(null);
  };

  /** Back to the prompt; an edited draft is only thrown away after the user confirms. */
  const handleEditPrompt = () => {
    if (draft && initialDraft && isDraftDirty(initialDraft, draft)) {
      setConfirmingEditPrompt(true);
      return;
    }
    discardToPrompt();
  };

  const handleManualFallback = () => {
    onClose();
    if (onFallbackManual) {
      onFallbackManual();
    } else {
      router.push('/projects');
    }
  };

  /** Asks the AI for a draft of the project. Nothing is saved until the user confirms. */
  const requestDraft = async (request: { prompt: string; fixedName?: string }, apiKeyToUse: string) => {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const aiProject = await generateProjectWithAi({
        prompt: request.prompt,
        apiKey: apiKeyToUse,
        provider,
        fixedName: request.fixedName,
      });
      lastRequest.current = request;
      const generated = projectToDraft(aiProject, request.fixedName);
      setDraft(generated);
      setInitialDraft(generated);
    } catch (err: unknown) {
      // Typed errors: 429, timeout, network, invalid JSON after one retry
      const { message: friendlyMessage } = mapAIErrorToUserMessage(err);
      setErrorMessage(friendlyMessage);
      toast.error(friendlyMessage);
    } finally {
      setIsGenerating(false);
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

    const currentKey = inputKey.trim() || apiKey.trim();
    if (!currentKey) {
      setShowConfig(true);
      setErrorMessage(
        `Se requiere una ${provider === 'gemini' ? 'Google Gemini' : 'Groq'} API Key para generar con IA.`
      );
      return;
    }

    // Persistir clave si se editó
    if (currentKey !== apiKey) {
      setApiKey(currentKey);
    }

    // A leading "Title. rest" / "Title: rest" names the project verbatim.
    const explicit = extractExplicitTitle(activePrompt);
    await requestDraft(
      explicit ? { prompt: explicit.rest, fixedName: explicit.title } : { prompt: activePrompt },
      currentKey
    );
  };

  const handleRegenerate = async () => {
    const request = lastRequest.current;
    const currentKey = inputKey.trim() || apiKey.trim();
    if (!request || !currentKey) return;
    await requestDraft(request, currentKey);
  };

  const handleCreate = () => {
    if (!draft) return;
    const args = draftToCreateArgs(draft);
    if (!args.name) {
      setErrorMessage('El proyecto necesita un nombre');
      return;
    }
    if (args.tasks.length === 0) {
      setErrorMessage('Agrega al menos una tarea con título');
      return;
    }

    setErrorMessage(null);
    setIsCreating(true);
    createProjectWithTasks(args, {
      onSuccess: (created) => {
        setIsCreating(false);
        onClose();
        onSuccess?.(created);
      },
      onError: (err) => {
        setIsCreating(false);
        setErrorMessage(err.message || 'Error al guardar el proyecto en la base de datos');
      },
    });
  };

  const isDirty = draft !== null && initialDraft !== null && isDraftDirty(initialDraft, draft);
  const isBusy = isGenerating || isCreating;
  const hasDraft = draft !== null;
  useEffect(() => {
    onStatusChange({ hasDraft, isDirty, isBusy });
  }, [hasDraft, isDirty, isBusy, onStatusChange]);

  return (
    <>
  <DialogHeader>
    <div className="flex items-center gap-2 mb-1">
      <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
        <Sparkles className="w-5 h-5" />
      </div>
      <DialogTitle className="text-foreground text-lg font-bold">
        Generar Proyecto con IA
      </DialogTitle>
    </div>
    <DialogDescription className="text-xs text-muted-foreground">
      {draft
        ? "Revisa el borrador, edita lo que quieras y crea el proyecto cuando esté listo. Todavía no se guardó nada."
        : "Describe tu idea, tus restricciones y tu situación. La IA propondrá un borrador que podrás editar antes de crear el proyecto."}
    </DialogDescription>
  </DialogHeader>

  {(confirmingDiscard || confirmingEditPrompt) && (
    <DiscardDraftConfirm
      // Trying to close wins: "Sí" then closes instead of only going back to the prompt.
      onDiscard={confirmingDiscard ? onDiscard : discardToPrompt}
      onKeepEditing={() => {
        setConfirmingEditPrompt(false);
        onKeepEditing();
      }}
    />
  )}

  {draft ? (
    <div className="space-y-4 pt-2">
      <AiDraftEditor draft={draft} onChange={setDraft} disabled={isGenerating || isCreating} />

      {errorMessage && (
        <div role="alert" className="p-3 rounded-xl bg-warning/10 border border-warning/20 text-foreground text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-warning" />
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          disabled={isGenerating || isCreating}
          onClick={handleEditPrompt}
          className="border-border text-foreground/80 hover:bg-muted text-xs rounded-xl h-9"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Editar prompt
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isGenerating || isCreating}
          onClick={handleRegenerate}
          className="border-border text-foreground/80 hover:bg-muted text-xs rounded-xl h-9"
        >
          {isGenerating ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          )}
          Regenerar
        </Button>
        <Button
          type="button"
          disabled={isGenerating || isCreating}
          onClick={handleCreate}
          className="flex-1 bg-primary hover:opacity-90 text-primary-foreground font-medium text-xs rounded-xl h-9 shadow-md shadow-primary/20 cursor-pointer"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              <span>Creando...</span>
            </>
          ) : (
            <span>Crear proyecto</span>
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Regenerar descarta los cambios que hayas hecho en el borrador.</p>
    </div>
  ) : (
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
        <span className="text-xs text-muted-foreground self-center mr-1">Sugerencias:</span>
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
            className="text-xs bg-muted hover:bg-muted/80 text-foreground/80 px-2 py-0.5 rounded-lg border border-border transition-colors cursor-pointer"
          >
            {sug}
          </button>
        ))}
      </div>
    </div>

    {/* Configuración Multi-Provider BYOK */}
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
          className="text-xs text-primary hover:underline font-medium cursor-pointer"
        >
          {showConfig || !hasApiKey ? 'Ocultar' : 'Cambiar Clave'}
        </button>
      </div>

      {/* Selector de proveedor */}
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-muted-foreground">Motor:</span>
        <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => handleProviderChange('gemini')}
            className={`px-2 py-0.5 text-xs rounded-md font-medium transition-colors cursor-pointer ${
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
            className={`px-2 py-0.5 text-xs rounded-md font-medium transition-colors cursor-pointer ${
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
        <div className="flex items-center gap-1.5 mt-2 text-xs text-success">
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
          <p className="text-xs text-muted-foreground">
            Tu clave nunca se envía a servidores de backend. Se llama al LLM directo desde tu navegador.
          </p>
        </div>
      )}
    </div>

    {/* Mensaje de error con opción de fallback manual */}
    {errorMessage && (
      <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 text-foreground text-xs space-y-2">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-warning" />
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
        <div className="pt-1 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleManualFallback}
            className="text-xs h-7 rounded-lg border-warning/30 hover:bg-warning/20 text-foreground"
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
        onClick={onClose}
        className="flex-1 border-border text-foreground/80 hover:bg-muted text-xs rounded-xl h-9"
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        disabled={isGenerating || !prompt.trim()}
        className="flex-1 bg-primary hover:opacity-90 text-primary-foreground font-medium text-xs rounded-xl h-9 shadow-md shadow-primary/20 cursor-pointer"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
            <span>Generando con IA...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5 mr-2 text-primary-foreground" />
            <span>Generar Proyecto</span>
          </>
        )}
      </Button>
    </div>
  </form>
  )}
    </>
  );
}
