// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import "forge-std/StdJson.sol";
import {LightClient} from "../src/LightClient.sol";

struct LightClientInit {
    uint256 genesisTime;
    bytes32 genesisValidatorsRoot;
    uint256 secondsPerSlot;
    uint256 slotsPerPeriod;
    uint32 sourceChainId;
    uint256 syncCommitteePeriod;
    bytes32 syncCommitteePoseidon;
}

contract DeployLightClient is Script {
    using stdJson for string;

    function setUp() public {}

    function run() public {
        string memory CONSENSUS_RPC_1 = vm.envString("CONSENSUS_RPC_1");
        bytes32 STEP_FUNCTION_ID = vm.envBytes32("STEP_FUNCTION_ID");
        bytes32 ROTATE_FUNCTION_ID = vm.envBytes32("ROTATE_FUNCTION_ID");
        address FUNCTION_GATEWAY_ADDRESS = vm.envAddress("FUNCTION_GATEWAY");
        uint16 FINALITY_THRESHOLD = uint16(vm.envUint("FINALITY_THRESHOLD"));

        LightClientInit memory initData;
        {
            string[] memory curlInputs = new string[](4);
            curlInputs[0] = "curl";
            curlInputs[1] = string(abi.encodePacked(CONSENSUS_RPC_1, "/api/beacon/proof/lightclient/init/head"));
            curlInputs[2] = "-o";
            curlInputs[3] = "init.json";

            vm.ffi(curlInputs);

            string memory rawJson = vm.readFile("init.json");
            bytes memory initJson = rawJson.parseRaw(".");
            initData = abi.decode(initJson, (LightClientInit));
        }

        console.log("genesisValidatorsRoot:");
        console.logBytes32(bytes32(initData.genesisValidatorsRoot));
        console.log("genesisTime: %s", uint256(initData.genesisTime));
        console.log("secondsPerSlot: %s", uint256(initData.secondsPerSlot));
        console.log("slotsPerPeriod: %s", uint256(initData.slotsPerPeriod));
        console.log("syncCommitteePeriod: %s", uint256(initData.syncCommitteePeriod));
        console.log("syncCommitteePoseidon:");
        console.logBytes32(bytes32(initData.syncCommitteePoseidon));
        console.log("sourceChainId: %s", uint32(initData.sourceChainId));
        console.log("finalityThreshold: %s", uint16(FINALITY_THRESHOLD));
        console.log("stepFunctionId:");
        console.logBytes32(bytes32(STEP_FUNCTION_ID));
        console.log("rotateFunctionId:");
        console.logBytes32(bytes32(ROTATE_FUNCTION_ID));
        console.log("functionGatewayAddress: %s", address(FUNCTION_GATEWAY_ADDRESS));
        vm.startBroadcast();
        LightClient lightClient = new LightClient(
            initData.genesisValidatorsRoot,
            initData.genesisTime,
            initData.secondsPerSlot,
            initData.slotsPerPeriod,
            initData.syncCommitteePeriod,
            initData.syncCommitteePoseidon,
            initData.sourceChainId,
            FINALITY_THRESHOLD,
            STEP_FUNCTION_ID,
            ROTATE_FUNCTION_ID,
            FUNCTION_GATEWAY_ADDRESS
        );
        vm.stopBroadcast();
        console.log("LightClient address: %s", address(lightClient));
    }
}
