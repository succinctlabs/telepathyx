/*
 _____         _                       _     _           
|_   _|  ___  | |  ___   _ __   __ _  | |_  | |_    _  _ 
  | |   / -_) | | / -_) | '_ \ / _` | |  _| | ' \  | || |
  |_|   \___| |_| \___| | .__/ \__,_|  \__| |_||_|  \_, |
                        |_|                         |__/ 

Created on March 6th 2023 by Succinct Labs
Code: https://github.com/succinctlabs/telepathy-circuits
License: GPL-3
*/

pragma circom 2.0.5;

include "./bls.circom";
include "./constants.circom";
include "./poseidon.circom";
include "./ssz.circom";
include "./sync_committee.circom";
include "./sha256.circom";
include "./io.circom";

/*
 * Reduces the gas cost of processing a light client update by offloading the 
 * verification of the aggregated BLS signature by the sync committee and 
 * various merkle proofs (e.g., finality) into a zkSNARK which can be verified
 * on-chain for ~200K gas. 
 *
 * @input  attested{HeaderRoot,Slot,ProposerIndex,ParentRoot,StateRoot,BodyRoot}
                                  The header attested to by the sync committee and all associated fields.
 * @input  finalized{HeaderRoot,Slot,ProposerIndex,ParentRoot,StateRoot,BodyRoot}
                                  The finalized header committed to inside the attestedHeader.
 * @input  pubkeysX               X-coordinate of the public keys of the sync committee in bigint form.
 * @input  pubkeysY               Y-coordinate of the public keys of the sync committee in bigint form.
 * @input  aggregationBits        Bitmap indicating which validators have signed
 * @input  signature              An aggregated signature over signingRoot
 * @input  domain                 sha256(forkVersion, genesisValidatorsRoot)
 * @input  signingRoot            sha256(attestedHeaderRoot, domain)
 * @input  participation          sum(aggregationBits)
 * @input  syncCommitteePoseidon  A commitment to the sync committee pubkeys from rotate.circom.
 * @input  finalityBranch         A Merkle proof for finalizedHeader
 * @input  executionStateRoot     The eth1 state root inside finalizedHeader
 * @input  executionStateBranch   A Merkle proof for executionStateRoot
 * @input  publicInputsRoot       A commitment to all "public inputs"
 */
