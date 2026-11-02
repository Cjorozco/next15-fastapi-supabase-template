import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerateProjectWithAiModal } from '@/domains/projects/components/GenerateProjectWithAiModal';
import * as geminiClient from '@/shared/lib/ai/gemini-client';
import { AIRateLimitError, AINetworkError, AISchemaValidationError } from '@/shared/lib/ai/gemini-client';
import { toast } from 'sonner';

const mockMutate = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@/domains/projects/hooks/useProjects', () => ({
  useCreateProjectWithTasks: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('GenerateProjectWithAiModal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockMutate.mockReset();
    mockPush.mockReset();
  });

  it('renders trigger button "✨ Generar con IA"', () => {
    render(<GenerateProjectWithAiModal />);
    expect(screen.getByRole('button', { name: /generar con ia/i })).toBeInTheDocument();
  });

  it('opens modal when clicking trigger button', () => {
    render(<GenerateProjectWithAiModal />);
    fireEvent.click(screen.getByRole('button', { name: /generar con ia/i }));
    expect(screen.getByText('Generar Proyecto con IA')).toBeInTheDocument();
    expect(screen.getByLabelText(/¿Qué proyecto deseas construir\?/i)).toBeInTheDocument();
  });

  it('populates prompt when clicking suggestion chips', () => {
    render(<GenerateProjectWithAiModal />);
    fireEvent.click(screen.getByRole('button', { name: /generar con ia/i }));

    const chip = screen.getByRole('button', { name: 'Campaña de marketing en 3 semanas' });
    fireEvent.click(chip);

    const textarea = screen.getByLabelText(/¿Qué proyecto deseas construir\?/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Campaña de marketing en 3 semanas');
  });

  const sampleProject = {
    projectName: 'Campaña de Marketing 3 Semanas',
    description: 'Estrategia integral',
    tasks: [
      { title: 'Definir público', position: 0, priority: 'alta' as const, estimatedHours: 1 },
      { title: 'Lanzar anuncios', position: 1 },
      { title: 'Medir resultados', position: 2 },
      { title: 'Ajustar presupuesto', position: 3 },
    ],
  };

  const openAndGenerate = async (promptText: string) => {
    render(<GenerateProjectWithAiModal />);
    fireEvent.click(screen.getByRole('button', { name: /generar con ia/i }));
    fireEvent.change(screen.getByLabelText(/¿Qué proyecto deseas construir?/i), {
      target: { value: promptText },
    });
    fireEvent.click(screen.getByRole('button', { name: /generar proyecto/i }));
    await screen.findByRole('button', { name: /crear proyecto/i });
  };

  it('shows an editable preview and does not create anything until confirmed', async () => {
    localStorage.setItem('gemini_api_key', 'test-key-123');
    const generateSpy = vi.spyOn(geminiClient, 'generateProjectWithAi').mockResolvedValue(sampleProject);

    await openAndGenerate('Campaña de marketing en 3 semanas');

    expect(generateSpy).toHaveBeenCalledWith({
      prompt: 'Campaña de marketing en 3 semanas',
      apiKey: 'test-key-123',
      provider: 'gemini',
    });
    expect(mockMutate).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nombre del proyecto')).toHaveValue('Campaña de Marketing 3 Semanas');
    expect(screen.getByLabelText('Título de la tarea 1')).toHaveValue('Definir público');
    expect(screen.getByLabelText('Prioridad de la tarea 1')).toHaveValue('alta');
    expect(screen.getByLabelText('Horas estimadas de la tarea 1')).toHaveValue(1);
  });

  it('creates the project with the edits made in the preview', async () => {
    localStorage.setItem('gemini_api_key', 'test-key-123');
    vi.spyOn(geminiClient, 'generateProjectWithAi').mockResolvedValue(sampleProject);

    await openAndGenerate('Campaña de marketing en 3 semanas');

    fireEvent.change(screen.getByLabelText('Nombre del proyecto'), { target: { value: 'Mi campaña' } });
    fireEvent.change(screen.getByLabelText('Título de la tarea 2'), { target: { value: 'Lanzar anuncios Meta' } });
    fireEvent.change(screen.getByLabelText('Prioridad de la tarea 2'), { target: { value: 'baja' } });
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar tarea 4' }));
    fireEvent.click(screen.getByRole('button', { name: /agregar tarea/i }));
    fireEvent.change(screen.getByLabelText('Título de la tarea 4'), { target: { value: 'Informe final' } });
    fireEvent.click(screen.getByRole('button', { name: /crear proyecto/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      {
        name: 'Mi campaña',
        description: 'Estrategia integral',
        tasks: [
          { title: 'Definir público', position: 0, priority: 'alta', estimatedHours: 1 },
          { title: 'Lanzar anuncios Meta', position: 1, priority: 'baja' },
          { title: 'Medir resultados', position: 2 },
          { title: 'Informe final', position: 3 },
        ],
      },
      expect.anything()
    );
  });

  it('lets the user mark a draft task as "Sin fecha límite", which disables and clears its date', async () => {
    localStorage.setItem('gemini_api_key', 'test-key-123');
    vi.spyOn(geminiClient, 'generateProjectWithAi').mockResolvedValue({
      ...sampleProject,
      tasks: [
        { title: 'Entrega', position: 0, dueDate: '2030-03-15' },
        { title: 'Hábito', position: 1, noDeadline: true },
        ...sampleProject.tasks.slice(2).map((t) => ({ ...t, noDeadline: true as const })),
      ],
    });

    await openAndGenerate('Curso con entrega el 15 de marzo');

    const date1 = screen.getByLabelText('Fecha de la tarea 1') as HTMLInputElement;
    expect(date1.value).toBe('2030-03-15');
    expect(screen.getByLabelText('Fecha de la tarea 2')).toBeDisabled();

    fireEvent.click(screen.getAllByLabelText(/Sin fecha límite/)[0]);
    expect(date1).toBeDisabled();
    expect(date1.value).toBe('');

    fireEvent.click(screen.getByRole('button', { name: /crear proyecto/i }));
    const args = mockMutate.mock.calls[0][0];
    expect(args.tasks[0]).toMatchObject({ title: 'Entrega', noDeadline: true });
    expect(args.tasks[0]).not.toHaveProperty('dueDate');
    expect(args.tasks[1]).toMatchObject({ title: 'Hábito', noDeadline: true });
  });

  it('keeps an explicit title from the prompt instead of the AI name', async () => {
    localStorage.setItem('gemini_api_key', 'test-key-123');
    const generateSpy = vi.spyOn(geminiClient, 'generateProjectWithAi').mockResolvedValue({
      ...sampleProject,
      projectName: 'Nombre inventado',
    });

    await openAndGenerate('Inglés B2. Retomo tras 19 días, 30 min al día');

    expect(generateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'Retomo tras 19 días, 30 min al día',
        fixedName: 'Inglés B2',
      })
    );
    expect(screen.getByLabelText('Nombre del proyecto')).toHaveValue('Inglés B2');
  });

  it('regenerates the draft with the same request', async () => {
    localStorage.setItem('gemini_api_key', 'test-key-123');
    const generateSpy = vi
      .spyOn(geminiClient, 'generateProjectWithAi')
      .mockResolvedValueOnce(sampleProject)
      .mockResolvedValueOnce({ ...sampleProject, projectName: 'Segunda versión' });

    await openAndGenerate('Campaña de marketing en 3 semanas');
    fireEvent.click(screen.getByRole('button', { name: /regenerar/i }));

    await waitFor(() => {
      expect(screen.getByLabelText('Nombre del proyecto')).toHaveValue('Segunda versión');
    });
    expect(generateSpy).toHaveBeenCalledTimes(2);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('handles 429 Rate Limit error gracefully with Sonner toast and manual fallback', async () => {
    localStorage.setItem('gemini_api_key', 'test-key-123');
    vi.spyOn(geminiClient, 'generateProjectWithAi').mockRejectedValue(new AIRateLimitError());

    render(<GenerateProjectWithAiModal />);
    fireEvent.click(screen.getByRole('button', { name: /generar con ia/i }));

    const textarea = screen.getByLabelText(/¿Qué proyecto deseas construir\?/i);
    fireEvent.change(textarea, { target: { value: 'Proyecto con IA saturada' } });

    const submitButton = screen.getByRole('button', { name: /generar proyecto/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'La IA está saturada. Por favor, crea el proyecto manualmente por ahora.'
      );
      expect(screen.getByText(/La IA está saturada/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /crear proyecto manualmente/i })).toBeInTheDocument();
    });

    // Verify manual fallback triggers navigation
    const fallbackBtn = screen.getByRole('button', { name: /crear proyecto manualmente/i });
    fireEvent.click(fallbackBtn);
    expect(mockPush).toHaveBeenCalledWith('/projects');
  });

  it('handles AI hallucination / schema validation failure gracefully without crashing', async () => {
    localStorage.setItem('gemini_api_key', 'test-key-123');
    vi.spyOn(geminiClient, 'generateProjectWithAi').mockRejectedValue(
      new AISchemaValidationError(null, 'tasks: al menos 1 tarea')
    );

    render(<GenerateProjectWithAiModal />);
    fireEvent.click(screen.getByRole('button', { name: /generar con ia/i }));

    const textarea = screen.getByLabelText(/¿Qué proyecto deseas construir\?/i);
    fireEvent.change(textarea, { target: { value: 'Prompt que alucina' } });

    const submitButton = screen.getByRole('button', { name: /generar proyecto/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('La IA generó una respuesta con formato inválido')
      );
      expect(screen.getByText(/formato inválido/i)).toBeInTheDocument();
    });
  });

  it('handles Network connection error gracefully', async () => {
    localStorage.setItem('gemini_api_key', 'test-key-123');
    vi.spyOn(geminiClient, 'generateProjectWithAi').mockRejectedValue(new AINetworkError());

    render(<GenerateProjectWithAiModal />);
    fireEvent.click(screen.getByRole('button', { name: /generar con ia/i }));

    const textarea = screen.getByLabelText(/¿Qué proyecto deseas construir\?/i);
    fireEvent.change(textarea, { target: { value: 'Prompt sin red' } });

    const submitButton = screen.getByRole('button', { name: /generar proyecto/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Error de conexión con el servicio de IA. Revisa tu conexión o crea el proyecto manualmente.'
      );
    });
  });
});
