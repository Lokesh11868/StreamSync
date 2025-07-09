// This file handles AgoraRTC functionality

const APP_ID = "17aee853fa3948748f1fab59626118e9"

let uid = sessionStorage.getItem('uid')
if(!uid){
    uid = String(Math.floor(Math.random() * 10000))
    sessionStorage.setItem('uid', uid)
}

let client;

let rtmClient;
let channel;

const queryString = window.location.search
const urlParams = new URLSearchParams(queryString)
let roomId = urlParams.get('room')

//room.html?room=234

if(!roomId){
    roomId = 'main'
}

let displayName = sessionStorage.getItem('display_name')
if(!displayName){
    window.location = 'index.html'
}

let localTracks = []
window.localTracks = localTracks;
let remoteUsers = {}

let localScreenTracks;
let sharingScreen = false;

let joinRoomInit = async () => {
    const response = await fetch('https://streamsync-n9xk.onrender.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: uid, room: roomId })
    });
    const data = await response.json();
    const rtcToken = data.rtcToken;
    const rtmToken = data.rtmToken;

    rtmClient = await AgoraRTM.createInstance(APP_ID);
    await rtmClient.login({ uid, token: rtmToken });

    await rtmClient.addOrUpdateLocalUserAttributes({ 'name': displayName });

    channel = await rtmClient.createChannel(roomId);
    await channel.join();

    channel.on('MemberJoined', handleMemberJoined);
    channel.on('MemberLeft', handleMemberLeft);
    channel.on('ChannelMessage', handleChannelMessage);

    getMembers();
    addBotMessageToDom(`Welcome to the room ${displayName}! 👋`);

    client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    try {
        client.setEncryptionConfig("aes-256-xts", "G3n3r@t3dS3cr3t!");
        console.log("Encryption enabled");
    } catch (err) {
        console.error("Encryption failed:", err);
    }
    await client.join(APP_ID, roomId, rtcToken, uid);

    client.on('user-published', handleUserPublished);
    client.on('user-left', handleUserLeft);
}

let joinStream = async () => {
    document.getElementById('join-btn').style.display = 'none';
    document.getElementsByClassName('stream__actions')[0].style.display = 'flex';

    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();
    window.localTracks = localTracks; // This line ensures window.localTracks is updated
    
    let player = `<div class="video__container" id="user-container-${uid}">
                      <div class="video-player" id="user-${uid}"></div>  
                  </div>`;
    document.getElementById('streams__container').insertAdjacentHTML('beforeend', player);
    document.getElementById(`user-container-${uid}`).addEventListener('click', expandVideoFrame);
    localTracks[1].play(`user-${uid}`);
    await client.publish([localTracks[0], localTracks[1]]);
    
    const transcriptBtn = document.getElementById('toggle-transcript-btn');
    const statusIndicator = document.getElementById('transcript-status');
    if (transcriptBtn) {
        transcriptBtn.disabled = false;
        transcriptBtn.style.opacity = '1';
        transcriptBtn.title = 'Start live transcription';
        
        statusIndicator.textContent = 'Ready - Click to start';
        statusIndicator.style.color = 'green';
    }
};

function gatherAllAudioTracks() {
    let combinedStream = new MediaStream();

    if (localTracks[0] && localTracks[0].track) {
        combinedStream.addTrack(localTracks[0].getMediaStreamTrack());
    }

    for (let uid in remoteUsers) {
        if (remoteUsers[uid].audioTrack) {
            combinedStream.addTrack(remoteUsers[uid].audioTrack.getMediaStreamTrack());
        }
    }
    return combinedStream;
}

