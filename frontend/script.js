// API Configuration
const API_URL = ''; // Relative path since frontend is served by the backend

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const removeBtn = document.getElementById('removeBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultsSection = document.getElementById('resultsSection');
const errorSection = document.getElementById('errorSection');
const resetBtn = document.getElementById('resetBtn');
const errorResetBtn = document.getElementById('errorResetBtn');

// Current selected file
let currentFile = null;

// Event Listeners
uploadArea.addEventListener('click', () => fileInput.click());
uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
removeBtn.addEventListener('click', removeImage);
analyzeBtn.addEventListener('click', analyzeImage);
resetBtn.addEventListener('click', resetApp);
errorResetBtn.addEventListener('click', resetApp);

// Drag and drop support
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'var(--primary-color)';
    uploadArea.style.background = '#f1f5f9';
});

uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'var(--border-color)';
    uploadArea.style.background = 'var(--bg-light)';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'var(--border-color)';
    uploadArea.style.background = 'var(--bg-light)';

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleFile(file);
    } else {
        showToast('Please drop a valid image file', 'error');
    }
});

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
        showToast('File size must be less than 10MB', 'error');
        return;
    }

    currentFile = file;

    // Preview image
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        uploadArea.style.display = 'none';
        imagePreview.style.display = 'block';
        analyzeBtn.disabled = false;
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    currentFile = null;
    fileInput.value = '';
    uploadArea.style.display = 'block';
    imagePreview.style.display = 'none';
    previewImg.src = '';
    analyzeBtn.disabled = true;

    // Hide results if showing
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
}

// Analyze image
async function analyzeImage() {
    if (!currentFile) return;

    // Show loading state
    analyzeBtn.disabled = true;
    const btnText = analyzeBtn.querySelector('.btn-text');
    const spinner = analyzeBtn.querySelector('.loading-spinner');
    btnText.style.display = 'none';
    spinner.style.display = 'inline-block';

    // Prepare form data
    const formData = new FormData();
    formData.append('file', currentFile);

    try {
        // Check API health first
        const healthResponse = await fetch(`${API_URL}/health`);
        if (!healthResponse.ok) {
            throw new Error('API server is not responding');
        }

        // Send prediction request
        const response = await fetch(`${API_URL}/predict`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Prediction failed');
        }

        const result = await response.json();
        displayResults(result);

    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
    } finally {
        // Reset button state
        analyzeBtn.disabled = false;
        btnText.style.display = 'inline';
        spinner.style.display = 'none';
    }
}

// Display results
function displayResults(result) {
    const diseaseName = document.getElementById('diseaseName');
    const confidenceFill = document.getElementById('confidenceFill');
    const confidenceText = document.getElementById('confidenceText');
    const probabilitiesList = document.getElementById('probabilitiesList');
    const recommendationText = document.getElementById('recommendationText');
    const resultIcon = document.getElementById('resultIcon');

    // Update main result
    diseaseName.textContent = result.prediction;
    const confidence = result.confidence;
    confidenceFill.style.width = `${confidence}%`;
    confidenceText.textContent = `${confidence.toFixed(1)}%`;

    // Set icon and color based on disease
    updateResultStyling(result.prediction, resultIcon);

    // Display all probabilities
    probabilitiesList.innerHTML = '';
    const sortedProbs = Object.entries(result.probabilities)
        .sort((a, b) => b[1] - a[1]);

    sortedProbs.forEach(([disease, prob]) => {
        const probItem = createProbabilityItem(disease, prob);
        probabilitiesList.appendChild(probItem);
    });

    // Add recommendations
    recommendationText.textContent = getRecommendations(result.prediction, confidence);

    // Show results section
    resultsSection.style.display = 'block';
    errorSection.style.display = 'none';

    // Smooth scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Show success toast
    showToast('Analysis completed successfully!', 'success');
}

