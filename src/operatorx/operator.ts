import { BeaconClient} from "./beacon.js";
import axios from 'axios';
import {
    PublicClient,
    createPublicClient,
    encodeFunctionData,
    encodePacked,
    fromBytes,
    http,
    toBytes
} from 'viem';
import { goerli } from 'viem/chains';
import { TELEPATHY_ABI } from './abi.js';
import { Config } from './config.js';
import fetch from 'node-fetch';

const SLOTS_PER_PERIOD = 8192n;
export function getSyncCommitteePeriod(slot: bigint): bigint {
    return slot / SLOTS_PER_PERIOD;
}

// A type that holds all the clients and config information needed for the request.
type ParentClient = {
    viem: PublicClient;
    beacon: BeaconClient;
};


function getPlatformUrl() {
    return process.env.PLATFORM_URL || 'https://alpha.succinct.xyz';
}

const zero_bytes32_str = fromBytes(toBytes(0, { size: 32 }), 'hex');

export class Operator {
    config: Config;
    client: ParentClient;

    stopped = false;
    lastRotatePeriod: number | null = null;
    lastStepEpoch: number | null = null;

    constructor(config: Config) {
        this.config = config;
        console.log('Using config:', config);

        const rpc_url = process.env[`RPC_${this.config.chainId}`];
        if (!rpc_url) {
            throw new Error(`No rpc url found for chain id ${this.config.chainId}`);
        }

        // Setup clients.
        const viemClient = createPublicClient({
            chain: goerli,
            transport: http(process.env[`RPC_${config.chainId}`], {
                fetchOptions: { cache: 'no-store' }
            })
        });
        let rpc = '';
        switch (config.consensusChainId) {
            case 1:
                rpc = process.env.CONSENSUS_RPC_1 || '';
                break;
            case 5:
                rpc = process.env.CONSENSUS_RPC_5 || '';
                break;
            default:
                throw new Error('Invalid consensus chain id');
        }
        const beaconClient = new BeaconClient(rpc);

        this.client = {
            viem: viemClient,
            beacon: beaconClient
        };
    }

    async start() {
        process.on('SIGINT', () => {
            if (this.stopped) {
                console.log('Force stopping..');
                process.exit();
            } else {
                console.log('Stopping.. (Ctrl-C again to force)');
                this.stopped = true;
            }
        });

        console.log('Starting operator...');
        this.run();
        console.log('Operator started.');
    }

    async run() {
        while (!this.stopped) {
            const startTime = Date.now();
            console.log('Running loop at ' + new Date().toISOString());
            await this.loop();
            console.log('Finished after ' + (Date.now() - startTime) / 1000 + 'sec.');

            const timeToSleep = Math.max(this.config.intervalMs - (Date.now() - startTime), 0);
            await new Promise((resolve) => setTimeout(resolve, timeToSleep));
        }
    }

