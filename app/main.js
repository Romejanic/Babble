const {app, BrowserWindow, Menu} = require("electron");

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
});
app.on("activate", createMainWindow);
app.on("window-all-closed", function() {
    if(!isMac()) {
        app.quit();
    }
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