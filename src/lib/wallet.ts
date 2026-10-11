// Tiny event bus for the wallet badges in the header (coins + vouchers).
// refreshWallet() = "the balance just changed, re-read it now"; the badges otherwise re-read it every 20 s.
export const WALLET_REFRESH = "wallet:refresh";
export const WALLET_UPDATE = "wallet:update";
export type WalletData = { coins: number; blue: number; gold: number };
export function refreshWallet(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(WALLET_REFRESH));
}
