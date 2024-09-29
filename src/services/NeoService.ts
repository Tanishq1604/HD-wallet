import { wallet, rpc, sc, tx, u } from "@cityofzion/neon-core";
import { mnemonicToSeedSync } from "bip39";

interface SendTransactionResponse {
  txid: string;
  gas: string;
}

class NeoXService {
  private rpcClient: rpc.RPCClient;
  

  constructor(private rpcUrl: string, private networkMagic: number) {
    this.rpcClient = new rpc.RPCClient(rpcUrl);
  }

  async createWallet(): Promise<wallet.Account> {
    return new Promise((resolve, reject) => {
      try {
        const account = new wallet.Account();
        resolve(account);
      } catch (error) {
        reject(new Error("Failed to create wallet: " + error.message));
      }
    });
  }
  async findNextUnusedWalletIndex(mnemonicPhrase: string, indexOffset: number = 0): Promise<number> {
    if (!mnemonicPhrase) {
      throw new Error("Empty mnemonic phrase");
    }
    // Note: You may want to add mnemonic validation here if @cityofzion/neon-core provides such functionality

    let currentIndex = indexOffset;
    while (true) {
      const account = await this.createWalletByIndex(mnemonicPhrase, currentIndex);
      const transactions = await this.fetchTransactions(account.address);
      
      if (transactions.length === 0) {
        break;
      }
      currentIndex += 1;
    }
    return currentIndex > 0 ? currentIndex + 1 : 0;
  }
  async importAllActiveAddresses(mnemonicPhrase: string, offsetIndex?: number): Promise<wallet.Account[]> {
    if (offsetIndex !== undefined) {
      return this.collectUsedAddresses(mnemonicPhrase, offsetIndex);
    } else {
      const unusedAddressIndex = await this.findNextUnusedWalletIndex(mnemonicPhrase);
      return this.collectUsedAddresses(mnemonicPhrase, unusedAddressIndex);
    }
  }
  
  
  

  async restoreWalletFromPhrase(mnemonicPhrase: string): Promise<wallet.Account> {
    if (!mnemonicPhrase) {
      throw new Error("Mnemonic phrase cannot be empty.");
    }

    try {
      const seed = mnemonicToSeedSync(mnemonicPhrase).toString("hex");
      const privateKey = seed.slice(0, 64); // Using first 64 characters as private key
      return new wallet.Account(privateKey);
    } catch (error) {
      throw new Error(
        "Failed to restore wallet from mnemonic: " + (error as Error).message
      );
    }
  }
  async derivePrivateKeysFromPhrase(seedPhrase: string, derivationPath: string): Promise<string> {
    const seed = mnemonicToSeedSync(seedPhrase);
    // Use a library like hdkey to derive the private key
    // This is a simplified example and may need adjustment based on your exact requirements
    const privateKey = seed.slice(0, 32).toString('hex');
    return privateKey;
  }
  