    async loop() {
        try {
            console.log('Running loop...');

            const TELEPATHY_ADDRESS = this.config.address;
            const STEP_THRESHOLD = this.config.stepThreshold;

            // Read data from the light client.
            let headRaw = await this.client.viem.readContract({
                address: TELEPATHY_ADDRESS,
                abi: TELEPATHY_ABI,
                functionName: 'head'
            });
            let headSlot = headRaw as bigint;
            console.log('Light Client current head: ' + headSlot);

            if (headSlot == 0n) {
                console.log('Head slot is 0, meaning the light client was likely just deployed.');
                const currentBeaconHeader = await this.client.beacon.getHeader('head');
                let currentSlot = BigInt(currentBeaconHeader.slot);
                let currentPeriod = getSyncCommitteePeriod(currentSlot);
                // Loop until we find a sync committee poseidon that is not 0.
                console.log("Trying to find a valid period's sync committee poesidon:");
                while (true) {
                    console.log('Trying...', currentPeriod);
                    const syncCommitteePoseidonRaw = await this.client.viem.readContract({
                        address: this.config.address,
                        abi: TELEPATHY_ABI,
                        functionName: 'syncCommitteePoseidons',
                        args: [currentPeriod]
                    });
                    const syncCommitteePoseidon = syncCommitteePoseidonRaw as string;
                    if (syncCommitteePoseidon != zero_bytes32_str) {
                        break;
                    }
                    currentPeriod -= 1n;
                }
                console.log('Found:', currentPeriod);
                // Now we can step with this period.
                let maxStepSlot = currentPeriod * 8192n + 8190n;
                if (currentSlot < maxStepSlot) {
                    console.log(
                        `Current slot is less than max step slot, setting step update to currentSlot=${currentSlot}`
                    );
                    maxStepSlot = currentSlot;
                }
                await this.requestValidStepSlot(maxStepSlot);
                return;
            }

            // Get the head slot's period + 1 to see if rotate has already been called with head slot.
            const targetPeriod = getSyncCommitteePeriod(headSlot) + 1n;
            console.log('Target period (period of head slot + 1):', targetPeriod);
            // Read the syncCommitteePoseidon of the target period.
            const syncCommitteePoseidonRaw = await this.client.viem.readContract({
                address: this.config.address,
                abi: TELEPATHY_ABI,
                functionName: 'syncCommitteePoseidons',
                args: [targetPeriod]
            });
            const syncCommitteePoseidon = syncCommitteePoseidonRaw as string;
            console.log('Sync committee poseidon of target period:', syncCommitteePoseidon);
            // If the syncCommitteePoseidon is bytes32(0), it means that rotate has not been called yet.
            if (syncCommitteePoseidon == zero_bytes32_str) {
                console.log(
                    `No sync committee update found for period ${targetPeriod}. Requesting rotate with head slot ${headSlot}.`
                );
                try {
                    const period = Number(getSyncCommitteePeriod(headSlot));
                    if (this.lastRotatePeriod == period) {
                        console.log('Already requested rotate for period:', period);
                        return;
                    }
                    // We get the rotate update to make sure there are no issues with the provided headSlot
                    await this.client.beacon.getRotateUpdate(headSlot);
                    await this.requestRotate(headSlot);
                    return;
                } catch (err) {
                    // This means the rotate update was not available.
                    console.log(`Rotate update for ${headSlot} doesn't exist.`);
                    throw err;
                }
            } else {
                console.log('Rotate not needed.');
            }

            const currentBeaconHeader = await this.client.beacon.getHeader('head');
            let currentSlot = BigInt(currentBeaconHeader.slot);
            console.log('Current slot: ' + currentSlot);
            // This is the maximum step slot we can request
            const maxStepSlot = targetPeriod * 8192n + 8190n;
            if (currentSlot > maxStepSlot) {
                console.log(
                    `Current slot is greater than max step slot, setting step update to maxStepSlot=${maxStepSlot}`
                );
                currentSlot = maxStepSlot;
            }

            // We should step if it is an appropriate time.
            if (currentSlot - headSlot >= STEP_THRESHOLD) {
                await this.requestValidStepSlot(currentSlot);
            } else {
                console.log(
                    `Not time to step yet (currentSlot=${currentSlot}, headSlot=${headSlot}, STEP_THRESHOLD=${STEP_THRESHOLD}).`
                );
            }
        } catch (err) {
            console.error(err);
        }
    }

