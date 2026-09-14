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
        <Card key={item.name} className="p-6 bg-card border-border hover:border-primary/40 transition-all shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <item.icon size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">{item.name}</p>
              <h3 className="text-2xl font-bold text-foreground tracking-tight">{item.value}</h3>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
