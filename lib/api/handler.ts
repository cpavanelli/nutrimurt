import { NextResponse } from "next/server";
import type { z } from "zod";

import { UnauthorizedError } from "@/lib/auth";
import { routeIdSchema, urlIdSchema } from "@/lib/validation/schemas";

export type Parsed<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

export function withApiHandler<Arguments extends unknown[]>(
  handler: (...args: Arguments) => Promise<Response>,
) {
  return async (...args: Arguments): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      throw error;
    }
  };
}

export function validationResponse(error: z.ZodError): NextResponse {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "body";
    (errors[key] ??= []).push(issue.message);
  }

  return NextResponse.json({ errors }, { status: 400 });
}

export async function parseJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<Parsed<T>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { errors: { body: ["O corpo da requisição deve ser JSON válido."] } },
        { status: 400 },
      ),
    };
  }

  const result = schema.safeParse(body);
  return result.success
    ? result
    : { success: false, response: validationResponse(result.error) };
}

export function parseRouteId(value: string): Parsed<number> {
  const result = routeIdSchema.safeParse(value);
  return result.success
    ? result
    : { success: false, response: validationResponse(result.error) };
}

/**
 * Patient links arrive as a path segment on unauthenticated routes, so the
 * shape is checked before the value reaches a query.
 */
export function parseUrlId(value: string): Parsed<string> {
  const result = urlIdSchema.safeParse(value);
  return result.success
    ? result
    : { success: false, response: validationResponse(result.error) };
}

export function conflict(detail: string): NextResponse {
  return NextResponse.json({ detail }, { status: 409 });
}

export function notFound(): NextResponse {
  return NextResponse.json({ title: "Not Found" }, { status: 404 });
}