function updateResultStyling(disease, iconElement) {
    const resultDisease = document.getElementById('diseaseName');
    const confidenceFill = document.getElementById('confidenceFill');

    // Remove existing classes
    resultDisease.classList.remove('text-normal', 'text-pneumonia', 'text-covid', 'text-tb');

    switch (disease.toLowerCase()) {
        case 'normal':
            iconElement.textContent = '✅';
            resultDisease.style.color = '#3b82f6';
            confidenceFill.style.background = 'linear-gradient(90deg, #3b82f6, #60a5fa)';
            break;
        case 'bacterial pneumonia':
            iconElement.textContent = '🫁';
            resultDisease.style.color = '#f59e0b';
            confidenceFill.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
            break;
        case 'corona virus disease':
            iconElement.textContent = '🦠';
            resultDisease.style.color = '#ef4444';
            confidenceFill.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
            break;
        case 'tuberculosis':
            iconElement.textContent = '⚠️';
            resultDisease.style.color = '#8b5cf6';
            confidenceFill.style.background = 'linear-gradient(90deg, #8b5cf6, #a78bfa)';
            break;
        default:
            iconElement.textContent = '🏥';
            resultDisease.style.color = '#64748b';
            confidenceFill.style.background = 'linear-gradient(90deg, #64748b, #94a3b8)';
    }
}

function createProbabilityItem(disease, probability) {
    const div = document.createElement('div');
    div.className = 'probability-item';

    const label = document.createElement('div');
    label.className = 'probability-label';
    label.innerHTML = `
        <span>${disease}</span>
        <span>${probability.toFixed(1)}%</span>
    `;

    const barContainer = document.createElement('div');
    barContainer.className = 'probability-bar';

    const fill = document.createElement('div');
    fill.className = `probability-fill fill-${disease.toLowerCase().replace(/[^a-z]/g, '-') || 'default'}`;
    fill.style.width = `${probability}%`;
    fill.textContent = probability > 15 ? `${probability.toFixed(1)}%` : '';

    barContainer.appendChild(fill);
    div.appendChild(label);
    div.appendChild(barContainer);

    return div;
}

function getRecommendations(disease, confidence) {
    const recommendations = {
        'normal': 'No abnormalities detected. Continue regular health check-ups and maintain a healthy lifestyle. However, if symptoms persist, consult a healthcare provider.',
        'bacterial pneumonia': 'Bacterial Pneumonia detected with high probability. Please consult a pulmonologist immediately. Common treatments include antibiotics, rest, and hydration. Fever management may be necessary.',
        'corona virus disease': 'Corona Virus Disease detected. Isolate immediately and contact your healthcare provider. Monitor oxygen levels and seek emergency care if breathing difficulties occur.',
        'tuberculosis': 'Tuberculosis suspected. Urgent medical consultation required for confirmatory tests (sputum culture, PCR). TB is treatable with proper antibiotic regimen.',
        'default': 'Please consult a healthcare professional for proper diagnosis and treatment recommendations.'
    };

    let recommendation = recommendations[disease.toLowerCase()] || recommendations.default;

    if (confidence < 70) {
        recommendation += ' Note: Confidence is moderate. Consider re-uploading a clearer X-ray image for better accuracy.';
    }

    return recommendation;
}

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message || 'An error occurred while analyzing the image. Please try again.';
    errorSection.style.display = 'block';
    resultsSection.style.display = 'none';

    showToast(message || 'Analysis failed. Please try again.', 'error');
}

function resetApp() {
    removeImage();
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Check API health on load
async function checkAPIHealth() {
    try {
        const response = await fetch(`${API_URL}/health`);
        if (response.ok) {
            showToast('Connected to API server', 'success');
        } else {
            showToast('API server is not responding properly', 'warning');
        }
    } catch (error) {
        showToast('Cannot connect to API server. Make sure it\'s running on ' + API_URL, 'error');
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAPIHealth();

    // Add keyboard shortcut (Ctrl/Cmd + U for upload)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
            e.preventDefault();
            fileInput.click();
        }
    });
});

// Add loading animation for analyze button
analyzeBtn.addEventListener('click', () => {
    if (analyzeBtn.disabled) return;

    // Add ripple effect
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');
    analyzeBtn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
});