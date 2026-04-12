import { TRPCClientError } from "@trpc/client";

type TrpcClientErr = TRPCClientError<any>;

/**
 * Best-effort user/server message from a failed tRPC call.
 * Some runtimes expose the API message on `shape` rather than `message`.
 */
export function trpcErrorMessage(err: unknown): string {
  if (err instanceof TRPCClientError) {
    const anyErr = err as TrpcClientErr & {
      shape?: { message?: string };
      data?: { message?: string };
    };
    const fromShape = anyErr.shape?.message;
    const fromData = anyErr.data?.message;
    const combined = [fromShape, fromData, err.message].find((s) => typeof s === "string" && s.trim().length > 0);
    return String(combined ?? "").trim();
  }
  if (err instanceof Error) return err.message.trim();
  return "";
}
