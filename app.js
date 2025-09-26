// Replace with your Google Apps Script Web App URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx5x0NzcbbPKJwg5ZISL015g2RzUki32TRgerdwXqCEx2H50fhCd8rMt4DRytgA-E22/exec';

let selectedFile = null;
let selectedImage = null;

// Drag and drop functionality
const uploadArea = document.getElementById('uploadArea');

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        handleFile(files[0]);
    }
});

function openCamera() {
    document.getElementById('cameraInput').click();
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        handleFile(file);
    }
}

function handleFile(file) {
    selectedFile = file;
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
        selectedImage = e.target.result;
        document.getElementById('previewImage').src = selectedImage;
        document.getElementById('previewContainer').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

async function uploadPhoto() {
    if (!selectedImage) {
        showStatus('Please select a photo first', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'uploadPhoto',
                imageData: selectedImage,
                fileName: selectedFile ? selectedFile.name : 'camera_photo.jpg'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatus(`Success! Photo saved as "${result.shortName}"`, 'success');
            resetForm();
        } else {
            showStatus(`Error: ${result.error}`, 'error');
        }
    } catch (error) {
        showStatus(`Upload failed: ${error.message}`, 'error');
    }
    
    showLoading(false);
}

function resetForm() {
    selectedFile = null;
    selectedImage = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('cameraInput').value = '';
    document.getElementById('previewContainer').style.display = 'none';
    document.getElementById('status').innerHTML = '';
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
    
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 5000);
    }
}

// Offline functionality
window.addEventListener('online', () => {
    showStatus('Back online! You can upload photos now.', 'success');
});

window.addEventListener('offline', () => {
    showStatus('You\'re offline. Photos will be uploaded when connection returns.', 'error');
});
