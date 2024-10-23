# backend/app.py
from flask import Flask, request, jsonify 
from flask_cors import CORS
import face_recognition
import numpy as np
from PIL import Image
import io
import base64
import os

app = Flask(__name__)
CORS(app)

# Directory to store user face encodings
USERS_DIR = "user_faces"
if not os.path.exists(USERS_DIR):
    os.makedirs(USERS_DIR)

def get_face_encoding_from_base64(base64_image):
    try:
        # Convert base64 to image
        image_data = base64.b64decode(base64_image.split(',')[1])
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert to numpy array
        image_np = np.array(image)
        
        # Get face encodings
        face_locations = face_recognition.face_locations(image_np)
        if not face_locations:
            return None
        
        face_encodings = face_recognition.face_encodings(image_np, face_locations)
        return face_encodings[0] if face_encodings else None
    except Exception as e:
        print(f"Error processing image: {e}")
        return None

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.json
        username = data.get('username')
        face_image = data.get('faceImage')
        
        if not username or not face_image:
            return jsonify({'error': 'Missing username or face image'}), 400
        
        # Get face encoding
        face_encoding = get_face_encoding_from_base64(face_image)
        if face_encoding is None:
            return jsonify({'error': 'No face detected in image'}), 400
        
        # Save face encoding
        encoding_path = os.path.join(USERS_DIR, f"{username}.npy")
        np.save(encoding_path, face_encoding)
        
        return jsonify({'message': 'Registration successful'}), 200
    except Exception as e:
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@app.route('/api/verify', methods=['POST'])
def verify():
    try:
        data = request.json
        username = data.get('username')
        face_image = data.get('faceImage')
        
        if not username or not face_image:
            return jsonify({'error': 'Missing username or face image'}), 400
        
        # Check if user exists
        encoding_path = os.path.join(USERS_DIR, f"{username}.npy")
        if not os.path.exists(encoding_path):
            return jsonify({'error': 'User not found'}), 404
        
        # Get face encoding from uploaded image
        new_face_encoding = get_face_encoding_from_base64(face_image)
        if new_face_encoding is None:
            return jsonify({'error': 'No face detected in image'}), 400
        
        # Load stored face encoding
        stored_face_encoding = np.load(encoding_path)
        
        # Compare faces
        matches = face_recognition.compare_faces([stored_face_encoding], new_face_encoding, tolerance=0.6)
        
        if matches[0]:
            return jsonify({'message': 'Face verification successful'}), 200
        else:
            return jsonify({'error': 'Face verification failed'}), 401
    except Exception as e:
        return jsonify({'error': f'Verification failed: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)