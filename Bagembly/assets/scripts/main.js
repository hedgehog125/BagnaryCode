/*
TODO

Raw binary support. Use special character?
Parsing doesn't think the stuff at the end is invalid for some reason?
*/

let game = (_ => {
    let memoryAddressLength = instructionSet => instructionSet.memoryAddressLength;
    let accAddressLength = instructionSet => instructionSet.accumulatorAddressLength;

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
                            if (denary == 0) break;
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
                        arguments: []
                    },
                    loadAccBit: {
                        arguments: [memoryAddressLength, accAddressLength]
                    },
                    jumpIf: {
                        arguments: [memoryAddressLength, accAddressLength]
                    },
                    saveAccBit: {
                        arguments: [memoryAddressLength, accAddressLength]
                    },

                    // Compile constants
                    "#Pointer": {
                        arguments: [-1]
                    },
                    "#InstructionSet": { // Doesn't do anything here
                        arguments: [-1]
                    }
                },
                instructionSets: {
                    "1.0": {
                        instructionCodeLength: 4,
                        accumulatorAddressLength: 3,
                        memoryAddressLength: 8,
                        used: [
                            "stop",
                            "loadAccBit",
                            "jumpIf",
                            "saveAccBit",

                            "#Pointer",
                            "#InstructionSet"
                        ]
                    },
                    "1.1": {
                        instructionCodeLength: 2,
                        accumulatorAddressLength: 4,
                        memoryAddressLength: 16,
                        used: [
                            "stop",
                            "loadAccBit",
                            "jumpIf",
                            "saveAccBit",

                            "#Pointer",
                            "#InstructionSet"
                        ]
                    }
                },

                assembleProgram: program => {
                    let subFunctions = game.vars.execution;
                    program = subFunctions.parseProgram(program);
                    let assembly = subFunctions.assembleCommands(program);
                    assembly = subFunctions.compileConstants(program, assembly);

                    debugger
                    return assembly;
                },
                parseProgram: program => {
                    let parsed = {};

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
                            alert("Invalid instruction set of " + JSON.stringify(name) + ".");
                            return;
                        }
                    }
                    let instructionNames = parsed.instructionSet.used;

                    let lines = program.split("\n");
                    let commands = [];
                    let lineNumbers = [];
                    let inMultiComment = false;
                    let commandName, commandInfo, argumentID;
                    let command = [];
                    for (let i in lines) {
                        let line = lines[i];
                        let inCompileCommand = false;

                        // Skip over whitespace
                        let c = 0;
                        while (line[c] == " " || line[c] == "   ") {
                            c++;
                        }

                        let subCommand = "";
                        while (c < line.length) {
                            let nextTwo = line[c] + line[c + 1];
                            if (inMultiComment) {
                                if (nextTwo == "*/") {
                                    inMultiComment = false;
                                    c += 2;
                                }
                            }
                            else {
                                if (nextTwo == "/*") {
                                    inMultiComment = true;
                                    c += 2;
                                }
                            }

                            if (inMultiComment || nextTwo == "//") {
                                if (nextTwo == "//") {
                                    break;
                                }
                                else {
                                    c++;
                                }
                                continue;
                            }
                            if (line[c] == "#") {
                                if (! inCompileCommand) {
                                    command.push("#");
                                }
                                inCompileCommand = ! inCompileCommand;
                                c++;
                                continue;
                            }

                            let endOfLine = c + 1 >= line.length;
                            if (commandName) {
                                let argumentLength = commandInfo.arguments[argumentID];
                                if (typeof argumentLength == "function") {
                                    argumentLength = argumentLength(parsed.instructionSet);
                                }

                                if (argumentLength == -1) { // Text. Unknown length
                                    if (endOfLine) {
                                        argumentID++;
                                        if (argumentID == commandInfo.arguments.length) {
                                            commandName = null;

                                            command = [];
                                            commands.push(command);
                                            lineNumbers.push(parseInt(i));
                                        }
                                    }
                                    else {
                                        subCommand += line[c];
                                    }
                                }
                                else {
                                    if (line[c] != " " && line[c] != "  ") {
                                        subCommand += line[c];
                                    }
                                    if (subCommand.length == argumentLength) {
                                        command.push(subCommand);
                                        subCommand = "";

                                        argumentID++;
                                        if (argumentID == commandInfo.arguments.length) {
                                            commandName = null;

                                            command = [];
                                            commands.push(command);
                                            lineNumbers.push(parseInt(i));
                                        }
                                    }
                                }
                            }
                            else {
                                if (line[c] == " " || line[c] == "  " || endOfLine) {
                                    if (endOfLine && c + 1 == line.length) {
                                        subCommand += line[c];
                                    }
                                    if (subCommand.length != 0) {
                                        command.push(subCommand);
                                        subCommand = "";

                                        commandName = command.join("");
                                        commandInfo = game.vars.execution.instructions[commandName];
                                        argumentID = 0;

                                        if (! instructionNames.includes(commandName)) {
                                            alert("Invalid instruction " + JSON.stringify(commandName) + " on line " + (parseInt(i) + 1) + ".");
                                            return;
                                        }
                                    }
                                }
                                else {
                                    subCommand += line[c];
                                }
                            }
                            c++;
                        }
                    }

                    parsed.commands = commands;
                    parsed.lineNumbers = lineNumbers;
                    return parsed;
                },
                assembleCommands: program => {
                    for (let i in program.commands) {
                        let command = program.commands[i];
                        let instructionName = command[0];

                        let compileConstant = instructionName == "#";
                        if (compileConstant) continue;
                    }
                },
                compileConstants: (program, assembly) => { // Calculate the values of the compile constants

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
