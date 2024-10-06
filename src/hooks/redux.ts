import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../store";
import { GeneralStatus } from "../store/types";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export const useLoadingState = () => {
  const activeEthIndex = useSelector(
    (state: RootState) => state.ethereum.activeIndex
  );
  const activeSolIndex = useSelector(
    (state: RootState) => state.solana.activeIndex
  );
  const activeNeoIndex = useSelector(
    (state: RootState) => state.neo.activeIndex
  );
  const activeTronIndex = useSelector(
    (state: RootState) => state.tron.activeIndex
  );

  const ethLoading = useSelector(
    (state: RootState) =>
      state.ethereum.addresses[activeEthIndex].status === GeneralStatus.Loading
  );
  const solLoading = useSelector(
    (state: RootState) =>
      state.solana.addresses[activeSolIndex].status === GeneralStatus.Loading
  );
  const neoLoading = useSelector(
    (state: RootState) =>
      state.neo.addresses[activeSolIndex].status === GeneralStatus.Loading
  );
  const tronLoading = useSelector(
    (state: RootState) =>
      state.tron.addresses[activeTronIndex].status === GeneralStatus.Loading
  );

  return ethLoading || solLoading || neoLoading || tronLoading;
};
