import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Array<{ field: string; message: string }>,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
    },
  })
}

function handleZodError(zodError: ZodError, res: Response): void {
  const details = zodError.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }))

  res.status(400).json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details,
    },
  })
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    handleZodError(err, res)
    return
  }

  const appErr =
    err instanceof AppError
      ? err
      : typeof err === 'object' && err !== null && 'statusCode' in err && 'code' in err
        ? (err as AppError)
        : null

  if (appErr) {
    const payload: Record<string, unknown> = {
      success: false,
      error: {
        code: appErr.code,
        message: appErr.message,
      },
    }

    if (appErr.details) {
      ;(payload.error as Record<string, unknown>).details = appErr.details
    }

    res.status(appErr.statusCode).json(payload)
    return
  }

  const message = err instanceof Error ? err.message : 'An unexpected error occurred'

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'development' ? message : 'An unexpected error occurred',
    },
  })
}
