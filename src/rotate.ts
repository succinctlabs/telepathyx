#!/usr/bin/env node

import { Circuit, ProofData } from "@succinctlabs/circomx";
import axios from "axios";

class RotateCircuit extends Circuit {
  circuitName(): string {
    return "rotate";
  }

  async generateProofData(inputBytes: Buffer): Promise<ProofData> {
    const inputByteString = inputBytes.toString("hex");
    const CONSENSUS_RPC_1 = process.env.CONSENSUS_RPC_1;

    let res;
    try {
      res = await axios.get(
        `${CONSENSUS_RPC_1}/api/beacon/proof/lightclient/rotate/${inputByteString}`
      );
    } catch (e) {
      console.error("Failed to get witness JSON from beaconapi", e);
      throw e;
    }

    console.log(res.data);
    const { result } = res.data;
    return {
      witness: result.witness,
      outputBytes: Buffer.from(result.outputBytes.slice(2), "hex"),
    };
  }
}

new RotateCircuit().entrypoint();
