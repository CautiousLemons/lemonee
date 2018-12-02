var inject = '('+function() { 
    //overide the browser's default RTCPeerConnection. 
    console.log("Lemonee: injected!")
    var origPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    //make sure it is supported
    if (origPeerConnection) {

        //our own RTCPeerConnection
        var newPeerConnection = function(config, constraints) {
            console.log('Lemonee: PeerConnection created with config', config);
            //proxy the orginal peer connection
            var pc = new origPeerConnection(config, constraints);
            //store the old addStream
            //onaddstream is deprecated! Use peerConnection.ontrack instead.
            var oldAddStream = pc.addStream;
            

            //addStream is called when a local stream is added. 
            //arguments[0] is a local media stream
            pc.addStream = function() {
                console.log("Lemonee: our add stream called!")
                //our mediaStream object
                console.dir(arguments[0])
                return oldAddStream.apply(this, arguments);
            }

            //ontrack is called when a remote track is added.
            //the media stream(s) are located in event.streams
            pc.ontrack = function(event) {
                console.log("Lemonee: ontrack got a track")
                console.dir(event);

                 //check if our element exists
                //var elm = document.getElementById("largeVideo");
                var elm = document.getElementById("remoteStream");
                if(elm == null) {
                    //create an audio element
                    elm = document.createElement("audio");
                    elm.id = "remoteStream";
                }

                //var elm = document.getElementById("remoteVideoStream");
                //if(elm == null) {
                    //create an video element
                    //elm = document.createElement("video");
                    //elm.id = "remoteVideoStream";
                //}

                //set the srcObject to our stream. not sure if you need to clone it
                elm.srcObject = event.streams[0].clone();
                //write the elment to the body
                document.body.appendChild(elm);

                //fire a custom event so our content script knows the stream is available.
                // you could pass the id in the "detail" object. for example:
                //CustomEvent("remoteStreamAdded", {"detail":{"id":"audio_element_id"}})
                //then access it via e.detail.id in your event listener.
                var e = new CustomEvent("remoteStreamAdded");
                window.dispatchEvent(e);
                console.log("Lemonee: remote stream added.")
                
                // When recording starts, the captured frames are emitted
                // as `dataavailable` events on the `recorder`.
                // These captured "chunks" can be collected in an array.
                const allChunks = [];
                

                window.addEventListener("remoteStreamAdded", function(e) {
                    console.log("Lemonee: event listener activated.")
                    elm = document.getElementById("remoteStream");
                    var stream = elm.mozCaptureStream(); //elm.captureStream()
                    console.log("Lemonee: initializing MediaRecorder");
                    var mediaRecorder = new MediaRecorder(stream); 
                    mediaRecorder.ondataavailable = function(e) {
                        allChunks.push(e.data);
                    } 
                    mediaRecorder.start();
                    console.log(mediaRecorder.state);
                    console.log("Lemonee: recorder started");

                    window.onbeforeunload = function() {
                        mediaRecorder.stop();
                        console.log(mediaRecorder.state);
                        console.log("Lemonee: recorder stopped");
                        
                        // We can now join all the chunks
                        // into a single "blob" ...
                        const fullBlob = new Blob(allChunks);

                        // ... which we can download using HTML5 `download` attribute on <a />
                        const link = document.createElement('a');
                        link.style.display = 'none';

                        const downloadUrl = window.URL.createObjectURL(fullBlob);
                        link.href = downloadUrl;
                        link.download = 'media.webm';

                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                    }
                })              

            }

            

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

