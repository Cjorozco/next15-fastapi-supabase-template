import asyncio
from sqlalchemy.ext.asyncio import AsyncSession

# Importamos el nombre exacto que tienes en database.py
from app.database import AsyncSessionLocal
from app import models


async def seed_data():
    # Usamos AsyncSessionLocal para abrir la conexión
    async with AsyncSessionLocal() as db:
        projects_data = [
            {
                "name": "Mobile Banking Redesign",
                "description": "Refactorización de componentes core usando React y TS para el flujo de transferencias.",
                "tasks": [
                    {
                        "title": "Implementar validación MFA en transferencias",
                        "is_completed": True,
                    },
                    {
                        "title": "Optimizar renderizado de historial (Virtual List)",
                        "is_completed": False,
                    },
                    {
                        "title": "Ajustar estilos de tarjetas según nueva guía de marca",
                        "is_completed": False,
                    },
                ],
            },
            {
                "name": "Plan de Mudanza (Sabaneta -> Quilla)",
                "description": "Logística y tareas pendientes para el traslado a Barranquilla.",
                "tasks": [
                    {
                        "title": "Investigar apartamentos en sector El Golf",
                        "is_completed": True,
                    },
                    {
                        "title": "Revisar cupos en jardines infantiles para Sofía",
                        "is_completed": False,
                    },
                    {
                        "title": "Cotizar camión de mudanza nacional",
                        "is_completed": False,
                    },
                ],
            },
            {
                "name": "Personal Finance SaaS",
                "description": "Laboratorio Fullstack usando Next.js 15 y FastAPI.",
                "tasks": [
                    {"title": "Configurar middleware de CORS", "is_completed": True},
                    {
                        "title": "Implementar Optimistic Updates en checkboxes",
                        "is_completed": True,
                    },
                    {
                        "title": "Integrar gráficas de Tremor para analytics",
                        "is_completed": False,
                    },
                ],
            },
        ]

        print("🚀 Iniciando carga de datos reales...")

        for p in projects_data:
            new_project = models.Project(
                name=p["name"], description=p["description"], owner_id=1
            )
            db.add(new_project)
            await db.flush()

            for t in p["tasks"]:
                new_task = models.Task(
                    title=t["title"],
                    is_completed=t["is_completed"],
                    project_id=new_project.id,
                )
                db.add(new_task)

        await db.commit()
        print("✅ ¡Base de datos poblada con éxito!")


if __name__ == "__main__":
    asyncio.run(seed_data())
