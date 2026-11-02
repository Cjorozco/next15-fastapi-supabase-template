import { v } from "convex/values";

export const projectStatusValidator = v.union(
  v.literal("activo"),
  v.literal("en_pausa"),
  v.literal("completado")
);

export const projectPriorityValidator = v.union(
  v.literal("alta"),
  v.literal("media"),
  v.literal("baja"),
  v.literal("ninguna")
);
