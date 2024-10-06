import ethService from "../services/EthereumService";
import solanaService from "../services/SolanaService";
import tronService from "../services/TronService";
import { Chains } from "../types";

export function identifyAddress(address: string) {
  if (ethService.validateAddress(address)) {
    return Chains.Ethereum;
  }

  if (solanaService.validateAddress(address)) {
    return Chains.Solana;
  }
  if (tronService.validateAddress(address)) {
    return Chains.Tron;
  }

  return "Unknown";
}
