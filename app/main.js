const {app, BrowserWindow, Menu, ipcMain} = require("electron");
const client = require("./client.js")();

var data = {
    userProfile: {
        id: "2dsa2dsas",
        name: "User",
        profilePic: null
    },
    conversations: [
        {
            name: "Test Conversation",
            members: [1, 2, 3],
            image: "img/avatars/default.png",
            chatHistory: [
                {
                    type: "text",
                    sender: "you",
                    content: "Hello world!",
                    timestamp: Date.now()
                }
            ]
        }
    ]
};

var mainWindow = null;

function createMainWindow() {
    if(mainWindow) {
        return;
    }
    var options = {
        title: "Babble",
        minWidth: 500,
        minHeight: 200,
        width: 860,
        height: 495,
        transparent: true,
        titleBarStyle: "hidden",
        vibrancy: "dark",
        webPreferences: {
            experimentalFeatures: true
        }
    };
    if(!isMac()) {
        delete options.titleBarStyle;
		delete options.vibrancy;
		delete options.transparent;
        options.frame = false;
    }
    mainWindow = new BrowserWindow(options);
    mainWindow.on("closed", function() {
        mainWindow = null;
    });
    mainWindow.loadURL("file://" + __dirname + "/ui/main.html");
    mainWindow.isMac = isMac();
}

app.on("ready", function() {
    //buildMenu();
    createMainWindow();

    var credentials = {
        username: "jackd",
        password: "password"
    };
    client.connect("MTcyLjE5LjIwNS4xNjM6NTUyMDI=", credentials, (err) => {
        if(err) {
            console.error("Failed to connect to server!");
        }
    });
});
app.on("activate", createMainWindow);
app.on("window-all-closed", function() {
    if(!isMac()) {
        app.quit();
    }
});
app.on("will-quit", () => {
    if(client) {
        client.disconnect();
    }
});

ipcMain.on("sendMessage", (event, message) => {
    console.log(message);
    // TODO: send to server
});
ipcMain.on("getUserData", (event) => {
    event.sender.send("getUserData", data);
});

function isMac() {
    return process.platform === "darwin";
}

function buildMenu() {
    const template = [
        {
            label: 'Edit',
            submenu: [
                {role: 'undo'},
                {role: 'redo'},
                {type: 'separator'},
                {role: 'cut'},
                {role: 'copy'},
                {role: 'paste'},
                {role: 'delete'},
                {role: 'selectall'}
            ]
        },
        {
            role: 'window',
            submenu: [
                {role: 'minimize'},
                {role: 'close'}
            ]
        },
        {
            role: 'help'
        }
    ];
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                {role: 'about'},
                {type: 'separator'},
                {role: 'services', submenu: []},
                {type: 'separator'},
                {role: 'hide'},
                {role: 'hideothers'},
                {role: 'unhide'},
                {type: 'separator'},
                {role: 'quit'}
            ]
        });
        template[1].submenu.push(
            {type: 'separator'},
            {
                label: 'Speech',
                submenu: [
                    {role: 'startspeaking'},
                    {role: 'stopspeaking'}
                ]
            }
        );
        template[2].submenu = [
            {role: 'close'},
            {role: 'minimize'},
            {role: 'togglefullscreen'},
            {role: 'zoom'},
            {type: 'separator'},
            {role: 'front'}
        ]
    }
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}