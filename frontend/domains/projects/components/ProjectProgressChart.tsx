'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Card } from '@/shared/components/ui/card';
import type { Project } from '@/domains/projects/types';

export function ProjectProgressChart({ projects }: { projects: Project[] }) {
  // Transformamos los datos para la gráfica
  const data = projects.map(project => {
    const total = project.tasks.length;
    const completed = project.tasks.filter((task) => task.isCompleted).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      name: project.name,
      progress: percentage,
      color: percentage === 100 ? '#10B981' : '#FF6B1A' // Verde si está terminado, naranja Orzix si no
    };
  });

  return (
    <Card className="p-6 mt-8 bg-[#0D0D0D] border-white/10 shadow-lg">
      <h3 className="text-lg font-semibold text-white mb-6">Progreso por Proyecto (%)</h3>
      <div className="h-72 w-full" style={{ minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              dataKey="name"
              type="category"
              width={150}
              tick={{ fontSize: 12, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              contentStyle={{
                backgroundColor: '#0D0D0D',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                color: '#FFFFFF'
              }}
            />
            <Bar dataKey="progress" radius={[0, 4, 4, 0]} barSize={26}>
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
