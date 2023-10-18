pragma circom 2.0.5;

include "./poseidon.circom";

component main {public [pubkeys]} = PoseidonG1Array(512, 55, 7);