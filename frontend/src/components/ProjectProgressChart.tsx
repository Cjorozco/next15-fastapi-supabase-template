'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Card } from '@/components/ui/card';

export function ProjectProgressChart({ projects }: { projects: any[] }) {
  // Transformamos los datos para la gráfica
  const data = projects.map(project => {
    const total = project.tasks.length;
    const completed = project.tasks.filter((t: any) => t.is_completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      name: project.name,
      progress: percentage,
      color: percentage === 100 ? '#10b981' : '#3b82f6' // Verde si está terminado, azul si no
    };
  });

  return (
    <Card className="p-6 mt-8">
      <h3 className="text-lg font-semibold text-slate-900 mb-6">Progreso por Proyecto (%)</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              dataKey="name"
              type="category"
              width={150}
              tick={{ fontSize: 12, fill: '#64748b' }}
            />
            <Tooltip
              cursor={{ fill: '#f1f5f9' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="progress" radius={[0, 4, 4, 0]} barSize={30}>
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