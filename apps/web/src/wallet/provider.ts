/** Minimal EIP-1193 provider typing over window.ethereum (D-02 wallet layer). */
export interface Eip1193Provider {
  request(args: { readonly method: string; readonly params?: readonly unknown[] | Record<string, unknown> }): Promise<unknown>;
  on?(event: string, handler: (...args: never[]) => void): void;
  removeListener?(event: string, handler: (...args: never[]) => void): void;
}

declare global {
  interface Window {
    readonly ethereum?: Eip1193Provider;
  }
}

export function getEthereumProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  return window.ethereum ?? null;
}
