const CONFIG = {
    API_URL: "selfless-optimism-production.up.railway.app/api", // <--- Use your Railway backend URL
    USER_ID: localStorage.getItem('7days_user') || `user_${Date.now()}`
};

localStorage.setItem('7days_user', CONFIG.USER_ID);
window.CONFIG = CONFIG;
