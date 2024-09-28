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

// Neo selectors
export const selectActiveNeoIndex = (state: RootState) =>
  state.neo.activeIndex ?? 0;

export const selectActiveNeoAddress = (state: RootState) => {
  const activeIndex = selectActiveNeoIndex(state);
  return state.neo.addresses[activeIndex]?.address ?? "";
};

export const selectNeoAddresses = (state: RootState) =>
  state.neo.addresses;

export const selectNeoBalance = (state: RootState) => {
  const activeIndex = selectActiveNeoIndex(state);
  return state.neo.addresses[activeIndex]?.balance ?? "0";
};