import tensorflow as tf
from tensorflow.keras import layers
from PIL import Image
import numpy as np
import os

class CBAM(layers.Layer):
    """Optimized Convolutional Block Attention Module as defined in training"""
    def __init__(self, channels, reduction_ratio=8, **kwargs):
        super(CBAM, self).__init__(**kwargs)
        self.channels = channels
        self.reduction_ratio = reduction_ratio

        # Channel Attention
        self.channel_attention_gap = layers.GlobalAveragePooling2D()
        self.channel_attention_gmp = layers.GlobalMaxPooling2D()
        self.channel_fc1 = layers.Dense(channels // reduction_ratio, activation='relu')
        self.channel_fc2 = layers.Dense(channels)

        # Spatial Attention
        self.spatial_conv = layers.Conv2D(1, 5, padding='same', activation='sigmoid')

    def build(self, input_shape):
        self.built = True
        super(CBAM, self).build(input_shape)

    def call(self, x):
        # Channel Attention
        gap = self.channel_attention_gap(x)
        gmp = self.channel_attention_gmp(x)

        gap_fc = self.channel_fc1(gap)
        gap_output = self.channel_fc2(gap_fc)

        gmp_fc = self.channel_fc1(gmp)
        gmp_output = self.channel_fc2(gmp_fc)

        channel_attention = tf.sigmoid(gap_output + gmp_output)
        channel_attention = tf.reshape(channel_attention, [-1, 1, 1, self.channels])
        x_channel = x * channel_attention

        # Spatial Attention
        avg_pool = tf.reduce_mean(x_channel, axis=3, keepdims=True)
        max_pool = tf.reduce_max(x_channel, axis=3, keepdims=True)
        spatial_concat = tf.concat([avg_pool, max_pool], axis=3)
        spatial_attention = self.spatial_conv(spatial_concat)

        return x_channel * spatial_attention

    def get_config(self):
        config = super(CBAM, self).get_config()
        config.update({
            "channels": self.channels,
            "reduction_ratio": self.reduction_ratio
        })
        return config

class LungDiseaseModel:
    def __init__(self, model_path: str):
        self.model = self._load_model(model_path)
        print(f"Model loaded successfully from {model_path}")
        
    def _load_model(self, model_path: str):
        try:
            # Load Keras model with custom CBAM layer
            model = tf.keras.models.load_model(
                model_path, 
                custom_objects={'CBAM': CBAM}
            )
            return model
        except Exception as e:
            raise RuntimeError(f"Failed to load model: {e}")
    
    def preprocess_image(self, image: Image.Image) -> np.ndarray:
        # Resize to 299x299 as required by the model
        image = image.resize((299, 299))
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        img_array = np.array(image).astype(np.float32)
        
        # The model includes an internal preprocess_input layer, 
        # so we pass raw pixel values [0-255].
        img_array = np.expand_dims(img_array, axis=0)
        
        return img_array
    
    def predict(self, image: Image.Image) -> dict:
        try:
            input_arr = self.preprocess_image(image)
            
            predictions = self.model.predict(input_arr, verbose=0)
            probabilities = predictions[0]
            
            predicted_class_idx = np.argmax(probabilities)
            confidence = float(probabilities[predicted_class_idx])
            
            # Updated Class Names from original training notebook
            class_names = {
                0: "Bacterial Pneumonia",
                1: "Corona Virus Disease",
                2: "Normal",
                3: "Tuberculosis"
            }
            
            result = {
                "prediction": class_names.get(predicted_class_idx, "Unknown"),
                "confidence": confidence * 100,
                "probabilities": {
                    class_names.get(i, f"Class_{i}"): float(probabilities[i] * 100)
                    for i in range(len(probabilities))
                }
            }
            
            return result
            
        except Exception as e:
            raise RuntimeError(f"Prediction failed: {e}")

model_instance = None

def get_model():
    global model_instance
    if model_instance is None:
        # Get path from environment or default
        model_path = os.getenv("MODEL_PATH", "backend/models/lung_disease_best_model.keras")
        
        # Handle case where CWD might be 'backend' or root
        if not os.path.exists(model_path):
            # If in root but path is missing 'backend/' prefix
            if os.path.exists(os.path.join("backend", model_path)):
                model_path = os.path.join("backend", model_path)
            # If in 'backend' but path has 'backend/' prefix
            elif model_path.startswith("backend/"):
                alt_path = model_path.replace("backend/", "", 1)
                if os.path.exists(alt_path):
                    model_path = alt_path
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found at {model_path}")
            
        model_instance = LungDiseaseModel(model_path)
    return model_instance