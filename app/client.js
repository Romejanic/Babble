const net = require("net");
const rsa = require("./rsa.js");

const client = function() {
    return {
        connect: function(code, callback) {
            var socketAddr = new Buffer(code, "base64").toString();
            var hostname = socketAddr.substring(0, socketAddr.indexOf(":"));
            var port = socketAddr.substring(socketAddr.indexOf(":") + 1);

            console.log("Attempting connection to " + socketAddr + "...");

            this.client = {
                user_id: null,
                server_public_key: null
            };

            this.socket = net.createConnection(port, hostname, () => {
                console.log("Connected to server!");
                callback();
            });
            this.socket.on("data", this.handleMessage);
            this.socket.on("error", (err) => {
                console.error("Error on client socket!", err);
            });
            this.socket.on("close", () => {
                console.log("Disconnected from server.");
            });
        },
        disconnect: function() {
            this.socket.end();
        },

        sendPacket: function(packet) {
            if(!packet.id) {
                throw "Object is not a packet! (packet requires identifier)";
            }
            var packetJson = JSON.stringify(packet);
            var encrypted = rsa.encryptVerified(packetJson, this.client.server_public_key);
            this.socket.write(encrypted);
        },

        handleMessage: function(data) {
            try {
                var packetStr;
                if(client.client.server_public_key) {
                    packetStr = rsa.decryptVerified(data, rsa.rsaKeys.private, client.client.server_public_key);
                } else {
                    packetStr = data.toString();
                }
                var packet = JSON.parse(packetStr);
                if(!client.client.server_public_key) {
                    if(packet.id == "rsa_public_key" && typeof packet.payload == "string") {
                        rsa.sendKeyExchangePacket(this);
                        client.client.server_public_key = packet.payload;
                    } else {
                        throw "Packet must be an rsa_public_key with string payload.";
                        this.close();
                    }
                } else {
                    client.handlePacket(packet);
                }
            } catch(e) {
                var error = {
                    id: "bad_format_error",
                };
                if(e) {
                    error.payload = e;
                }
                if(client.client.server_public_key) {
                    client.sendPacket(error);
                } else {
                    this.write(JSON.stringify(error));
                }
            }
        },

        handlePacket: function(packet) {

        }
    };
};

module.exports = client;