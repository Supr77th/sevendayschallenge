const CONFIG = {
    API_URL: "https://selfless-optimism-production.up.railway.app/api",
    USER_ID: localStorage.getItem('7days_user') || `user_${Date.now()}`
};

localStorage.setItem('7days_user', CONFIG.USER_ID);
window.CONFIG = CONFIG;
