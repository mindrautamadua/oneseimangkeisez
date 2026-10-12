export class ForbiddenError extends Error {
  constructor(message = "Akses ditolak.") {
    super(message);
    this.name = "ForbiddenError";
  }
}
export class NotFoundError extends Error {
  constructor(message = "Data tidak ditemukan.") {
    super(message);
    this.name = "NotFoundError";
  }
}
export class ValidationError extends Error {
  constructor(public readonly fieldErrors: Record<string, string>) {
    super("Validasi gagal.");
    this.name = "ValidationError";
  }
}
