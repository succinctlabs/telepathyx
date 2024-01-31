import { Phase0Client } from './phase0';
import { BeaconId, RotateUpdate, StepUpdate } from './types';
import { altair, bellatrix, capella, deneb, phase0, ssz } from '@lodestar/types';
import { ProofType, SingleProof, createProof } from '@chainsafe/persistent-merkle-tree';
import { BeaconChainConfig, ChainId } from './config';

export class CapellaClient extends Phase0Client {
    constructor(rpc: string, chainId: ChainId) {
        super(rpc, chainId);
    }

    async getBlock(blockIdentifier: BeaconId): Promise<capella.BeaconBlock> {
        const id = this.toStringFromBeaconId(blockIdentifier);
        const response = await this.client.get(
            '/eth/v2/beacon/blocks/{block_id}'.replace('{block_id}', id)
        );
        return ssz.capella.BeaconBlock.fromJson(response.data.data.message) as capella.BeaconBlock;
    }

    async getState(stateIdentifier: BeaconId): Promise<capella.BeaconState> {
        const id = this.toStringFromBeaconId(stateIdentifier);
        const response = await this.client.get(
            '/eth/v2/debug/beacon/states/{state_id}'.replace('{state_id}', id),
            {
                responseType: 'arraybuffer',
                headers: {
                    Accept: 'application/octet-stream'
                }
            }
        );
        const bytes = response.data as Buffer;
        const state = ssz.capella.BeaconState.deserialize(bytes);
        return state;
    }

    // Separate this function so the state container can be GC'd quickly; Vercel has 3008 MB limit
    async getAttestedStepUpdate(
        attestedIdentifier: number
    ): Promise<Pick<StepUpdate, 'finalizedBlock' | 'finalityBranch'>> {
        const attestedBlock = await this.getBlock(attestedIdentifier);
        const attestedState = await this.getState(attestedBlock.slot);
        const attestedStateView = ssz.capella.BeaconState.toView(attestedState as any);

        const finalizedBlock = await this.getBlock(attestedState.finalizedCheckpoint.root);
        const finalityBranchIndex = ssz.capella.BeaconState.getPathInfo([
            'finalized_checkpoint',
            'root'
        ]).gindex;
        const finalityBranch = (
            createProof(attestedStateView.node, {
                type: ProofType.single,
                gindex: finalityBranchIndex
            }) as SingleProof
        ).witnesses;

        return { finalizedBlock, finalityBranch };
    }

    async getStepUpdate(attestedIdentifier: BeaconId): Promise<StepUpdate> {
        const attestedBlock = await this.getBlock(attestedIdentifier);
        const attestedHeaderRoot = ssz.capella.BeaconBlock.hashTreeRoot(attestedBlock);

        const signedSlot = attestedBlock.slot + 1;
        const signedBlock = await this.getBlock(signedSlot);

        const { finalizedBlock, finalityBranch } = await this.getAttestedStepUpdate(
            attestedBlock.slot
        );
        const finalizedHeaderRoot = ssz.capella.BeaconBlock.hashTreeRoot(finalizedBlock);

        const signedState = await this.getState(signedSlot);

        const currentSyncCommittee = signedState.currentSyncCommittee;
        const syncAggregate = signedBlock.body.syncAggregate;
        const genesisValidatorsRoot = signedState.genesisValidatorsRoot;
        const forkVersion =
            Math.floor(signedState.slot / BeaconChainConfig.slotsPerEpoch(this.chainId!)) <
            signedState.fork.epoch
                ? signedState.fork.previousVersion
                : signedState.fork.currentVersion;

        const executionStateRootAndBranch = await this.getExecutionStateRootProof(finalizedBlock);
        const executionStateRoot = executionStateRootAndBranch.root;
        const executionStateBranch = executionStateRootAndBranch.branch;

        return {
            attestedBlock,
            attestedHeaderRoot,
            currentSyncCommittee,
            finalizedBlock,
            finalizedHeaderRoot,
            finalityBranch,
            syncAggregate,
            genesisValidatorsRoot,
            forkVersion,
            executionStateRoot,
            executionStateBranch
        };
    }

    async getRotateUpdate(blockIdentifier: BeaconId): Promise<RotateUpdate> {
        const finalizedBlock = await this.getBlock(blockIdentifier);
        const finalizedState = await this.getState(finalizedBlock.slot);
        const finalizedStateView = ssz.capella.BeaconState.toView(finalizedState as any);

        const currentSyncCommittee = finalizedState.currentSyncCommittee;
        const nextSyncCommitteeIndex = ssz.capella.BeaconState.getPathInfo([
            'next_sync_committee'
        ]).gindex;
        const nextSyncCommittee = finalizedState.nextSyncCommittee;
        const nextSyncCommitteeBranch = (
            createProof(finalizedStateView.node, {
                type: ProofType.single,
                gindex: nextSyncCommitteeIndex
            }) as SingleProof
        ).witnesses;

        const syncAggregate = finalizedBlock.body.syncAggregate;

        return {
            currentSyncCommittee,
            nextSyncCommittee,
            nextSyncCommitteeBranch,
            syncAggregate
        };
    }

    async getExecutionStateRootProof(block: capella.BeaconBlock) {
        const executionStateRootIndex = ssz.capella.BeaconBlockBody.getPathInfo([
            'execution_payload',
            'state_root'
        ]).gindex;

        const view = ssz.capella.BeaconBlockBody.toView(block.body as any);
        const proof = createProof(view.node, {
            type: ProofType.single,
            gindex: BigInt(executionStateRootIndex)
        }) as SingleProof;

        return { root: proof.leaf, branch: proof.witnesses };
    }
}
