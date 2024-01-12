export const TELEPATHY_ABI = [
    {
        inputs: [
            {
                internalType: 'bytes32',
                name: 'genesisValidatorsRoot',
                type: 'bytes32'
            },
            {
                internalType: 'uint256',
                name: 'genesisTime',
                type: 'uint256'
            },
            {
                internalType: 'uint256',
                name: 'secondsPerSlot',
                type: 'uint256'
            },
            {
                internalType: 'uint256',
                name: 'slotsPerPeriod',
                type: 'uint256'
            },
            {
                internalType: 'uint256',
                name: 'syncCommitteePeriod',
                type: 'uint256'
            },
            {
                internalType: 'bytes32',
                name: 'syncCommitteePoseidon',
                type: 'bytes32'
            },
            {
                internalType: 'uint32',
                name: 'sourceChainId',
                type: 'uint32'
            },
            {
                internalType: 'uint16',
                name: 'finalityThreshold',
                type: 'uint16'
            },
            {
                internalType: 'bytes32',
                name: 'stepFunctionId',
                type: 'bytes32'
            },
            {
                internalType: 'bytes32',
                name: 'rotateFunctionId',
                type: 'bytes32'
            },
            {
                internalType: 'address',
                name: 'gatewayAddress',
                type: 'address'
            }
        ],
        stateMutability: 'nonpayable',
        type: 'constructor'
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'slot',
                type: 'uint256'
            }
        ],
        name: 'HeaderRootNotSet',
        type: 'error'
    },
    {
        inputs: [
            {
                internalType: 'uint16',
                name: 'participation',
                type: 'uint16'
            }
        ],
        name: 'NotEnoughParticipation',
        type: 'error'
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'period',
                type: 'uint256'
            }
        ],
        name: 'SyncCommitteeNotSet',
        type: 'error'
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'uint256',
                name: 'slot',
                type: 'uint256'
            },
            {
                indexed: true,
                internalType: 'bytes32',
                name: 'root',
                type: 'bytes32'
            }
        ],
        name: 'HeaderUpdate',
        type: 'event'
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'uint256',
                name: 'period',
                type: 'uint256'
            },
            {
                indexed: true,
                internalType: 'bytes32',
                name: 'root',
                type: 'bytes32'
            }
        ],
        name: 'SyncCommitteeUpdate',
        type: 'event'
    },
    {
        inputs: [],
        name: 'FINALITY_THRESHOLD',
        outputs: [
            {
                internalType: 'uint16',
                name: '',
                type: 'uint16'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [],
        name: 'FUNCTION_GATEWAY_ADDRESS',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [],
        name: 'GENESIS_TIME',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [],
        name: 'GENESIS_VALIDATORS_ROOT',
        outputs: [
            {
                internalType: 'bytes32',
                name: '',
                type: 'bytes32'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [],
        name: 'ROTATE_FUNCTION_ID',
        outputs: [
            {
                internalType: 'bytes32',
                name: '',
                type: 'bytes32'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [],
        name: 'SECONDS_PER_SLOT',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [],
        name: 'SLOTS_PER_PERIOD',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [],
        name: 'SOURCE_CHAIN_ID',
        outputs: [
            {
                internalType: 'uint32',
                name: '',
                type: 'uint32'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [],
        name: 'STEP_FUNCTION_ID',
        outputs: [
            {
                internalType: 'bytes32',
                name: '',
                type: 'bytes32'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [],
        name: 'consistent',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256'
            }
        ],
        name: 'executionStateRoots',
        outputs: [
            {
                internalType: 'bytes32',
                name: '',
                type: 'bytes32'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [],
        name: 'head',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256'
            }
        ],
        name: 'headers',
        outputs: [
            {
                internalType: 'bytes32',
                name: '',
                type: 'bytes32'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'finalizedSlot',
                type: 'uint256'
            }
        ],
        name: 'requestRotate',
        outputs: [],
        stateMutability: 'payable',
        type: 'function'
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'attestedSlot',
                type: 'uint256'
            }
        ],
        name: 'requestStep',
        outputs: [],
        stateMutability: 'payable',
        type: 'function'
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'finalizedSlot',
                type: 'uint256'
            }
        ],
        name: 'rotate',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'attestedSlot',
                type: 'uint256'
            }
        ],
        name: 'step',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256'
            }
        ],
        name: 'syncCommitteePoseidons',
        outputs: [
            {
                internalType: 'bytes32',
                name: '',
                type: 'bytes32'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256'
            }
        ],
        name: 'timestamps',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    }
] as const;
