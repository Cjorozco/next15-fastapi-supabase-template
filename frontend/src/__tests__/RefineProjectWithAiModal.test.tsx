import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RefineProjectWithAiModal } from '@/domains/projects/components/RefineProjectWithAiModal';
import { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';

const mockApplyRefinement = vi.fn();

vi.mock('@/domains/projects/hooks/useProjects', () => ({
  useApplyAiRefinement: () => ({
    mutate: mockApplyRefinement,
    isPending: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('RefineProjectWithAiModal Component', () => {
  const dummyProjectId = 'proj_123' as Id<'projects'>;
  const dummyTasks = [
    {
      _id: 'task_1' as Id<'tasks'>,
      title: 'Diseño de Base de Datos',
      isCompleted: false,
      subtasks: [{ id: 'st_1', title: 'Definir tablas', isCompleted: true }],
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockApplyRefinement.mockReset();
  });

  it('renders trigger button "Refinar con IA"', () => {
    render(
      <RefineProjectWithAiModal
        projectId={dummyProjectId}
        projectName="Mi Proyecto SaaS"
        projectDescription="Descripción existente"
        tasks={dummyTasks}
      />
    );

    expect(screen.getByRole('button', { name: /refinar con ia/i })).toBeInTheDocument();
  });

  it('opens modal and displays current project context and suggestions', () => {
    render(
      <RefineProjectWithAiModal
        projectId={dummyProjectId}
        projectName="Mi Proyecto SaaS"
        projectDescription="Descripción existente"
        tasks={dummyTasks}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /refinar con ia/i }));

    expect(screen.getByText('Copiloto IA: Refinar Proyecto')).toBeInTheDocument();
    expect(screen.getByText(/Mi Proyecto SaaS/i)).toBeInTheDocument();
    expect(screen.getByText(/Agregar subtareas detalladas/i)).toBeInTheDocument();
  });

  const mockSuccessfulAiResponse = (payload: unknown) => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }],
      }),
    } as Response);
  };

  const renderAndGenerate = async (payload: unknown) => {
    localStorage.setItem('gemini_api_key', 'test-gemini-key');
    mockSuccessfulAiResponse(payload);

    render(
      <RefineProjectWithAiModal
        projectId={dummyProjectId}
        projectName="Mi Proyecto SaaS"
        projectDescription="Descripción existente"
        tasks={dummyTasks}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /refinar con ia/i }));
    fireEvent.change(screen.getByLabelText(/¿Qué deseas agregar o mejorar\?/i), {
      target: { value: 'Agrega subtareas a la base de datos' },
    });
    fireEvent.click(screen.getByRole('button', { name: /generar propuesta/i }));

    await screen.findByTestId('refinement-preview');
  };

  const proposal = {
    summary: 'Se agregaron 2 subtareas técnicas.',
    updatedDescription: 'Descripción mejorada con métricas.',
    newTasks: [{ title: 'Pruebas de carga', subtasks: ['Definir escenarios'] }],
    newSubtasksForExistingTasks: [
      { taskId: 'task_1', subtaskTitles: ['Configurar índices', 'Añadir seed data'] },
    ],
  };

  it('shows a preview of the changes and does NOT save anything before confirming', async () => {
    await renderAndGenerate(proposal);

    expect(screen.getByText('Descripción existente')).toBeInTheDocument();
    expect(screen.getByText('Descripción mejorada con métricas.')).toBeInTheDocument();
    expect(screen.getByText('Pruebas de carga')).toBeInTheDocument();
    expect(screen.getByText('Diseño de Base de Datos')).toBeInTheDocument();
    expect(screen.getByText('Configurar índices')).toBeInTheDocument();
    expect(mockApplyRefinement).not.toHaveBeenCalled();
  });

  it('applies exactly the reviewed changes after confirming', async () => {
    mockApplyRefinement.mockImplementation((_params, options) => {
      options?.onSuccess?.();
    });
    await renderAndGenerate(proposal);

    fireEvent.click(screen.getByRole('button', { name: /aplicar cambios/i }));

    await waitFor(() => {
      expect(mockApplyRefinement).toHaveBeenCalledWith(
        {
          projectId: dummyProjectId,
          updatedDescription: 'Descripción mejorada con métricas.',
          newTasks: [{ title: 'Pruebas de carga', subtasks: ['Definir escenarios'] }],
          newSubtasksForExistingTasks: [
            { taskId: 'task_1', subtaskTitles: ['Configurar índices', 'Añadir seed data'] },
          ],
        },
        expect.anything()
      );
      expect(toast.success).toHaveBeenCalledWith('Se agregaron 2 subtareas técnicas.');
    });
  });

  it('discarding the preview returns to the form without saving', async () => {
    await renderAndGenerate(proposal);

    fireEvent.click(screen.getByRole('button', { name: /descartar/i }));

    expect(screen.queryByTestId('refinement-preview')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/¿Qué deseas agregar o mejorar\?/i)).toHaveValue(
      'Agrega subtareas a la base de datos'
    );
    expect(mockApplyRefinement).not.toHaveBeenCalled();
  });

  it('never wipes the description when the AI returns an empty one', async () => {
    mockApplyRefinement.mockImplementation((_params, options) => {
      options?.onSuccess?.();
    });
    await renderAndGenerate({
      summary: 'Solo subtareas',
      updatedDescription: '',
      newSubtasksForExistingTasks: [{ taskId: 'task_1', subtaskTitles: ['Una'] }],
    });

    expect(screen.queryByLabelText('Cambio en la descripción')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /aplicar cambios/i }));

    await waitFor(() => expect(mockApplyRefinement).toHaveBeenCalled());
    expect(mockApplyRefinement.mock.calls[0][0]).not.toHaveProperty('updatedDescription');
  });

  it('offers no apply button when the AI proposes nothing', async () => {
    await renderAndGenerate({ summary: 'Nada que cambiar' });

    expect(screen.getByText(/no propuso cambios/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /aplicar cambios/i })).not.toBeInTheDocument();
  });
});
