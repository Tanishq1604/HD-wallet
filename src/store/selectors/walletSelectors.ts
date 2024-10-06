import { RootState } from "../index";

// Ethereum selectors
export const selectActiveEthereumIndex = (state: RootState) =>
  state.ethereum.activeIndex ?? 0;

export const selectActiveEthereumAddress = (state: RootState) => {
  const activeIndex = selectActiveEthereumIndex(state);
  return state.ethereum.addresses[activeIndex]?.address ?? "";
};

export const selectEthereumAddresses = (state: RootState) =>
  state.ethereum.addresses;

export const selectEthereumBalance = (state: RootState) => {
  const activeIndex = selectActiveEthereumIndex(state);
  return state.ethereum.addresses[activeIndex]?.balance ?? "0";
};

// Solana selectors
export const selectActiveSolanaIndex = (state: RootState) =>
  state.solana.activeIndex ?? 0;

export const selectActiveSolanaAddress = (state: RootState) => {
  const activeIndex = selectActiveSolanaIndex(state);
  return state.solana.addresses[activeIndex]?.address ?? "";
};

export const selectSolanaAddresses = (state: RootState) =>
  state.solana.addresses;

export const selectSolanaBalance = (state: RootState) => {
  const activeIndex = selectActiveSolanaIndex(state);
  return state.solana.addresses[activeIndex]?.balance ?? "0";
};

// Tron selectors
export const selectActiveTronIndex = (state: RootState) =>
  state.tron.activeIndex ?? 0;

export const selectActiveTronAddress = (state: RootState) => {
  const activeIndex = selectActiveTronIndex(state);
  return state.tron.addresses[activeIndex]?.address ?? "";
};

export const selectTronAddresses = (state: RootState) =>
  state.tron.addresses;

export const selectTronBalance = (state: RootState) => {
  const activeIndex = selectActiveTronIndex(state);
  return state.tron.addresses[activeIndex]?.balance ?? 0;
};

export const selectTronTransactions = (state: RootState) => {
  const activeIndex = selectActiveTronIndex(state);
  return state.tron.addresses[activeIndex]?.transactionMetadata.transactions ?? [];
};

export const selectTronTransactionConfirmations = (state: RootState) => {
  const activeIndex = selectActiveTronIndex(state);
  return state.tron.addresses[activeIndex]?.transactionConfirmations ?? [];
};

export const selectTronStatus = (state: RootState) => {
  const activeIndex = selectActiveTronIndex(state);
  return state.tron.addresses[activeIndex]?.status;
};