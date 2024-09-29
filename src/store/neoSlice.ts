import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import neoXService from "../services/NeoService";
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

export const fetchNeoTransactions = createAsyncThunk(
  "wallet/fetchNeoTransactions",
  async ({ address }: FetchTransactionsArg, { rejectWithValue }) => {
    try {
      const transactions = await neoXService.fetchTransactions(address);
      return transactions;
    } catch (error) {
      console.error("error", error);
      return rejectWithValue(error.message);
    }
  }
);

export const fetchNeoTransactionsInterval = createAsyncThunk(
  "wallet/fetchNeoTransactionsInterval",
  async ({ address }: FetchTransactionsArg, { rejectWithValue }) => {
    try {
      const transactions = await neoXService.fetchTransactions(address);
      return transactions;
    } catch (error) {
      console.error("error", error);
      return rejectWithValue(error.message);
    }
  }
);

export const fetchNeoBalance = createAsyncThunk(
  "wallet/fetchNeoBalance",
  async (address: string, { rejectWithValue }) => {
    try {
      const balance = await neoXService.getBalance(address);
      return balance;
    } catch (error) {
      console.error("error", error);
      return rejectWithValue(error.message);
    }
  }
);

export const fetchNeoBalanceInterval = createAsyncThunk(
  "wallet/fetchNeoBalanceInterval",
  async (address: string, { rejectWithValue }) => {
    try {
      const balance = await neoXService.getBalance(address);
      return balance;
    } catch (error) {
      console.error("error", error);
      return rejectWithValue(error.message);
    }
  }
);

interface NeoTransactionArgs {
  toAddress: string;
  privateKey: string;
  amount: string;
  assetId: string;
}

