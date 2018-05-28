const {app, BrowserWindow, Menu, Notification, ipcMain} = require("electron");
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
    conversations: [],
    users: []
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
    buildMenu();
    createMainWindow();

    client.onLoggedIn = function(data) {
        setUserInfo(data.id, data.name);
        if(data.firstLogin) {
            mainWindow.webContents.send("first-login");
        }
    };
    client.onPacket = function(packet) {
        if(packet.id === "user_list") {
            setUserList(packet.payload);
        } else if(packet.id == "conversation_created") {
            var convo;
            if((convo = getConversationByName(packet.payload.name))) {
                convo.id = packet.payload.id;
                mainWindow.webContents.send("getUserData", data);
            }  
        } else if(packet.id == "message") {
            onMessageRecieved(packet.payload);
        } else if(packet.id == "new_messages") {
            packet.payload.forEach((msg) => {
                onMessageRecieved(packet.payload, true);
            });
            mainWindow.webContents.send("getUserData", data);
        } else if(packet.id == "new_conversation") {
            data.conversations.push(packet.payload);
            mainWindow.webContents.send("getUserData", data);
            if(packet.payload.chatHistory && packet.payload.chatHistory.length > 0) {
                var lastIndex = packet.payload.chatHistory.length - 1;
                sendMessageNotification(packet.payload.chatHistory[lastIndex]);
            }
        } else if(packet.id == "sync_convos") {
            var unknown = [];
            packet.payload.forEach((v) => {
                if(!getConversationById(v)) {
                    unknown.push(v);
                }
            });
            if(unknown.length > 0) {
                client.sendPacket({
                    id: "sync_convos",
                    payload: unknown
                });
            }
        }
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
    var conversation = getConversationById(message.conversation);
    if(!conversation) {
        console.error("Error: Tried to send message to conversation that doesn't exist...");
        return;
    }
    conversation.chatHistory.push(message);
    client.sendPacket({
        id: "message",
        payload: message
    });
});
ipcMain.on("getUserData", (event) => {
    event.sender.send("getUserData", data);

    var loginData = data.userProfile.login;
    var requiresLogin = !loginData || !loginData.connectionCode || !loginData.username || !loginData.password;
    mainWindow.webContents.send("requiresLogin", requiresLogin);

    if(data.users && data.users.length > 0) {
        mainWindow.webContents.send("users", data.users);
    }

    if(loginData && loginData.connectionCode && loginData.username && loginData.password) {
        doConnect();
    }
});
ipcMain.on("connect", (event, credentials) => {
    data.userProfile.login = credentials;
    doConnect();
});
ipcMain.on("updateDetails", (event, profile) => {
    if(profile.id) {
        data.userProfile.id = profile.id;
    }
    if(profile.name) {
        data.userProfile.name = profile.name;
    }
    if(profile.profilePic) {
        data.userProfile.profilePic = profile.profilePic;
    }
    client.sendPacket({
        id: "update_details",
        payload: profile
    });
});
ipcMain.on("sendPacket", (event, packet) => {
    client.sendPacket(packet);
});
ipcMain.on("createConversation", (event, conversation) => {
    data.conversations.push(conversation);
    var memberArray = conversation.members;
    conversation.members = [data.userProfile.id];
    memberArray.forEach((v) => {
        conversation.members.push(v.id);
    });
    client.sendPacket({
        id: "create_conversation",
        payload: conversation
    });
});

function getConversationById(id) {
    for(var i = 0; i < data.conversations.length; i++) {
        if(data.conversations[i].id == id) {
            return data.conversations[i];
        }
    }
    return undefined;
}
function getConversationByName(name) {
    for(var i = 0; i < data.conversations.length; i++) {
        if(data.conversations[i].name == name) {
            return data.conversations[i];
        }
    }
    return undefined;
}
function getUserById(id) {
    for(var i = 0; i < data.users.length; i++) {
        if(data.users[i].id == id) {
            return data.users[i];
        }
    }
    return undefined;
}

function onMessageRecieved(message, addOnly = false) {
    var convo = getConversationById(message.conversation);
    if(convo) {
        message.timestamp = Date.now();
        convo.chatHistory.push(message);
        if(!addOnly) {
            mainWindow.webContents.send("getUserData", data);
            sendMessageNotification(message);
        }
    } else {
        client.sendPacket({
            id: "sync_convos",
            payload: [ message.conversation ]
        });
    }
}

function sendMessageNotification(message) {
    if(!mainWindow || !mainWindow.isFocused()) {
        var sender = getUserById(message.sender);
        var convo  = getConversationById(message.conversation);
        const notif = new Notification({
            title: sender.name + " to " + convo.name,
            body: message.content,
            hasReply: true,
            replyPlaceholder: "Type a message..."
        });
        notif.on("click", (e) => {
            remote.getCurrentWindow().focus();
            $scope.select(convo);
            setTimeout(() => {
                document.querySelector(".message-list").scrollTo(0, Number.MAX_VALUE);
            }, 20);
        });
        notif.on("reply", (e, reply) => {
            console.log("replied to notification", reply);
        });
        notif.show();
    }
}

function doConnect() {
    if(client.isConnected()) {
        return;
    }
    client.connect(data.userProfile.login.connectionCode, data.userProfile.login, (err) => {
        if(err) {
            mainWindow.webContents.send("connectStatus", {
                success: false,
                error: err
            });
            data.userProfile.login = {
                connectionCode: null,
                username: null,
                password: null
            };
        } else {
            mainWindow.webContents.send("connectStatus", {
                success: true,

            });
            saveUserData();
        }
    });
}

function isMac() {
    return process.platform === "darwin";
}

function setUserInfo(id, name) {
    data.userProfile.id = id;
    data.userProfile.name = name;
    client.sendPacket({
        id: "get_users"
    });
    mainWindow.webContents.send("getUserData", data);
}

function setUserList(users) {
    data.users = users;
    mainWindow.webContents.send("users", users);
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