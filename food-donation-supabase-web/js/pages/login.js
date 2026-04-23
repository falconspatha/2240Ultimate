import { login } from "../auth/session.js";
import { DEMO_USERS } from "../auth/demoUsers.js";
import { getRoleHome } from "../auth/authorization.js";
import { showToast } from "../ui/components.js";

export async function render(container) {
  container.innerHTML = `
    <section class="login-wrap">
      <article class="card login-card">
        <h2>Sign in</h2>
        <p class="muted">Use one of the project stakeholder accounts.</p>
        <form id="loginForm" class="form-grid" style="margin-top:.5rem">
          <label>Username<input name="username" autocomplete="username" required></label>
          <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
          <div style="grid-column:1/-1;display:flex;justify-content:flex-end">
            <button class="btn btn-primary" type="submit">Login</button>
          </div>
        </form>
        <details style="margin-top:1rem">
          <summary>Demo accounts</summary>
          <div class="table-wrap" style="margin-top:.6rem">
            <table>
              <thead><tr><th>Role</th><th>Username</th><th>Password</th></tr></thead>
              <tbody>
                ${DEMO_USERS.map((u) => `<tr><td>${u.role}</td><td>${u.username}</td><td>${u.password}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </details>
      </article>
    </section>
  `;

  container.querySelector("#loginForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const session = login(form.get("username"), form.get("password"));
    if (!session) {
      showToast("Invalid username or password.", "error");
      return;
    }
    showToast(`Welcome ${session.displayName}`);
    location.hash = `#/${getRoleHome(session.role)}`;
  });
}

export function destroy() {}
