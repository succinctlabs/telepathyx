import { toHexString } from "@chainsafe/ssz";
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

export class BeaconClient {
  client: AxiosInstance;

  constructor(rpc?: string) {
    let defaultRpc = "";
    switch (process.env.CHAIN_ID) {
      case "1":
        defaultRpc = process.env.CONSENSUS_RPC_1 || "";
        break;
      case "5":
        defaultRpc = process.env.CONSENSUS_RPC_5 || "";
        break;
    }
    const baseURL = rpc || defaultRpc;
    this.client = newAxiosClient({
      baseURL,
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

  async getBlock(blockIdentifier: BeaconId): Promise<capella.BeaconBlock> {
    const id = this.toStringFromBeaconId(blockIdentifier);
    const response = await this.client.get(
      "/eth/v2/beacon/blocks/{block_id}".replace("{block_id}", id)
    );
    try {
      return ssz.capella.BeaconBlock.fromJson(
        response.data.data.message
      ) as capella.BeaconBlock;
    } catch (e) {
      return ssz.bellatrix.BeaconBlock.fromJson(
        response.data.data.message
      ) as capella.BeaconBlock;
    }
  }

  async getState(stateIdentifier: BeaconId): Promise<capella.BeaconState> {
    const id = this.toStringFromBeaconId(stateIdentifier);
    const response = await this.client.get(
      "/eth/v2/debug/beacon/states/{state_id}".replace("{state_id}", id),
      {
        responseType: "arraybuffer",
        headers: {
          Accept: "application/octet-stream",
        },
      }
    );
    const bytes = response.data as Buffer;
    const state = ssz.capella.BeaconState.deserialize(bytes);
    return state;
  }

  async getAttestedStepUpdate(
    attestedIdentifier: number
  ): Promise<Pick<StepUpdate, "finalizedBlock" | "finalityBranch">> {
    const attestedBlock = await this.getBlock(attestedIdentifier);
    const attestedState = await this.getState(attestedBlock.slot);
    const attestedStateView = ssz.capella.BeaconState.toView(
      attestedState as any
    );

    const finalizedBlock = await this.getBlock(
      attestedState.finalizedCheckpoint.root
    );
    const finalityBranchIndex = ssz.capella.BeaconState.getPathInfo([
      "finalized_checkpoint",
      "root",
    ]).gindex;
    const finalityBranch = (
      createProof(attestedStateView.node, {
        type: ProofType.single,
        gindex: finalityBranchIndex,
      }) as SingleProof
    ).witnesses;

    return { finalizedBlock, finalityBranch };
  }

  async getStepUpdate(attestedIdentifier: BeaconId): Promise<StepUpdate> {
    const attestedBlock = await this.getBlock(attestedIdentifier);
    const signedSlot = attestedBlock.slot + 1;
    const signedBlock = await this.getBlock(signedSlot);

    const { finalizedBlock, finalityBranch } = await this.getAttestedStepUpdate(
      attestedBlock.slot
    );

    const signedState = await this.getState(signedSlot);

    const currentSyncCommittee = signedState.currentSyncCommittee;
    const syncAggregate = signedBlock.body.syncAggregate;
    const genesisValidatorsRoot = signedState.genesisValidatorsRoot;
    const forkVersion =
      Math.floor(
        signedState.slot / BeaconChainConfig.slotsPerEpoch(ChainId.Mainnet)
      ) < signedState.fork.epoch
        ? signedState.fork.previousVersion
        : signedState.fork.currentVersion;

    const executionStateRootAndBranch = await this.getExecutionStateRootProof(
      finalizedBlock
    );
    const executionStateRoot = executionStateRootAndBranch.root;
    const executionStateBranch = executionStateRootAndBranch.branch;

    return {
      attestedBlock,
      currentSyncCommittee,
      finalizedBlock,
      finalityBranch,
      syncAggregate,
      genesisValidatorsRoot,
      forkVersion,
      executionStateRoot,
      executionStateBranch,
    };
  }

  async getExecutionStateRootProof(block: capella.BeaconBlock) {
    const view = ssz.capella.BeaconBlockBody.toView(block.body as any);
    const proof = createProof(view.node, {
      type: ProofType.single,
      gindex: BigInt(402),
    }) as SingleProof;
    return { root: proof.leaf, branch: proof.witnesses };
  }

  async getRotateUpdate(blockIdentifier: BeaconId): Promise<RotateUpdate> {
    const finalizedBlock = await this.getBlock(blockIdentifier);
    const finalizedState = await this.getState(finalizedBlock.slot);
    const finalizedStateView = ssz.capella.BeaconState.toView(
      finalizedState as any
    );

    const currentSyncCommittee = finalizedState.currentSyncCommittee;
    const nextSyncCommitteeIndex = ssz.capella.BeaconState.getPathInfo([
      "next_sync_committee",
    ]).gindex;
    const nextSyncCommittee = finalizedState.nextSyncCommittee;
    const nextSyncCommitteeBranch = (
      createProof(finalizedStateView.node, {
        type: ProofType.single,
        gindex: nextSyncCommitteeIndex,
      }) as SingleProof
    ).witnesses;

    const syncAggregate = finalizedBlock.body.syncAggregate;

    return {
      currentSyncCommittee,
      nextSyncCommittee,
      nextSyncCommitteeBranch,
      syncAggregate,
    };
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

export type StepUpdate = {
  attestedBlock: capella.BeaconBlock;
  currentSyncCommittee: altair.SyncCommittee;
  finalizedBlock: capella.BeaconBlock;
  finalityBranch: Uint8Array[];
  forkVersion: Uint8Array;
  syncAggregate: altair.SyncAggregate;
  genesisValidatorsRoot: Uint8Array;
  executionStateRoot: Uint8Array;
  executionStateBranch: Uint8Array[];
};

export type RotateUpdate = {
  currentSyncCommittee: altair.SyncCommittee;
  nextSyncCommittee: altair.SyncCommittee;
  nextSyncCommitteeBranch: Uint8Array[];
  syncAggregate: altair.SyncAggregate;
};

type BeaconId = number | Uint8Array | string | bigint;

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
  }
>;

config[ChainId.Mainnet] = {
  secondsPerSlot: 12,
  slotsPerEpoch: 32,
  epochsPerPeriod: 256,
  capellaForkEpoch: 194048,
};

config[ChainId.Sepolia] = {
  secondsPerSlot: 12,
  slotsPerEpoch: 32,
  epochsPerPeriod: 256,
  capellaForkEpoch: 56832,
};

config[ChainId.Holesky] = {
  secondsPerSlot: 12,
  slotsPerEpoch: 32,
  epochsPerPeriod: 256,
  capellaForkEpoch: 256,
};

config[ChainId.Goerli] = {
  secondsPerSlot: 12,
  slotsPerEpoch: 32,
  epochsPerPeriod: 256,
  capellaForkEpoch: 162304,
};

config[ChainId.Gnosis] = {
  secondsPerSlot: 5,
  slotsPerEpoch: 16,
  epochsPerPeriod: 512,
  capellaForkEpoch: 648704,
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
}
