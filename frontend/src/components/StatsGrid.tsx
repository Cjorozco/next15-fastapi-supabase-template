import { Card } from "@/components/ui/card";
import { Project } from "@/types";
import { CheckCircle2, ListTodo, LayoutGrid } from "lucide-react";

export function StatsGrid({ projects }: { projects: Project[] }) {
  const totalTasks = projects.reduce((acc, p) => acc + p.tasks.length, 0);
  const completedTasks = projects.reduce(
    (acc, p) => acc + p.tasks.filter((t) => t.isCompleted).length, 0
  );
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const stats = [
    { name: "Progreso Total", value: `${completionRate}%`, icon: CheckCircle2, color: "text-emerald-500" },
    { name: "Tareas Pendientes", value: totalTasks - completedTasks, icon: ListTodo, color: "text-blue-500" },
    { name: "Proyectos Activos", value: projects.length, icon: LayoutGrid, color: "text-slate-500" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
      {stats.map((item) => (
        <Card key={item.name} className="p-6">
          <div className="flex items-center space-x-4">
            <div className={`p-2 rounded-lg bg-slate-100 ${item.color}`}>
              <item.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{item.name}</p>
              <h3 className="text-2xl font-bold text-slate-900">{item.value}</h3>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
