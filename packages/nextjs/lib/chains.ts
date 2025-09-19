import { Chain } from "viem";
import { hardhat } from "viem/chains";
import { createPublicClient, http } from "viem";
import deployedContracts from "../contracts/deployedContracts";

// Somnia Testnet chain configuration
export const somnia: Chain = {
  id: 50312,
  name: "Somnia Testnet",
  nativeCurrency: {
    name: "STT",
    symbol: "STT",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.somnia.network"],
    },
    public: {
      http: ["https://testnet-rpc.somnia.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Somnia Explorer",
      url: "https://explorer.somnia.network",
    },
  },
  testnet: true,
};

// Chain configuration based on environment (evaluated at runtime)
export function getChainConfig() {
  const useFoundry = process.env.NEXT_PUBLIC_ENABLE_FOUNDRY === "true";

  if (useFoundry) {
    return {
      chain: hardhat,
      rpcUrl: "http://localhost:8546",
      chainId: 31337,
      contract: deployedContracts[31337]?.StoryChain,
    };
  } else {
    return {
      chain: somnia,
      rpcUrl: "https://testnet-rpc.somnia.network",
      chainId: 50312,
      contract: deployedContracts[50312]?.StoryChain,
    };
  }
}

// Create public client based on environment (called at runtime)
export function createChainClient() {
  const config = getChainConfig();

  return createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl),
  });
}

// Get contract configuration (called at runtime)
export function getContractConfig() {
  const config = getChainConfig();
  return config.contract;
}