const config = {
    RAMAmount: 64 * 8,
    clockSpeed: 1,
    instructionSetVersion: 1
};

// TODO: reduce clock speed to match config
let game = Bagel.init({
    id: "BagnaryCodeEmulator",
    state: "main",
    vars: {
        execution: {
            binaryToDenary: binary => {
                let powers = [1, 2, 4, 8, 16, 32, 64, 128];
                let total = 0;
                for (let i in binary) {
                    if (binary[i] == "1") {
                        total += powers[(binary.length - 1) - i];
                    }
                }
                return total;
            },
            instructionCode: {
                "0000": (executionVars, register) => { // Stop the program
                    executionVars.state.running = false;
                },
                "0001": (executionVars, register) => { // Load address into the accumulator
                    let state = executionVars.state;
                    let address = state.RAM.slice(register.programCounter + 4, register.programCounter + 12);
                    address = executionVars.binaryToDenary(address);
                    let bitID = executionVars.binaryToDenary(state.RAM.slice(register.programCounter + 12, register.programCounter + 15));

                    register.accumulator[bitID] = state.RAM[address];
                    register.programCounter += 8 + 3; // The next instruction is actually a value, which is double the length of an instruction code and skip over the bit number
                },
                "0010": (executionVars, register) => { // Conditional jump to else continue
                    if (register.accumulator[7] == "0") {
                        register.programCounter += 8 + 3; // Skip over the value that stores the conditional jump to adddress
                    }
                    else {
                        let value = executionVars.binaryToDenary(executionVars.state.RAM.slice(register.programCounter + 4, register.programCounter + 12));
                        register.programCounter = value;
                        return true;
                    }
                },
                "0011": (executionVars, register) => { // Write accumulator bit to RAM
                    let state = executionVars.state;
                    let address = executionVars.binaryToDenary(state.RAM.slice(register.programCounter + 4, register.programCounter + 12));
                    let bitID = executionVars.binaryToDenary(state.RAM.slice(register.programCounter + 12, register.programCounter + 15));
                    executionVars.state.RAM[address] = register.accumulator[bitID];
                    register.programCounter += 8 + 3; // Skip over the value that stores the address and that stores the bit number
                }
            },
            instructionSets: {
                1: [
                    "0000"
                ]
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

            parseProgram: program => { // Do some really basic parsing to remove spaces and comments
                return program.split("\n").map(value => (
                    value.replaceAll(" ", "").replaceAll("  ", "")
                )).filter(value => (
                    ! value.split("").some(character => ! "01".includes(character)) // Exlude lines that have something other than a 0 or a 1 in them
                )).join("");
            },
            loadProgram: program => {
                let state = game.vars.execution.state;
                if (program.length > state.RAM.length) {
                    alert("Program is too big.");
                }
                state.RAM.splice(0, program.length, ...program);
            },
            resetProgramCounter: _ => {
                game.vars.execution.state.register.programCounter = 0;
            },
            beginExecution: _ => {
                game.vars.execution.state.running = true;
            },
            tick: _ => {
                let executionVars = game.vars.execution;
                let state = executionVars.state;
                let register = state.register;
                register.instruction = state.RAM.slice(register.programCounter, register.programCounter + 4).join("");
                let code = executionVars.instructionCode[register.instruction];
                if (code == null) {
                    alert("Invalid instruction at address " + register.programCounter + ".");
                    state.running = false;
                    return;
                }
                console.log(register.programCounter);
                let output = code(executionVars, register);
                if (! output) {
                    register.programCounter += 4;
                }
            }
        }
    },
    game: {
        scripts: {
            main: [
                {
                    code: _ => {
                        if (game.vars.execution.state.running) {
                            game.vars.execution.tick();
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
                                },
                                onHover: "Upload a program to emulate",
                                color: "yellow",
                                icon: "Upload",
                                iconSize: 0.6,
                                size: 150
                            }
                        ]
                    },
                    execution: {
                        elements: [
                            {
                                type: "image",
                                color: "#202020",
                                width: 450,
                                height: 450
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
