import { Abi, AbiFunction } from "viem";

export type DecodedTransaction = {
  functionName: string;
  args: any[];
};

/**
 * Decode transaction data using ABI
 */
export const decodeTxData = (abi: Abi, data: string): DecodedTransaction | null => {
  try {
    // This is a simplified implementation
    // In a full implementation, you would use decodeFunctionData from viem
    return null;
  } catch (error) {
    console.error("Error decoding transaction data:", error);
    return null;
  }
};

export const getFunctionDetails = (abi: Abi, functionName: string): AbiFunction | undefined => {
  return abi.find((item): item is AbiFunction => item.type === "function" && item.name === functionName);
};
