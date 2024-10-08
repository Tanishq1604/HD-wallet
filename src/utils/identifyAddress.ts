import ethService from "../services/EthereumService";
import solanaService from "../services/SolanaService";
import tronService from "../services/TronService";
import { Chains } from "../types";

export function identifyAddress(address: string) {
  if (ethService.validateAddress(address)) {
    return Chains.Ethereum;
  }
  
  if (tronService.validateAddress(address)) {
    return Chains.Tron;
  }
  if (solanaService.validateAddress(address)) {
    return Chains.Solana;
  }

  return Chains.Tron;
}
