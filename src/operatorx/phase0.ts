import { BitArray, toHexString } from "@chainsafe/ssz";
import {
  ProofType,
  SingleProof,
  createProof,
} from "@chainsafe/persistent-merkle-tree";
import axios, {
  AxiosInstance,
  CreateAxiosDefaults,
  InternalAxiosRequestConfig,
} from "axios";
import { altair, capella, phase0, ssz } from "@lodestar/types";
import { BeaconChainConfig, ChainId } from "./config";
import { BeaconId } from "./types";

export class Phase0Client {
  client: AxiosInstance;
  chainId: ChainId;

  constructor(rpcURL: string, chainId: ChainId) {
    this.chainId = chainId;
    this.client = newAxiosClient({
      baseURL: rpcURL,
      responseType: "json",
      headers: { "Content-Type": "application/json" },
    });
  }

  toStringFromBeaconId(identifier: BeaconId) {
    if (identifier instanceof Uint8Array) {
      return toHexString(identifier);
    }
    return identifier.toString();
  }

  async getHeader(
    blockIdentifier: BeaconId
  ): Promise<phase0.BeaconBlockHeader> {
    const id = this.toStringFromBeaconId(blockIdentifier);
    const response = await this.client.get(
      "/eth/v1/beacon/headers/{block_id}".replace("{block_id}", id)
    );
    const header = ssz.phase0.BeaconBlockHeader.fromJson(
      response.data.data.header.message
    );
    return header;
  }
}

function newAxiosClient(
  config?: CreateAxiosDefaults<any> | undefined
): AxiosInstance {
  const client = axios.create(config);
  client.interceptors.request.use((config) => {
    type ConfigWithErrorContext = InternalAxiosRequestConfig & {
      errorContext?: Error;
    };

    const newConfig: ConfigWithErrorContext = config;
    newConfig.errorContext = new Error("Thrown at:");
    return config;
  });
  client.interceptors.response.use(undefined, async (error) => {
    const originalStackTrace = error.config?.errorContext?.stack;
    if (originalStackTrace) {
      error.stack = `${error.stack}\n${originalStackTrace}`;
    }

    throw error;
  });
  return client;
}

export function computeBitSum(bits: BitArray): bigint {
  return BigInt(
    bits
      .toBoolArray()
      .map((x) => (x ? Number(1) : Number(0)))
      .reduce((x, y) => x + y)
  );
}
