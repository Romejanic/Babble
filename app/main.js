const {app, BrowserWindow, Menu, ipcMain} = require("electron");
const path = require("path");
const fs = require("fs");
const client = require("./client.js")();

var data = {
    userProfile: {
        id: 0,
        name: "User",
        profilePic: null,
        login: {
            connectionCode: null,
            username: null,
            password: null
        }
    },
    conversations: []
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

    client.onLoggedIn = function(data) {
        setUserInfo(data.id, data.name);
    };
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
    saveUserData();
});

ipcMain.on("sendMessage", (event, message) => {
    console.log(message);
    // TODO: send to server
});
ipcMain.on("getUserData", (event) => {
    event.sender.send("getUserData", data);

    var requiresLogin = !data.userProfile.login || !data.userProfile.login.connectionCode || !data.userProfile.login.username || !data.userProfile.login.password;
    mainWindow.webContents.send("requiresLogin", requiresLogin);
});
ipcMain.on("connect", (event, credentials) => {
    console.log(credentials);
    data.userProfile.login = credentials;
    client.connect(credentials.connectionCode, credentials, (err) => {
        if(err) {
            event.sender.send("connectStatus", {
                success: false,
                error: err
            });
            data.userProfile.login = {
                connectionCode: null,
                username: null,
                password: null
            };
        } else {
            event.sender.send("connectStatus", {
                success: true
            });
            saveUserData();
        }
    });
});

function isMac() {
    return process.platform === "darwin";
}

function setUserInfo(id, name) {
    data.userProfile.id = id;
    data.userProfile.name = name;
    mainWindow.webContents.send("getUserData", data);
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

var userDataPath = path.join(app.getPath("userData"), "user.dat");
console.log("User data is stored at:", userDataPath);

function loadUserData() {
    try {
        if(!fs.existsSync(userDataPath)) {
            return;
        }
        var json = fs.readFileSync(userDataPath);
        data = JSON.parse(json);
        console.log("Loaded user data!");
    } catch (e) {
        console.error("Failed to read user data!\n", e);
    }
}
loadUserData();

function saveUserData() {
    try {
        var json = JSON.stringify(data);
        fs.writeFile(userDataPath, json, (err) => {
            if(err) {
                throw err;
            }
            console.log("Saved user data!");
        });
    } catch(e) {
        console.error("Failed to save user data!\n", e);
    }
}