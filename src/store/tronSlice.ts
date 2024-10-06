import "react-native-get-random-values";
import "@ethersproject/shims";

import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import tronService from "../services/TronService";
import { truncateBalance } from "../utils/truncateBalance";
import {
  GeneralStatus,
  AddressState,
  Transaction,
  TransactionConfirmation,
  ConfirmationState,
  WalletState,
} from "./types";

const CONFIRMATION_TIMEOUT = 60000;
const initialState: WalletState = {
  activeIndex: 0,
  addresses: [
    {
      accountName: "",
      derivationPath: "",
      address: "",
      publicKey: "",
      balance: 0,
      failedNetworkRequest: false,
      status: GeneralStatus.Idle,
      transactionConfirmations: [],
      transactionMetadata: {
        paginationKey: undefined,
        transactions: [],
      },
    },
  ],
};

export interface FetchTransactionsArg {
  address: string;
  paginationKey?: string[] | string;
}

export const fetchTronTransactions = createAsyncThunk(
  "wallet/fetchTronTransactions",
  async (address: string, { rejectWithValue }): Promise<any> => {
    try {
      const transactions = await tronService.fetchTransactions(address);
      return transactions;
    } catch (error) {
      console.error("error", error);
      return rejectWithValue(error.message);
    }
  }
);

export const fetchTronTransactionsInterval = createAsyncThunk(
  "wallet/fetchTronTransactionsInterval",
  async (address: string, { rejectWithValue }): Promise<any> => {
    try {
      const transactions = await tronService.fetchTransactions(address);
      return transactions;
    } catch (error) {
      console.error("error", error);
      return rejectWithValue(error.message);
    }
  }
);

export const fetchTronBalance = createAsyncThunk(
  "wallet/fetchTronBalance",
  async (address: string, { rejectWithValue }): Promise<any> => {
    try {
      const currentTronBalance = await tronService.getBalance(address);
      return currentTronBalance;
    } catch (error) {
      console.error("error", error);
      return rejectWithValue(error.message);
    }
  }
);

export const fetchTronBalanceInterval = createAsyncThunk(
  "wallet/fetchTronBalanceInterval",
  async (address: string, { rejectWithValue }): Promise<any> => {
    try {
      const currentTronBalance = await tronService.getBalance(address);
      return currentTronBalance;
    } catch (error) {
      console.error("error", error);
      return rejectWithValue(error.message);
    }
  }
);

interface TronTransactionArgs {
  privateKey: string;
  address: string;
  amount: number;
}

