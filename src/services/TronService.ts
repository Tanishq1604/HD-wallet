import {TronWeb} from 'tronweb';
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
  private tronWeb: TronWeb;

  constructor(
    private fullNode: string,
    private solidityNode: string,
    private eventServer: string,
    private apiKey: string
  ) {
    this.tronWeb =new TronWeb({
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

      
      const unSignedTxn = await this.tronWeb.transactionBuilder.sendTrx(toAddress, amount, fromAddress?.toString());
      const signedTxn = await this.tronWeb.trx.sign(unSignedTxn, privateKey);
      const result = await this.tronWeb.trx.sendRawTransaction(signedTxn);
      return {
        result: result.result,
        txid: result.transaction.txID,
      };
    } catch (error) {
      console.error("Failed to send transaction:", error);
      throw new Error("Failed to send transaction. Please try again later.");
    }
  }

  async fetchTransactions(address: string, params?: AssetTransferParams): Promise<any> {
    try {
        
      const transactions = await this.tronWeb.trx.getTransactionsRelated(address, 'all', params.limit);
      const transformTransactions = (txs: any[]) =>
        txs.map((tx: any) => ({
          ...tx,
          uniqueId: uuid.v4(),
          value: this.tronWeb.fromSun(tx.amount), // Convert SUN to TRX
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
        
      const balanceInSun = await this.tronWeb.trx.getBalance(address);
      const balance =this.tronWeb.fromSun(balanceInSun)
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
        
      const result = await this.tronWeb.trx.getTransactionInfo(txHash);
      return result && result.receipt && result.receipt.result === 'SUCCESS';
    } catch (error) {
      console.error("Error confirming Tron transaction:", error);
      return false;
    }
  }
  async calculateTransactionFee(from: string, to: string, amount: number): Promise<number> {
    try {
      // Create an unsigned transaction
      
      const transaction = await this.tronWeb.transactionBuilder.sendTrx(to, amount, from);
      
      // Estimate the energy (CPU) and bandwidth consumption
     
      const estimatedEnergy = await this.tronWeb.transactionBuilder.estimateEnergy(transaction);
      const estimatedBandwidth = await this.tronWeb.transactionBuilder.estimateBandwidth(transaction);
      
      // Get the current energy and bandwidth prices
      
      const chainParameters = await this.tronWeb.trx.getChainParameters();
      const energyFee = chainParameters.find((param: any) => param.key === 'getEnergyFee').value;
      const bandwidthFee = chainParameters.find((param: any) => param.key === 'getTransactionFee').value;

      // Calculate the total fee
      const totalFee = (estimatedEnergy * energyFee) + (estimatedBandwidth * bandwidthFee);

      // Convert SUN to TRX
      const fee= this.tronWeb.fromSun(totalFee);
      if(typeof fee === 'string'){

        return Number(fee);
      }
      throw new Error("Error in calculating fee") // Convert SUN to TRX
    } catch (error) {
      console.error("Error calculating Tron transaction fee:", error);
      throw new Error("Failed to calculate transaction fee. Please try again later.");
    }
  }
  async derivePrivateKeysFromPhrase(
    mnemonicPhrase: string,
    derivationPath: string
  ): Promise<string> {
    if (!mnemonicPhrase) {
      throw new Error("Empty mnemonic phrase");
    }

    if (!validateMnemonic(mnemonicPhrase)) {
      throw new Error("Invalid mnemonic phrase");
    }

    try {
      const account = this.tronWeb.utils.accounts.generateAccountWithMnemonic(mnemonicPhrase, derivationPath);
      return account.privateKey;
    } catch (error) {
      throw new Error("Failed to derive wallet from mnemonic: " + (error as Error).message);
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