export const sendNeoTransaction = createAsyncThunk(
  "neo/sendNeoTransaction",
  async (
    { toAddress, privateKey, amount, assetId }: NeoTransactionArgs,
    { rejectWithValue }
  ) => {
    try {
      const response = await neoXService.sendTransaction(
        toAddress,
        privateKey,
        amount,
        assetId
      );
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const confirmNeoTransaction = createAsyncThunk(
  "wallet/confirmNeoTransaction",
  async ({ txid }: { txid: string }, { rejectWithValue }) => {
    try {
      const confirmationPromise = neoXService.confirmTransaction(txid);
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
      return { txid, confirmation };
    } catch (error) {
      return rejectWithValue({ txid, error: error.message });
    }
  }
);

export const neoSlice = createSlice({
  name: "neo",
  initialState,
  reducers: {
    saveNeoAddresses: (state, action: PayloadAction<AddressState[]>) => {
      state.addresses = [...action.payload];
      state.activeIndex = 0;
    },
    depositNeo: (state, action: PayloadAction<number>) => {
      state.addresses[state.activeIndex].balance += action.payload;
    },
    withdrawNeo: (state, action: PayloadAction<number>) => {
      if (state.addresses[state.activeIndex].balance >= action.payload) {
        state.addresses[state.activeIndex].balance -= action.payload;
      } else {
        console.warn("Not enough Neo balance");
      }
    },
    addNeoTransaction: (state, action: PayloadAction<Transaction>) => {
      state.addresses[state.activeIndex].transactionMetadata.transactions.push(
        action.payload
      );
    },
    updateNeoBalance: (state, action: PayloadAction<number>) => {
      state.addresses[state.activeIndex].balance = action.payload;
    },
    updateNeoAddresses: (state, action: PayloadAction<AddressState>) => {
      state.addresses.push(action.payload);
    },
    updateNeoAccountName: (
      state,
      action: PayloadAction<{
        accountName: string;
        neoAddress: string;
      }>
    ) => {
      const neoAddressIndex = state.addresses.findIndex(
        (item) => item.address === action.payload.neoAddress
      );
      if (neoAddressIndex !== -1) {
        state.addresses[neoAddressIndex].accountName =
          action.payload.accountName;
      }
    },
    setActiveNeoAccount: (state, action: PayloadAction<number>) => {
      state.activeIndex = action.payload;
    },
    resetNeoState: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNeoBalance.pending, (state) => {
        state.addresses[state.activeIndex].status = GeneralStatus.Loading;
      })
      .addCase(fetchNeoBalance.fulfilled, (state, action) => {
        state.addresses[state.activeIndex].balance = parseFloat(
          truncateBalance(action.payload['NEO'])
        );
        state.addresses[state.activeIndex].status = GeneralStatus.Idle;
      })
      .addCase(fetchNeoBalance.rejected, (state, action) => {
        state.addresses[state.activeIndex].status = GeneralStatus.Failed;
        console.error("Failed to fetch balance:", action.payload);
      })
      .addCase(fetchNeoBalanceInterval.fulfilled, (state, action) => {
        state.addresses[state.activeIndex].balance = parseFloat(
          truncateBalance(action.payload['NEO'])
        );
        state.addresses[state.activeIndex].status = GeneralStatus.Idle;
      })
      .addCase(fetchNeoBalanceInterval.rejected, (state, action) => {
        state.addresses[state.activeIndex].status = GeneralStatus.Failed;
        console.error("Failed to fetch balance:", action.payload);
      })
      .addCase(fetchNeoTransactions.pending, (state) => {
        state.addresses[state.activeIndex].status = GeneralStatus.Loading;
      })
      .addCase(fetchNeoTransactions.fulfilled, (state, action) => {
        if (action.payload) {
          state.addresses[state.activeIndex].failedNetworkRequest = false;
          state.addresses[state.activeIndex].transactionMetadata.transactions =
            action.payload;
        } else {
          state.addresses[state.activeIndex].failedNetworkRequest = true;
        }
        state.addresses[state.activeIndex].status = GeneralStatus.Idle;
      })
      .addCase(fetchNeoTransactions.rejected, (state, action) => {
        state.addresses[state.activeIndex].status = GeneralStatus.Failed;
        console.error("Failed to fetch transactions:", action.payload);
      })
      .addCase(fetchNeoTransactionsInterval.fulfilled, (state, action) => {
        if (action.payload) {
          state.addresses[state.activeIndex].failedNetworkRequest = false;
          state.addresses[state.activeIndex].transactionMetadata.transactions =
            action.payload;
        } else {
          state.addresses[state.activeIndex].failedNetworkRequest = true;
        }
        state.addresses[state.activeIndex].status = GeneralStatus.Idle;
      })
      .addCase(fetchNeoTransactionsInterval.rejected, (state, action) => {
        state.addresses[state.activeIndex].status = GeneralStatus.Failed;
        console.error("Failed to fetch transactions:", action.payload);
      })
      .addCase(confirmNeoTransaction.pending, (state, action) => {
        const { txid } = action.meta.arg;
        const newConfirmation: TransactionConfirmation = {
          txHash: txid,
          status: ConfirmationState.Pending,
        };
        state.addresses[state.activeIndex].transactionConfirmations.push(
          newConfirmation
        );
      })
      .addCase(confirmNeoTransaction.fulfilled, (state, action) => {
        const { txid, confirmation } = action.payload;
        const index = state.addresses[
          state.activeIndex
        ].transactionConfirmations.findIndex((tx) => tx.txHash === txid);
        if (index !== -1) {
          state.addresses[state.activeIndex].transactionConfirmations[
            index
          ].status = confirmation
            ? ConfirmationState.Confirmed
            : ConfirmationState.Failed;
        }
      })
      .addCase(confirmNeoTransaction.rejected, (state, action) => {
        const { txid, error } = action.payload as any;
        const index = state.addresses[
          state.activeIndex
        ].transactionConfirmations.findIndex((tx: any) => tx.txHash === txid);
        if (index !== -1) {
          state.addresses[state.activeIndex].transactionConfirmations[
            index
          ].status = ConfirmationState.Failed;
          state.addresses[state.activeIndex].transactionConfirmations[
            index
          ].error = error;
        }
      })
      .addCase(sendNeoTransaction.pending, (state) => {
        state.addresses[state.activeIndex].status = GeneralStatus.Loading;
      })
      .addCase(sendNeoTransaction.fulfilled, (state, action) => {
        state.addresses[state.activeIndex].status = GeneralStatus.Idle;

        state.addresses[state.activeIndex].transactionConfirmations.push({
          txHash: action.payload.txid,
          status: ConfirmationState.Pending,
        });
      })
      .addCase(sendNeoTransaction.rejected, (state, action) => {
        state.addresses[state.activeIndex].status = GeneralStatus.Failed;
        console.error("Failed to send Neo transaction:", action.payload);
      });
  },
});

export const {
  depositNeo,
  withdrawNeo,
  addNeoTransaction,
  updateNeoBalance,
  saveNeoAddresses,
  resetNeoState,
  setActiveNeoAccount,
  updateNeoAddresses,
  updateNeoAccountName,
} = neoSlice.actions;

export default neoSlice.reducer;