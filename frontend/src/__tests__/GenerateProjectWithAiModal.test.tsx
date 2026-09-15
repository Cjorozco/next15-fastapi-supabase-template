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

  it('executes AI generation and calls atomic mutation on submit', async () => {
    localStorage.setItem('gemini_api_key', 'test-key-123');

    const generateSpy = vi.spyOn(geminiClient, 'generateProjectWithAi').mockResolvedValue({
      projectName: 'Campaña de Marketing 3 Semanas',
      description: 'Estrategia integral',
      tasks: [
        { title: 'Definir público', position: 0 },
        { title: 'Lanzar anuncios', position: 1 },
      ],
    });

    render(<GenerateProjectWithAiModal />);
    fireEvent.click(screen.getByRole('button', { name: /generar con ia/i }));

    const textarea = screen.getByLabelText(/¿Qué proyecto deseas construir\?/i);
    fireEvent.change(textarea, { target: { value: 'Campaña de marketing en 3 semanas' } });

    const submitButton = screen.getByRole('button', { name: /generar proyecto/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(generateSpy).toHaveBeenCalledWith({
        prompt: 'Campaña de marketing en 3 semanas',
        apiKey: 'test-key-123',
      });
      expect(mockMutate).toHaveBeenCalledWith(
        {
          name: 'Campaña de Marketing 3 Semanas',
          description: 'Estrategia integral',
          tasks: [
            { title: 'Definir público', position: 0 },
            { title: 'Lanzar anuncios', position: 1 },
          ],
        },
        expect.anything()
      );
    });
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
