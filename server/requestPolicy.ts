export function resolveClientIp(socketAddress: string | undefined, forwardedHeader: string | string[] | undefined, trustedProxyHops: number): string {
  if (trustedProxyHops > 0) {
    const forwarded = (Array.isArray(forwardedHeader) ? forwardedHeader.join(",") : forwardedHeader ?? "")
      .split(",").map((part) => part.trim()).filter(Boolean);
    const chain = [...forwarded, ...(socketAddress ? [socketAddress] : [])];
    const index = chain.length - 1 - trustedProxyHops;
    if (index >= 0) return chain[index];
  }
  return socketAddress || "unknown";
}
