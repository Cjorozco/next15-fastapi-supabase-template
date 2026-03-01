import asyncio
from sqlalchemy import text
from app.database import engine


async def migrate():
    async with engine.begin() as conn:
        try:
            await conn.execute(
                text("ALTER TABLE tasks ADD COLUMN position INTEGER DEFAULT 0;")
            )
            print("Successfully added 'position' column to 'tasks' table.")
        except Exception as e:
            print(f"Error migrating: {e}")


if __name__ == "__main__":
    asyncio.run(migrate())
