// Chat box resize functionality
document.addEventListener('DOMContentLoaded', function() {
    const chatContainer = document.getElementById('messages__container');
    const resizeHandle = document.querySelector('.chat-resize-handle');
    const streamContainer = document.getElementById('stream__container');
    const messageForm = document.getElementById('message__form');
    
    let isDragging = false;
    let startX = 0;
    let startWidth = 0;
    
    // Minimum and maximum widths
    const MIN_WIDTH = 240; // 15rem
    const MAX_WIDTH = 400; // 25rem
    
    function updateStreamContainerWidth() {
        const chatWidth = chatContainer.offsetWidth;
        const windowWidth = window.innerWidth;
        const newStreamWidth = windowWidth - chatWidth;
        
        streamContainer.style.width = `${newStreamWidth}px`;
        streamContainer.style.left = '0px';
        
        // Update message form width
        messageForm.style.width = `${chatWidth - 20}px`; // Subtract padding
    }
    
    function startResize(e) {
        isDragging = true;
        startX = e.clientX;
        startWidth = chatContainer.offsetWidth;
        
        resizeHandle.classList.add('dragging');
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
        
        e.preventDefault();
    }
    
    function doResize(e) {
        if (!isDragging) return;
        
        const deltaX = startX - e.clientX;
        const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + deltaX));
        
        chatContainer.style.width = `${newWidth}px`;
        updateStreamContainerWidth();
        
        e.preventDefault();
    }
    
    function stopResize() {
        if (!isDragging) return;
        
        isDragging = false;
        resizeHandle.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }
    
    // Event listeners for the resize handle
    resizeHandle.addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);
    
    // Prevent text selection while dragging
    resizeHandle.addEventListener('selectstart', function(e) {
        e.preventDefault();
    });
    
    // Initialize the layout
    updateStreamContainerWidth();
    
    // Update on window resize
    window.addEventListener('resize', updateStreamContainerWidth);
    
    // Handle mobile devices (disable resize on touch)
    if ('ontouchstart' in window) {
        resizeHandle.style.display = 'none';
    }
}); 