window.startLiveTranscription = function() {
    const combinedStream = gatherAllAudioTracks();
    if (!combinedStream || combinedStream.getAudioTracks().length === 0) {
        console.error("No audio tracks found for transcription.");
        return;
    }

    // if tls certificate is available then try wss
    const dgUrl = `wss://streamsync-n9xk.onrender.com/?model=general-enhanced`;

    const socket = new WebSocket(dgUrl);
    window.transcriptionSocket = socket;

    let audioContext;
    let source;
    let processor;

    socket.onopen = () => {
        audioContext = new AudioContext({ sampleRate: 16000 });
        source = audioContext.createMediaStreamSource(combinedStream);
        audioContext.audioWorklet
            .addModule('js/audio-processor.js')
            .then(() => {
                processor = new AudioWorkletNode(audioContext, 'audio-processor');
                source.connect(processor);
                processor.connect(audioContext.destination);
                processor.port.onmessage = (event) => {
                    if (socket.readyState === WebSocket.OPEN) {
                        if (event.data.audioData) {
                            socket.send(event.data.audioData);
                        }
                    }
                };
            })
            .catch((error) => {
                console.error('Error adding audio processor:', error);
            });
    };

    socket.onerror = (error) => {
        console.error('Transcription socket error:', error);
    };

    socket.onclose = () => {
        if (processor && source) {
            source.disconnect(processor);
            processor.disconnect();
        }
        if (audioContext) {
            audioContext.close();
        }
    };

    window.accumulatedTranscript = window.accumulatedTranscript || '';
    window.lastTranscriptChunk = '';
    
    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.transcript && data.transcript.trim()) {
                const newChunk = data.transcript.trim();
                
                // Only add if it's different from the last chunk to avoid duplicates
                if (newChunk !== window.lastTranscriptChunk) {
                    // If the new chunk starts with the end of the last chunk, don't duplicate
                    if (window.lastTranscriptChunk && newChunk.toLowerCase().startsWith(window.lastTranscriptChunk.toLowerCase())) {
                        window.accumulatedTranscript = window.accumulatedTranscript.replace(window.lastTranscriptChunk, newChunk);
                    } else {
                        // Add proper spacing and punctuation
                        if (window.accumulatedTranscript && !window.accumulatedTranscript.endsWith('.') && !window.accumulatedTranscript.endsWith('!') && !window.accumulatedTranscript.endsWith('?')) {
                            window.accumulatedTranscript += '. ';
                        }
                        window.accumulatedTranscript += newChunk + ' ';
                    }
                    
                    window.lastTranscriptChunk = newChunk;
                    document.getElementById('transcript-container').textContent = window.accumulatedTranscript;
                }
            }
        } catch (err) {
            console.error('Error parsing transcript data:', err);
        }
    };

    const statusIndicator = document.getElementById('transcript-status');
    if (statusIndicator) {
        statusIndicator.textContent = 'Active';
        statusIndicator.style.color = 'green';
    }
};

window.stopLiveTranscription = function() {
    if (window.transcriptionSocket) {
        window.transcriptionSocket.close();
        window.transcriptionSocket = null;
        console.log('Live transcription stopped');
    }

    const statusIndicator = document.getElementById('transcript-status');
    if (statusIndicator) {
        statusIndicator.textContent = 'Transcription stopped';
        statusIndicator.style.color = 'orange';
    }
}

let switchToCamera = async() => {
    let player = `<div class="video__container" id="user-container-${uid}">
                      <div class="video-player" id="user-${uid}"></div>  
                 </div>`;
    displayFrame.insertAdjacentHTML('beforeend', player)

    await localTracks[0].setMuted(true)
    await localTracks[1].setMuted(true)

    document.getElementById('mic-btn').classList.remove('active')
    document.getElementById('screen-btn').classList.remove('active')

    localTracks[1].play(`user-${uid}`)
    await client.publish([localTracks[1]])
}

let handleUserPublished = async(user, mediaType) => {
    remoteUsers[user.uid] = user

    await client.subscribe(user, mediaType)

    let player = document.getElementById(`user-container-${user.uid}`)
    if(player === null){
        let playerHTML = `<div class="video__container" id="user-container-${user.uid}">
                            <div class="video-player" id="user-${user.uid}"></div>  
                          </div>`;
        document.getElementById('streams__container').insertAdjacentHTML('beforeend', playerHTML);
        player = document.getElementById(`user-container-${user.uid}`);
        player.addEventListener('click', expandVideoFrame);
    }

    if(displayFrame.style.display){
        let videoFrame = document.getElementById(`user-container-${user.uid}`)
        videoFrame.style.height = '100px'
        videoFrame.style.width = '100px'
    }

    if(mediaType === 'video'){
        user.videoTrack.play(`user-${user.uid}`)
    }

    if(mediaType === 'audio'){
        user.audioTrack.play()
    }
}