export const sendTronTransaction = createAsyncThunk(
  "tron/sendTronTransaction",
  async (
    { privateKey, address, amount }: TronTransactionArgs,
    { rejectWithValue }
  ) => {
    try {
      const response = await tronService.sendTransaction(address, privateKey, amount);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const confirmTronTransaction = createAsyncThunk(
  "wallet/confirmTronTransaction",
  async ({ txHash }: { txHash: string }, { rejectWithValue }) => {
    try {
      const confirmationPromise = tronService.confirmTransaction(txHash);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Transaction confirmation timed out")),
          CONFIRMATION_TIMEOUT
        )
      );

      const confirmation = await Promise.race([
        confirmationPromise,
        timeoutPromise,
      ]);
      return { txHash, confirmation };
    } catch (error) {
      return rejectWithValue({ txHash, error: error.message });
    }
  }
);

export const tronSlice = createSlice({
  name: "tron",
  initialState,
  reducers: {
    saveTronAddresses: (state, action: PayloadAction<AddressState[]>) => {
      state.addresses = [...action.payload];
      state.activeIndex = 0;
    },
    depositTron: (state, action: PayloadAction<number>) => {
      state.addresses[state.activeIndex].balance += action.payload;
    },
    withdrawTron: (state, action: PayloadAction<number>) => {
      if (state.addresses[state.activeIndex].balance >= action.payload) {
        state.addresses[state.activeIndex].balance -= action.payload;
      } else {
        console.warn("Not enough Tron balance");
      }
    },
    addTronTransaction: (state, action: PayloadAction<Transaction>) => {
      state.addresses[state.activeIndex].transactionMetadata.transactions.push(
        action.payload
      );
    },
    updateTronBalance: (state, action: PayloadAction<number>) => {
      state.addresses[state.activeIndex].balance = action.payload;
    },
    updateTronAddresses: (state, action: PayloadAction<AddressState>) => {
      state.addresses.push(action.payload);
    },
    updateTronAccountName: (
      state,
      action: PayloadAction<{
        accountName: string;
        tronAddress: string;
      }>
    ) => {
      const tronAddressIndex = state.addresses.findIndex(
        (item) => item.address === action.payload.tronAddress
      );
      if (tronAddressIndex !== -1) {
        state.addresses[tronAddressIndex].accountName =
          action.payload.accountName;
      }
    },
    setActiveTronAccount: (state, action: PayloadAction<number>) => {
      state.activeIndex = action.payload;
    },
    resetTronState: (state) => {
      state = initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTronBalance.pending, (state) => {
        state.addresses[state.activeIndex].status = GeneralStatus.Loading;
      })
      .addCase(fetchTronBalance.fulfilled, (state, action) => {
        state.addresses[state.activeIndex].balance = parseFloat(
          truncateBalance(action.payload)
        );
        state.addresses[state.activeIndex].status = GeneralStatus.Idle;
      })
      .addCase(fetchTronBalance.rejected, (state, action) => {
        state.addresses[state.activeIndex].status = GeneralStatus.Failed;
        console.error("Failed to fetch balance:", action.payload);
      })
      .addCase(fetchTronBalanceInterval.fulfilled, (state, action) => {
        state.addresses[state.activeIndex].balance = parseFloat(
          truncateBalance(action.payload)
        );
        state.addresses[state.activeIndex].status = GeneralStatus.Idle;
      })
      .addCase(fetchTronBalanceInterval.rejected, (state, action) => {
        state.addresses[state.activeIndex].status = GeneralStatus.Failed;
        console.error("Failed to fetch balance:", action.payload);
      })
      .addCase(fetchTronTransactions.pending, (state) => {
        state.addresses[state.activeIndex].status = GeneralStatus.Loading;
      })
      .addCase(fetchTronTransactions.fulfilled, (state, action) => {
        if (action.payload) {
          state.addresses[state.activeIndex].failedNetworkRequest = false;
          state.addresses[state.activeIndex].transactionMetadata.transactions =
            action.payload.transferHistory;
        } else {
          state.addresses[state.activeIndex].failedNetworkRequest = true;
        }
        state.addresses[state.activeIndex].status = GeneralStatus.Idle;
      })
      .addCase(fetchTronTransactions.rejected, (state, action) => {
        state.addresses[state.activeIndex].status = GeneralStatus.Failed;
        console.error("Failed to fetch transactions:", action.payload);
      })
      .addCase(fetchTronTransactionsInterval.fulfilled, (state, action) => {
        if (action.payload) {
          state.addresses[state.activeIndex].failedNetworkRequest = false;
          state.addresses[state.activeIndex].transactionMetadata.transactions =
            action.payload.transferHistory;
        } else {
          state.addresses[state.activeIndex].failedNetworkRequest = true;
        }
        state.addresses[state.activeIndex].status = GeneralStatus.Idle;
      })
      .addCase(fetchTronTransactionsInterval.rejected, (state, action) => {
        state.addresses[state.activeIndex].status = GeneralStatus.Failed;
        console.error("Failed to fetch transactions:", action.payload);
      })
      .addCase(confirmTronTransaction.pending, (state, action) => {
        const { txHash } = action.meta.arg;
        const newConfirmation: TransactionConfirmation = {
          txHash,
          status: ConfirmationState.Pending,
        };
        state.addresses[state.activeIndex].transactionConfirmations.push(
          newConfirmation
        );
      })
      .addCase(confirmTronTransaction.fulfilled, (state, action) => {
        const { txHash, confirmation } = action.payload;
        const index = state.addresses[
          state.activeIndex
        ].transactionConfirmations.findIndex((tx) => tx.txHash === txHash);
        if (index !== -1) {
          state.addresses[state.activeIndex].transactionConfirmations[
            index
          ].status = confirmation
            ? ConfirmationState.Confirmed
            : ConfirmationState.Failed;
        }
      })
      .addCase(confirmTronTransaction.rejected, (state, action) => {
        const { txHash, error } = action.payload as any;
        const index = state.addresses[
          state.activeIndex
        ].transactionConfirmations.findIndex((tx: any) => tx.txHash === txHash);
        if (index !== -1) {
          state.addresses[state.activeIndex].transactionConfirmations[
            index
          ].status = ConfirmationState.Failed;
          state.addresses[state.activeIndex].transactionConfirmations[
            index
          ].error = error;
        }
      })
      .addCase(sendTronTransaction.pending, (state) => {
        state.addresses[state.activeIndex].status = GeneralStatus.Loading;
      })
      .addCase(sendTronTransaction.fulfilled, (state, action) => {
        state.addresses[state.activeIndex].status = GeneralStatus.Idle;

        state.addresses[state.activeIndex].transactionConfirmations.push({
          txHash: action.payload.txid,
          status: ConfirmationState.Pending,
        });
      })
      .addCase(sendTronTransaction.rejected, (state, action) => {
        state.addresses[state.activeIndex].status = GeneralStatus.Failed;
        console.error("Failed to send Tron transaction:", action.payload);
      });
  },
});

export const {
  depositTron,
  withdrawTron,
  addTronTransaction,
  updateTronBalance,
  saveTronAddresses,
  resetTronState,
  setActiveTronAccount,
  updateTronAddresses,
  updateTronAccountName,
} = tronSlice.actions;

export default tronSlice.reducer;