const userBtn = document.getElementById("user-btn");
const adminBtn = document.getElementById("admin-btn");

userBtn.addEventListener("click", () => {
    adminBtn.classList.remove("active-admin"); // Remove navy blue
    userBtn.classList.add("active-user");      // Add forest green
});

adminBtn.addEventListener("click", () => {
    userBtn.classList.remove("active-user");   // Remove forest green
    adminBtn.classList.add("active-admin");    // Add navy blue
});


const loginForm = document.getElementById("login-form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (usernameInput.value.trim() === "" || passwordInput.value.trim() === "") {
        alert("Please fill in both username and Password!");
    } else {
        alert("Welcome, " + usernameInput.value.trim() + "!");
    }
});