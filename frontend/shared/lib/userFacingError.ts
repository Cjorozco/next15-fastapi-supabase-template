import { DomainError, DomainErrorCode } from "../../convex/lib/errors";

const ERROR_MESSAGES: Record<DomainErrorCode, string> = {
  [DomainError.ENTITY_NOT_FOUND]: "El recurso solicitado no fue encontrado.",
  [DomainError.DUPLICATE_ENTITY]: "Ya existe un elemento con estos datos.",
  [DomainError.INVALID_INPUT]: "Los datos proporcionados no son válidos.",
  [DomainError.UNAUTHORIZED]: "No tienes permisos para realizar esta acción.",
  [DomainError.NOT_AUTHENTICATED]: "Debes iniciar sesión para continuar.",
};

/**
 * Convierte cualquier error (DomainException, ConvexError, Error estándar o desconocido)
 * en un mensaje amigable y accionable para mostrar en la interfaz de usuario.
 */
export function mapErrorToUserMessage(error: unknown, fallbackMessage = "Ocurrió un error inesperado. Inténtalo de nuevo."): string {
  if (!error) return fallbackMessage;

  if (typeof error === "string") {
    if (error in ERROR_MESSAGES) {
      return ERROR_MESSAGES[error as DomainErrorCode];
    }
    return error;
  }

  if (typeof error === "object") {
    const maybeCode = (error as { code?: string; data?: { code?: string } }).code ||
      (error as { code?: string; data?: { code?: string } }).data?.code;

    if (maybeCode && maybeCode in ERROR_MESSAGES) {
      return ERROR_MESSAGES[maybeCode as DomainErrorCode];
    }

    if (error instanceof Error) {
      for (const [code, msg] of Object.entries(ERROR_MESSAGES)) {
        if (error.message.includes(code)) {
          return msg;
        }
      }
      return error.message;
    }
  }

  return fallbackMessage;
}
