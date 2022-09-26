/*
TODO

How's best to improve the bitshift command? It depends on the second value in the accumulator, so might need a command to set that value up? Or just some combination of raw and a new denary command? Compile time maths?
Tidy up code
Error checking
*/

let game = (_ => {
	const memoryAddressLength = instructionSet => instructionSet.memoryAddressLength;
	const accAddressLength = instructionSet => instructionSet.accumulatorAddressLength;
	const simpleCommand = code => ({
		arguments: [],
		map: _ => code
	});
	const simpleArgs = (code, args) => ({
		arguments: args,
		map: (_, args) => code + args.join("")
	});

	return Bagel.init({
		id: "BagnaryCodeEmulator",
		state: "main",
		vars: {
			execution: {
				powers: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768],
				binaryToDenary: binary => {
					let total = 0;
					for (let i in binary) {
						if (binary[i] == "1") {
							total += game.vars.execution.powers[(binary.length - 1) - i];
						}
					}
					return total;
				},
				denaryToBinary: (denary, length) => {
					let binary = "";

					let powers = game.vars.execution.powers;
					let i = length - 1;
					while (i != -1) {
						if (denary >= powers[i]) {
							denary -= powers[i];
							binary += "1";
							if (denary == 0) {
								binary += "0".repeat(length - binary.length);
								break;
							}
						}
						else {
							binary += "0";
						}
						i--;
					}
					return binary;
				},
				instructions: {
					stop: {
						arguments: [],
						map: instructionSet => {
							if (instructionSet.name == "1.0") return "0000";
							else if (instructionSet.name == "1.1") return "00";
							return "0".repeat(8);
						}
					},
					loadAccBit: {
						arguments: [
							{
								type: "denary",
								convertTo: "binary",
								length: memoryAddressLength,
								binaryInsertOffset: instructionSet => instructionSet.instructionCodeLength
							},
							{
								type: "denary",
								convertTo: "binary",
								length: accAddressLength,
								binaryInsertOffset: instructionSet => instructionSet.instructionCodeLength + instructionSet.memoryAddressLength
							}
						],
						map: (instructionSet, arguments) => {
							let commandCode = instructionSet.name == "1.0"? "0001" : "01";
							return commandCode + arguments[0] + arguments[1];
						}
					},
					jumpIf: {
						arguments: [
							{
								type: "denary",
								convertTo: "binary",
								length: memoryAddressLength,
								binaryInsertOffset: instructionSet => instructionSet.instructionCodeLength
							},
							{
								type: "denary",
								convertTo: "binary",
								length: accAddressLength,
								binaryInsertOffset: instructionSet => instructionSet.instructionCodeLength + instructionSet.memoryAddressLength
							}
						],
						map: (instructionSet, arguments) => {
							let commandCode = instructionSet.name == "1.0"? "0010" : "10";
							return commandCode + arguments[0] + arguments[1];
						}
					},
					saveAccBit: {
						arguments: [
							{
								type: "denary",
								convertTo: "binary",
								length: memoryAddressLength,
								binaryInsertOffset: instructionSet => instructionSet.instructionCodeLength
							},
							{
								type: "denary",
								convertTo: "binary",
								length: accAddressLength,
								binaryInsertOffset: instructionSet => instructionSet.instructionCodeLength + instructionSet.memoryAddressLength
							}
						],
						map: (instructionSet, arguments) => {
							let commandCode = instructionSet.name == "1.0"? "0011" : "11";
							return commandCode + arguments[0] + arguments[1];
						}
					},

					// 2.0
					switchAccA: simpleCommand("00000001"),
					switchAccB: simpleCommand("00000010"),
					switchAccC: simpleCommand("00000011"),
					switchAccD: simpleCommand("00000100"),


					loadConst: simpleArgs("00000101", [{
						type: "denary",
						convertTo: "binary",
						length: 8,
						binaryInsertOffset: 8
					}]),
					loadRAM: simpleArgs("00000110", [{
						type: "denary",
						convertTo: "binary",
						length: 16,
						binaryInsertOffset: 8
					}]),
					loadDynRAM: simpleArgs("00000111", [{
						type: "denary",
						convertTo: "binary",
						length: 16,
						binaryInsertOffset: 8
					}]),

					copyAccToA: simpleCommand("00001000"),
					copyAccToB: simpleCommand("00001001"),
					copyAccToC: simpleCommand("00001010"),
					copyAccToD: simpleCommand("00001011"),


					not: simpleCommand("00001100"),
					and: simpleCommand("00001101"),
					or: simpleCommand("00001110"),
					xor: simpleCommand("00001111"),

					add: simpleCommand("00010000"),
					bitShift: simpleCommand("00010001"),

					joinAccAB: simpleCommand("00010010"),
					joinAccCD: simpleCommand("00010011"),

					unjoinAccAB: simpleCommand("00010100"),
					unjoinAccCD: simpleCommand("00010101"),

					skipUnless: simpleCommand("00010110"),
					jump: simpleArgs("00010111", [{
						type: "denary",
						convertTo: "binary",
						length: 16,
						binaryInsertOffset: 8
					}]),
					jumpDyn: simpleArgs("00011000", [{
						type: "denary",
						convertTo: "binary",
						length: 16,
						binaryInsertOffset: 8
					}]),
							
					writeConst: simpleArgs("00011001", [
						{
							type: "denary",
							convertTo: "binary",
							length: 8,
							binaryInsertOffset: 8
						},
						{
							type: "denary",
							convertTo: "binary",
							length: 16,
							binaryInsertOffset: 16
						}
					]),
					writeAcc: simpleArgs("00011010", [{
						type: "denary",
						convertTo: "binary",
						length: 16,
						binaryInsertOffset: 8
					}]),
					writeAccDyn: simpleArgs("00011011", [{
						type: "denary",
						convertTo: "binary",
						length: 16,
						binaryInsertOffset: 8
					}]),

					// Compile commands
					"#Pointer": {
						arguments: [
							{
								type: "text"
							},
							{
								type: "denary",
								optional: true
							}
						],
						map: (instructionSet, arguments, compileCommandIsArg, temporary, temporaryForThisCommand, currentLength) => {
							if (compileCommandIsArg) return "0".repeat(instructionSet.memoryAddressLength);
							else {
								if (! temporary.pointers) temporary.pointers = {};

								let name = arguments[0];
								if (temporary.pointers[name] == null) {
									temporary.pointers[name] = currentLength;
								}
								else {
									alert("Error: Pointer " + JSON.stringify(name) + " has already been defined.");
								}
							}
						},
						lateMap: (instructionSet, temporary, temporaryForThisCommand, arguments, compileCommandIsArg) => {
							if (compileCommandIsArg) {
								if (! temporary.pointers) temporary.pointers = {};

								let name = arguments[0];
								if (temporary.pointers[name] == null) {
									alert("Error: Pointer " + JSON.stringify(name) + " hasn't been set.");
								}
								else {
									let address = temporary.pointers[name];
									if (instructionSet.ramIsBytes) address /= 8;
									if (arguments[1]) address += arguments[1];

									return game.vars.execution.denaryToBinary(address, instructionSet.memoryAddressLength);
								}
							}
						}
					},
					"#Raw": {
						arguments: [
							{
								type: "text"
							}
						],
						map: (instructionSet, arguments) => {
							return arguments[0].split(" ").join("");
						}
					}
				},
				instructionSets: {
					"1.0": {
						instructionCodeLength: 4,
						accumulatorAddressLength: 3,
						memoryAddressLength: 8,
						ramIsBytes: false,
						used: [
							"stop",
							"loadAccBit",
							"jumpIf",
							"saveAccBit",

							"#Pointer",
							"#Raw"
						]
					},
					"1.1": {
						instructionCodeLength: 2,
						accumulatorAddressLength: 4,
						memoryAddressLength: 16,
						ramIsBytes: false,
						used: [
							"stop",
							"loadAccBit",
							"jumpIf",
							"saveAccBit",

							"#Pointer",
							"#Raw"
						]
					},
					"2.0": {
						instructionCodeLength: 8,
						accumulatorAddressLength: null,
						memoryAddressLength: 16,
						ramIsBytes: true,
						used: [
							"stop",
							"switchAcc",

							"loadConst",
							"loadRAM",
							"loadDynRAM",

							"copyAccTo",

							"not",
							"and",
							"or",
							"xor",

							"add",
							"bitShift",

							"joinAcc",
							"unjoinAcc",

							"skipUnless",
							"jump",
							"jumpDyn",
							
							"writeConst",
							"writeAcc",
							"writeAccDyn",

							"#Pointer",
							"#Raw"
						]
					}
				},

				assembleProgram: program => {
					let subFunctions = game.vars.execution;
					program = subFunctions.parseProgram(program);
					subFunctions.checkSyntax(program);
					let binary = subFunctions.assembleCommands(program);

					return "#InstructionSet " + program.instructionSetName + "\n" + binary;
				},
				parseProgram: program => {
					program = program.split("\r\n").join("\n");
					let parsed = {};

					const nextArgument = _ => {
						argumentID++;

						if (argumentID == commandInfo.arguments.length) {
							commandName = null;

							commands.push(command);
							command = [];
						}
					};

					// Find the instruction set specified in the file
					let keyword = "#InstructionSet ";
					let index = program.indexOf(keyword);
					if (index == -1) {
						alert("No instruction set specified in program. Specify one by putting \"#InstructionSet <name>\" at the top of the program file.");
						return;
					}
					else {
						let end = program.indexOf("\n", index + keyword.length);
						let hashClose = program.indexOf("#", index + keyword.length);
						if (hashClose != -1) {
							end = hashClose;
						}

						let name = program.slice(index + keyword.length, end);
						parsed.instructionSetName = name;
						parsed.instructionSet = game.vars.execution.instructionSets[name];
						if (parsed.instructionSet == null) {
							alert("Invalid instruction set " + JSON.stringify(name) + ".");
							return;
						}

						parsed.instructionSet.name = name;
						if (parsed.instructionSet == null) {
							alert("Invalid instruction set of " + JSON.stringify(name) + ".");
							return;
						}
					}
					let instructionNames = parsed.instructionSet.used;

					let lines = program.split("\n");
					let commands = [];
					let inMultiComment = false;
					let commandName, commandInfo, argumentID;

					let inCompileCommand = false;
					let compileCommandInfo, compileCommandName, compileArgumentID;

					let command = [];
					let i = 1;
					while (i < lines.length) {
						let line = lines[i];
						let lineNumber = parseInt(i) + 1;


						// Skip over whitespace
						let c = 0;
						while (line[c] == " " || line[c] == "   ") {
							c++;
						}

						let subCommand = "";
						while (c < line.length) {
							let nextTwo = line.slice(c, c + 2); // This might be only 1 long if it's the end of the line
							if (inMultiComment) {
								if (nextTwo == "*/") {
									inMultiComment = false;
									c += 2;
									continue;
								}
							}
							else {
								if (nextTwo == "/*") {
									inMultiComment = true;
									c += 2;
									continue;
								}
							}

							if (inMultiComment || nextTwo == "//") {
								break;
							}
							let endOfLine = c + 1 >= line.length;
							if (line[c] == "#") {
								if (subCommand != "") {
									command.push(subCommand);
									subCommand = "";

									if (inCompileCommand) {
										if (! instructionNames.includes(compileCommandName)) {
											alert(`Invalid instruction ${JSON.stringify(compileCommandName)} on line ${lineNumber}.`);
											return;
										}
									}
								}
								command.push("#");

								if (inCompileCommand) {
									if (command[0] == "#") { // Only run if this compile command isn't an argument
										commandName = null;

										commands.push(command);
										command = [];
									}
									else {
										nextArgument();
									}
									compileCommandName = null;
									inCompileCommand = false;
									break;
								}
								else {
									inCompileCommand = true;
								}
								c++;
								continue;
							}

							if (inCompileCommand? compileCommandName : commandName) {
								let args = (inCompileCommand? compileCommandInfo : commandInfo).arguments;
								let argumentJSON = args[inCompileCommand? compileArgumentID : argumentID];
								let noArgs = args.length == 0;

								if (! noArgs) {
									if (line[c] && ((! argumentJSON.hasOwnProperty("length")) || (line[c] != " " && line[c] != "    "))) {
										subCommand += line[c];
									}
								}
								if (endOfLine || noArgs) {
									command.push(subCommand);
									subCommand = "";
									if (inCompileCommand) {
										compileArgumentID++;
									}
									else {
										nextArgument();
									}
								}
							}
							else {
								let isSpace = line[c] == " " || line[c] == "    ";
								let firstSpace = isSpace && ((inCompileCommand && command[command.length - 1] == "#") || command.length == 0);
								if (line[c] && (! firstSpace)) {
									subCommand += line[c];
								}
								if (endOfLine || firstSpace) {
									if (subCommand) {
										command.push(subCommand);
										subCommand = "";
									}
									if (command.length != 0) {
										let newCommandName = command[command.length - 1];
										if (inCompileCommand) newCommandName = "#" + newCommandName;

										if (! instructionNames.includes(newCommandName)) {
											alert("Invalid instruction " + JSON.stringify(newCommandName) + " on line " + lineNumber + ".");
											return;
										}

										let info = game.vars.execution.instructions[newCommandName];
										if (info.arguments.length == 0 && (! inCompileCommand)) {
											commands.push(command);
											command = [];
										}
										else {
											if (inCompileCommand) {
												compileCommandName = newCommandName;
												compileCommandInfo = info;
												compileArgumentID = 0;
											}
											else {
												commandName = newCommandName;
												commandInfo = info;
												argumentID = 0;
											}
										}
									}
								}
							}
							c++;
						}
						i++;
					}

					parsed.commands = commands;
					return parsed;
				},
				checkSyntax: program => {
					// TODO
				},
				assembleCommands: program => {
					let generatedCode = [];
					let secondPassQueue = [];
					let temporary = {};

					for (let i in program.commands) {
						let command = program.commands[i];
						let temporaryForThisCommand = {};

						let output = game.vars.execution.assembleCommand(program.instructionSet, command, false, temporary, temporaryForThisCommand, secondPassQueue, generatedCode.length, -1);

						generatedCode.push(...output);
					}

					for (let i of secondPassQueue) {
						let code = i[0].lateMap;

						let output = code(program.instructionSet, temporary, i[1], i[2], i[5]);

						if (output) {
							if (output.length != i[3]) {
								alert("Error: The length of code returned from lateMap must be the same as that instance returned from map. " + output.length + " was returned but " + i[3] + " was expected.");
								return;
							}


							let offset = 0;
							if (i[7]) {
								let argumentID = i[6];
								let parentCommandJSON = game.vars.execution.instructions[i[7]];

								if (! parentCommandJSON.arguments[argumentID].hasOwnProperty("binaryInsertOffset")) {
									alert("Error: Command " + JSON.stringify(i[7]) + " doesn't support binary insertion for argument " + argumentID + ".");
									return;
								}
								offset = parentCommandJSON.arguments[argumentID].binaryInsertOffset;
								if (typeof offset == "function") {
									offset = offset(program.instructionSet);
								}
							}

							generatedCode.splice(i[4] + offset, output.length, ...output);
						}
					}

					return generatedCode.join("");
				},
				assembleCommand: (instructionSet, command, compileCommandIsArg, temporary, temporaryForThisCommand, secondPassQueue, totalGeneratedCodeLength, parentArgumentID, parentArgumentName) => {
					let generatedCode = "";
					let isOuterCompileConstant = command[0] == "#";
					let instructionName = isOuterCompileConstant? "#" + command[1] : command[0];
					let commandJSON = game.vars.execution.instructions[instructionName];

					let arguments = [];
					let i = isOuterCompileConstant + 1;
					let argumentID = 0;
					while (i < command.length) {
						let argumentJSON = commandJSON.arguments[argumentID];

						let value = command[i];
						let isCompileConstant = value == "#";
						if (isCompileConstant) {
							if (i == command.length - 1) break;
							let end = command.indexOf("#", i + 1);
							value = game.vars.execution.assembleCommand(instructionSet, command.slice(i, end + 1), true, temporary, temporaryForThisCommand, secondPassQueue, totalGeneratedCodeLength, argumentID, instructionName);
							i = end;
						}

						if (argumentJSON.type == "denary" && (! isCompileConstant)) {
							value = parseInt(value);
							if (argumentJSON.convertTo == "binary") {
								let length = argumentJSON.length;
								if (typeof length == "function") length = length(instructionSet);
								value = game.vars.execution.denaryToBinary(value, length);
							}
						}
						arguments.push(value);

						i++;
						argumentID++;
					}

					if (commandJSON.map) {
						let output = commandJSON.map(instructionSet, arguments, compileCommandIsArg, temporary, temporaryForThisCommand, totalGeneratedCodeLength);

						if (output != null) {
							for (let c in output) {
								generatedCode += output[c];
							}

							if (commandJSON.lateMap) {
								secondPassQueue.push([
									commandJSON,
									temporaryForThisCommand,
									arguments, // Arguments
									output.length,
									totalGeneratedCodeLength,
									compileCommandIsArg,
									parentArgumentID,
									parentArgumentName
								]);
							}
						}
					}

					return generatedCode;
				}
			}
		},
		game: {
			assets: {
				imgs: [
					{
						id: "Upload",
						src: "../assets/imgs/upload.png"
					}
				]
			},
			plugins: [
				{
					src: "../assets/plugins/gui.js"
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
											Bagel.download(
												execution.assembleProgram(contents),
												"program.txt"
											);
										});
										game.input.mouse.down = false;
									},
									onHover: "Upload a program to assemble",
									color: "yellow",
									icon: "Upload",
									iconSize: 0.6,
									size: 150
								}
							]
						}
					},
					stateToActivate: "main"
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
})();
