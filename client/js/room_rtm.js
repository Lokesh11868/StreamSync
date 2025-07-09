// This file handles AgoraRTM functionality

let handleMemberJoined = async(MemberId) => {
    addMemberToDom(MemberId) 

    let members = await channel.getMembers()
    updateMemberTotal(members)

    let {name} = await rtmClient.getUserAttributesByKeys(MemberId, ['name'])
    addBotMessageToDom(`Welcome to the room ${name}! 👋`)
}

let addMemberToDom = async(MemberId) => {
    let {name} = await rtmClient.getUserAttributesByKeys(MemberId, ['name'])

    let membersWrapper = document.getElementById('member__list')
    let memberItem = `<div class="member__wrapper" id="member__${MemberId}__wrapper">
                        <span class="green__icon"></span>
                        <p class="member_name">${name}</p>
                    </div>`
    membersWrapper.insertAdjacentHTML('beforeend', memberItem)
}

let updateMemberTotal = async(members) => {
    let total = document.getElementById('members__count')
    total.innerText = members.length
}

let handleMemberLeft = async(MemberId) => {
    removeMemberFromDom(MemberId)

    let members = await channel.getMembers()
    updateMemberTotal(members)
}

let removeMemberFromDom = async(MemberId) => {
    let memberWrapper = document.getElementById(`member__${MemberId}__wrapper`)
    let name = memberWrapper.getElementsByClassName('member_name')[0].textContent
    addBotMessageToDom(`${name} has left the room.`)

    memberWrapper.remove()
}

let getMembers = async() => {
    let members = await channel.getMembers()
    updateMemberTotal(members)
    for(let i=0; members.length>i; i++){
        addMemberToDom(members[i])
    }
}

// Triggers the ChannelMessage event listener as per Agora documentation
let sendMessage = async (e) => {
    e.preventDefault();

    let message = e.target.message.value;
    let fileUrl = null;
    let fileName = null;
    
    if (typeof selectedFile !== 'undefined' && selectedFile) {
        const fileData = await uploadSelectedFile();
        if (fileData) {
            fileUrl = fileData.url;
            fileName = fileData.fileName;
        }
    }
    
    channel.sendMessage({
        text: JSON.stringify({
            'type': 'chat', 
            'message': message, 
            'displayName': displayName,
            'fileUrl': fileUrl,
            'fileName': fileName
        })
    });   

    addMessageToDom(displayName, message, fileUrl, fileName);
    e.target.reset();
}

let handleChannelMessage = async (messageData) => {
    let data = JSON.parse(messageData.text);

    if (data.type === 'chat') {
        addMessageToDom(data.displayName, data.message, data.fileUrl, data.fileName)
    }

    if (data.type === 'user_left'){
        document.getElementById(`user-container-${data.uid}`).remove()

        if(userIdInDisplayFrame === `user-container-${data.uid}`){
            displayFrame.style.display = null
            for(let i=0; videoFrames.length>i; i++){
                videoFrames[i].style.height = '300px'
                videoFrames[i].style.width = '300px'
            }
        }
    }
}

let addMessageToDom = (name, message, fileUrl = null, fileName = null) => {
    let messagesWrapper = document.getElementById('messages')
    
    let fileElement = '';
    if (fileUrl) {
        const displayName = fileName || fileUrl.split('/').pop().split('?')[0];
        const fileExtension = displayName.split('.').pop().toLowerCase();
        
        let fileIcon = '📄'; 
        if (fileExtension === 'pdf') fileIcon = '📕';
        else if (fileExtension.match(/(doc|docx)$/)) fileIcon = '📘';
        else if (fileExtension.match(/(ppt|pptx)$/)) fileIcon = '📙';
        else if (fileExtension.match(/(xls|xlsx|csv)$/)) fileIcon = '📗';
        else if (fileExtension.match(/(zip|rar|7z|tar|gz)$/)) fileIcon = '🗄️';
        else if (fileExtension.match(/(mp4|avi|mov|wmv)$/)) fileIcon = '🎬';
        else if (fileExtension.match(/(mp3|wav|ogg|m4a)$/)) fileIcon = '🎵';
        else if (fileExtension.match(/(jpeg|jpg|gif|png|webp|bmp)$/)) fileIcon = '🖼️';
        
        const downloadUrl = fileUrl; 
        
        fileElement = `
            <div class="message__file">
                ${fileIcon} Download
                <a href="${downloadUrl}" class="file-link" download="${displayName}">
                    ${displayName}
                </a>
            </div>
        `;
    }

    // Determine alignment class
    let alignmentClass = (name === displayName) ? 'message--right' : 'message--left';

    let newMessage = `
        <div class="message__wrapper ${alignmentClass}">
            <div class="message__body">
                <strong class="message__author">${name}</strong>
                <p class="message__text">${message}</p>
                ${fileElement}
            </div>
        </div>
    `;

    messagesWrapper.insertAdjacentHTML('beforeend', newMessage)

    let lastMessage = document.querySelector('#messages .message__wrapper:last-child')
    if(lastMessage){
        lastMessage.scrollIntoView()
    }
}

let addBotMessageToDom = (botMessage) => {
    let messagesWrapper = document.getElementById('messages')

    let newMessage = `<div class="message__wrapper">
                        <div class="message__body__bot">
                            <strong class="message__author__bot"> Bot</strong>
                            <p class="message__text__bot">${botMessage}</p>
                        </div>
                    </div>`

    messagesWrapper.insertAdjacentHTML('beforeend', newMessage)

    let lastMessage = document.querySelector('#messages .message__wrapper:last-child')
    if(lastMessage){
        lastMessage.scrollIntoView()
    }
}

// Created the leaveChannel function to immediately trigger the MemberLeft event listener
// Without this, the listener would take 30 seconds to respond due to Agora's default behavior
let leaveChannel = async() => {
    await channel.leave()
    await rtmClient.logout()
}

window.addEventListener('beforeunload', leaveChannel) 
// beforeunload - This event is triggered when the user attempts to leave the webpage 
// (e.g., by closing the tab, refreshing the page, or navigating to another URL).
let messageForm = document.getElementById('message__form')
messageForm.addEventListener('submit', sendMessage)