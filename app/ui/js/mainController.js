/**
 * mainController.js by Jack Davenport.
 * This is responsible for connecting Angular to the application's
 * data and providing an interface between the web page and client
 * main process.
 */

const moment = require("moment");
const {remote, ipcRenderer} = require("electron");

// create an Angular module
var ngApp = angular.module("main", []);

// create the main Angular controller
ngApp.controller("messageApp", function($scope) {
    // initialize some variables
    $scope.conversations = [];
    $scope.users = [];
    $scope.selectedConvo = null;
    $scope.memberListOpen = false;

    // switches to the conversation screen and selects the conversation
    $scope.select = function(convo) {
        $scope.activeScreen   = "conversation";
        $scope.memberListOpen = false;
        $scope.selectedConvo  = convo;
    };
    // switches to the new conversation screen and fetches the users
    $scope.createConversation = function() {
        $scope.activeScreen = "newConversation";
        ipcRenderer.send("sendPacket", {
            id: "get_users"
        });
    };
    // called when the 'create' button is clicked. validates the information
    // and creates the conversation.
    $scope.doCreateConversation = function() {
        // check the name is valid
        if(!$scope.convoName || $scope.convoName.trim().length <= 0) {
            alert("Please enter a valid conversation name!");
            return;
        }
        // check the conversation name isn't already taken
        for(var i = 0; i < $scope.conversations.length; i++) {
            if($scope.conversations[i].name == $scope.convoName) {
                alert("That conversation name is already taken!");
                return;
            }
        }
        var name = $scope.convoName.trim();
        var members = [ $scope.userProfile.id ];
        // add the selected users to the member array
        $scope.users.forEach((v) => {
            if(v && !v.self && v.selected) {
                delete v.selected; // deselect the user
                members.push(v.id);
            }
        });
        // check that other users have been selected
        if(members.length <= 1) {
            alert("Please select someone to add!");
            return;
        }

        // created the conversation object
        var conversation = {
            name: name,
            members: members,
            image: null,
            chatHistory: []
        };
        // add to the local array
        $scope.conversations.push(conversation);
        // select the conversation
        $scope.select(conversation);
        // send details to main process (to be sent to server)
        ipcRenderer.send("createConversation", conversation);
    };
    // called when a user is selected in the list
    $scope.toggleNewUser = function(user) {
        if(user.self) {
            // don't select if the user is ourselves
            return;
        }
        // toggles the selected state
        user.selected = !user.selected;
    };

    // validates the connection credentials and tries to connect to the server
    $scope.connect = function() {
        // extract the values from the DOM
        var connection_code = document.getElementById("connection_code").value;
        var username = document.getElementById("username").value;
        var password = document.getElementById("password").value;

        // check the fields are valid and not empty
        if(!connection_code || connection_code.trim().length <= 0) {
            // set the error message and stop processing further
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

        // clear the status message
        $scope.status = undefined;
        // send the details to the main process
        ipcRenderer.send("connect", {
            connectionCode: connection_code,
            username: username,
            password: password
        });
    };
    // called upon the initial setup (if the user account hasn't logged in before)
    // when the user clicks the 'Done' button.
    $scope.initialSetup = function() {
        // extract the values from the DOM
        var name = document.getElementById("setup_name").value;
        var password = document.getElementById("setup_password").value;
        var passwordConf = document.getElementById("setup_password_conf").value;

        // check they are not empty
        if(!name || name.trim().length <= 0) {
            // show an error message and stop processing further
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

        // clear the error message
        $scope.status = undefined;
        // send the details to the main process
        ipcRenderer.send("updateDetails", {
            name: name,
            password: password
        });

        // clear the screen and change to the main view
        $scope.firstLogin = false;
        $scope.$apply();
    };

    // called when the enter key is pressed (and a message is sent)
    $scope.messageSent = function() {
        if(!$scope.selectedConvo) {
            // stop if no conversation is selected
            return;
        }
        if(!$scope.selectedConvo.id) {
            // stop if the conversation has no ID (still being created)
            alert("Please wait for a response from the server.");
            return;
        }
        // get the message text and trim it
        var msg = $scope.messageInput;
        if(!msg || (msg = msg.trim()).length < 0) {
            // stop if the message is empty
            return;
        }
        // clear the text field
        $scope.messageInput = "";
        // construct a message object
        var msg = {
            sender: $scope.userProfile.id,
            content: msg,
            conversation: $scope.selectedConvo.id,
            type: "text",
            timestamp: Date.now()
        };
        // push it to the chat history
        $scope.selectedConvo.chatHistory.push(msg);
        // send the message to the main process
        ipcRenderer.send("sendMessage", msg);
        // scroll to the bottom of the screen
        setTimeout(() => {
            $scope.$apply();
            $scope.scrollToBottom();
        }, 20);
    };

    // scrolls to the bottom of the message view
    $scope.scrollToBottom = function() {
        var div = document.querySelector(".message-list");
        div.scrollTop = div.scrollHeight - div.clientHeight;
    };

    // called when the user clicks the '+' button in the message screen. not implemented yet.
    $scope.addContent = function() {
        dissapointUser("allow users to attach content to their messages (images, files, plans, etc.)");
    };
    // called when the user clicks the calendar button in the message screen. not implemented yet.
    $scope.showPlans = function() {
        dissapointUser("show the files, plans, checklists and other items attached to messages.");
    };
    // toggles the open state of the member list
    $scope.showMembers = function() {
        $scope.memberListOpen = !$scope.memberListOpen;
    };

    // gets a user with the given id
    $scope.getUser = function(id) {
        for(var i = 0; i < $scope.users.length; i++) {
            if($scope.users[i].id == id) {
                return $scope.users[i];
            }
        }
        return undefined;
    };
    // gets a conversation with the given id
    $scope.getConvo = function(id) {
        for(var i = 0; i < $scope.conversations.length; i++) {
            if($scope.conversations[i].id == id) {
                return $scope.conversations[i];
            }
        }
        return undefined;
    };

    // use the 'moment' module to format the timestamp into human-readable text
    $scope.formatTimestamp = function(epoch) {
        return moment(epoch).fromNow();
    };
    // get the name of a user account from the id given
    $scope.getUserNameFromId = function(id) {
        if(id == $scope.userProfile.id) {
            // return 'you' if the given id is the current user
            return "you";
        }
        // loop through users
        for(var i = 0; i < $scope.users.length; i++) {
            if($scope.users[i].id == id) {
                // return the name of the matching user
                return $scope.users[i].name;
            }
        }
        // if none found, return the id as a string
        return String(id);
    };
    // get the image data of the user from the id given
    $scope.getUserImageFromId = function(id) {
        if(id == $scope.userProfile.id) {
            // return our own profile picture if the id is the current user
            return $scope.userProfile.image;
        }
        // loop through users
        for(var i = 0; i < $scope.users.length; i++) {
            if($scope.users[i].id == id) {
                // return the image of the matching user
                return $scope.users[i].image;
            }
        }
        // if none found, return the id as a string
        return String(id);
    };

    // remove redundant listeners from old windows
    ipcRenderer.removeAllListeners("getUserData");
    ipcRenderer.removeAllListeners("requiresLogin");
    ipcRenderer.removeAllListeners("connectStatus");
    ipcRenderer.removeAllListeners("first-login");
    ipcRenderer.removeAllListeners("users");
    ipcRenderer.removeAllListeners("focusConversation");

    // called when the process sends the current user data
    ipcRenderer.on("getUserData", (event, data) => {
        // update the userProfile object
        $scope.userProfile = {
            id: data.userProfile.id,
            name: data.userProfile.name,
            profilePic: data.userProfile.profilePic
        };
        // update the conversation array
        $scope.conversations = data.conversations;
        if($scope.selectedConvo) {
            // if a conversation is selected, find it and replace it with
            // the new version
            data.conversations.forEach((v, i) => {
                if(v.name == $scope.selectedConvo.name) {
                    $scope.selectedConvo = $scope.conversations[i];
                }
            });
        }
    });
    // called if the user needs to log in, and sets the screen accordingly
    ipcRenderer.on("requiresLogin", (event, requiresLogin) => {
        if(requiresLogin) {
            $scope.requiresLogin = requiresLogin;
            $scope.$apply();
        }
    });
    // returned by the client once the client is connected
    ipcRenderer.on("connectStatus", (event, result) => {
        if(result.success) {
            // if the connection succeeds, clear the login screen
            $scope.requiresLogin = false;
            $scope.$apply();
        } else {
            // if the connection fails, show the error message
            $scope.status = "Error: " + result.error;
        }
    });
    // called if the user has not logged in yet
    ipcRenderer.on("first-login", (event) => {
        // show the inital login screen
        $scope.firstLogin = true;
        // set the setup name to the user profile's name
        $scope.setup_name = $scope.userProfile.name;

        $scope.$apply();
    });
    // called when the main process returns the array of users
    ipcRenderer.on("users", (event, users) => {
        // update the users in the scope
        $scope.users = users;
        $scope.$apply();
    });
    // called when a user clicks on a notification
    ipcRenderer.on("focusConversation", (event, id) => {
        // loop through conversations
        $scope.conversations.forEach((v) => {
            if(v.id == id) {
                // select the conversation if it matches the given id
                $scope.select(v);
                // scroll to the bottom of the screen
                setTimeout(() => {
                    $scope.scrollToBottom();
                }, 30);
            }
        });
    });
    // fetches the user data upon startup
    ipcRenderer.send("getUserData");

    // creates an interval to refresh the scope (to update time stamps)
    $scope.refreshInterval = setInterval(function() {
        $scope.$apply(); // refresh time stamps
    }, 10000);

    // display our own window controls if we're not on a mac
    if(!remote.getCurrentWindow().isMac) {
        // set the flag to draw the buttons
        $scope.drawButtons = true;
        // create functions to mirror the window button functionality
        $scope.closeWindow = function() { remote.getCurrentWindow().close(); }
        $scope.minimizeWindow = function() { remote.getCurrentWindow().minimize() };
        $scope.maximizeWindow = function() { remote.getCurrentWindow().maximize() };
        // make the backgrounds opaque (no vibrancy on windows/linux)
		document.querySelector(".main").style.backgroundColor = "rgb(54, 54, 54)";
		document.querySelector(".sidebar").style.backgroundColor = "rgb(54, 54, 54)";
    }
});

// the name says it all
function dissapointUser(feature) {
    alert("This function is not implemented yet.\n\nWhen clicked, this button will " + feature);
}