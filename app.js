// Replace with your Google Apps Script Web App URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyQO4yLkxV6jGsNuvnYdoh0bxwSf2P4B64twzTZA3Smw1uMRk-cAxiEhcfCq9q9pUWz/exec';

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
    
    // Compress and create preview
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set max dimensions to avoid large uploads
            const maxWidth = 1920;
            const maxHeight = 1080;
            let { width, height } = img;
            
            // Calculate new dimensions
            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            selectedImage = canvas.toDataURL('image/jpeg', 0.7); // Reduced quality for faster upload
            
            // Show preview
            document.getElementById('previewImage').src = selectedImage;
            document.getElementById('previewContainer').style.display = 'block';
        };
        img.src = e.target.result;
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
        // Method 1: Try direct POST (might work after recent Google updates)
        const directResponse = await tryDirectUpload();
        if (directResponse.success) {
            showStatus(`Success! Photo saved as "${directResponse.shortName}"`, 'success');
            resetForm();
            showLoading(false);
            return;
        }
    } catch (error) {
        console.log('Direct upload failed, trying JSONP method...');
    }
    
    // Method 2: Fallback to JSONP method
    try {
        await uploadViaJsonp();
    } catch (error) {
        showStatus(`Upload failed: ${error.message}`, 'error');
        showLoading(false);
    }
}

async function tryDirectUpload() {
    const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            imageData: selectedImage,
            fileName: selectedFile ? selectedFile.name : 'camera_photo_' + Date.now() + '.jpg'
        })
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
}

function uploadViaJsonp() {
    return new Promise((resolve, reject) => {
        // Create unique callback name
        const callbackName = 'photoUploadCallback_' + Date.now();
        
        // Create callback function
        window[callbackName] = function(response) {
            // Cleanup
            document.head.removeChild(script);
            delete window[callbackName];
            
            showLoading(false);
            
            if (response.success) {
                showStatus(`Success! Photo saved as "${response.shortName}"`, 'success');
                resetForm();
                resolve(response);
            } else {
                showStatus(`Error: ${response.error}`, 'error');
                reject(new Error(response.error));
            }
        };
        
        // Create script tag for JSONP
        const script = document.createElement('script');
        
        // Prepare URL with parameters
        const params = new URLSearchParams({
            action: 'upload',
            callback: callbackName,
            imageData: selectedImage,
            fileName: selectedFile ? selectedFile.name : 'camera_photo_' + Date.now() + '.jpg'
        });
        
        script.src = SCRIPT_URL + '?' + params.toString();
        script.onerror = () => {
            document.head.removeChild(script);
            delete window[callbackName];
            showLoading(false);
            reject(new Error('JSONP request failed'));
        };
        
        // Add script to head to trigger the request
        document.head.appendChild(script);
        
        // Set timeout for cleanup
        setTimeout(() => {
            if (window[callbackName]) {
                document.head.removeChild(script);
                delete window[callbackName];
                showLoading(false);
                reject(new Error('Upload timeout'));
            }
        }, 30000); // 30 second timeout
    });
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

// Network status handling
window.addEventListener('online', () => {
    showStatus('Back online! You can upload photos now.', 'success');
});

window.addEventListener('offline', () => {
    showStatus('You\'re offline. Photos will be uploaded when connection returns.', 'error');
});



