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

  it('executes AI refinement and calls Convex mutation on submit', async () => {
    localStorage.setItem('gemini_api_key', 'test-gemini-key');

    const mockAiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  summary: 'Se agregaron 2 subtareas técnicas.',
                  updatedDescription: 'Descripción mejorada con métricas.',
                  newTasks: [],
                  newSubtasksForExistingTasks: [
                    {
                      taskId: 'task_1',
                      subtaskTitles: ['Configurar índices', 'Añadir seed data'],
                    },
                  ],
                }),
              },
            ],
          },
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockAiResponse,
    } as Response);

    mockApplyRefinement.mockImplementation((_params, options) => {
      options?.onSuccess?.();
    });

    render(
      <RefineProjectWithAiModal
        projectId={dummyProjectId}
        projectName="Mi Proyecto SaaS"
        projectDescription="Descripción existente"
        tasks={dummyTasks}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /refinar con ia/i }));

    const textarea = screen.getByLabelText(/¿Qué deseas agregar o mejorar\?/i);
    fireEvent.change(textarea, { target: { value: 'Agrega subtareas a la base de datos' } });

    const submitBtn = screen.getByRole('button', { name: /aplicar mejoras con ia/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockApplyRefinement).toHaveBeenCalledWith(
        {
          projectId: dummyProjectId,
          updatedDescription: 'Descripción mejorada con métricas.',
          newTasks: [],
          newSubtasksForExistingTasks: [
            {
              taskId: 'task_1',
              subtaskTitles: ['Configurar índices', 'Añadir seed data'],
            },
          ],
        },
        expect.anything()
      );
      expect(toast.success).toHaveBeenCalledWith('Se agregaron 2 subtareas técnicas.');
    });
  });
});
