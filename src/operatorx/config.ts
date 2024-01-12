import { Hex } from 'viem';

export type Config = {
    address: Hex;
    chainId: number;
    consensusChainId: number;
    stepFunctionId: Hex;
    rotateFunctionId: Hex;
    finalityThreshold: number;
    stepThreshold: number;
    intervalMs: number;
};

export const ALL_CONFIGS: Record<string, Config> = {
    gnosis: {
        address: '0x186731E7997e2190dcADC1BBEf62e042622AB7de',
        chainId: 100,
        consensusChainId: 1,
        stepFunctionId: '0x07cd2826b4acf0a4b3d1ee85085a913d19988067791cabb6aaf2235469574d4e',
        rotateFunctionId: '0xa1f922cbf415acc5b39520f5811247ab2c27d43b247af94f2b6847ea7232fc91',
        finalityThreshold: 342,
        stepThreshold: 32,
        intervalMs: 1000 * 48 // 4 slots = 12*4
    },
    eigenlayer: {
        address: '0x137e057b14389e8c1d19e14aCB777390841b5102',
        chainId: 5,
        consensusChainId: 5,
        stepFunctionId: '0x024b386f0da1a762a16154595859fad93e7147a45a1a042c355feda8e54429bb',
        rotateFunctionId: '0x3e313c671454e727381c24bb73bda9104ba4b50d5e38b37adc5d8a5ab19def0c',
        finalityThreshold: 342,
        stepThreshold: 32,
        intervalMs: 1000 * 1800 // 150 slots = 12*150
    }
};
