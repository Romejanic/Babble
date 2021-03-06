const net = require("net");
const Encrypt = require("./encrypt.js");

const client = function() {
    var obj = {
        connect: function(code, credentials, callback) {
            var socketAddr = Buffer.from(code, "base64").toString();
            var hostname = socketAddr.substring(0, socketAddr.indexOf(":"));
            var port = socketAddr.substring(socketAddr.indexOf(":") + 1);

            console.log("Attempting connection to " + socketAddr + "...");

            this.client = {
                user_data: null,
                credentials: credentials,
                encryption: Encrypt()
            };
            this.callback = callback;

            this.socket = net.createConnection(port, hostname, () => {
                console.log("Connected to server!");
                this.socket.isConnected = true;

                this.client.encryption.createKeyExchange();
                this.client.encryption.sendKeyExchangePacket(this.socket);
            });
            this.socket.on("data", this.handleMessage);
            this.socket.on("error", (err) => {
                console.error("Error on client socket!", err);
            });
            this.socket.on("close", () => {
                console.log("Disconnected from server.");
                this.socket.isConnected = false;
            });
        },
        disconnect: function() {
            if(this.socket) {
                this.socket.end();
            }
        },

        sendPacket: function(packet) {
            if(!packet.id) {
                throw "Object is not a packet! (packet requires identifier)";
            }
            var packetJson = JSON.stringify(packet);
            var encrypted = obj.client.encryption.encrypt(packetJson);
            this.socket.write(encrypted);
        },

        handleMessage: function(data) {
            try {
                if(obj.client.encryption.aesKey) {
                    var packetStr = obj.client.encryption.decrypt(data.toString());
                    var packet = JSON.parse(packetStr);
                    obj.handlePacket(packet);
                } else {
                    obj.client.encryption.handleKeyExchangePacket(data, this);
                }
                
            } catch(e) {
                var error = {
                    id: "bad_format_error",
                };
                if(e) {
                    error.payload = e;
                }
                if(typeof e === "object") {
                    console.log("error in packet parser", e);
                }
                if(obj.client.encryption.aesKey) {
                    obj.sendPacket(error);
                } else {
                    this.write(JSON.stringify(error));
                }
            }
        },

        handlePacket: function(packet) {
            if(packet.id == "request_auth") {
                if(obj.client.credentials) {
                    obj.sendPacket({
                        id: "authenticate",
                        payload: obj.client.credentials
                    });
                    delete obj.client.credentials;
                } else {
                    obj.sendPacket({
                        id: "bad_request",
                        payload: "auth_already_requested"
                    });
                }
            } else if(packet.id == "login_status") {
                if(packet.payload.success) {
                    obj.client.user_data = packet.payload.userId;
                    console.log("Login successful! (user id " + obj.client.user_data.id + ")");
                    if(obj.onLoggedIn) {
                        obj.onLoggedIn(obj.client.user_data);
                        obj.callback();
                    }
                } else {
                    console.error("Login failed: " + packet.payload.error);
                    obj.callback(packet.payload.error);
                }
            } else if(obj.onPacket) {
                obj.onPacket(packet);
            }
        },

        isConnected: function() {
            return obj.socket && obj.socket.isConnected;
        }
    };
    return obj;
};

module.exports = client;