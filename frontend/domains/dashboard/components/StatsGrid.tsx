import { Card } from "@/shared/components/ui/card";
import { Project } from "@/domains/projects/types";
import { CheckCircle2, ListTodo, LayoutGrid } from "lucide-react";

export function StatsGrid({ projects }: { projects: Project[] }) {
  const totalTasks = projects.reduce((acc, p) => acc + p.tasks.length, 0);
  const completedTasks = projects.reduce(
    (acc, p) => acc + p.tasks.filter((t) => t.isCompleted).length, 0
  );
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const stats = [
    { name: "Progreso Total", value: `${completionRate}%`, icon: CheckCircle2 },
    { name: "Tareas Pendientes", value: totalTasks - completedTasks, icon: ListTodo },
    { name: "Proyectos Activos", value: projects.length, icon: LayoutGrid },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
      {stats.map((item) => (
        <Card key={item.name} className="p-6 bg-[#0D0D0D] border-white/10 hover:border-[#FF6B1A]/40 transition-all shadow-lg">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-[#FF6B1A]/15 text-[#FF6B1A]">
              <item.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-white/60">{item.name}</p>
              <h3 className="text-2xl font-bold text-white tracking-tight">{item.value}</h3>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
