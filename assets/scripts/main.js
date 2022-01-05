/*
TODO

More instruction sets
1.0 instruction set variation with 16 bit memory addresses
Fix error when pausing and reloading while no program is loaded
*/

const config = {
    RAMAmount: 256,
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
            binaryToDenary: binary => {
                let powers = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
                let total = 0;
                for (let i in binary) {
                    if (binary[i] == "1") {
                        total += powers[(binary.length - 1) - i];
                    }
                }
                return total;
            },
            instructionCode: {
                stop: (executionVars, register) => { // Stop the program
                    executionVars.pauseExecution();
                    return true;
                },

                // V1
                loadIntoAccumulator: (executionVars, register) => { // Load address into the accumulator
                    let state = executionVars.state;
                    let address = state.RAM.slice(register.programCounter + 4, register.programCounter + 12);
                    address = executionVars.binaryToDenary(address);
                    let bitID = executionVars.binaryToDenary(state.RAM.slice(register.programCounter + 12, register.programCounter + 15));

                    register.accumulator[bitID] = state.RAM[address];
                    register.programCounter += 8 + 3; // The next instruction is actually a value, which is double the length of an instruction code and skip over the bit number
                },
                conditionalJumpToElse: (executionVars, register) => { // Conditional jump to else continue
                    let bitID = executionVars.binaryToDenary(executionVars.state.RAM.slice(register.programCounter + 12, register.programCounter + 15));
                    if (register.accumulator[bitID] == "0") {
                        register.programCounter += 8 + 3; // Skip over the value that stores the conditional jump to adddress
                    }
                    else {
                        let value = executionVars.binaryToDenary(executionVars.state.RAM.slice(register.programCounter + 4, register.programCounter + 12));
                        register.programCounter = value;
                        return true;
                    }
                },
                writeAccumulatorBitRAM: (executionVars, register) => { // Write accumulator bit to RAM
                    let state = executionVars.state;
                    let address = executionVars.binaryToDenary(state.RAM.slice(register.programCounter + 4, register.programCounter + 12));
                    let bitID = executionVars.binaryToDenary(state.RAM.slice(register.programCounter + 12, register.programCounter + 15));
                    executionVars.state.RAM[address] = register.accumulator[bitID];
                    register.programCounter += 8 + 3; // Skip over the value that stores the address and that stores the bit number
                },

                // V1.1
                "loadIntoAccumulator1.1": (executionVars, register) => { // Load address into the accumulator
                    let state = executionVars.state;
                    let address = state.RAM.slice(register.programCounter + 2, register.programCounter + 18);
                    address = executionVars.binaryToDenary(address);
                    let bitID = executionVars.binaryToDenary(state.RAM.slice(register.programCounter + 18, register.programCounter + 22));

                    register.accumulator[bitID] = state.RAM[address];
                    register.programCounter += 16 + 4; // Skip over the values
                },
                "conditionalJumpToElse1.1": (executionVars, register) => { // Conditional jump to else continue
                    let state = executionVars.state;
                    let bitID = executionVars.binaryToDenary(state.RAM.slice(register.programCounter + 18, register.programCounter + 22));
                    if (register.accumulator[bitID] == "0") {
                        register.programCounter += 16 + 4; // Skip over the values
                    }
                    else {
                        let value = executionVars.binaryToDenary(state.RAM.slice(register.programCounter + 2, register.programCounter + 18));
                        register.programCounter = value;
                        return true;
                    }
                },
                "writeAccumulatorBitRAM1.1": (executionVars, register) => { // Write accumulator bit to RAM
                    let state = executionVars.state;
                    let address = executionVars.binaryToDenary(state.RAM.slice(register.programCounter + 2, register.programCounter + 18));
                    let bitID = executionVars.binaryToDenary(state.RAM.slice(register.programCounter + 18, register.programCounter + 22));
                    executionVars.state.RAM[address] = register.accumulator[bitID];
                    register.programCounter += 16 + 4; // Skip over the value that stores the address and that stores the bit number
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
                    mappings: {
                        "0000": "stop",
                        "0001": "loadIntoAccumulator",
                        "0010": "conditionalJumpToElse",
                        "0011": "writeAccumulatorBitRAM"
                    },
                    instructionCodeLength: 4,
                    accumulatorSize: 8
                },
                "1.1": {
                    mappings: {
                        "00": "stop",
                        "01": "loadIntoAccumulator1.1",
                        "10": "conditionalJumpToElse1.1",
                        "11": "writeAccumulatorBitRAM1.1"
                    },
                    instructionCodeLength: 2,
                    accumulatorSize: 16
                }
            },
            state: {
                running: false,
                RAM: new Array(config.RAMAmount).fill("0"),
                register: {
                    programCounter: 0,
                    instruction: "0".repeat(4),
                    accumulator: new Array(8).fill("0")
                }
            },
            program: null,

            parseProgram: program => { // Do some really basic parsing to remove spaces and comments
                // Find the instruction set specified in the file
                let keyword = "#InstructionSet ";
                let index = program.indexOf(keyword);
                if (index == -1) {
                    alert("No instruction set specified in program. Specify one by putting \"#InstructionSet <name>\" at the top of the program file.");
                    return;
                }
                else {
                    let name = program.slice(index + keyword.length, program.indexOf("\n", index + keyword.length));
                    config.instructionSetName = name;
                    config.instructionSet = game.vars.execution.instructionSets[name];
                    if (config.instructionSet == null) {
                        alert("Invalid instruction set of " + JSON.stringify(name) + ".");
                        return;
                    }
                }


                return program.split("\n").map(value => (
                    value.replaceAll(" ", "").replaceAll("  ", "")
                )).filter(value => (
                    ! value.split("").some(character => ! "01".includes(character)) // Exlude lines that have something other than a 0 or a 1 in them
                )).join("");
            },
            loadProgram: program => {
                let state = game.vars.execution.state;
                if (program.length > state.RAM.length) {
                    alert("Program is too big. At least " + program.length + " bits of RAM are needed to store it. Try increasing the amount of RAM.");
                }

                for (let i in state.RAM) {
                    if (i >= program.length) {
                        state.RAM[i] = "0";
                    }
                    else {
                        state.RAM[i] = program[i];
                    }
                }
                game.vars.execution.program = program;
            },
            reloadProgram: _ => {
                let execution = game.vars.execution;
                if (execution.program) {
                    execution.loadProgram(execution.program);
                }
                execution.resetRegister();
                execution.beginExecution();
            },
            resetProgramCounter: _ => {
                game.vars.execution.state.register.programCounter = 0;
            },
            resetRegister: _ => {
                game.vars.execution.state.register = {
                    programCounter: 0,
                    instruction: "0".repeat(config.instructionSet.instructionCodeLength),
                    accumulator: new Array(config.instructionSet.accumulatorSize).fill("0")
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
                let register = state.register;
                register.instruction = state.RAM.slice(register.programCounter, register.programCounter + config.instructionSet.instructionCodeLength).join("");

                let instructionName = config.instructionSet.mappings[register.instruction];
                if (instructionName == null) {
                    alert("Invalid instruction at address " + register.programCounter + ".");
                    state.running = false;
                    return;
                }
                let code = executionVars.instructionCode[instructionName];
                if (code == null) {
                    alert("Invalid instruction mapping for instruction set " + config.instructionSetName + " for code " + register.instruction + ".");
                    state.running = false;
                    return;
                }

                // For debugging
                let address = register.programCounter;
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

                let output = code(executionVars, register);
                if (! output) {
                    register.programCounter += config.instructionSet.instructionCodeLength;
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
                                        execution.resetRegister();
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
                                    let input = prompt("Enter the new amount of RAM... (in bytes)", config.RAMAmount / 8);
                                    game.input.mouse.down = false;
                                    if (input != null) {
                                        input = parseFloat(input);
                                        if (isNaN(input)) {
                                            alert("That's not a number.");
                                        }
                                        else {
                                            input *= 8;
                                            let resize = true;
                                            if (game.vars.execution.state.running) {
                                                if (input < config.RAMAmount) {
                                                    if (! confirm("Are you sure you want to reduce the RAM this CPU has? This is likely to cause issues if you don't know where the program ends in memory.")) {
                                                        resize = false;
                                                    }
                                                    game.input.mouse.down = false;
                                                }
                                            }

                                            if (resize) {
                                                if (input < config.RAMAmount) {
                                                    let toRemove = config.RAMAmount - input;
                                                    let i = 0;
                                                    while (i < toRemove) {
                                                        game.vars.execution.state.RAM.pop();
                                                        i++;
                                                    }
                                                }
                                                else {
                                                    let toAdd = input - config.RAMAmount;
                                                    let i = 0;
                                                    while (i < toAdd) {
                                                        game.vars.execution.state.RAM.push("0");
                                                        i++;
                                                    }
                                                }
                                                config.RAMAmount = input;
                                            }
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
                                let register = game.vars.execution.state.register;
                                let text = "Program counter: " + register.programCounter + "\n";
                                text += "Accumulator: ";
                                text += register.accumulator.map((value, index) => index != 0 && index % 4 == 0? " " + value : value).join("");

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
