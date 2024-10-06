import TronWeb from 'tronweb';
import { validateMnemonic } from 'bip39';
import uuid from 'react-native-uuid';

interface ExtendedHDWallet {
  address: string;
  privateKey: string;
  publicKey: string;
  derivationPath: string;
}

interface SendTransactionResponse {
  result: boolean;
  txid: string;
}

interface AssetTransferParams {
  limit?: number;
  fingerprint?: string;
  order_by?: string;
  order_direction?: string;
  min_timestamp?: number;
  max_timestamp?: number;
}

class TronService {
  private tronWeb: typeof TronWeb;

  constructor(
    private fullNode: string,
    private solidityNode: string,
    private eventServer: string,
    private apiKey: string
  ) {
    //@ts-ignore
    this.tronWeb = new TronWeb({
      fullHost: fullNode,
      solidityNode: solidityNode,
      eventServer: eventServer,
      headers: { "TRON-PRO-API-KEY": apiKey },
    });
  }

  async createWallet(): Promise<ExtendedHDWallet> {
    try {
      const account = this.tronWeb.utils.accounts.generateAccount();
      const address = this.tronWeb.utils.address.fromPrivateKey(account.privateKey);
      if(address==false){
        throw new Error("Failed to generate Tron address");
      }
      return {
        address,
        privateKey: account.privateKey,
        publicKey: account.publicKey,
        derivationPath: "m/44'/195'/0'/0/0", // Default Tron derivation path
      };
    } catch (error) {
      throw new Error("Failed to create wallet: " + (error as Error).message);
    }
  }

  async restoreWalletFromPhrase(mnemonicPhrase: string): Promise<ExtendedHDWallet> {
    if (!mnemonicPhrase) {
      throw new Error("Mnemonic phrase cannot be empty.");
    }

    if (!validateMnemonic(mnemonicPhrase)) {
      throw new Error("Invalid mnemonic phrase");
    }

    try {
      
      const account = this.tronWeb.utils.accounts.generateAccountWithMnemonic(mnemonicPhrase);
      const address = this.tronWeb.utils.address.fromPrivateKey(account.privateKey);
      if(address==false){
        throw new Error("Failed to generate Tron address");
      }
      return {
        address,
        privateKey: account.privateKey,
        publicKey: account.publicKey,
        derivationPath: "m/44'/195'/0'/0/0",
      };
    } catch (error) {
      throw new Error("Failed to restore wallet from mnemonic: " + (error as Error).message);
    }
  }

  async createWalletByIndex(phrase: string, index: number = 0): Promise<ExtendedHDWallet> {
    try {
      const path = `m/44'/195'/0'/0/${index}`;
      
      const account = this.tronWeb.utils.accounts.generateAccountWithMnemonic(phrase, path);
      const address = this.tronWeb.utils.address.fromPrivateKey(account.privateKey);
      if(address==false){
        throw new Error("Failed to generate Tron address");
      }
      return {
        address,
        privateKey: account.privateKey,
        publicKey: account.publicKey,
        derivationPath: path,
      };
    } catch (error) {
      throw new Error("Failed to create Tron wallet by index: " + (error as Error).message);
    }
  }

  async sendTransaction(toAddress: string, privateKey: string, amount: number): Promise<SendTransactionResponse> {
    try {
      const fromAddress = this.tronWeb.utils.address.fromPrivateKey(privateKey);
      //@ts-ignore
      const unSignedTxn = await this.tronWeb.TransactionBuilder.sendTrx(toAddress, amount, fromAddress);//@ts-ignore
      const signedTxn = await this.tronWeb.Trx.sign(unSignedTxn, privateKey);//@ts-ignore
      const result = await this.tronWeb.Trx.sendRawTransaction(signedTxn);
      return {
        result: result.result,
        txid: result.txid,
      };
    } catch (error) {
      console.error("Failed to send transaction:", error);
      throw new Error("Failed to send transaction. Please try again later.");
    }
  }

  async fetchTransactions(address: string, params?: AssetTransferParams): Promise<any> {
    try {
        //@ts-ignore
      const transactions = await this.tronWeb.Trx.getTransactionsRelated(address, 'all', params);
      const transformTransactions = (txs: any[]) =>
        txs.map((tx: any) => ({
          ...tx,
          uniqueId: uuid.v4(),
          value: this.tronWeb.TronWeb.fromSun(tx.amount), // Convert SUN to TRX
          blockTime: tx.block_timestamp,
          direction: tx.from === address ? "sent" : "received",
        }));

      const allTransactions = transformTransactions(transactions);
      return {
        transferHistory: allTransactions.sort((a, b) => b.blockTime - a.blockTime),
      };
    } catch (error) {
      console.error("failed to fetch transaction history", error);
    }
  }

  validateAddress(address: string): boolean {
    return this.tronWeb.utils.address.isAddress(address);
  }

  async findNextUnusedWalletIndex(phrase: string, index: number = 0): Promise<number> {
    if (!phrase) {
      throw new Error("Empty mnemonic phrase");
    }

    if (!validateMnemonic(phrase)) {
      throw new Error("Invalid mnemonic phrase");
    }

    let currentIndex = index;

    while (true) {
      const wallet = await this.createWalletByIndex(phrase, currentIndex);
      const transactions = await this.fetchTransactions(wallet.address);
      if (transactions.transferHistory.length === 0) {
        break;
      }
      currentIndex += 1;
    }

    return currentIndex > 0 ? currentIndex + 1 : 0;
  }

  async importAllActiveAddresses(mnemonicPhrase: string, index?: number): Promise<ExtendedHDWallet[]> {
    if (index !== undefined) {
      return this.collectedUsedAddresses(mnemonicPhrase, index);
    } else {
      const unusedAddressIndex = await this.findNextUnusedWalletIndex(mnemonicPhrase);
      return this.collectedUsedAddresses(mnemonicPhrase, unusedAddressIndex);
    }
  }

  async collectedUsedAddresses(phrase: string, unusedIndex: number): Promise<ExtendedHDWallet[]> {
    const startingIndex = unusedIndex > 0 ? unusedIndex - 1 : unusedIndex;
    const addressesUsed: ExtendedHDWallet[] = [];

    for (let i = 0; i <= startingIndex; i++) {
      const wallet = await this.createWalletByIndex(phrase, i);
      addressesUsed.push(wallet);
    }

    return addressesUsed;
  }

  async getBalance(address: string): Promise<string> {
    try {
        //@ts-ignore
      const balanceInSun = await this.tronWeb.Trx.getBalance(address);
      const balance =this.tronWeb.TronWeb.fromSun(balanceInSun)
      if (typeof balance === 'string'){
        return balance;
      }

     throw new Error("error in get balance ") // Convert SUN to TRX
    } catch (err) {
      console.error("Error fetching balance:", err);
      throw new Error("Failed to fetch balance. Please try again later.");
    }
  }

  async confirmTransaction(txHash: string): Promise<boolean> {
    try {
        //@ts-ignore
      const result = await this.tronWeb.Trx.getTransactionInfo(txHash);
      return result && result.receipt && result.receipt.result === 'SUCCESS';
    } catch (error) {
      console.error("Error confirming Tron transaction:", error);
      return false;
    }
  }
}

const tronService = new TronService(
  process.env.EXPO_PUBLIC_TRON_FULL_NODE,
  process.env.EXPO_PUBLIC_TRON_SOLIDITY_NODE,
  process.env.EXPO_PUBLIC_TRON_EVENT_SERVER,
  process.env.EXPO_PUBLIC_TRON_API_KEY
);

export default tronService;