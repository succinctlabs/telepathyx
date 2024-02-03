import { altair, bellatrix, capella, deneb, phase0, ssz } from '@lodestar/types';

export type BeaconBlock = capella.BeaconBlock | deneb.BeaconBlock;
export type BeaconState = capella.BeaconState | deneb.BeaconState;

export type BeaconId = number | Uint8Array | string | bigint;

export type StepUpdate = {
    attestedBlock: BeaconBlock;
    attestedHeaderRoot: Uint8Array;
    currentSyncCommittee: altair.SyncCommittee;
    finalizedBlock: BeaconBlock;
    finalizedHeaderRoot: Uint8Array;
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
