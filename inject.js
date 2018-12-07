var inject = '('+function() { 

    console.log("Lemonee: injected");
    //overide the browser's default RTCPeerConnection. 
    var origPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    //make sure it is supported

    // list of relevant variables
    var mediaStreamsList = []
    var recorderElements = []
    var streamRrecording = []
    var mediaRecorderList = []
    var allChunks = []

    if (origPeerConnection) {

        //our own RTCPeerConnection
        var newPeerConnection = function(config, constraints) {
            console.log('Lemonee: PeerConnection created with config', config);
            //proxy the orginal peer connection
            var pc = new origPeerConnection(config, constraints);
            //store the old addStream
            var oldAddStream = pc.addStream;

            //addStream is called when a local stream is added. 
            //arguments[0] is a local media stream
            pc.addStream = function() {
                console.log("Lemonee: our add stream called!")
                //our mediaStream object
                //console.dir("Lemonee: addStream arguments[0] - ", arguments[0])
                return oldAddStream.apply(this, arguments);
            }

            //ontrack is called when a remote track is added.
            //the media stream(s) are located in event.streams
            pc.ontrack = function(event) {
                console.log("Lemonee: ontrack got a track")
                //console.dir("Lemonee: event - ", event);

                function stopRecorder(mediaID) {
                    
                    console.log("Lemonee: stopRecorder called");
                    for (var i = 0; i < mediaStreamsList.length; i++) {
                        if (mediaStreamsList[i][0].id == mediaID) {
                            mediaRecorderList[i].stop();
                            console.log("Lemonee: recorder " + i + " stopped - ", mediaRecorderList[i].state);
                            
                            //mediaStreamsList.splice(i,1);
                        }
                    }
                    
                }
                
                if (event.streams[0].id!='mixedmslabel' && (mediaStreamsList.indexOf(event.streams) < 0)) {
                    event.streams[0].onremovetrack = function(ee) {
                        console.log("Lemonee: Track removed ", ee.srcElement);
                        if (stopRecorder(ee.srcElement.id)) {
                            console.log("Lemonee: Recorder stopped successfully");
                        }
                    }
                    console.dir("Lemonee: event.streams - ", event.streams[0]);
                    mediaStreamsList.push(event.streams);
                    var i = mediaStreamsList.indexOf(event.streams);

                    //console.dir("Lemonee: ", mediaStreamsList[i])
                    //console.log("Lemonee: array index - ", mediaStreamsList.indexOf(event.streams))

                    //create video elements
                    recorderElements[i] = document.createElement("video");
                    var streamid = "lemoneeRemote" + i;
                    console.log("Lemonee: streamid - ", streamid);
                    recorderElements[i].id = streamid;

                    //set the srcObject to our stream. not sure if you need to clone it
                    recorderElements[i].srcObject = mediaStreamsList[i][0].clone();
                    //write the elment to the body
                    document.body.appendChild(recorderElements[i]);

                    //fire a custom event so our content script knows the stream is available.
                    // you could pass the id in the "detail" object. for example:
                    //CustomEvent("remoteStreamAdded", {"detail":{"id":"audio_element_id"}})
                    //then access it via e.detail.id in your event listener.
                    var e = new CustomEvent("remoteStreamAdded", {"detail":{"id":streamid}});
                    window.dispatchEvent(e);
                }
            }


            window.addEventListener("remoteStreamAdded", function(e) {
                //console.log("Lemonee: streamid in listener - ", e.detail.id);
                var elm = document.getElementById(e.detail.id);
                var index = e.detail.id.replace( /^\D+/g, '');
                streamRrecording[index] = elm.mozCaptureStream();
                streamRrecording[index].onended = function(e) {
                    console.log("Lemonee: Remote connection disconnected");
                }
                if(mediaRecorderList[index] == null) {
                    mediaRecorderList[index] = new MediaRecorder(streamRrecording[index]);
                    // var answer = MediaRecorder.isTypeSupported('video/webm');
                    // console.log("Lemonee: webm supported? ", answer);
                    mediaRecorderList[index].ondataavailable = function(e) {
                        console.log("Lemonee: ondataavailable called", e.data);
                        //allChunks[index].push(e.data);
                        //const fullBlob = new Blob(allChunks[index]);
                        console.log("Lemonee: allChunks[index].length ", allChunks[index]);
                    }
                    console.log("Lemonee: mediaRecorderList[index] - ", mediaRecorderList[index]);
                    mediaRecorderList[index].start();
                    console.log("Lemonee: recorder " + index + " started - ", mediaRecorderList[index].state);
                }
            });

            // pc.oniceconnectionstatechange = function(event) {
            //     if (pc.iceConnectionState === "failed") {
            //         console.log("Lemonee: connectionstate failed - ", event);
            //     }

            //     if (pc.iceConnectionState === "disconnected") {
            //         console.log("Lemonee: connectionstate disconnected - ", event);
            //     }
            //     if (pc.iceConnectionState === "closed") {
            //         console.log("Lemonee: connectionstate closed - ", event);
            //     }
            // };

            window.ourPC = pc;

            return pc; 
        };

    ['RTCPeerConnection', 'webkitRTCPeerConnection', 'mozRTCPeerConnection'].forEach(function(obj) {
        // Override objects if they exist in the window object
        if (window.hasOwnProperty(obj)) {
            window[obj] = newPeerConnection;
            // Copy the static methods
            Object.keys(origPeerConnection).forEach(function(x){
                window[obj][x] = origPeerConnection[x];
            })
            window[obj].prototype = origPeerConnection.prototype;
        }
    });
  }

}+')();';
var script = document.createElement('script');
script.textContent = inject;
(document.head||document.documentElement).appendChild(script);
script.parentNode.removeChild(script);