  async createWalletByIndex(phrase: string, index: number = 0): Promise<wallet.Account> {
    try {
      const seed = mnemonicToSeedSync(phrase).toString("hex");
      const privateKey = seed.slice(index * 64, (index + 1) * 64); // Derive based on index
      return new wallet.Account(privateKey);
    } catch (error) {
      throw new Error(
        "Failed to create NeoX wallet by index: " + (error as Error).message
      );
    }
  }
  async calculateNetworkFee(toAddress: string, amount: string): Promise<string> {
    const dummyAccount = new wallet.Account();
    const script = sc.createScript({
      scriptHash: 'dummyAssetId', // Replace with actual NEO or GAS asset ID
      operation: "transfer",
      args: [
        sc.ContractParam.hash160(dummyAccount.address),
        sc.ContractParam.hash160(toAddress),
        sc.ContractParam.integer(u.BigInteger.fromDecimal(amount, 8)),
        sc.ContractParam.any()
      ]
    });

    const currentHeight = await this.rpcClient.getBlockCount();
    const transaction = new tx.Transaction({
      signers: [
        {
          account: dummyAccount.scriptHash,
          scopes: tx.WitnessScope.CalledByEntry
        }
      ],
      validUntilBlock: currentHeight + 1000,
      script: script
    });

    const networkFee = await this.rpcClient.calculateNetworkFee(transaction);
    return networkFee.toString();
  }
  async getMaxTransferAmount(fromAddress: string, toAddress: string, assetId: string): Promise<string> {
    const balance = await this.getBalance(fromAddress);
    const assetBalance = balance[assetId] || "0";
    const networkFee = await this.calculateNetworkFee(toAddress, assetBalance);
    
    const maxAmount = u.BigInteger.fromDecimal(assetBalance, 8).sub(u.BigInteger.fromDecimal(networkFee, 8));
    return maxAmount.toDecimal(8);
  }
  async validateAddress(address: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      resolve(wallet.isAddress(address));
    });
  }
  // async sendTransaction(
  //   toAddress: string,
  //   privateKey: string,
  //   amount: string,
  //   assetId: string
  // ): Promise<SendTransactionResponse> {
  //   const account = new wallet.Account(privateKey);
  //   const script = sc.createScript({
  //     scriptHash: assetId,
  //     operation: "transfer",
  //     args: [
  //       sc.ContractParam.hash160(account.address),
  //       sc.ContractParam.hash160(toAddress),
  //       sc.ContractParam.integer(u.BigInteger.fromDecimal(amount, 8)), // Specify decimals
  //       sc.ContractParam.any()
  //     ]
  //   });

  //   const currentHeight = await this.rpcClient.getBlockCount();
  //   const transaction = new tx.Transaction({
  //     signers: [
  //       {
  //         account: account.scriptHash,
  //         scopes: tx.WitnessScope.CalledByEntry
  //       }
  //     ],
  //     validUntilBlock: currentHeight + 1000,
  //     script: script
  //   });

  //   const networkFee = await this.rpcClient.calculateNetworkFee(transaction);
  //   // transaction.networkFee = networkFee;
  //   transaction.networkFee = u.BigInteger.fromDecimal(parseFloat(networkFee), 8); // Assuming 8 decimal places for NEO/GAS network fees

  //   const signedTx = transaction.sign(account, this.networkMagic);

  //   try {
  //     const result = await this.rpcClient.sendRawTransaction(
  //       u.HexString.fromHex(signedTx.serialize(true))
  //     );
  //     return {
  //       txid: result,
  //       gas: networkFee.toString()
  //     };
  //   } catch (error) {
  //     console.error("Failed to send transaction:", error);
  //     throw new Error("Failed to send transaction. Please try again later.");
  //   }
  // }
  async sendTransaction(
    privateKey: string,
    toAddress: string,
    amount: string,
    assetId: string
  ): Promise<SendTransactionResponse> {
    const account = new wallet.Account(privateKey);
    const script = sc.createScript({
      scriptHash: assetId,
      operation: "transfer",
      args: [
        sc.ContractParam.hash160(account.address),
        sc.ContractParam.hash160(toAddress),
        sc.ContractParam.integer(u.BigInteger.fromDecimal(amount, 8)),
        sc.ContractParam.any()
      ]
    });

    const currentHeight = await this.rpcClient.getBlockCount();
    const transaction = new tx.Transaction({
      signers: [
        {
          account: account.scriptHash,
          scopes: tx.WitnessScope.CalledByEntry
        }
      ],
      validUntilBlock: currentHeight + 1000,
      script: script
    });

    const networkFee = await this.rpcClient.calculateNetworkFee(transaction);
    transaction.networkFee = u.BigInteger.fromDecimal(networkFee, 8);

    const signedTx = transaction.sign(account, this.networkMagic);

    try {
      const result = await this.rpcClient.sendRawTransaction(
        u.HexString.fromHex(signedTx.serialize(true))
      );
      return {
        txid: result,
        gas: networkFee.toString()
      };
    } catch (error) {
      console.error("Failed to send transaction:", error);
      throw new Error("Failed to send transaction. Please try again later.");
    }
  }
  async getBalance(address: string): Promise<{ [assetSymbol: string]: string }> {
    try {
      const response = await this.rpcClient.getNep17Balances(address); // Updated to getNep17Balances
      return Object.entries(response.balance).reduce((acc, [assetHash, balance]) => {
        acc[assetHash] = balance;
        return acc;
      }, {});
    } catch (error) {
      console.error("Error fetching balance:", error);
      throw new Error("Failed to fetch balance. Please try again later.");
    }
  }

  async fetchTransactions(address: string, page: number = 1, pageSize: number = 20): Promise<any> {
    try {
      const response = await this.rpcClient.getRawTransaction(address); // Adjust to correct method
      // Ensure response is an array before using .map()
      if (Array.isArray(response)) {
        return response.map((tx: any) => ({
          txid: tx.txid,
          blockNumber: tx.block_height,
          timestamp: tx.block_time,
          asset: tx.asset,
          amount: tx.amount,
          from: tx.transfer_from,
          to: tx.transfer_to
        }));
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      throw new Error("Failed to fetch transactions. Please try again later.");
    }
  }
  private async collectUsedAddresses(mnemonicPhrase: string, endIndex: number): Promise<wallet.Account[]> {
    const usedAddresses: wallet.Account[] = [];
    for (let i = 0; i < endIndex; i++) {
      const account = await this.createWalletByIndex(mnemonicPhrase, i);
      const transactions = await this.fetchTransactions(account.address);
      if (transactions.length > 0) {
        usedAddresses.push(account);
      }
    }
    return usedAddresses;
  }


  async confirmTransaction(txid: string): Promise<boolean> {
    try {
      const response = await this.rpcClient.getRawTransaction(txid); // Use getRawTransaction
      const transaction = JSON.parse(response);
      return transaction && transaction.blocktime > 0; // Ensure blocktime exists
    } catch (error) {
      console.error("Error confirming NeoX transaction:", error);
      return false;
    }
  }
}

const neoXService = new NeoXService(
  process.env.EXPO_PUBLIC_NEO_RPC_URL,
  parseInt(process.env.EXPO_PUBLIC_NEO_NETWORK_MAGIC)
);

export default neoXService;
