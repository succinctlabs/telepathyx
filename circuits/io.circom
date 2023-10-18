pragma circom 2.0.5;

include "./sha256.circom";

/*
 * Hashes input bytes into a single 253-bit truncated number.
 * Equivalent to sha256(in) & 0x1fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff.
 * The order of the input / output bytes is as normally expected with sha256.
 */
template IOHasher(NUM_BYTES) {
    signal input in[NUM_BYTES];
    signal output out;

    // Compute 32 bytes digest from input bytes.
    component shaBytes = Sha256Bytes(NUM_BYTES);
    for (var i = 0; i < NUM_BYTES; i++) {
        shaBytes.in[i] <== in[i];
    }

    // Convert 32 bytes to 256 bits. Note that Num2Bits is in LE, but Bits2Num also is.
    component shaToBits[32];
    for (var i = 0; i < 32; i++) {
        shaToBits[i] = Num2Bits(8);
        shaToBits[i].in <== shaBytes.out[i];
    }

    // Convert 256 bits into a single number, truncating the 3 biggest bits.
    // Note that we input the bytes in reverse order since Bits2Num is LE.
    // The bits are not reversed here because Num2Bits already output them as LE.
    component shaToNum = Bits2Num(253);
    for (var i = 0; i < 32; i++) {
        for (var j = 0; j < 8; j++) {
            if (i*8+j < 253) {
                shaToNum.in[i*8+j] <== shaToBits[32-i-1].out[j];
            }
        }
    }
    out <== shaToNum.out;
}
