import { BitArray } from "@chainsafe/ssz";
import { Hex } from "viem";

export type OperatorConfig = {
  address: Hex;
  chainId: number;
  consensusChainId: number;
  stepFunctionId: Hex;
  rotateFunctionId: Hex;
  finalityThreshold: number;
  stepThreshold: number;
  intervalMs: number;
};

export const ALL_CONFIGS: Record<string, OperatorConfig> = {
  gnosis: {
    address: "0x186731E7997e2190dcADC1BBEf62e042622AB7de",
    chainId: 100,
    consensusChainId: 1,
    stepFunctionId:
      "0x07cd2826b4acf0a4b3d1ee85085a913d19988067791cabb6aaf2235469574d4e",
    rotateFunctionId:
      "0xa1f922cbf415acc5b39520f5811247ab2c27d43b247af94f2b6847ea7232fc91",
    finalityThreshold: 342,
    stepThreshold: 32,
    intervalMs: 1000 * 48, // 4 slots = 12*4
  },
  eigenlayer: {
    address: "0x137e057b14389e8c1d19e14aCB777390841b5102",
    chainId: 5,
    consensusChainId: 5,
    stepFunctionId:
      "0x024b386f0da1a762a16154595859fad93e7147a45a1a042c355feda8e54429bb",
    rotateFunctionId:
      "0x3e313c671454e727381c24bb73bda9104ba4b50d5e38b37adc5d8a5ab19def0c",
    finalityThreshold: 342,
    stepThreshold: 32,
    intervalMs: 1000 * 1800, // 150 slots = 12*150
  },
  sepolia: {
    address: "0x26c5bE2e002b7A9703F4e66B92F9D380a1Dd13bc",
    chainId: 11155111,
    consensusChainId: 11155111,
    // TODO: Update these function IDs with Sepolia-Deneb
    stepFunctionId:
      "0xd7f33a3358d67df3bf792e8b2ab0188d16f4fc07418b35d950407af0d3cb33e0",
    rotateFunctionId:
      "0xa511bd86a30fa6db581480ac7591d4271c845411ac4e1ad93797d09a57b60522",
    finalityThreshold: 342,
    stepThreshold: 32,
    intervalMs: 1000 * 240,
  },
};

export enum ChainId {
  Mainnet = 1,
  Goerli = 5,
  Sepolia = 11155111,
  Holesky = 17000,
  Gnosis = 100,
}

const config = {} as Record<
  ChainId,
  {
    secondsPerSlot: number;
    slotsPerEpoch: number;
    epochsPerPeriod: number;
    capellaForkEpoch: number;
    denebForkEpoch: number;
  }
>;

config[ChainId.Mainnet] = {
  secondsPerSlot: 12,
  slotsPerEpoch: 32,
  epochsPerPeriod: 256,
  capellaForkEpoch: 194048,
  // TODO: UPDATE THIS TO THE REAL FORK EPOCH FOR MAINNET
  denebForkEpoch: 500000
};

config[ChainId.Goerli] = {
  secondsPerSlot: 12,
  slotsPerEpoch: 32,
  epochsPerPeriod: 256,
  capellaForkEpoch: 162304,
  denebForkEpoch: 231680
};

config[ChainId.Sepolia] = {
  secondsPerSlot: 12,
  slotsPerEpoch: 32,
  epochsPerPeriod: 256,
  capellaForkEpoch: 56832,
  denebForkEpoch: 132608
};

config[ChainId.Holesky] = {
  secondsPerSlot: 12,
  slotsPerEpoch: 32,
  epochsPerPeriod: 256,
  capellaForkEpoch: 256,
  denebForkEpoch: 29696
};

config[ChainId.Gnosis] = {
  secondsPerSlot: 5,
  slotsPerEpoch: 16,
  epochsPerPeriod: 512,
  capellaForkEpoch: 648704,
  // TODO: UPDATE THIS TO THE REAL FORK EPOCH FOR MAINNET
  denebForkEpoch: 1839314
};

export class BeaconChainConfig {
  static secondsPerSlot(chainId: ChainId): number {
    return config[chainId].secondsPerSlot;
  }

  static slotsPerEpoch(chainId: ChainId): number {
    return config[chainId].slotsPerEpoch;
  }

  static epochsPerPeriod(chainId: ChainId): number {
    return config[chainId].epochsPerPeriod;
  }

  static capellaForkEpoch(chainId: ChainId): number {
    return config[chainId].capellaForkEpoch;
  }

  static capellaForkSlot(chainId: ChainId): number {
    return config[chainId].capellaForkEpoch * config[chainId].slotsPerEpoch;
  }

  static denebForkSlot(chainId: ChainId): number {
    return config[chainId].denebForkEpoch * config[chainId].slotsPerEpoch;
}
}