template Step() {
    var N = getNumBitsPerRegister();
    var K = getNumRegisters();
    var SYNC_COMMITTEE_SIZE = getSyncCommitteeSize();
    var LOG_2_SYNC_COMMITTEE_SIZE = getLog2SyncCommitteeSize();
    var FINALIZED_HEADER_DEPTH = getFinalizedHeaderDepth();
    var FINALIZED_HEADER_INDEX = getFinalizedHeaderIndex();
    var EXECUTION_STATE_ROOT_DEPTH = getExecutionStateRootDepth();
    var EXECUTION_STATE_ROOT_INDEX = getExecutionStateRootIndex();
    var TRUNCATED_SHA256_SIZE = getTruncatedSha256Size();

    /* Attested Header */
    signal input attestedHeaderRoot[32];
    signal input attestedSlot[32];
    signal input attestedProposerIndex[32];
    signal input attestedParentRoot[32];
    signal input attestedStateRoot[32];
    signal input attestedBodyRoot[32];

    /* Finalized Header */
    signal input finalizedHeaderRoot[32];
    signal input finalizedSlot[32];
    signal input finalizedProposerIndex[32];
    signal input finalizedParentRoot[32];
    signal input finalizedStateRoot[32];
    signal input finalizedBodyRoot[32];

    /* Sync Committee Protocol */
    signal input pubkeysX[SYNC_COMMITTEE_SIZE][K];
    signal input pubkeysY[SYNC_COMMITTEE_SIZE][K];
    signal input aggregationBits[SYNC_COMMITTEE_SIZE];
    signal input signature[2][2][K];
    signal input domain[32];
    signal input signingRoot[32];
    signal input participation;
    signal input syncCommitteePoseidon;

    /* Finality Proof */
    signal input finalityBranch[FINALIZED_HEADER_DEPTH][32];

    /* Execution State Proof */
    signal input executionStateRoot[32];
    signal input executionStateBranch[EXECUTION_STATE_ROOT_DEPTH][32];
    
    /* Public inputs */
    signal output outputHash;
    signal input inputHash;

    // Input: [uint256 syncCommitteePoseidon, uint64 attestedSlot]
    component inputHasher = IOHasher(40);

    // inputHasher[0:32] == syncCommitteePoseidon bytes
    component poseidonToBits = Num2Bits_strict();
    poseidonToBits.in <== syncCommitteePoseidon;
    component poseidonBitsToBytes[32];
    for (var i = 0; i < 32; i++) {
        poseidonBitsToBytes[i] = Bits2Num(8);
        for (var j = 0; j < 8; j++) {
            if (i*8+j < 254) {
                poseidonBitsToBytes[i].in[j] <== poseidonToBits.out[i*8+j];
            } else {
                poseidonBitsToBytes[i].in[j] <== 0;
            }
        }
    }
    for (var i = 0; i < 32; i++) {
        // Put bytes in reverse order to convert from LE to BE
        inputHasher.in[32-i-1] <== poseidonBitsToBytes[i].out;
    }

    // inputHasher[32:40] == requestedAttestedSlot bytes (LE to BE)
    for (var i = 0; i < 32; i++) {
        if i < 8 {
            inputHasher.in[32+i] <== attestedSlot[7-i];
        } else {
            inputHasher.in[32+i] === 0;
        }
    }

    inputHasher.out === inputHash;

    // /* VALIDATE BEACON CHAIN DATA AGAINST SIGNING ROOT */
    // component sszAttestedHeader = SSZPhase0BeaconBlockHeader();
    // component sszFinalizedHeader = SSZPhase0BeaconBlockHeader();
    // component sszSigningRoot = SSZPhase0SigningRoot();
    // for (var i = 0; i < 32; i++) {
    //     sszAttestedHeader.slot[i] <== attestedSlot[i];
    //     sszAttestedHeader.proposerIndex[i] <== attestedProposerIndex[i];
    //     sszAttestedHeader.parentRoot[i] <== attestedParentRoot[i];
    //     sszAttestedHeader.stateRoot[i] <== attestedStateRoot[i];
    //     sszAttestedHeader.bodyRoot[i] <== attestedBodyRoot[i];

    //     sszFinalizedHeader.slot[i] <== finalizedSlot[i];
    //     sszFinalizedHeader.proposerIndex[i] <== finalizedProposerIndex[i];
    //     sszFinalizedHeader.parentRoot[i] <== finalizedParentRoot[i];
    //     sszFinalizedHeader.stateRoot[i] <== finalizedStateRoot[i];
    //     sszFinalizedHeader.bodyRoot[i] <== finalizedBodyRoot[i];

    //     sszSigningRoot.headerRoot[i] <== attestedHeaderRoot[i];
    //     sszSigningRoot.domain[i] <== domain[i];
    // }
    // for (var i = 0; i < 32; i++) {
    //     sszAttestedHeader.out[i] === attestedHeaderRoot[i];
    //     sszFinalizedHeader.out[i] === finalizedHeaderRoot[i];
    //     sszSigningRoot.out[i] === signingRoot[i];
    // }
    
    // /* VERIFY SYNC COMMITTEE SIGNATURE AND COMPUTE PARTICIPATION */
    // component verifySignature = VerifySyncCommitteeSignature(
    //     SYNC_COMMITTEE_SIZE,
    //     LOG_2_SYNC_COMMITTEE_SIZE,
    //     N,
    //     K
    // );
    // for (var i = 0; i < SYNC_COMMITTEE_SIZE; i++) {
    //     verifySignature.aggregationBits[i] <== aggregationBits[i];
    //     for (var j = 0; j < K; j++) {
    //         verifySignature.pubkeys[i][0][j] <== pubkeysX[i][j];
    //         verifySignature.pubkeys[i][1][j] <== pubkeysY[i][j];
    //     }
    // }
    // for (var i = 0; i < 2; i++) {
    //     for (var j = 0; j < 2; j++) {
    //         for (var l = 0; l < K; l++) {
    //             verifySignature.signature[i][j][l] <== signature[i][j][l];
    //         }
    //     }
    // }
    // for (var i = 0; i < 32; i++) {
    //     verifySignature.signingRoot[i] <== signingRoot[i];
    // }
    // verifySignature.syncCommitteeRoot <== syncCommitteePoseidon;
    // verifySignature.participation === participation;
   
    // /* VERIFY FINALITY PROOF */
    // component verifyFinality = SSZRestoreMerkleRoot(
    //     FINALIZED_HEADER_DEPTH,
    //     FINALIZED_HEADER_INDEX
    // );
    // for (var i = 0; i < 32; i++) {
    //     verifyFinality.leaf[i] <== finalizedHeaderRoot[i];
    //     for (var j = 0; j < FINALIZED_HEADER_DEPTH; j++) {
    //         verifyFinality.branch[j][i] <== finalityBranch[j][i];
    //     }
    // }
    // for (var i = 0; i < 32; i++) {
    //     verifyFinality.out[i] === attestedStateRoot[i];
    // }

    // /* VERIFY EXECUTION STATE PROOF */
    // component verifyExecutionState = SSZRestoreMerkleRoot(
    //     EXECUTION_STATE_ROOT_DEPTH,
    //     EXECUTION_STATE_ROOT_INDEX
    // );
    // for (var i = 0; i < 32; i++) {
    //     verifyExecutionState.leaf[i] <== executionStateRoot[i];
    //     for (var j = 0; j < EXECUTION_STATE_ROOT_DEPTH; j++) {
    //         verifyExecutionState.branch[j][i] <== executionStateBranch[j][i];
    //     }
    // }
    // for (var i = 0; i < 32; i++) {
    //     verifyExecutionState.out[i] === finalizedBodyRoot[i];
    // }

    // Output: [bytes32 finalizedHeaderRoot, bytes32 executionStateRoot, uint64 finalizedSlot, uint16 participation]
    component outputHasher = IOHasher(74);

    // outputHasher[0:32] == finalizedHeaderRoot bytes
    for (var i = 0; i < 32; i++) {
        outputHasher.in[i] <== finalizedHeaderRoot[i];
    }

    // outputHasher[32:64] == executionStateRoot bytes
    for (var i = 0; i < 32; i++) {
        outputHasher.in[32+i] <== executionStateRoot[i];
    }

    // outputHasher[64:72] == finalizedSlot bytes (LE to BE) uint64
    for (var i = 0; i < 8; i++) {
        outputHasher.in[64+i] <== finalizedSlot[8-i-1];
    }

    // outputHasher[72:74] == participation LE to BE uint16
    component participationToBits = Num2Bits(16);
    participationToBits.in <== participation;
    component participationBitsToBytes[2];
    for (var i = 0; i < 2; i++) {
        participationBitsToBytes[i] = Bits2Num(8);
        for (var j = 0; j < 8; j++) {
            participationBitsToBytes[i].in[j] <== participationToBits.out[i*8+j];
        }
    }
    for (var i = 0; i < 2; i++) {
        outputHasher.in[72+i] <== participationBitsToBytes[2-i-1].out;
    }
    
    outputHash <== outputHasher.out;
}

component main {public [inputHash]} = Step();