    async requestStep(slot: bigint) {
        let request_url = `${getPlatformUrl()}/api/request/new`;

        // From TelepathyX smart contract:
        // input = abi.encodePacked(
        //     syncCommitteePoseidons[getSyncCommitteePeriod(attestedSlot)], uint64(attestedSlot)
        // )
        const syncCommitteePoseidon = await this.client.viem.readContract({
            address: this.config.address,
            abi: TELEPATHY_ABI,
            functionName: 'syncCommitteePoseidons',
            args: [getSyncCommitteePeriod(slot)]
        });
        if (syncCommitteePoseidon == zero_bytes32_str) {
            console.log(`No sync committee poseidon found for period associated with slot ${slot}`);
            return;
        }

        let input = encodePacked(['bytes32', 'uint64'], [syncCommitteePoseidon, slot]);
        let data = {
            chainId: this.config.chainId,
            to: this.config.address,
            data: encodeFunctionData({ abi: TELEPATHY_ABI, functionName: 'step', args: [slot] }),
            functionId: this.config.stepFunctionId,
            input: input,
            retry: true
        };

        // This is useful for debugging the input bytes API that is used for witness generation.
        // const res = await fetch(
        //     `https://beaconapi.succinct.xyz/api/beacon/proof/lightclient/step/${input}`
        // );
        // console.log(res);

        console.log('step request data:', data);
        const response = await fetch(request_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.PLATFORM_API_KEY}`
            },
            body: JSON.stringify(data) // body data type must match "Content-Type" header
        });
        if (response.status != 200) {
            console.log("response status isn't 200");
            console.log(
                `The TelepathyX Light Client at ${this.config.address} on Chain ${this.config.chainId} step update failed with error ${response.status} ${response.statusText}.`
            );
        } else {
            const json = await response.json();
            console.log('step request response:', json);
        }
    }

    async requestRotate(slot: bigint) {
        let request_url = `${getPlatformUrl()}/api/request/new`;

        // From TelepathyX smart contract:
        // input = abi.encodePacked(headers[finalizedSlot])
        const headerRoot = await this.client.viem.readContract({
            address: this.config.address,
            abi: TELEPATHY_ABI,
            functionName: 'headers',
            args: [slot]
        });

        if (headerRoot == zero_bytes32_str) {
            console.log(`No header found for slot ${slot}`);
            return;
        }

        let data = {
            chainId: this.config.chainId,
            to: this.config.address,
            data: encodeFunctionData({ abi: TELEPATHY_ABI, functionName: 'rotate', args: [slot] }),
            functionId: this.config.rotateFunctionId,
            input: headerRoot,
            retry: true
        };

        const period = Number(getSyncCommitteePeriod(slot));
        this.lastRotatePeriod = period;

        console.log('rotate request data:', data);

        const response = await fetch(request_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.PLATFORM_API_KEY}`
            },
            body: JSON.stringify(data) // body data type must match "Content-Type" header
        });
        if (response.status != 200) {
            console.log(
                `The TelepathyX Light Client at ${this.config.address} on Chain ${this.config.chainId} rotate update failed with error ${response.status} ${response.statusText}.`
            );
        } else {
            const json = await response.json();
            console.log('rotate request response:', json);
        }
    }

    // Takes a headSlot and steps backwards until it finds a valid slot to requestStep for.
    async requestValidStepSlot(headSlot: bigint) {
        const epoch = Math.floor(Number(headSlot) / 32);
        if (this.lastStepEpoch == epoch) {
            console.log('Already requested step for epoch:', epoch);
            return;
        }

        let requestSlot = undefined;
        // Try slots from head to head - 100
        for (let i = 0; i <= 100; i++) {
            try {
                // Try to get the step update for the current head - i
                const data = await this.client.beacon.getStepUpdate(headSlot - BigInt(i));
                if (
                    // If the step update is valid, then we break
                    true 
                    // Number(BeaconSDK.computeBitSum(data.syncAggregate.syncCommitteeBits)) >
                    // this.config.finalityThreshold
                ) {
                    requestSlot = headSlot - BigInt(i);
                    console.log('Found a valid slot to request step for:', requestSlot);
                    break;
                }
            } catch (err) {
                if (axios.isAxiosError(err) && err.response?.status === 404) {
                    continue;
                }
                console.error('Error getting step update for slot:', headSlot - BigInt(i), err);
            }
        }

        if (requestSlot === undefined) {
            await console.log(
                `No valid step update found for TelepathyX at ${this.config.address}`
            );
        } else {
            this.lastStepEpoch = Math.floor(Number(requestSlot) / 32);
            await this.requestStep(requestSlot);
        }
    }
}
