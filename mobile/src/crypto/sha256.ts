/**
 * SHA-256 for sync payload hashes.
 *
 * The sync envelope previously carried `sha256:<crc16 in hex>` -- a 16-bit
 * CRC with a "sha256:" prefix. The server now recomputes and verifies this
 * field, so it has to be a real digest.
 *
 * Uses WebCrypto where available (Hermes with expo-crypto installed, and the
 * Node test runtime). Throws rather than silently returning a weak value.
 */
export async function sha256Hex(input: string): Promise<string> {
  const subtle: SubtleCrypto | undefined =
    (globalThis as any)?.crypto?.subtle ?? undefined;

  if (!subtle) {
    throw new Error(
      'No SubtleCrypto available. Install expo-crypto and register a WebCrypto ' +
        'polyfill before syncing; a weaker hash is not an acceptable fallback.',
    );
  }

  const bytes = new TextEncoder().encode(input);
  const digest = await subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