let handleUserLeft = async(user) => {
    delete remoteUsers[user.uid]
    let item = document.getElementById(`user-container-${user.uid}`)
    if(item){
        item.remove()
    }

    if(userIdInDisplayFrame === `user-container-${user.uid}`){
        displayFrame.style.display = null
        let videoFrames = document.getElementsByClassName('video__container')

        for(let i=0; videoFrames.length>i; i++){
            videoFrames[i].style.height = '300px'
            videoFrames[i].style.width = '300px'
        }
    }
}

let toggleMic = async(e) => {
    let button = e.currentTarget

    if(localTracks[0].muted){
        await localTracks[0].setMuted(false)
        button.classList.add('active')
    } else{
        await localTracks[0].setMuted(true)
        button.classList.remove('active')
    }
}

let toggleCamera = async(e) => {
    let button = e.currentTarget

    if(localTracks[1].muted){
        await localTracks[1].setMuted(false)
        button.classList.add('active')
    } else{
        await localTracks[1].setMuted(true)
        button.classList.remove('active')
    }
}

let toggleScreen = async(e) => {
    let screenButton = e.currentTarget
    let cameraButton = document.getElementById('camera-btn')

    if(!sharingScreen){
        sharingScreen = true

        screenButton.classList.add('active')
        cameraButton.classList.remove('active')
        cameraButton.style.display = 'none'

        localScreenTracks = await AgoraRTC.createScreenVideoTrack()

        document.getElementById(`user-container-${uid}`).remove()
        displayFrame.style.display = 'block' // Doubt

        let player = `<div class="video__container" id="user-container-${uid}">
                        <div class="video-player" id="user-${uid}"></div>  
                      </div>`;

        displayFrame.insertAdjacentHTML('beforeend', player)
        document.getElementById(`user-container-${uid}`).addEventListener('click', expandVideoFrame)

        userIdInDisplayFrame = `user-container-${uid}`
        localScreenTracks.play(`user-${uid}`)

        await client.unpublish([localTracks[1]]) // Allows publishing of two video tracks: Camera and Screen
        await client.publish([localScreenTracks])

        let videoFrames = document.getElementsByClassName('video__container')
        for(let i=0; videoFrames.length>i; i++){
            if(videoFrames[i].id != userIdInDisplayFrame){
              videoFrames[i].style.height = '100px'
              videoFrames[i].style.width = '100px'
            } 
          }
    } else{
        sharingScreen = false
        cameraButton.style.display = 'block'
        document.getElementById(`user-container-${uid}`).remove()
        await client.unpublish([localScreenTracks])

        switchToCamera()
    }
}

let leaveStream = async(e) => {
    e.preventDefault()

    document.getElementsByClassName('stream__actions')[0].style.display = 'none'
    document.getElementById('join-btn').style.display = 'block'

    for(let i=0; localTracks>i; i++){
        localTracks[i].stop()
        localTracks[i].close()
    }

    await client.unpublish([localTracks[0], localTracks[1]])

    if(localScreenTracks){
        await client.unpublish([localScreenTracks])
    }

    document.getElementById(`user-container-${uid}`).remove()

    if(userIdInDisplayFrame === `user-container-${uid}`){
        displayFrame.style.display = null
        for(let i=0; videoFrames.length>i; i++){
            videoFrames[i].style.height = '300px'
            videoFrames[i].style.width = '300px'
        }
    }

    stopLiveTranscription();
    
    // Reset button state
    const transcriptBtn = document.getElementById('toggle-transcript-btn');
    if (transcriptBtn) {
        transcriptBtn.textContent = 'Start Transcription';
        transcriptBtn.style.backgroundColor = '#435F7A';
    }

    // Sends a message to the channel for remote users to remove displayFrame from the DOM after the user clicks the leave button
    channel.sendMessage({text:JSON.stringify({'type':'user_left', 'uid':uid})}) 
}

document.getElementById('camera-btn').addEventListener('click', toggleCamera)
document.getElementById('mic-btn').addEventListener('click', toggleMic)
document.getElementById('screen-btn').addEventListener('click', toggleScreen)
document.getElementById('join-btn').addEventListener('click', joinStream)
document.getElementById('leave-btn').addEventListener('click', leaveStream)

joinRoomInit()