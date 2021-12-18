let game = Bagel.init({
    id: "BagnaryCodeEmulator",
    state: "main",
    game: {
        plugins: [
            {
                src: "assets/plugins/gui.js"
            }
        ],
        sprites: [
            {
                type: "GUI",
                id: "menu",
                submenu: "upload",
                submenus: {
                    upload: {
                        elements: [
                            {
                                type: "button",
                                color: "yellow",
                                size: 50
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
