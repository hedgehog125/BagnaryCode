/*
TODO

More instruction sets
1.0 instruction set variation with 16 bit memory addresses
Fix error when pausing and reloading while no program is loaded
*/

const config = {
	RAMAmount: 256,
	RAMInBytes: 256,
	clockSpeed: 1,
	instructionSetVersion: 1,
	display: {
		RAMByteMode: false
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
				}
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
						"stop"
					],
					instructionCodeLength: 1,
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


				const parsed = program.split("\n").map(value => (
					value.replaceAll(" ", "").replaceAll("  ", "")
				)).filter(value => (
					! value.split("").some(character => ! "01".includes(character)) // Exlude lines that have something other than a 0 or a 1 in them
				)).join("");
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
				
				console.log("TODO: handle storing when is bytes. Also handle not multiple of 8")
				for (let i in program) {
					state.RAM[i] = program[i];
				}
			},
			reloadProgram: _ => {
				let execution = game.vars.execution;
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
				game.vars.execution.state.running = true;
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
				registers.instruction = state.RAM.slice(registers.programCounter, registers.programCounter + config.instructionSet.instructionCodeLength).join("");

				let instructionName = config.instructionSet.mappings[parseInt(registers.instruction, 2)];
				if (instructionName == null) {
					alert(`Invalid instruction ${registers.instruction} at address ${registers.programCounter}.`);
					state.running = false;
					return;
				}
				let code = executionVars.instructionCode[instructionName];
				if (code == null) {
					alert("Invalid instruction mapping for instruction set " + config.instructionSetName + " for code " + registers.instruction + ".");
					state.running = false;
					return;
				}

				// For debugging
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

				let output = code(executionVars, registers);
				if (! output) {
					registers.programCounter += config.instructionSet.instructionCodeLength;
				}
			}
		},
		executionTick: 0,
		flashWarningLevel: 0,
		flashWarningIfNeeded: showing => {
			let level = game.vars.flashWarningLevel;
			if (level == 0) {
				return true;
			}
			else if (level == 1) {
				game.input.mouse.down = false;
				if (showing) {
					return confirm("This may produce slight flashes in the debug display at this clock speed. Continue?");
				}
				return confirm("This may produce slight flashes in the debug display. Continue?");
			}
			else {
				game.input.mouse.down = false;
				if (showing) {
					return confirm("This will produce many flashes in the debug display at this clock speed. Continue?");
				}
				return confirm("This will produce many flashes in the debug display. Continue?");
			}
		}
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
							game.vars.executionTick += config.clockSpeed / 60;
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
										execution.loadProgram(execution.parseProgram(contents));
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
									let input = prompt("Enter the new clock speed...", config.clockSpeed);
									game.input.mouse.down = false;
									if (input != null) {
										input = parseFloat(input);
										if (isNaN(input)) {
											alert("That's not a number.");
										}
										else {
											let flashiness = 0;
											if (input >= 17) {
												if (input >= 30) {
													flashiness = 2;
												}
												else {
													flashiness = 1;
												}
											}
											game.vars.flashWarningLevel = flashiness;
											if (game.vars.flashWarningIfNeeded()) {
												config.clockSpeed = input;
											}
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
									}
									else {
										if (game.vars.flashWarningIfNeeded(true)) {
											game.get.sprite("RAM_Display").visible = true;
											game.get.sprite("MemoryHistoryTitle").visible = true;
											game.get.sprite("MemoryHistory").visible = true;
											game.get.sprite("OtherDebugInfo").visible = true;

											iconSprite.img = "Visible";
											element.onHover = "Hide the debug displays";
										}
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
					if (me.vars.lastRAMAmount != config.RAMAmount || me.vars.byteMode != config.display.RAMByteMode) {
						canvas.width = Math.ceil(Math.sqrt(config.display.RAMByteMode? (config.RAMAmount / 8) : config.RAMAmount));
						canvas.height = canvas.width;

						me.vars.lastRAMAmount = config.RAMAmount;
						me.vars.byteMode = config.display.RAMByteMode;
					}

					ctx.fillStyle = "blue";
					ctx.fillRect(0, 0, canvas.width, canvas.height);

					let ram = game.vars.execution.state.RAM;
					if (me.vars.byteMode) {
						let i = 0;
						while (i < ram.length) {
							let value = game.vars.execution.binaryToDenary(ram.slice(i, i + 8));

							/*
							value = (value / 255) * 16777215;
							let r = Math.floor(value / (256 * 256));
							value %= 256 * 256;
							let g = Math.floor(value / 256);
							value %= 256;
							let b = value;
							*/


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
				size: 9,
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
								text += "Accumulator: ";
								if (config.instructionSetName == "1.0" || config.instructionSetName == "1.1") {
									text += registers.accumulator.map((value, index) => index != 0 && index % 4 == 0? " " + value : value).join("");
								}
								else {
									text += "Can't display";
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
