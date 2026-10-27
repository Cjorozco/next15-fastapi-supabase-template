'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Card } from '@/shared/components/ui/card';
import type { Project } from '@/domains/projects/types';
import { useTheme } from '@/shared/context/ThemeContext';

export function ProjectProgressChart({ projects }: { projects: Project[] }) {
  const { theme } = useTheme();
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Transformamos los datos para la gráfica
  const data = projects.map((project, index) => {
    const total = project.tasks.length;
    const completed = project.tasks.filter((task) => task.isCompleted).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Asigna colores armónicos según el índice y estado
    const colors = [theme.chart1, theme.chart3, theme.chart4, theme.chart5];
    const itemColor = percentage === 100 ? theme.chart2 : colors[index % colors.length];

    return {
      name: project.name,
      progress: percentage,
      color: itemColor,
    };
  });

  return (
    <Card className="p-6 mt-8 bg-card border-border shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-foreground">Progreso por Proyecto (%)</h3>
        <span className="text-xs text-muted-foreground">{projects.length} proyectos registrados</span>
      </div>
      <div
        className="h-72 w-full"
        style={{ minWidth: 0 }}
        role="img"
        aria-label={`Progreso por proyecto: ${data.map((d) => `${d.name} ${d.progress}%`).join(', ')}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={true}
              vertical={false}
              stroke="var(--border)"
            />
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              dataKey="name"
              type="category"
              width={150}
              tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
              contentStyle={{
                backgroundColor: 'var(--popover)',
                borderColor: 'var(--border)',
                borderRadius: '12px',
                color: 'var(--popover-foreground)',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Bar dataKey="progress" isAnimationActive={!prefersReducedMotion} radius={[0, 6, 6, 0]} barSize={24}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
