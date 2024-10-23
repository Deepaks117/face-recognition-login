document.addEventListener('DOMContentLoaded', () => {
    const faceRecognitionBtn = document.getElementById('faceRecognitionBtn');
    const video = document.getElementById('video');
    const captureControls = document.querySelector('.face-capture-controls');
    const captureRegisterBtn = document.getElementById('captureRegister');
    const captureVerifyBtn = document.getElementById('captureVerify');
    let stream = null;

    // Add loading state management
    const setLoading = (isLoading) => {
        const buttons = [faceRecognitionBtn, captureRegisterBtn, captureVerifyBtn];
        buttons.forEach(button => {
            if (button) {
                button.disabled = isLoading;
                if (isLoading) {
                    button.originalText = button.textContent;
                    button.textContent = 'Processing...';
                } else {
                    button.textContent = button.originalText || button.textContent;
                }
            }
        });
    };

    const startCamera = async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                } 
            });
            video.srcObject = stream;
            video.style.display = 'block';
            captureControls.style.display = 'flex';
            
            // Wait for video to be ready
            await new Promise((resolve) => {
                video.onloadedmetadata = resolve;
            });
            video.play();
        } catch (error) {
            console.error('Error accessing camera:', error);
            if (error.name === 'NotAllowedError') {
                alert('Camera access denied. Please enable camera permissions in your browser settings.');
            } else if (error.name === 'NotFoundError') {
                alert('No camera found. Please ensure your camera is properly connected.');
            } else {
                alert('Unable to access your camera. Please check permissions and try again.');
            }
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            video.style.display = 'none';
            captureControls.style.display = 'none';
            stream = null;
            video.srcObject = null;
        }
    };

    const captureAndSendImage = async (mode) => {
        const username = document.getElementById('username').value.trim();
        
        if (!username) {
            alert('Please enter a valid username');
            return;
        }

        if (!stream || !video.srcObject) {
            alert('Camera not started. Please try again.');
            return;
        }

        try {
            setLoading(true);

            // Ensure video is playing and ready
            if (video.paused || video.ended) {
                await video.play();
            }

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            
            // Flip horizontally if needed (mirror effect)
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            
            ctx.drawImage(video, 0, 0);
            const imageData = canvas.toDataURL('image/jpeg', 0.9); // Added quality parameter

            const endpoint = mode === 'register' ? '/api/register' : '/api/verify';

            const response = await fetch(`http://localhost:5000${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    faceImage: imageData
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message);
                if (mode === 'verify') {
                    // Store auth token if provided
                    if (data.token) {
                        localStorage.setItem('authToken', data.token);
                    }
                    // Redirect to dashboard
                    window.location.href = "/dashboard";
                }
            } else {
                throw new Error(data.error || 'Operation failed');
            }
        } catch (error) {
            console.error('Error:', error);
            alert(error.message || 'An error occurred. Please try again.');
        } finally {
            setLoading(false);
            stopCamera();
        }
    };

    // Event Listeners
    faceRecognitionBtn.addEventListener('click', startCamera);
    captureRegisterBtn.addEventListener('click', () => captureAndSendImage('register'));
    captureVerifyBtn.addEventListener('click', () => captureAndSendImage('verify'));

    // Cleanup on page unload
    window.addEventListener('beforeunload', stopCamera);
});