const USER_KEY = 'partner-user-details';

const StorageService = {
  setUserDetails(user) {
    try {
      if (!user) {
        localStorage.removeItem(USER_KEY);
        return;
      }
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to store partner user details:', error);
    }
  },

  getUserDetails() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('Failed to read partner user details:', error);
      return null;
    }
  },

  clearUserDetails() {
    try {
      localStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('Failed to clear partner user details:', error);
    }
  },

  clearAll() {
    this.clearUserDetails();
  },
};

export default StorageService;
