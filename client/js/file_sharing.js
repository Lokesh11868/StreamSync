let selectedFile = null;
let fileNameDisplay = null;

document.addEventListener('DOMContentLoaded', () => {
  const fileDisplayContainer = document.createElement('div');
  fileDisplayContainer.className = 'file-display-container';
  
  fileNameDisplay = document.createElement('div');
  fileNameDisplay.className = 'selected-file-name';
  fileNameDisplay.style.display = 'none';
  
  const clearFileButton = document.createElement('button');
  clearFileButton.type = 'button';
  clearFileButton.className = 'clear-file-button';
  clearFileButton.textContent = '✕';
  clearFileButton.style.display = 'none';
  clearFileButton.addEventListener('click', () => {
    selectedFile = null;
    document.getElementById("message_file").value = "";
    fileNameDisplay.style.display = 'none';
    clearFileButton.style.display = 'none';
  });
  
  fileDisplayContainer.appendChild(fileNameDisplay);
  fileDisplayContainer.appendChild(clearFileButton);
  
  const messageForm = document.getElementById('message__form');
  messageForm.insertBefore(fileDisplayContainer, messageForm.firstChild);
  
  const uploadButton = document.getElementById("upload_file_btn");
  if (uploadButton) {
    uploadButton.addEventListener("click", function() {
      document.getElementById("message_file").click();
    });
  } else {
    console.error("Upload button element not found!");
  }
  
  document.getElementById("message_file").addEventListener("change", function(e) {
    selectedFile = e.target.files[0];
    if (!selectedFile) return;

    let fileSize = selectedFile.size;
    let fileSizeFormatted = '';
    
    if (fileSize < 1024) {
      fileSizeFormatted = fileSize + ' bytes';
    } else if (fileSize < 1024 * 1024) {
      fileSizeFormatted = (fileSize / 1024).toFixed(1) + ' KB';
    } else {
      fileSizeFormatted = (fileSize / (1024 * 1024)).toFixed(1) + ' MB';
    }

    if (fileNameDisplay) {
      fileNameDisplay.textContent = `Selected: ${selectedFile.name} (${fileSizeFormatted})`;
      fileNameDisplay.style.display = 'block';
      
      const clearButton = document.querySelector('.clear-file-button');
      if (clearButton) clearButton.style.display = 'inline-block';
    }
  });
});

async function uploadSelectedFile() {
  if (!selectedFile) return null;
  
  const formData = new FormData();
  formData.append("file", selectedFile);
  
  const originalFileName = selectedFile.name;

  try {
    const response = await fetch('https://streamsync-n9xk.onrender.com/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    
    document.getElementById("message_file").value = "";
    
    if (fileNameDisplay) {
      fileNameDisplay.style.display = 'none';
      const clearButton = document.querySelector('.clear-file-button');
      if (clearButton) clearButton.style.display = 'none';
    }
    
    selectedFile = null;
    return { url: data.url, fileName: originalFileName };
  } catch (error) {
    console.error('Error during upload:', error);
    return null;
  }
}