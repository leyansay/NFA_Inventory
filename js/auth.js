function login(event) {
  event.preventDefault();

  const usernameInput = document.getElementById("username").value.trim();
  const passwordInput = document.getElementById("password").value.trim();
  const errorBox = document.getElementById("errorMessage");
  const loginButton = document.getElementById("loginButton");

  // Hide error message and clear text
  errorBox.textContent = "";
  errorBox.classList.remove("show");

  // Validate inputs
  if (!usernameInput || !passwordInput) {
    showError(errorBox, "Please fill in all fields");
    return;
  }

  // Disable login button to prevent multiple submissions
  loginButton.disabled = true;
  loginButton.textContent = "Logging in...";

  // Query the database
  db.ref("users").once("value")
    .then(snapshot => {
      console.log("Database query successful");

      if (!snapshot.exists()) {
        showError(errorBox, "No users found in database");
        resetLoginButton(loginButton);
        return;
      }

      let isValid = false;
      let loggedInUser = null;

      // Check each user in the database
      snapshot.forEach(child => {
        const user = child.val();
        
        // Compare username and password
        if (user.username === usernameInput && user.password === passwordInput) {
          isValid = true;
          loggedInUser = {
            uid: child.key,
            username: user.username,
            role: user.role || "User",
            email: user.email || "",
            fullName: user.fullName || user.username
          };
          return true; // Stop iteration
        }
      });

      if (isValid && loggedInUser) {
        console.log("Login successful for user:", loggedInUser.username);
        
        // Store user data in sessionStorage
        sessionStorage.setItem("currentUser", JSON.stringify(loggedInUser));
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("loginTime", new Date().toISOString());
        
        // Redirect based on username/role
        if (loggedInUser.username === "nfa_admin") {
          // NFA Admin goes to home.html
          window.location.href = "home.html";
        } else if (loggedInUser.username === "nfa_bsm") {
          // BSM goes to bsm_homepage.html
          window.location.href = "bsm_home.html";
        } else {
          // Default redirect for other users
          window.location.href = "home.html";
        }
      } else {
        console.log("Login failed - Invalid credentials");
        showError(errorBox, "Invalid username or password");
        resetLoginButton(loginButton);
      }
    })
    .catch(err => {
      console.error("Database error:", err);
      showError(errorBox, "System error. Please try again.");
      resetLoginButton(loginButton);
    });
}

// Helper function to show error messages
function showError(errorBox, message) {
  errorBox.textContent = message;
  errorBox.classList.add("show");
}

// Helper function to reset login button
function resetLoginButton(button) {
  button.disabled = false;
  button.textContent = "Login";
}

// Function to check if user is already logged in
function checkLoginStatus() {
  const isLoggedIn = sessionStorage.getItem("isLoggedIn");
  const currentUser = sessionStorage.getItem("currentUser");
  
  if (isLoggedIn === "true" && currentUser) {
    try {
      const user = JSON.parse(currentUser);
      
      // Redirect based on username/role
      if (user.username === "nfa_admin") {
        window.location.href = "home.html";
      } else if (user.username === "nfa_bsm") {
        window.location.href = "bsm_home.html";
      } else {
        window.location.href = "home.html";
      }
    } catch (e) {
      console.error("Error parsing user data:", e);
      // Clear invalid session data
      sessionStorage.clear();
    }
  }
}

// Check login status when page loads
if (window.location.pathname.includes("login.html") || window.location.pathname.includes("index.html")) {
  checkLoginStatus();
}