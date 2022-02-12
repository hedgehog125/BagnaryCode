# BagnaryCode
Bagel Binary Code. Not really anything to do with Bagel.js, I just felt like naming it after it. It's a really basic CPU architecture and emulator

Version 1.0 of the architecture is really basic and only supports 4 instructions:
* Stop (0000)
* Load bit at memory address into the accumulator (0001)
The first 8 bits after the instruction represent the memory address and the next 3 are the accumulator bit.
* Conditional jump (0010)
First 8 bits are the address to jump to and the next 3 are the bit ID in the accumulator that has to be 1 for the condition to be met.
* Write to RAM (0011)
The 8 bits are the address to write to. The next 3 are the ID in the accumulator to write.

Version 1.1 supports also only supports those 4 instructions but: <br>
* The instruction codes are 2 bits. (remove the 2 zeros at the start from 1.0)
* Memory addresses are 16 bits
* Accumulator address are 4 bits (because it's 16 bits long)

Technically the stop command isn't needed as it can be replaced by a conditional jump that's always met to the same address. However, it's useful for interacting with the emulator so I'm keeping it.

A few things to note: <br>
* Instruction set 1.0 uses 8 bit memory addresses and has a 8 bit accumulator.
* 1.1 uses 16 bits for both.
* Addresses target a bit instead of a byte
* (this is emulating a CPU that doesn't actually exist. It's hypothetical for now)

# Getting started
Run the emulator in your browser here: https://hedgehog125.github.io/BagnaryCode
Or download the code and run a local http server.

Programs are written in txt files where everything other than a 0 or a 1 is ignored. Lines that contain a 0 and/or a 1 as well as something else will also be ignored. This means you can use 0s and 1s in comments.

Programs must start with the instruction set. This is specified by putting "#InstructionSet <name>" in the file. e.g "#InstructionSet 1.0"
Check out the testPrograms folder in the files for some example programs.
