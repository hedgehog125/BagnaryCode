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
                        arguments: [],
                        map: instructionSet => {
                            if (instructionSet.name == "1.0") return "0000";
                            else return "00";
                        }
                    },
                    loadAccBit: {
                        arguments: [
                            {
                                type: "denary",
                                convertTo: "binary",
                                length: memoryAddressLength
                            },
                            {
                                type: "denary",
                                convertTo: "binary",
                                length: accAddressLength
                            }
                        ]
                    },
                    jumpIf: {
                        arguments: [
                            {
                                type: "denary",
                                convertTo: "binary",
                                length: memoryAddressLength
                            },
                            {
                                type: "denary",
                                convertTo: "binary",
                                length: accAddressLength
                            }
                        ]
                    },
                    saveAccBit: {
                        arguments: [
                            {
                                type: "denary",
                                convertTo: "binary",
                                length: memoryAddressLength
                            },
                            {
                                type: "denary",
                                convertTo: "binary",
                                length: accAddressLength
                            }
                        ]
                    },

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
                            if (compileCommandIsArg) return "0";
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
                        }
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

                            "#Pointer"
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

                            "#Pointer"
                        ]
                    }
                },

                assembleProgram: program => {
                    let subFunctions = game.vars.execution;
                    program = subFunctions.parseProgram(program);
                    subFunctions.checkSyntax(program);
                    let assembly = subFunctions.assembleCommands(program);

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
                            let nextTwo = line[c] + line[c + 1];
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
                                }
                                command.push("#");

                                if (inCompileCommand) {
                                    if (command[0] == "#") { // Only run if this compile command isn't an argument
                                        commandName = null;

                                        commands.push(command);
                                        command = [];
                                    }
                                    else {
                                        argumentID++;
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
                                        argumentID++;

                                        if (argumentID == commandInfo.arguments.length) {
                                            commandName = null;

                                            commands.push(command);
                                            command = [];
                                        }
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
                                        if (info.arguments.length == 0) {
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

                        let output = game.vars.execution.assembleCommand(program.instructionSet, command, false, temporary, temporaryForThisCommand);
                        let commandJSON = output[1];
                        if (commandJSON.lateMap) {
                            secondPassQueue.push([
                                commandJSON.lateMap,
                                temporaryForThisCommand,
                                output[2], // Arguments
                                output.length,
                                generatedCode.length
                            ]);
                        }

                        generatedCode.push(...output[0]);
                    }

                    for (let i of secondPassQueue) {
                        let code = i[0];
                        let output = code(program.instructionSet, i[1], i[2], temporary);

                        if (output) {
                            if (output.length != i[3]) {
                                alert("Error: The length of code returned from lateMap must be the same as that instance returned from map.");
                                return;
                            }
                            if (typeof output == "string") output = output.split("");
                            else if (! Array.isArray(output)) {
                                alert("Error: Wrong return type from lateMap.");
                                return;
                            }

                            generatedCode.splice(i[4], output.length, ...output);
                        }
                    }

                    return generatedCode.join("");
                },
                assembleCommand: (instructionSet, command, compileCommandIsArg, temporary, temporaryForThisCommand) => {
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
                        if (value == "#") {
                            if (i == command.length - 1) break;
                            let end = command.indexOf("#", i + 1);
                            value = game.vars.execution.assembleCommand(instructionSet, command.slice(i, end + 1), true, temporary, temporaryForThisCommand)[0];
                            i = end;
                        }

                        if (argumentJSON.convertTo == "binary") {
                            let length = argumentJSON.length;
                            if (typeof length == "function") length = length(instructionSet);
                            value = game.vars.execution.denaryToBinary(parseInt(value), length);
                        }
                        arguments.push(value);

                        i++;
                        argumentID++;
                    }

                    if (commandJSON.map) {
                        let output = commandJSON.map(instructionSet, arguments, compileCommandIsArg, temporary, temporaryForThisCommand, generatedCode.length);

                        if (output != null) {
                            if (typeof output != "string" && (! Array.isArray(output))) {
                                alert("Error: Wrong return type for map.");
                                return;
                            }
                            for (let c in output) {
                                generatedCode += output[c];
                            }
                        }
                    }

                    return [generatedCode, commandJSON, arguments];
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
