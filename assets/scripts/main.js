/*
TODO

Make the incrementing due to arguments automatic

Boolean and maths commands could work differently if the second value is the current one?
Some instructions should take more than a cycle, e.g load dynamic RAM and also based on arguments. Maybe only in 2.0?

= Testing =
Joined accumulators
Conditions
Bit shifting
*/

const config = {
	RAMAmount: 256,
	RAMInBytes: 256,
	clockSpeed: 1000,
	debugSpeed: 1,
	instructionSetVersion: 1,
	display: {
		RAMByteMode: false,
		visible: true
	},
	instructionSet: null,
	instructionSetName: null
};

let game = Bagel.init({
	id: "BagnaryCodeEmulator",
	state: "main",
	vars: {
		execution: {
			binaryToDenary: binary => parseInt(binary.join(""), 2),
			instructionCode: {
				stop: executionVars => { // Stop the program
					executionVars.pauseExecution();
					return true;
				},

				// V1
				loadIntoAccumulator: (executionVars, registers) => { // Load address into the accumulator
					let state = executionVars.state;
					let address = state.RAM.slice(registers.programCounter + 4, registers.programCounter + 12);
					address = executionVars.binaryToDenary(address);
					let bitID = executionVars.binaryToDenary(state.RAM.slice(registers.programCounter + 12, registers.programCounter + 15));

					registers.accumulator[bitID] = state.RAM[address];
					registers.programCounter += 8 + 3; // The next instruction is actually a value, which is double the length of an instruction code and skip over the bit number
				},
				conditionalJumpToElse: (executionVars, registers) => { // Conditional jump to else continue
					let bitID = executionVars.binaryToDenary(executionVars.state.RAM.slice(registers.programCounter + 12, registers.programCounter + 15));
					if (registers.accumulator[bitID] == "0") {
						registers.programCounter += 8 + 3; // Skip over the value that stores the conditional jump to adddress
					}
					else {
						let value = executionVars.binaryToDenary(executionVars.state.RAM.slice(registers.programCounter + 4, registers.programCounter + 12));
						registers.programCounter = value;
						return true;
					}
				},
				writeAccumulatorBitRAM: (executionVars, registers) => { // Write accumulator bit to RAM
					let state = executionVars.state;
					let address = executionVars.binaryToDenary(state.RAM.slice(registers.programCounter + 4, registers.programCounter + 12));
					let bitID = executionVars.binaryToDenary(state.RAM.slice(registers.programCounter + 12, registers.programCounter + 15));
					executionVars.state.RAM[address] = registers.accumulator[bitID];
					registers.programCounter += 8 + 3; // Skip over the value that stores the address and that stores the bit number
				},

				// V1.1
				"loadIntoAccumulator1.1": (executionVars, registers) => { // Load address into the accumulator
					let state = executionVars.state;
					let address = state.RAM.slice(registers.programCounter + 2, registers.programCounter + 18);
					address = executionVars.binaryToDenary(address);
					let bitID = executionVars.binaryToDenary(state.RAM.slice(registers.programCounter + 18, registers.programCounter + 22));

					registers.accumulator[bitID] = state.RAM[address];
					registers.programCounter += 16 + 4; // Skip over the values
				},
				"conditionalJumpToElse1.1": (executionVars, registers) => { // Conditional jump to else continue
					let state = executionVars.state;
					let bitID = executionVars.binaryToDenary(state.RAM.slice(registers.programCounter + 18, registers.programCounter + 22));
					if (registers.accumulator[bitID] == "0") {
						registers.programCounter += 16 + 4; // Skip over the values
					}
					else {
						let value = executionVars.binaryToDenary(state.RAM.slice(registers.programCounter + 2, registers.programCounter + 18));
						registers.programCounter = value;
						return true;
					}
				},
				"writeAccumulatorBitRAM1.1": (executionVars, registers) => { // Write accumulator bit to RAM
					let state = executionVars.state;
					let address = executionVars.binaryToDenary(state.RAM.slice(registers.programCounter + 2, registers.programCounter + 18));
					let bitID = executionVars.binaryToDenary(state.RAM.slice(registers.programCounter + 18, registers.programCounter + 22));
					executionVars.state.RAM[address] = registers.accumulator[bitID];
					registers.programCounter += 16 + 4; // Skip over the value that stores the address and that stores the bit number
				},

				// V2
				switchAcc: (executionVars, registers, instructionID) => {
					let accumulatorID = instructionID - 1;
					{
						let floored = Math.floor(accumulatorID / 2);
						if (registers.joinedAccumulators[floored]) accumulatorID = floored;
					}
					
					registers.currentAccumulator = accumulatorID;
					registers.currentAccumulatorByte = 0;
				},
				loadConst: (executionVars, registers) => {
					const value = executionVars.state.RAM[registers.programCounter + 1];
					executionVars.loadIntoAccumulator(value);

					executionVars.toggleAccumulatorByte();
					registers.programCounter++;
				},
				loadRAM: (executionVars, registers) => {
					const RAM = executionVars.state.RAM;

					const address = (RAM[registers.programCounter + 1] * 256) + RAM[registers.programCounter + 2]; // The 2 bytes after the command
					executionVars.loadIntoAccumulator(RAM[address]);

					executionVars.toggleAccumulatorByte();
					registers.programCounter += 2;
				},
				loadDynRAM: (executionVars, registers) => {
					const RAM = executionVars.state.RAM;

					const address = (RAM[registers.programCounter + 1] * 256) + RAM[registers.programCounter + 2]; // The 2 bytes after the command
					executionVars.loadIntoAccumulator(RAM[(RAM[address] * 256) + RAM[address + 1]]);

					executionVars.toggleAccumulatorByte();
					registers.programCounter += 2;
				},

				copyAccTo: (executionVars, registers, instructionID) => {
					const target = instructionID - 8;
					const value = executionVars.getAccumulatorValue(0);
					if (executionVars.isAccumulatorJoined()) {
						const id = target + registers.currentAccumulatorByte;
						registers.joinedAccumulatorValues[id] = value;
					}
					else {
						const id = (target * 2) + registers.currentAccumulatorByte;
						registers.accumulators[id] = value;
					}
					executionVars.toggleAccumulatorByte();
				},

				not: executionVars => {
					executionVars.loadIntoAccumulator(255 - executionVars.getAccumulatorValue(0), true);
				},
				and: (executionVars, registers) => {
					executionVars.loadIntoAccumulator(executionVars.getAccumulatorValue(0) & executionVars.getAccumulatorValue(1), true);
				},
				or: (executionVars, registers) => {
					executionVars.loadIntoAccumulator(executionVars.getAccumulatorValue(0) | executionVars.getAccumulatorValue(1), true);
				},
				xor: (executionVars, registers) => {
					executionVars.loadIntoAccumulator(executionVars.getAccumulatorValue(0) ^ executionVars.getAccumulatorValue(1), true);
				},

				add: (executionVars, registers) => {
					executionVars.loadIntoAccumulator(executionVars.getAccumulatorValue(0) + executionVars.getAccumulatorValue(1), true);
				},
				bitShift: (executionVars, registers) => {
					console.log("TODO: adapt for joined accumulators");
					const accumulators = registers.accumulators;
					const id = registers.currentAccumulator * 2;

					// Format of the bits: [0-1: Mode, 2: unused, 3: sign and 4-7: amount]
					const mode = Math.floor(accumulators[id + 1] / 64); // First 2 bits
					const amount = accumulators[id + 1] % 16; // Last 4 bytes
					const isLeft = Math.floor((accumulators[id + 1] % 32) / 16) == 1; // The 5th byte from the last

					let bits = accumulators[id].toString(2).split("");
					for (let i = 0; i < amount; i++) {
						let insertValue;
						if (mode == 1) insertValue = "0";
						else if (mode == 2) insertValue = "1";
						
						if (isLeft) {
							if (mode == 0) insertValue = bits[0];
							bits.splice(0, 1);
							bits.push(insertValue);
						}
						else {
							if (mode == 0) insertValue = bits[bits.length - 1];
							bits.splice(0, 0, insertValue);
							bits.pop();
						}
					}
					accumulators[id] = parseInt(bits.join(""), 2);

					registers.currentAccumulatorByte = 0;
				},

				joinAcc: (executionVars, registers, instructionID) => {
					const accumulatorID = instructionID - 18;
					const values = [
						executionVars.getAccumulatorValue(0, accumulatorID),
						executionVars.getAccumulatorValue(1, accumulatorID)
					];
					registers.joinedAccumulators[accumulatorID] = true;
					executionVars.loadIntoAccumulator(values[0], true);
					executionVars.loadIntoAccumulator(values[1]);
					registers.currentAccumulatorByte = 0;
				},
				unjoinAcc: (executionVars, registers, instructionID) => {
					const accumulatorID = instructionID - 20;
					const values = [
						executionVars.getAccumulatorValue(0, accumulatorID),
						executionVars.getAccumulatorValue(1, accumulatorID)
					];
					registers.joinedAccumulators[accumulatorID] = false;
					executionVars.loadIntoAccumulator(values[0], true);
					executionVars.loadIntoAccumulator(values[1]);
					registers.currentAccumulatorByte = 0;
				},

				skipUnless: (executionVars, registers) => {
					if (registers.accumulators[registers.currentAccumulator * 2] % 2 == 0) {
						registers.programCounter++;
						const instructionID = executionVars.decodeNextInstructionType();
						const nextArgsCount = executionVars.totalArgumentLengths[
							config.instructionSet.mappings[instructionID]
						];
						registers.programCounter += nextArgsCount + config.instructionSet.instructionCodeLength;
						return true;
					}
				},
				jump: (executionVars, registers) => {
					const RAM = executionVars.state.RAM;

					const address = (RAM[registers.programCounter + 1] * 256) + RAM[registers.programCounter + 2];
					registers.programCounter = address;
					return true;
				},
				jumpDyn: (executionVars, registers) => {
					const RAM = executionVars.state.RAM;

					const address = (RAM[registers.programCounter + 1] * 256) + RAM[registers.programCounter + 2];
					registers.programCounter = RAM[(RAM[address] * 256) + RAM[address + 1]];
					return true;
				},
				
				writeConst: (executionVars, registers) => {
					const RAM = executionVars.state.RAM;

					const value = RAM[registers.programCounter + 1];
					const address = (RAM[registers.programCounter + 2] * 256) + RAM[registers.programCounter + 3];
					RAM[address] = value;

					registers.programCounter += 3;
				},
				writeAcc: (executionVars, registers) => {
					const RAM = executionVars.state.RAM;

					const value = executionVars.getAccumulatorValue(0);
					const address = (RAM[registers.programCounter + 1] * 256) + RAM[registers.programCounter + 2];
					RAM[address] = value;

					registers.programCounter += 2;
				},
				writeAccDyn: (executionVars, registers) => {
					const RAM = executionVars.state.RAM;

					const value = executionVars.getAccumulatorValue(0);
					const indirectAddress = (RAM[registers.programCounter + 1] * 256) + RAM[registers.programCounter + 2];
					const address = RAM[(RAM[indirectAddress] * 256) + RAM[indirectAddress + 1]];
					RAM[address] = value;

					registers.programCounter += 2;
				}
			},
			totalArgumentLengths: {
				// V1
				stop: 0,
				loadIntoAccumulator: 11,
				conditionalJumpToElse: 11,
				writeAccumulatorBitRAM: 11,

				// V1.1
				"loadIntoAccumulator1.1": 20,
				"conditionalJumpToElse1.1": 20,
				"writeAccumulatorBitRAM1.1": 20,

				// V2
				switchAcc: 0,
				loadConst: 1,
				loadRAM: 2,
				loadDynRAM: 2,
				copyAccBetween: 0,
				not: 0,
				and: 0,
				or: 0,
				xor: 0,
				add: 0,
				bitShift: 0,
				joinAcc: 0,
				unjoinAcc: 0,
				skipUnless: 0,
				jump: 2,
				jumpDyn: 2,
				writeConst: 3,
				writeAcc: 2,
				writeDyn: 2
			},
			instructionInfo: { // Only used for the debug display
				// V1.0
				stop: {
					name: "Stop",
					arguments: []
				},
				loadIntoAccumulator: {
					name: "Load > Acc",
					arguments: [8, 3]
				},
				conditionalJumpToElse: {
					name: "Jump if",
					arguments: [8, 3]
				},
				writeAccumulatorBitRAM: {
					name: "Write > RAM",
					arguments: [8, 3]
				},

				// V1.1
				"loadIntoAccumulator1.1": {
					name: "Load > Acc",
					arguments: [16, 4]
				},
				"conditionalJumpToElse1.1": {
					name: "Jump if",
					arguments: [16, 4]
				},
				"writeAccumulatorBitRAM1.1": {
					name: "Write > RAM",
					arguments: [16, 4]
				},

				// V2.0
				switchAcc: {
					name: "Switch accumulator",
					arguments: []
				},

				loadConst: {
					name: "Load const",
					arguments: [1]
				},
				loadRAM: {
					name: "Load RAM",
					arguments: [2]
				},
				loadDynRAM: {
					name: "Load dynamic RAM",
					arguments: [2]
				},

				copyAccTo: {
					name: "Copy accumulator > accumulator",
					arguments: []
				},

				not: {
					name: "Not",
					arguments: []
				},
				and: {
					name: "And",
					arguments: []
				},
				or: {
					name: "Or",
					arguments: []
				},
				xor: {
					name: "XOR",
					arguments: []
				},

				add: {
					name: "Add",
					arguments: []
				},
				bitShift: {
					name: "Bitshift",
					arguments: []
				},

				joinAcc: {
					name: "Join accumulators",
					arguments: []
				},
				unjoinAcc: {
					name: "Unjoin accumulators",
					arguments: []
				},

				skipUnless: {
					name: "Skip unless",
					arguments: []
				},
				jump: {
					name: "Jump",
					arguments: [2]
				},
				jumpDyn: {
					name: "Dynamic jump",
					arguments: [2]
				},

				writeConst: {
					name: "Write const > RAM",
					arguments: [1, 2]
				},
				writeAcc: {
					name: "Write accumulator > RAM",
					arguments: [2]
				},
				writeDyn: {
					name: "Write dynamic > RAM",
					arguments: [2]
				}
			},
			instructionSets: {
				"1.0": {
					mappings: [
						"stop",
						"loadIntoAccumulator",
						"conditionalJumpToElse",
						"writeAccumulatorBitRAM"
					],
					instructionCodeLength: 4,
					initRegisters: _ => ({
						accumulator: new Array(8).fill("0")
					}),
					ramIsBytes: false
				},
				"1.1": {
					mappings: [
						"stop",
						"loadIntoAccumulator1.1",
						"conditionalJumpToElse1.1",
						"writeAccumulatorBitRAM1.1"
					],
					instructionCodeLength: 2,
					initRegisters: _ => ({
						accumulator: new Array(16).fill("0")
					}),
					ramIsBytes: false
				},
				"2.0": {
					mappings: [
						"stop",

						"switchAcc",
						"switchAcc",
						"switchAcc",
						"switchAcc",

						"loadConst",
						"loadRAM",
						"loadDynRAM",

						"copyAccTo",
						"copyAccTo",
						"copyAccTo",
						"copyAccTo",

						"not",
						"and",
						"or",
						"xor",

						"add",
						"bitShift",

						"joinAcc",
						"joinAcc",
						"unjoinAcc",
						"unjoinAcc",

						"skipUnless",
						"jump",
						"jumpDyn",
						
						"writeConst",
						"writeAcc",
						"writeAccDyn"
					],
					instructionCodeLength: 1,
					initRegisters: _ => ({
						accumulators: new Uint8Array(8), // 2 values in 4 accumulators
						currentAccumulator: 0,
						currentAccumulatorByte: 0,
						joinedAccumulators: [false, false],
						joinedAccumulatorValues: new Uint16Array(4) // 2 values in 2 joined accumulators
					}),
					ramIsBytes: true
				}
			},
			state: {
				running: false,
				RAM: null,
				registers: null
			},
			program: null,

			parseProgram: program => { // Do some really basic parsing to remove spaces and comments
				// Find the instruction set specified in the file
				let keyword = "#InstructionSet ";
				let index = program.indexOf(keyword);

				let name, instructionSet;
				if (index == -1) {
					alert("No instruction set specified in program. Specify one by putting \"#InstructionSet <name>\" at the top of the program file.");
					return;
				}
				else {
					name = program.slice(index + keyword.length, program.indexOf("\n", index + keyword.length));
					instructionSet = game.vars.execution.instructionSets[name];
					if (instructionSet == null) {
						alert(`Invalid instruction set of ${JSON.stringify(name)}.`);
						return;
					}
				}


				const parsed = program.split("\r\n").join("\n").split("\n").map(value => (
					value.replaceAll(" ", "").replaceAll("  ", "")
				)).filter(value => (
					! value.split("").some(character => ! "01".includes(character)) // Exlude lines that have something other than a 0 or a 1 in them
				)).join("");
				if (instructionSet.ramIsBytes) {
					if (parsed.length % 8 != 0) {
						alert(`Program binary length must be a multiple of 8, as this instruction set uses bytes instead of bits. It's ${parsed.length} bytes long.`);
						return;
					}
				}

				return [parsed, name, instructionSet];
			},
			loadProgram: ([program, name, instructionSet]) => {
				let state = game.vars.execution.state;
				const maxSize = config.RAMInBytes * 8;
				if (program.length > maxSize) {
					alert(`Program is too big. At least ${program.length} ${instructionSet.ramIsBytes? "bytes" : "bits"} of RAM are needed to store it. Try increasing the amount of RAM.`);
					return;
				}

				game.vars.execution.program = program;
				config.instructionSetName = name;
				config.instructionSet = instructionSet;
				game.vars.execution.resetRAM();
				
				if (config.instructionSet.ramIsBytes) {
					let c = 0;
					for (let i = 0; i < program.length; i += 8) {
						state.RAM[c] = parseInt(program.slice(i, i + 8), 2);
						c++;
					}
				}
				else {
					for (let i in program) {
						state.RAM[i] = program[i];
					}
				}
			},
			reloadProgram: _ => {
				const execution = game.vars.execution;
				if (execution.program) {
					execution.loadProgram(execution.program);
				}
				execution.resetRegisters();
				execution.beginExecution();
			},
			resetProgramCounter: _ => {
				game.vars.execution.state.registers.programCounter = 0;
			},
			resetRAM: _ => {
				if (config.instructionSet.ramIsBytes) {
					config.RAMAmount = config.RAMInBytes;
					game.vars.execution.state.RAM = new Uint8Array(config.RAMAmount);
				}
				else {
					config.RAMAmount = config.RAMInBytes * 8;
					game.vars.execution.state.RAM = new Array(config.RAMAmount).fill("0");
				}
			},
			resetRegisters: _ => {
				game.vars.execution.state.registers = {
					programCounter: 0,
					instruction: null,
					...(config.instructionSet? config.instructionSet.initRegisters() : {})
				};
			},
			beginExecution: _ => {
				const execution = game.vars.execution;
				if (execution.program == null) return;

				execution.state.running = true;
				game.vars.executionTick = 1;

				let pauseButton = game.game.sprites[15];
				let pauseElement = pauseButton.vars.element;
				pauseElement.onClick(pauseElement, pauseButton, true);
			},
			pauseExecution: _ => {
				game.vars.execution.state.running = false;

				let pauseButton = game.game.sprites[15];
				let pauseElement = pauseButton.vars.element;
				pauseElement.onClick(pauseElement, pauseButton, true);
			},
			tick: _ => {
				let executionVars = game.vars.execution;
				let state = executionVars.state;
				let registers = state.registers;

				let instructionID = executionVars.decodeNextInstructionType();

				const instructionName = config.instructionSet.mappings[instructionID];
				if (instructionName == null) {
					alert(`Invalid instruction ${registers.instruction} (ID: ${instructionID}) at address ${registers.programCounter}.`);
					state.running = false;
					return;
				}
				const code = executionVars.instructionCode[instructionName];
				if (code == null) {
					alert(`Invalid instruction mapping for instruction set ${config.instructionSetName} for code ${registers.instruction} (ID: ${instructionID}).`);
					state.running = false;
					return;
				}

				{ // For debugging
					let address = registers.programCounter;
					let line = address + ") ";
					let instructionInfo = executionVars.instructionInfo[instructionName];
					line += instructionInfo.name;

					address += config.instructionSet.instructionCodeLength;
					for (let i in instructionInfo.arguments) {
						let length = instructionInfo.arguments[i];
						let value = state.RAM.slice(address, address + length);

						let c = 0;
						while (c < value.length) {
							if (c != 0 && c % 4 == 0) {
								value[c - 1] += " ";
							}
							c++;
						}

						line += " | " + value.join("");
						address += length;
					}

					let debugDisplay = game.get.sprite("MemoryHistory");
					let instructionHistory = debugDisplay.vars.instructionHistory;
					instructionHistory.push(line);
					let itemHeight = debugDisplay.height / (instructionHistory.length - 1);
					if (instructionHistory.length > 1 && instructionHistory.length * itemHeight >= debugDisplay.vars.instructionHistoryMaxHeight) {
						instructionHistory.splice(0, 1);
					}
				}


				let output = code(executionVars, registers, instructionID);
				if (! output) {
					registers.programCounter += config.instructionSet.instructionCodeLength;
				}
			},
			decodeNextInstructionType: _ => {
				let executionVars = game.vars.execution;
				let state = executionVars.state;
				let registers = state.registers;

				if (config.instructionSet.ramIsBytes) {
					registers.instruction = state.RAM.slice(
						registers.programCounter, registers.programCounter + config.instructionSet.instructionCodeLength
					).reduceRight((accumulator, current, index) => (
						accumulator + (current * Math.pow(256, index))
					), 0);
					return registers.instruction;
				}
				else {
					registers.instruction = state.RAM.slice(
						registers.programCounter,
						registers.programCounter + config.instructionSet.instructionCodeLength
					).join("");
					return parseInt(registers.instruction, 2);
				}
			},

			toggleAccumulatorByte: _ => {
				const registers = game.vars.execution.state.registers;
				registers.currentAccumulatorByte = (registers.currentAccumulatorByte + 1) % 2;
			},
			isAccumulatorJoined: _ => {
				const registers = game.vars.execution.state.registers;
				return registers.joinedAccumulators[Math.floor(registers.currentAccumulator / 2)];
			},
			loadIntoAccumulator: (value, isResult = false) => {
				const executionVars = game.vars.execution;
				const registers = executionVars.state.registers;

				if (isResult) registers.currentAccumulatorByte = 0;
				if (executionVars.isAccumulatorJoined()) {
					const id = registers.currentAccumulator + registers.currentAccumulatorByte; // The current accumulator will be either 0 or 2 here, so no need to multiply by 2
					registers.joinedAccumulatorValues[id] = value;
				}
				else {
					const id = (registers.currentAccumulator * 2) + registers.currentAccumulatorByte;
					registers.accumulators[id] = value;
				}
				if (isResult) registers.currentAccumulatorByte++;
			},
			getAccumulatorValue: (subValueIndex, accumulatorID) => {
				const executionVars = game.vars.execution;
				const registers = executionVars.state.registers;
				if (subValueIndex == null) subValueIndex = registers.currentAccumulatorByte;
				if (accumulatorID == null) accumulatorID = registers.currentAccumulator;

				if (executionVars.isAccumulatorJoined()) return registers.joinedAccumulatorsValues[accumulatorID + subValueIndex];
				return registers.accumulators[(registers.accumulatorID * 2) + subValueIndex];
			}
		},
		executionTick: 0
	},
	game: {
		scripts: {
			init: [
				{
					code: _ => {
						game.vars.execution.resetRegisters();
					},
					stateToRun: "main"
				}
			],
			main: [
				{
					code: _ => {
						if (game.vars.execution.state.running) {
							game.vars.executionTick += (config.display.visible? config.debugSpeed : config.clockSpeed) / 60;
							let cycles = Math.floor(game.vars.executionTick);
							let i = 0;
							while (i < cycles) {
								game.vars.execution.tick();
								if (! game.vars.execution.state.running) {
									break;
								}
								i++;
							}

							game.vars.executionTick -= cycles;
						}
					},
					stateToRun: "main"
				}
			]
		},
		assets: {
			imgs: [
				{
					id: "Upload",
					src: "assets/imgs/upload.png"
				},
				{
					id: "Hz",
					src: "assets/imgs/hz.png"
				},
				{
					id: "RAM",
					src: "assets/imgs/dedicatedWAM.png"
				},
				{
					id: "RAMDisplayMode",
					src: "assets/imgs/ramDisplayMode.png"
				},
				{
					id: "Pause",
					src: "assets/imgs/pause.png"
				},
				{
					id: "Resume",
					src: "assets/imgs/resume.png"
				},
				{
					id: "Restart",
					src: "assets/imgs/restart.png"
				},
				{
					id: "Visible",
					src: "assets/imgs/visible.png"
				},
				{
					id: "Invisible",
					src: "assets/imgs/invisible.png"
				}
			]
		},
		plugins: [
			{
				src: "assets/plugins/gui.js"
			}
		],
		sprites: [
			{
				type: "GUI",
				id: "Menu",
				submenu: "upload",
				submenus: {
					upload: {
						hoverText: {
							color: "white"
						},
						elements: [
							{
								type: "button",
								onClick: _ => {
									Bagel.upload(url => {
										let typeAndEncoding = url.split(":")[1].split(",")[0];
										let type = typeAndEncoding.split(";")[0];
										let contents = url.split(",");
										contents.splice(0, 1);
										contents = contents.join(",");

										if (type != "text/plain") {
											alert("Wrong file type. It should be text/plain.");
											return;
										}

										if (typeAndEncoding.includes("base64")) {
											contents = atob(contents);
										}
										let execution = game.vars.execution;

										const parsed = execution.parseProgram(contents);
										if (parsed == null) return;
										execution.loadProgram(parsed);
										execution.resetProgramCounter();
										execution.resetRegisters();
										execution.beginExecution();
										/*
										game.get.sprite("Menu").animateSubmenuChange("execution", {
											type: "circle",
											color: "yellow",
											initialSize: 150,
											x: game.width / 2,
											y: game.height / 2
										})
										*/
									});
									game.input.mouse.down = false;
								},
								onHover: "Upload a program to emulate",
								color: "yellow",
								icon: "Upload",
								iconSize: 0.6,
								size: 150
							},
							{
								type: "button",
								onClick: _ => {
									let input = prompt("Enter the new clock speed... (only applies when the debug displays are hidden)", config.clockSpeed);
									game.input.mouse.down = false;
									if (input != null) {
										input = parseFloat(input);
										if (isNaN(input)) {
											alert("That's not a number.");
										}
										else {
											config.clockSpeed = input;
										}
									}
								},
								onHover: "Override the clock speed of the emulated CPU",
								color: "lime",
								icon: "Hz",
								left: 25,
								top: 25,
								iconSize: 0.6,
								size: 75
							},
							{
								type: "button",
								onClick: _ => {
									let input = prompt("Enter the new amount of RAM... (in bytes)", config.RAMInBytes);
									game.input.mouse.down = false;
									if (input != null) {
										input = parseFloat(input);
										if (isNaN(input)) {
											alert("That's not a number.");
										}
										else {
											if (input == config.RAMInBytes) return;
											if (game.vars.execution.state.running) {
												alert("The new amount will apply on program change or reload.");
												game.input.mouse.down = false;
											}

											config.RAMInBytes = input; // It'll be used when the program is loaded
										}
									}
								},
								onHover: "Adjust the amount of RAM",
								color: "skyblue",
								icon: "RAM",
								left: 125,
								top: 25,
								iconSize: 0.6,
								size: 75
							},
							{
								type: "button",
								onClick: (element, sprite) => {
									config.display.RAMByteMode = ! config.display.RAMByteMode;
								},
								onHover: "Swap between displaying the RAM as bits and bytes",
								color: "orange",
								icon: "RAMDisplayMode",
								right: 800 - 5,
								top: 205,
								iconSize: 0.8,
								size: 50
							},
							{
								type: "button",
								onClick: (element, sprite) => {
									let iconSprite = sprite.vars.linkedElements[1];
									if (iconSprite.img == "Visible") {
										game.get.sprite("RAM_Display").visible = false;
										game.get.sprite("MemoryHistoryTitle").visible = false;
										game.get.sprite("MemoryHistory").visible = false;
										game.get.sprite("OtherDebugInfo").visible = false;

										iconSprite.img = "Invisible";
										element.onHover = "Show the debug displays";
										config.display.visible = false;
									}
									else {
										game.get.sprite("RAM_Display").visible = true;
										game.get.sprite("MemoryHistoryTitle").visible = true;
										game.get.sprite("MemoryHistory").visible = true;
										game.get.sprite("OtherDebugInfo").visible = true;
										config.display.visible = true;

										iconSprite.img = "Visible";
										element.onHover = "Hide the debug displays";
									}
								},
								onHover: "Hide the debug displays",
								color: "yellow",
								icon: "Visible",
								right: 740,
								top: 205,
								iconSize: 0.8,
								size: 50
							},

							{
								type: "button",
								onClick: (element, sprite, external) => {
									let iconSprite = sprite.vars.linkedElements[1];
									let execution = game.vars.execution;
									if (external !== true) { // It'll be the plugin object if it's not external
										if (execution.state.running) {
											execution.pauseExecution();
										}
										else {
											execution.beginExecution();
										}
									}

									if (execution.state.running) {
										iconSprite.img = "Pause";
										element.onHover = "Pause program execution";
									}
									else {
										iconSprite.img = "Resume";
										element.onHover = "Resume program execution";
									}
								},
								onHover: "Resume program execution",
								color: "orange",
								icon: "Resume",
								left: 25,
								bottom: 449 - 25,
								iconSize: 0.8,
								size: 75
							},
							{
								type: "button",
								onClick: (element, sprite) => {
									game.vars.execution.reloadProgram();
								},
								onHover: "Reload the current program",
								color: "yellow",
								icon: "Restart",
								left: 125,
								bottom: 449 - 25,
								iconSize: 0.8,
								size: 75
							}
						]
					}
				},
				stateToActivate: "main"
			},
			{
				type: "canvas",
				id: "RAM_Display",
				mode: "animated",
				fullRes: false,
				updateRes: false,
				vars: {
					lastRAMAmount: 0,
					byteMode: false
				},
				scripts: {
					init: [
						{
							code: me => {
								me.width = 200;
								me.height = 200;

								me.right = game.width - 1;
								me.top = 0;
							},
							stateToRun: "main"
						}
					]
				},
				render: (me, game, ctx, canvas) => {
					if (config.instructionSet == null) return;
					if (me.vars.lastRAMAmount != config.RAMAmount || me.vars.byteMode != config.display.RAMByteMode) {
						let minPixels = (config.display.RAMByteMode? (config.RAMAmount / 8) : config.RAMAmount);
						if (config.instructionSet.ramIsBytes) minPixels *= 8;

						const size = Math.ceil(Math.sqrt(minPixels));
						canvas.width = size;
						canvas.height = size;

						me.vars.lastRAMAmount = config.RAMAmount;
						me.vars.byteMode = config.display.RAMByteMode;
					}

					ctx.fillStyle = "blue";
					ctx.fillRect(0, 0, canvas.width, canvas.height);

					let ram = game.vars.execution.state.RAM;
					if (config.instructionSet.ramIsBytes) {
						if (me.vars.byteMode) {
							for (let i in ram) {	
								ctx.fillStyle = "rgb(" + [0, ram[i], 0] + ")";
								ctx.fillRect(i % canvas.width, Math.floor(i / canvas.width), 1, 1);
							}
						}
						else {
							for (let i in ram) {
								const byte = ram[i].toString(2).padStart(8, "0");
								for (let c = 0; c < byte.length; c++) {
									const x = ((i * 8) + c) % canvas.width;
									const y = Math.floor(((i * 8) + c) / canvas.width);
									if (byte[c] == "1") {
										ctx.fillStyle = "green";
										ctx.fillRect(x, y, 1, 1);
									}
									else {
										ctx.fillStyle = "black";
										ctx.fillRect(x, y, 1, 1);
									}
								}
							}
						}
					}
					else {
						if (me.vars.byteMode) {
							let i = 0;
							while (i < ram.length) {
								let value = game.vars.execution.binaryToDenary(ram.slice(i, i + 8));
	
								ctx.fillStyle = "rgb(" + [0, value, 0] + ")";
								ctx.fillRect((i / 8) % canvas.width, Math.floor((i / 8) / canvas.width), 1, 1);
								i += 8;
							}
						}
						else {
							for (let i in ram) {
								if (ram[i] == "1") {
									ctx.fillStyle = "green";
									ctx.fillRect(i % canvas.width, Math.floor(i / canvas.width), 1, 1);
								}
								else {
									ctx.fillStyle = "black";
									ctx.fillRect(i % canvas.width, Math.floor(i / canvas.width), 1, 1);
								}
							}
						}
					}
				},
				width: 1,
				height: 1
			},
			{
				type: "text",
				text: "Instruction History:",
				id: "MemoryHistoryTitle",
				bitmap: true,
				color: "#EFEFEF",
				top: 260,
				left: 599,
				size: 9.7,
				scripts: {
					init: [
						{
							code: null,
							stateToRun: "main"
						}
					]
				}
			},
			{
				type: "text",
				text: "",
				id: "MemoryHistory",
				bitmap: true,
				color: "#EFEFEF",
				wordWrapWidth: 200,
				size: 6,
				vars: {
					instructionHistory: [],
					instructionHistoryMaxHeight: 115,
					memoryHistory: []
				},
				scripts: {
					init: [
						{
							code: me => {
								me.vars.top = game.get.sprite("MemoryHistoryTitle").bottom + 5;
							},
							stateToRun: "main"
						}
					],
					main: [
						{
							code: me => {
								me.text = me.vars.instructionHistory.join("\n");
								me.top = me.vars.top;
								me.left = 599;
							},
							stateToRun: "main"
						}
					]
				}
			},
			{
				type: "text",
				text: "Program counter:\nAccumulator:\n",
				id: "OtherDebugInfo",
				bitmap: true,
				wordWrapWidth: 205,
				color: "#EFEFEF",
				left: 599,
				size: 7,
				scripts: {
					init: [
						{
							code: null,
							stateToRun: "main"
						}
					],
					main: [
						{
							code: me => {
								let registers = game.vars.execution.state.registers;
								let text = "Program counter: " + registers.programCounter + "\n";
								if (config.instructionSetName == "1.0" || config.instructionSetName == "1.1") {
									text += "Accumulator: ";
									text += registers.accumulator.map((value, index) => index != 0 && index % 4 == 0? " " + value : value).join("");
								}
								else if (config.instructionSetName == "2.0") {
									text += `Accumulator active: ${registers.currentAccumulator}\n`;
									const id = registers.currentAccumulator * 2;
									const bytes = [
										registers.accumulators[id].toString(2).padStart(8, "0"),
										registers.accumulators[id + 1].toString(2).padStart(8, "0")
									];
									text += `${bytes[0].slice(0, 4)} ${bytes[0].slice(4, 8)}\n`;
									text += `${bytes[1].slice(0, 4)} ${bytes[1].slice(4, 8)}`;
								}

								me.text = text;
								me.bottom = 439;
								me.left = 599;
							},
							stateToRun: "main"
						}
					]
				}
			}
		]
	},
	width: 800,
	height: 450,
	config: {
		display: {
			backgroundColor: "#202020"
		}
	}
});
