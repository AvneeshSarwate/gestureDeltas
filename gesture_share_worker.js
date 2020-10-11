let portCollection = [];

onconnect = function(e) {
    var port = e.ports[0];
    portCollection.push(port);
    console.log("port", port);
    port.onmessage = function(e) {
        portCollection.forEach(p => p.postMessage(e.data[0]));
    }
}