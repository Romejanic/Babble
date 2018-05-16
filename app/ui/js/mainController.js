const moment = require("moment");
const {remote, ipcRenderer} = require("electron");

var ngApp = angular.module("main", []);

ngApp.controller("messageApp", function($scope) {
    $scope.conversations = [];
    $scope.selectedConvo = null;
    $scope.select = function(convo) {
        $scope.activeScreen = "conversation";
        $scope.selectedConvo = convo;
    };
    $scope.createConversation = function() {
        $scope.activeScreen = "newConversation";
    };

    $scope.connect = function() {
        var connection_code = document.getElementById("connection_code").value;
        var username = document.getElementById("username").value;
        var password = document.getElementById("password").value;

        if(!connection_code || connection_code.trim().length <= 0) {
            $scope.status = "Please enter a valid connection code!";
            return;
        }
        if(!username || username.trim().length <= 0) {
            $scope.status = "Please enter a valid username!";
            return;
        }
        if(!password || password.trim().length <= 0) {
            $scope.status = "Please enter a valid password!";
            return;
        }

        $scope.status = undefined;
        ipcRenderer.send("connect", {
            connectionCode: connection_code,
            username: username,
            password: password
        });
    };
    $scope.initialSetup = function() {
        var name = document.getElementById("setup_name").value;
        var password = document.getElementById("setup_password").value;
        var passwordConf = document.getElementById("setup_password_conf").value;

        console.log(name, password, passwordConf);

        if(!name || name.trim().length <= 0) {
            $scope.status = "Please enter a valid name!";
            return;
        }
        if(!password || password.trim().length <= 0) {
            $scope.status = "Please enter a valid password!";
            return;
        }
        if(password !== passwordConf) {
            $scope.status = "The two passwords you entered do not match!";
            return;
        }

        $scope.status = undefined;
        ipcRenderer.send("updateDetails", {
            name: name,
            password: password
        });

        $scope.firstLogin = false;
        $scope.$apply();
    };

    $scope.messageSent = function() {
        if(!$scope.selectedConvo) {
            return;
        }
        var msg = $scope.messageInput;
        if(!msg || (msg = msg.trim()).length < 0) {
            return;
        }
        $scope.messageInput = "";
        $scope.selectedConvo.chatHistory.push({
            type: "text",
            sender: "you",
            content: msg,
            timestamp: Date.now()
        });
        ipcRenderer.send("sendMessage", {
            conversation: $scope.selectedConvo,
            type: "text",
            content: msg
        });
        setTimeout(() => {
            $scope.$apply();
            document.querySelector(".message-list").scrollTo(0, Number.MAX_VALUE);
        }, 20);
    };

    $scope.addContent = function() {
        dissapointUser("allow users to attach content to their messages (images, files, plans, etc.)");
    };
    $scope.showPlans = function() {
        dissapointUser("show the files, plans, checklists and other items attached to messages.");
    };
    $scope.showMembers = function() {
        dissapointUser("show all members added to this conversation.");
    };

    $scope.formatTimestamp = function(epoch) {
        return moment(epoch).fromNow();
    };

    ipcRenderer.on("getUserData", (event, data) => {
        $scope.userProfile = {
            id: data.userProfile.id,
            name: data.userProfile.name,
            profilePic: data.userProfile.profilePic
        };
        $scope.conversations = data.conversations;
    });
    ipcRenderer.on("requiresLogin", (event, requiresLogin) => {
        if(requiresLogin) {
            $scope.requiresLogin = requiresLogin;
            $scope.$apply();
        }
    });
    ipcRenderer.on("connectStatus", (event, result) => {
        if(result.success) {
            $scope.requiresLogin = false;
            $scope.$apply();
        } else {
            $scope.status = "Error: " + result.error;
        }
    });
    ipcRenderer.on("first-login", (event) => {
        $scope.firstLogin = true;
        $scope.setup_name = $scope.userProfile.name;

        $scope.$apply();
    });
    ipcRenderer.send("getUserData");

    $scope.refreshInterval = setInterval(function() {
        $scope.$apply(); // refresh time stamps
    }, 10000);

    if(!remote.getCurrentWindow().isMac) { // display our own window controls if we're not on a mac
        $scope.drawButtons = true;
        $scope.closeWindow = function() { remote.getCurrentWindow().close(); }
        $scope.minimizeWindow = function() { remote.getCurrentWindow().minimize() };
        $scope.maximizeWindow = function() { remote.getCurrentWindow().maximize() };
		document.querySelector(".main").style.backgroundColor = "rgb(54, 54, 54)";
		document.querySelector(".sidebar").style.backgroundColor = "rgb(54, 54, 54)";
    }
});

// The name says it all
function dissapointUser(feature) {
    alert("This function is not implemented yet.\n\nWhen clicked, this button will " + feature);
}