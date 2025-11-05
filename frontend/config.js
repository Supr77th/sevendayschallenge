// API Configuration
const CONFIG = {
    API_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api' 
        : 'https://sevendayschallenge.vercel.app/api', // Replace with your actual backend URL
    USER_ID: 'user_' + (localStorage.getItem('7jacked_user_id') || generateUserId())
};

function generateUserId() {
    const id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('7jacked_user_id', id.replace('user_', ''));
    return id.replace('user_', '');
}

// Export for use in app.js
window.CONFIG = CONFIG;