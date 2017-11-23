const moment = require("moment");
const remote = require("electron").remote;

var ngApp = angular.module("main", []);

ngApp.controller("messageApp", function($scope) {
    $scope.conversations = [];
    $scope.selectedConvo = null;
    $scope.select = function(convo) {
        $scope.selectedConvo = convo;
    };

    $scope.messageSent = function() {
        if(!$scope.selectedConvo) {
            return;
        }
        var msg = $scope.messageInput;
        if(!msg || msg.trim().length < 0) {
            return;
        }
        msg = msg.trim();
        $scope.messageInput = "";
        $scope.selectedConvo.chatHistory.push({
            type: "text",
            sender: "you",
            content: msg,
            timestamp: Date.now()
        });
        // TODO: actually send the message
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

    // generate randomly sized conversations to fill interface and demonstrate it
    var n = 1 + Math.floor(Math.random() * 20);
    for(var i = 0; i < n; i++) {
        var people = new Array(1 + Math.floor(Math.random() * 9));
        var chats = [];
        var messageN = 1 + Math.floor(Math.random() * 25);
        for(var j = 0; j < messageN; j++) {
            var messageC = "";
            var loremN = (1 + Math.floor(Math.random() * 3));
            for(var k = 0; k < loremN; k++) {
                messageC += "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ";
            }
            messageC = messageC.trim();
            chats.push({
                type: "text",
                sender: Math.random() > 0.5 ? "me" : "you",
                content: messageC,
                timestamp: Date.now() - Math.floor(429492 * (messageN-j))
            });
        }
        $scope.conversations.push({
            name: "Test Person #" + (i+1),
            members: people,
            imageSrc: "img/avatars/default.png",
            chatHistory: chats
        });
    }

    $scope.refreshInterval = setInterval(function() {
        $scope.$apply(); // refresh time stamps
    }, 10000);

    if(!remote.getCurrentWindow().isMac) { // display our own window controls if we're not on a mac
        $scope.drawButtons = true;
        $scope.closeWindow = function() { remote.getCurrentWindow().close(); }
        $scope.minimizeWindow = function() { remote.getCurrentWindow().minimize() };
        $scope.maximizeWindow = function() { remote.getCurrentWindow().maximize() };
    }
});

// The name says it all
function dissapointUser(feature) {
    alert("This function is not implemented yet.\n\nWhen clicked, this button will " + feature);
}