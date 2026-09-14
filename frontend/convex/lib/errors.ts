/**
 * Errores de dominio tipados.
 * Los componentes de UI mapean estos códigos a mensajes amigables
 * en shared/lib/userFacingError.ts.
 */

export const DomainError = {
  ENTITY_NOT_FOUND: "ENTITY_NOT_FOUND",
  DUPLICATE_ENTITY: "DUPLICATE_ENTITY",
  INVALID_INPUT: "INVALID_INPUT",
  UNAUTHORIZED: "UNAUTHORIZED",
  NOT_AUTHENTICATED: "NOT_AUTHENTICATED",
} as const;

export type DomainErrorCode = keyof typeof DomainError;

export class DomainException extends Error {
  public readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message?: string) {
    super(message ?? code);
    this.name = "DomainException";
    this.code = code;
  }
}
