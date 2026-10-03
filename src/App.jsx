import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Flame,
  Flower2,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  NotebookPen,
  Plus,
  Search,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";

const moods = ["Great", "Good", "Okay", "Low", "Stressed"];
const affirmationLibrary = [
  "Small steps still count, and this is a beautiful place to begin.",
  "You are allowed to move gently and still make real progress.",
  "Your momentum is not measured by perfection; it is measured by showing up.",
  "A kind plan is still a plan, and it deserves room to breathe.",
  "The next right step is often smaller than your mind makes it seem.",
  "You are building a life with intention, one steady choice at a time.",
];
const nav = [
  ["Home", LayoutDashboard],
  ["Journal", BookOpen],
  ["To-Do List", CheckCircle2],
  ["Mood Tracker", Heart],
  ["Vision Board", Flower2],
  ["AI Roadmap", TrendingUp],
  ["Collaborations", UserRound],
  ["Calendar", CalendarDays],
  ["AI Chat", MessageCircle],
  ["Notifications", Bell],
  ["Settings", UserRound],
];

async function api(path, options = {}) {
  const token = localStorage.getItem("ivy_token");
  const response = await fetch(`/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.error || "Something went wrong");
  return data;
}

function Logo() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Flower2 size={19} />
      </span>
      <span>
        Ivy<span>Journal</span>
      </span>
    </div>
  );
}
function Button({ children, variant = "primary", ...props }) {
  return (
    <button className={`button ${variant}`} {...props}>
      {children}
    </button>
  );
}
function Empty({ icon: Icon = Sparkles, title, body, action }) {
  return (
    <div className="empty">
      <Icon size={28} />
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}
function Toast({ message, onClose }) {
  return message ? (
    <div className="toast">
      <CheckCircle2 size={18} />
      {message}
      <button onClick={onClose}>
        <X size={15} />
      </button>
    </div>
  ) : null;
}

function ProfileMenu({ user, go, onLogout, onClose }) {
  const items = [
    { label: "My Profile", page: "Settings" },
    { label: "My Rewards", page: "Rewards" },
    { label: "Progress", page: "Progress" },
    { label: "History", page: "History" },
    { label: "Logout", action: onLogout },
  ];
  return (
    <div className="profile-menu">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            onClose?.();
            if (item.action) {
              item.action();
              return;
            }
            go(item.page);
          }}
        >
          <span>{item.label}</span>
          {item.label === "Logout" ? <LogOut size={15} /> : <ChevronRight size={14} />}
        </button>
      ))}
    </div>
  );
}

function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (mode === "forgot") {
        const data = await api("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email: form.email }),
        });
        setMessage(
          data.resetToken
            ? `Development reset token: ${data.resetToken}`
            : data.message,
        );
      } else if (mode === "reset") {
        const data = await api("/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({ token: form.token, password: form.password }),
        });
        setMessage(data.message);
        setMode("login");
      } else {
        const data = await api(
          `/auth/${mode === "login" ? "login" : "signup"}`,
          {
            method: "POST",
            body: JSON.stringify(
              mode === "login"
                ? { email: form.email, password: form.password }
                : {
                    fullName: form.fullName,
                    username: form.username,
                    email: form.email,
                    password: form.password,
                  },
            ),
          },
        );
        localStorage.setItem("ivy_token", data.token);
        onLogin(data.user);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  const forgot = mode === "forgot";
  const reset = mode === "reset";
  return (
    <main className="auth-page">
      <div className="auth-art">
        <Logo />
        <div className="art-copy">
          <p className="eyebrow">A softer way to grow</p>
          <h1>
            Your goals,
            <br />
            <em>your pace.</em>
          </h1>
          <p>
            Plan your days, keep your thoughts close, and make progress that
            feels like yours.
          </p>
          <div className="art-note">
            <Sparkles size={18} />
            <span>Small steps are still steps forward.</span>
          </div>
        </div>
        <div className="leaf leaf-one">✦</div>
        <div className="leaf leaf-two">♡</div>
      </div>
      <section className="auth-form">
        <div className="auth-inner">
          <div className="mobile-logo">
            <Logo />
          </div>
          <p className="eyebrow">
            {forgot || reset
              ? "Account access"
              : mode === "login"
                ? "Welcome back"
                : "Begin your story"}
          </p>
          <h2>
            {forgot
              ? "Find your way back."
              : reset
                ? "Choose a new password."
                : mode === "login"
                  ? "Come on in."
                  : "Make room for what matters."}
          </h2>
          <p className="muted">
            {forgot
              ? "We will help you get back into your space."
              : reset
                ? "Use the secure token from your reset email."
                : mode === "login"
                  ? "Your little corner of calm is waiting."
                  : "Create an account and let your next chapter unfold."}
          </p>
          <form onSubmit={submit}>
            {mode === "signup" && (
              <>
                <label>
                  Full name
                  <input
                    required
                    onChange={(e) =>
                      setForm({ ...form, fullName: e.target.value })
                    }
                    placeholder="Sahasra Rao"
                  />
                </label>
                <label>
                  Username
                  <input
                    required
                    onChange={(e) =>
                      setForm({ ...form, username: e.target.value })
                    }
                    placeholder="sahasra"
                  />
                </label>
              </>
            )}
            {reset && (
              <label>
                Reset token
                <input
                  required
                  value={form.token || ""}
                  onChange={(e) => setForm({ ...form, token: e.target.value })}
                  placeholder="Paste your reset token"
                />
              </label>
            )}
            <label>
              Email
              {reset ? (
                <input
                  type="email"
                  disabled
                  value={form.email || ""}
                  placeholder="Not needed for reset"
                />
              ) : (
                <input
                  required
                  type="email"
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                />
              )}
            </label>
            {!forgot && (
              <label>
                Password
                <input
                  required
                  minLength="8"
                  type="password"
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="8+ characters"
                />
              </label>
            )}
            {error && <div className="form-error">{error}</div>}
            {message && <div className="form-success">{message}</div>}
            <Button disabled={loading}>
              {loading
                ? "Working..."
                : forgot
                  ? "Send reset instructions"
                  : reset
                    ? "Update password"
                    : mode === "login"
                      ? "Enter IvyJournal"
                      : "Create my space"}{" "}
              <ArrowRight size={17} />
            </Button>
          </form>
          {mode === "login" && (
            <button
              className="switch"
              onClick={() => {
                setMode("forgot");
                setError("");
              }}
            >
              Forgot your password?
            </button>
          )}
          <button
            className="switch"
            onClick={() => {
              setMode(mode === "login" || forgot || reset ? "signup" : "login");
              setError("");
              setMessage("");
            }}
          >
            {mode === "login" || forgot || reset
              ? "New here? Create an account"
              : "Already have an account? Sign in"}
          </button>
          {forgot && (
            <button className="switch" onClick={() => setMode("reset")}>
              Already have a reset token?
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

function Shell({ user, onLogout }) {
  const [page, setPage] = useState("Home");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [search, setSearch] = useState("");
  const [inspiration, setInspiration] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const notify = (text) => {
    setToast(text);
    setTimeout(() => setToast(""), 3000);
  };
  const refreshNotifications = () =>
    api("/notifications")
      .then((items) => setNotificationCount(items.filter((item) => !item.is_read).length))
      .catch(() => setNotificationCount(0));
  const refreshDashboard = () =>
    api("/dashboard")
      .then(setDashboard)
      .catch((e) => notify(e.message));
  useEffect(() => {
    refreshDashboard();
    refreshNotifications();
    api("/inspiration").then(setInspiration).catch(() => {});
  }, []);
  const go = (name) => {
    setPage(name);
    setProfileMenuOpen(false);
    setMobileOpen(false);
  };
  if (!dashboard)
    return (
      <div className="loading-screen">
        <Logo />
        <div className="spinner" />
        <p>Making space for your day...</p>
      </div>
    );
  return (
    <div className="app-shell">
      <aside className={mobileOpen ? "sidebar open" : "sidebar"}>
        <div className="sidebar-top">
          <Logo />
          <button
            className="icon-button mobile-close"
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="side-label">Your space</div>
        <nav>
          {nav.map(([name, Icon]) => (
            <button
              key={name}
              className={page === name ? "nav-item active" : "nav-item"}
              onClick={() => go(name)}
            >
              <Icon size={17} />
              <span>{name}</span>
              {name === "Home" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="side-quote">
          <Flower2 size={18} />
          <p>“{inspiration?.quote || affirmationLibrary[0]}”</p>
          <small>— {inspiration?.author || "Ivy"}</small>
        </div>
        <button className="nav-item logout" onClick={onLogout}>
          <LogOut size={17} />
          <span>Log out</span>
        </button>
      </aside>
      <main className="main">
        <header className="topbar">
          <button
            className="icon-button menu-button"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={22} />
          </button>
          <div className="top-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your journal..."
            />
          </div>
          <div className="top-actions">
            <button className="icon-button" onClick={() => go("AI Chat")}>
              <MessageCircle size={19} />
            </button>
            <button
              className="icon-button notification"
              onClick={() => go("Notifications")}
            >
              <span>{notificationCount}</span>
              <Bell size={19} />
            </button>
            <div className="user-menu-wrap">
              <button
                className="user-chip"
                onClick={() => setProfileMenuOpen((value) => !value)}
              >
                <div className="avatar">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name || "Profile"} />
                  ) : (
                    user.full_name?.[0] || "I"
                  )}
                </div>
                <div>
                  <strong>{user.full_name}</strong>
                  <small>@{user.username}</small>
                </div>
              </button>
              {profileMenuOpen && (
                <ProfileMenu
                  user={user}
                  go={go}
                  onLogout={onLogout}
                  onClose={() => setProfileMenuOpen(false)}
                />
              )}
            </div>
          </div>
        </header>
        <div className="page-content">
          {page === "Home" && (
            <Dashboard
              data={dashboard}
              user={user}
              go={go}
              notify={notify}
              onChange={refreshDashboard}
            />
          )}
          {page === "To-Do List" && <Tasks notify={notify} onChanged={refreshDashboard} />}
          {page === "Journal" && <Journal notify={notify} />}
          {page === "Mood Tracker" && <Mood notify={notify} />}
          {page === "Vision Board" && <VisionBoard notify={notify} />}
          {page === "AI Roadmap" && <Roadmap notify={notify} />}
          {page === "Collaborations" && (
            <Collaborations notify={notify} user={user} />
          )}
          {page === "Calendar" && <Calendar data={dashboard} />}
          {page === "Progress" && <Progress data={dashboard} />}
          {page === "History" && <History />}
          {page === "Rewards" && <Rewards />}
          {page === "AI Chat" && <Chat />}
          {page === "Notifications" && (
            <Notifications notify={notify} onRead={refreshNotifications} />
          )}
          {page === "Settings" && <Settings user={user} notify={notify} />}
        </div>
      </main>
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

function Dashboard({ data, user, go, notify, onChange }) {
  const percent = data.taskStats.total
    ? Math.round((data.taskStats.completed / data.taskStats.total) * 100)
    : 0;
  const [suggestions, setSuggestions] = useState([]);
  useEffect(() => {
    api("/suggestions")
      .then(setSuggestions)
      .catch(() => {});
  }, []);
  const addSuggestion = async (suggestion) => {
    await api("/suggestions/add", {
      method: "POST",
      body: JSON.stringify(suggestion),
    });
    notify("Added to your task list");
  };
  const toggleTask = async (task) => {
    try {
      await api(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !task.completed }),
      });
      await onChange?.();
      notify(task.completed ? "Task reopened" : "One step closer!");
    } catch (error) {
      notify(error.message || "Could not update this task.");
    }
  };
  return (
    <>
      <div className="welcome-row">
        <div>
          <p className="eyebrow">Tuesday, September 15, 2026</p>
          <h1>
            Good morning, {user.full_name?.split(" ")[0] || "friend"}{" "}
            <span className="heart">♡</span>
          </h1>
          <p className="subtitle">Your goals, your pace, your journey.</p>
        </div>
        <button className="date-pill" onClick={() => go("Calendar")}>
          <CalendarDays size={16} /> Today
        </button>
      </div>
      <section className="hero-grid">
        <div className="hero-card">
          <div>
            <p className="eyebrow light">A note for today</p>
            <h2>
              Show up for the
              <br />
              <em>life you're building.</em>
            </h2>
            <p>One intentional thing is enough to make today count.</p>
            <Button onClick={() => go("To-Do List")}>
              View today's plan <ArrowRight size={16} />
            </Button>
          </div>
          <div className="hero-sun">
            <Sparkles size={31} />
          </div>
        </div>
        <div className="stat-card blush">
          <div className="stat-icon">
            <Flame size={20} />
          </div>
          <p>Current streak</p>
          <strong>
            {data.streak.current_count || 0} <small>days</small>
          </strong>
          <span>Keep the rhythm going ✦</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon cream-icon">
            <Target size={20} />
          </div>
          <p>Progress</p>
          <strong>
            {data.taskStats.completed}/{data.taskStats.total}
          </strong>
          <div className="progress-track">
            <i style={{ width: `${percent}%` }} />
          </div>
          <span>Completed Tasks: {data.taskStats.completed}/{data.taskStats.total}</span>
        </div>
      </section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Your day, gently organized</p>
          <h2>Today at a glance</h2>
        </div>
        <button className="text-button" onClick={() => go("Calendar")}>
          Open calendar <ChevronRight size={16} />
        </button>
      </div>
      <section className="dashboard-grid">
        <div className="panel task-panel">
          <div className="panel-head">
            <h3>Today's tasks</h3>
            <button className="circle-add" onClick={() => go("To-Do List")}>
              <Plus size={17} />
            </button>
          </div>
          {data.tasks.length ? (
            data.tasks.slice(0, 4).map((task) => (
              <div className="task-line" key={task.id}>
                <button
                  type="button"
                  className={task.completed ? "check checked" : "check"}
                  onClick={() => toggleTask(task)}
                  aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                >
                  {task.completed && <Check size={13} />}
                </button>
                <div>
                  <strong className={task.completed ? "done" : ""}>
                    {task.title}
                  </strong>
                  <small>
                    {task.category} · {task.priority} priority
                  </small>
                </div>
              </div>
            ))
          ) : (
            <Empty
              icon={CheckCircle2}
              title="A clear little slate"
              body="Add something kind and achievable."
            />
          )}
        </div>
        <div className="panel mood-panel">
          <div className="panel-head">
            <h3>Today's mood</h3>
            <button className="text-button" onClick={() => go("Mood Tracker")}>
              Update <ChevronRight size={15} />
            </button>
          </div>
          <div className="mood-main">
            <div className="mood-orb">
              {data.moods[0]?.mood === "Great" ? "☀" : "♡"}
            </div>
            <div>
              <strong>{data.moods[0]?.mood || "Not recorded"}</strong>
              <p>
                {data.moods[0]
                  ? "A little check-in can change a whole day."
                  : "How are you feeling today?"}
              </p>
            </div>
          </div>
          <div className="mood-week">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
              <div key={i}>
                <span>{day}</span>
                <i className={i < 4 ? "mood-dot filled" : "mood-dot"}>
                  {i < 4 ? "•" : ""}
                </i>
              </div>
            ))}
          </div>
        </div>
        <div className="panel journal-panel">
          <div className="panel-head">
            <h3>Recent reflection</h3>
            <button className="text-button" onClick={() => go("Journal")}>
              Open journal <ChevronRight size={15} />
            </button>
          </div>
          {data.journal ? (
            <>
              <p className="journal-date">
                {new Date(data.journal.created_at).toLocaleDateString(
                  undefined,
                  { month: "long", day: "numeric" },
                )}
              </p>
              <h3>{data.journal.title}</h3>
              <p className="journal-preview">{data.journal.content}</p>
              <div className="tag-row">
                <span>♡ {data.journal.mood}</span>
                <span>✦ reflection</span>
              </div>
            </>
          ) : (
            <Empty
              icon={BookOpen}
              title="Your story starts here"
              body="Write your first entry."
            />
          )}
        </div>
        <div className="panel ai-panel">
          <div className="ai-head">
            <span className="ai-badge">
              <Sparkles size={14} /> Ivy AI
            </span>
            <span className="tiny-label">For your next step</span>
          </div>
          <h3>
            A little momentum,
            <br />
            <em>made for you.</em>
          </h3>
          {suggestions.slice(0, 1).map((item) => (
            <div className="suggestion" key={item.title}>
              <div className="suggestion-icon">✦</div>
              <div>
                <strong>{item.title}</strong>
                <p>{item.reason}</p>
              </div>
              <button
                onClick={() => addSuggestion(item)}
                aria-label="Add suggestion"
              >
                <Plus size={18} />
              </button>
            </div>
          ))}
        </div>
      </section>
      <div className="appreciation">
        <span>✦</span>
        <p>
          <strong>You don't have to do it all.</strong> You only have to take
          the next small step.
        </p>
        <span>✦</span>
      </div>
    </>
  );
}

function Tasks({ notify, onChanged }) {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({ priority: "Medium" });
  const [show, setShow] = useState(false);
  const load = () => api("/tasks").then(setTasks);
  useEffect(() => {
    load();
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    await api("/tasks", { method: "POST", body: JSON.stringify(form) });
    setForm({ priority: "Medium" });
    setShow(false);
    await load();
    await onChanged?.();
    notify("Task added to your day");
  };
  const toggle = async (task) => {
    await api(`/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed: !task.completed }),
    });
    await load();
    await onChanged?.();
    notify(task.completed ? "Task reopened" : "One step closer!");
  };
  const remove = async (id) => {
    await api(`/tasks/${id}`, { method: "DELETE" });
    await load();
    await onChanged?.();
    notify("Task removed");
  };
  return (
    <PageTitle
      eyebrow="Make it happen"
      title="Your to-do list"
      action={
        <Button onClick={() => setShow(true)}>
          <Plus size={17} /> Add task
        </Button>
      }
    >
      <div className="content-layout">
        <div className="panel full-panel">
          <div className="filter-row">
            <span>{tasks.filter((t) => !t.completed).length} open tasks</span>
            <span className="soft-label">
              {tasks.filter((t) => t.completed).length} completed
            </span>
          </div>
          {tasks.length ? (
            tasks.map((task) => (
              <div className="full-task" key={task.id}>
                <button
                  className={task.completed ? "check checked" : "check"}
                  onClick={() => toggle(task)}
                >
                  {task.completed && <Check size={14} />}
                </button>
                <div className="task-copy">
                  <strong className={task.completed ? "done" : ""}>
                    {task.title}
                  </strong>
                  <p>{task.description}</p>
                  <small>
                    {task.category} · {task.priority} ·{" "}
                    {task.due_date
                      ? new Date(task.due_date).toLocaleDateString()
                      : "No date"}
                  </small>
                </div>
                <button
                  className="icon-button delete-button"
                  onClick={() => remove(task.id)}
                >
                  <X size={17} />
                </button>
              </div>
            ))
          ) : (
            <Empty
              icon={CheckCircle2}
              title="Nothing on your list yet"
              body="Add your first task and make it wonderfully doable."
              action={
                <Button onClick={() => setShow(true)}>
                  <Plus size={16} /> Add your first task
                </Button>
              }
            />
          )}
        </div>
      </div>
      {show && (
        <Modal title="Add a task" onClose={() => setShow(false)}>
          <form onSubmit={submit} className="modal-form">
            <label>
              Task title
              <input
                required
                value={form.title || ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="What would feel good to finish?"
              />
            </label>
            <label>
              Description
              <textarea
                value={form.description || ""}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="A little context..."
              />
            </label>
            <div className="form-grid">
              <label>
                Due date
                <input
                  type="date"
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                />
              </label>
              <label>
                Priority
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </label>
            </div>
            <Button>
              Add task <ArrowRight size={16} />
            </Button>
          </form>
        </Modal>
      )}
    </PageTitle>
  );
}

function Journal({ notify }) {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ mood: "Good" });
  const [show, setShow] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [reflectionMap, setReflectionMap] = useState({});
  const load = () => api("/journal").then(setEntries);
  useEffect(() => {
    load();
  }, []);
  const handleReflect = async (entry) => {
    if (!entry.content?.trim()) {
      notify("Write a few words in the entry before reflecting.");
      return;
    }
    setLoadingId(entry.id);
    try {
      const data = await api(`/journal/${entry.id}/reflect`, {
        method: "POST",
      });
      setReflectionMap((prev) => ({ ...prev, [entry.id]: data.reflection }));
    } catch (error) {
      notify(
        error.message || "Reflection could not be generated. Please try again.",
      );
    } finally {
      setLoadingId(null);
    }
  };
  const submit = async (e) => {
    e.preventDefault();
    await api("/journal", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        tags: form.tags
          ?.split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    });
    setShow(false);
    setForm({ mood: "Good" });
    await load();
    notify("Journal entry saved");
  };
  return (
    <PageTitle
      eyebrow="A place for your thoughts"
      title="Your journal"
      action={
        <Button onClick={() => setShow(true)}>
          <Plus size={17} /> New entry
        </Button>
      }
    >
      <div className="journal-list">
        {entries.length ? (
          entries.map((entry) => (
            <article className="journal-entry" key={entry.id}>
              <div className="entry-date">
                <span>
                  {new Date(entry.created_at).toLocaleDateString(undefined, {
                    weekday: "short",
                  })}
                </span>
                <strong>{new Date(entry.created_at).getDate()}</strong>
                <span>
                  {new Date(entry.created_at).toLocaleDateString(undefined, {
                    month: "short",
                  })}
                </span>
              </div>
              <div className="entry-body">
                <div className="entry-meta">
                  <span>{entry.mood}</span>
                  <span>
                    {new Date(entry.created_at).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <h3>{entry.title}</h3>
                <p>{entry.content}</p>
                <div className="tag-row">
                  {(typeof entry.tags === "string"
                    ? JSON.parse(entry.tags || "[]")
                    : entry.tags || []
                  ).map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
                {reflectionMap[entry.id] && (
                  <div className="reflection-box">
                    <strong>AI reflection</strong>
                    <p>{reflectionMap[entry.id]}</p>
                  </div>
                )}
              </div>
              <button
                className="reflect-button"
                onClick={() => handleReflect(entry)}
                disabled={loadingId === entry.id}
              >
                {loadingId === entry.id ? (
                  "Thinking..."
                ) : (
                  <>
                    <Sparkles size={15} /> Reflect with AI
                  </>
                )}
              </button>
            </article>
          ))
        ) : (
          <div className="panel">
            <Empty
              icon={BookOpen}
              title="Your story starts here"
              body="The page is yours. Write something true, tiny, or unfinished."
              action={
                <Button onClick={() => setShow(true)}>
                  <Plus size={16} /> Write an entry
                </Button>
              }
            />
          </div>
        )}
      </div>
      {show && (
        <Modal title="A moment worth keeping" onClose={() => setShow(false)}>
          <form onSubmit={submit} className="modal-form">
            <label>
              Title
              <input
                required
                value={form.title || ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="A softer start"
              />
            </label>
            <label>
              What is on your mind?
              <textarea
                required
                rows="7"
                value={form.content || ""}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Write freely. This is just for you."
              />
            </label>
            <div className="form-grid">
              <label>
                Mood
                <select
                  value={form.mood}
                  onChange={(e) => setForm({ ...form, mood: e.target.value })}
                >
                  {moods.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label>
                Tags
                <input
                  value={form.tags || ""}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="focus, reflection"
                />
              </label>
            </div>
            <Button>
              Save entry <ArrowRight size={16} />
            </Button>
          </form>
        </Modal>
      )}
    </PageTitle>
  );
}

function Mood({ notify }) {
  const [selected, setSelected] = useState("Good");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState([]);
  const load = () => api("/moods").then(setHistory);
  useEffect(() => {
    load();
  }, []);
  const save = async (e) => {
    e.preventDefault();
    await api("/moods", {
      method: "POST",
      body: JSON.stringify({ mood: selected, note }),
    });
    await load();
    notify("Mood recorded for today");
  };
  return (
    <PageTitle eyebrow="Check in with yourself" title="How are you, really?">
      <div className="mood-layout">
        <div className="panel mood-checkin">
          <div className="panel-head">
            <h3>Today's check-in</h3>
            <span className="soft-label">September 15</span>
          </div>
          <p className="muted">
            There is no wrong answer. Just notice what is here.
          </p>
          <div className="mood-options">
            {moods.map((mood) => (
              <button
                key={mood}
                className={
                  selected === mood ? "mood-option selected" : "mood-option"
                }
                onClick={() => setSelected(mood)}
              >
                <span>
                  {mood === "Great"
                    ? "☀"
                    : mood === "Good"
                      ? "♡"
                      : mood === "Okay"
                        ? "◒"
                        : mood === "Low"
                          ? "◡"
                          : "〰"}
                </span>
                {mood}
              </button>
            ))}
          </div>
          <form onSubmit={save}>
            <label>
              One small note, if you feel like it
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What shaped your day?"
              />
            </label>
            <Button>
              Save today's mood <Heart size={15} />
            </Button>
          </form>
        </div>
        <div className="panel">
          <div className="panel-head">
            <h3>Your mood rhythm</h3>
            <span className="soft-label">Last 7 days</span>
          </div>
          <div className="mood-chart">
            {(history.length
              ? history.slice(0, 7).reverse()
              : [1, 2, 3, 4, 3, 4, 4]
            ).map((item, i) => {
              const score = typeof item === "number" ? item : item.score;
              return (
                <div className="chart-column" key={i}>
                  <div
                    className="chart-bar"
                    style={{ height: `${score * 17}%` }}
                  />
                  <small>
                    {typeof item === "number"
                      ? ["M", "T", "W", "T", "F", "S", "S"][i]
                      : new Date(item.recorded_on).toLocaleDateString(
                          undefined,
                          { weekday: "narrow" },
                        )}
                  </small>
                </div>
              );
            })}
          </div>
          <p className="chart-caption">
            <span className="chart-dot" /> A gentle upward trend is worth
            noticing.
          </p>
        </div>
      </div>
    </PageTitle>
  );
}

function Roadmap({ notify }) {
  const [skill, setSkill] = useState("");
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(() => JSON.parse(localStorage.getItem("ivy_roadmap_completed") || "{}"));
  const load = () => api("/roadmaps").then(setRoadmaps);
  useEffect(() => {
    load();
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api("/roadmaps", {
        method: "POST",
        body: JSON.stringify({ skill }),
      });
      setSkill("");
      await load();
      notify("Your roadmap is ready");
    } finally {
      setLoading(false);
    }
  };
  const toggleDay = async (map, weekIndex, dayIndex, totalDays) => {
    const key = `${map.id}-${weekIndex}-${dayIndex}`;
    const next = { ...completed, [key]: !completed[key] };
    setCompleted(next);
    localStorage.setItem("ivy_roadmap_completed", JSON.stringify(next));
    const done = Object.keys(next).filter((item) => item.startsWith(`${map.id}-`) && next[item]).length;
    await api(`/roadmaps/${map.id}/progress`, { method: "PATCH", body: JSON.stringify({ progress: Math.round((done / totalDays) * 100) }) });
    setRoadmaps((items) => items.map((item) => item.id === map.id ? { ...item, progress: Math.round((done / totalDays) * 100) } : item));
  };
  return (
    <PageTitle eyebrow="Learn something wonderful" title="Your AI roadmap">
      <div className="roadmap-create">
        <div>
          <span className="ai-badge">
            <Sparkles size={14} /> Ivy AI
          </span>
          <h2>What would you love to learn?</h2>
          <p>
            We will turn the big idea into a kind, practical path you can
            actually follow.
          </p>
        </div>
        <form onSubmit={submit}>
          <input
            required
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            placeholder="e.g. Learn Python, build a portfolio..."
          />
          <Button disabled={loading}>
            {loading ? "Thinking..." : "Build my roadmap"}{" "}
            <ArrowRight size={16} />
          </Button>
        </form>
      </div>
      {roadmaps.length ? (
        roadmaps.map((map) => (
          <div className="roadmap-card" key={map.id}>
            <div className="roadmap-head">
              <div>
                <span className="eyebrow">
                  {map.skill_level} · {map.duration_weeks} weeks
                </span>
                <h2>{map.title}</h2>
              </div>
              <div className="roadmap-progress">
                {map.progress || 0}%<small>complete</small>
              </div>
            </div>
            {map.content?.learningLinks?.length ? (
              <div className="roadmap-links">
                {map.content.learningLinks.map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                ))}
              </div>
            ) : null}
            <div className="week-grid">
              {(map.content?.weeks || []).map((week, index) => (
                <div className="week" key={week.title}>
                  <span>WEEK {index + 1}</span>
                  <h3>{week.title}</h3>
                  {week.days.map((day, dayIndex) => (
                    <button className={completed[`${map.id}-${index}-${dayIndex}`] ? "roadmap-day checked" : "roadmap-day"} key={day} onClick={() => toggleDay(map, index, dayIndex, (map.content?.weeks || []).reduce((total, item) => total + item.days.length, 0))}>
                      <span>{dayIndex + 1}</span>
                      {day}
                      {completed[`${map.id}-${index}-${dayIndex}`] && <Check size={13} />}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <Empty
          icon={TrendingUp}
          title="Tell us what you want to learn"
          body="Your first roadmap can start with one sentence."
        />
      )}
    </PageTitle>
  );
}

function Goals({ notify }) {
  const [goals, setGoals] = useState([]);
  const [title, setTitle] = useState("");
  const [taskTitles, setTaskTitles] = useState({});
  const [goalTasks, setGoalTasks] = useState({});
  const load = () => api("/goals").then(setGoals);
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    goals.forEach((goal) => api(`/goals/${goal.id}/tasks`).then((tasks) => setGoalTasks((items) => ({ ...items, [goal.id]: tasks }))));
  }, [goals]);
  const submit = async (e) => {
    e.preventDefault();
    await api("/goals", { method: "POST", body: JSON.stringify({ title }) });
    setTitle("");
    await load();
    notify("Goal added");
  };
  const addCompletedTask = async (goal) => {
    const taskTitle = taskTitles[goal.id]?.trim();
    if (!taskTitle) return;
    const task = await api(`/goals/${goal.id}/tasks`, { method: "POST", body: JSON.stringify({ title: taskTitle }) });
    setGoalTasks((items) => ({ ...items, [goal.id]: [...(items[goal.id] || []), task] }));
    setTaskTitles((items) => ({ ...items, [goal.id]: "" }));
    await load();
    notify("Completed task added to your goal");
  };
  return (
    <PageTitle eyebrow="Keep your eyes on the why" title="Goals">
      <div className="goal-create panel">
        <form onSubmit={submit}>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What are you moving toward?"
          />
          <Button>
            <Plus size={16} /> Add goal
          </Button>
        </form>
      </div>
      <div className="goal-grid">
        {goals.length ? (
          goals.map((goal) => (
            <div className="goal-card" key={goal.id}>
              <div className="goal-icon">
                <Target size={19} />
              </div>
              <span className="eyebrow">{goal.status}</span>
              <h3>{goal.title}</h3>
              <div className="progress-track">
                <i style={{ width: `${goal.progress}%` }} />
              </div>
              <small>{goal.progress}% complete</small>
              <div className="goal-tasks">
                {(goalTasks[goal.id] || []).map((task) => <div className="goal-task" key={task.id}><Check size={13} /> {task.title}</div>)}
                <form onSubmit={(event) => { event.preventDefault(); addCompletedTask(goal); }}>
                  <input value={taskTitles[goal.id] || ""} onChange={(event) => setTaskTitles((items) => ({ ...items, [goal.id]: event.target.value }))} placeholder="Add completed task" />
                  <button aria-label="Add completed goal task"><Plus size={14} /></button>
                </form>
              </div>
            </div>
          ))
        ) : (
          <div className="panel">
            <Empty
              icon={Target}
              title="Your goals live here"
              body="Choose something meaningful, then make it smaller."
            />
          </div>
        )}
      </div>
    </PageTitle>
  );
}
function Calendar({ data }) {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const monthLabel = monthDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startOffset = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0,
  ).getDate();
  const daysInPrevMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    0,
  ).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i += 1) {
    const prevDate = daysInPrevMonth - startOffset + i + 1;
    cells.push({
      date: new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, prevDate),
      outside: true,
    });
  }
  for (let i = 1; i <= daysInMonth; i += 1) {
    cells.push({
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), i),
      outside: false,
    });
  }
  while (cells.length % 7 !== 0) {
    const next = cells.length - daysInMonth - startOffset + 1;
    cells.push({
      date: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, next),
      outside: true,
    });
  }
  const selectedKey = selectedDate.toISOString().slice(0, 10);
  const itemsForDay = (date) => {
    const key = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    const tasks = (data?.tasks || []).filter((task) => {
      if (!task.due_date) return false;
      return new Date(task.due_date).toISOString().slice(0, 10) === key;
    });
    const journal = data?.journal && new Date(data.journal.created_at).toISOString().slice(0, 10) === key ? [data.journal] : [];
    return { tasks, journal };
  };
  const daySummary = itemsForDay(selectedDate);
  return (
    <PageTitle eyebrow="See the shape of your days" title="Calendar">
      <div className="calendar panel">
        <div className="calendar-head">
          <button
            className="icon-button"
            onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}
          >
            <ArrowRight size={17} className="rotate" />
          </button>
          <h2>{monthLabel}</h2>
          <button
            className="icon-button"
            onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}
          >
            <ArrowRight size={17} />
          </button>
        </div>
        <div className="calendar-grid">
          {["M", "T", "W", "T", "F", "S", "S"].map((x, i) => (
            <strong key={i}>{x}</strong>
          ))}
          {cells.map(({ date, outside }, index) => {
            const isToday =
              date.toDateString() === new Date().toDateString();
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const { tasks, journal } = itemsForDay(date);
            return (
              <button
                className={[
                  "calendar-day",
                  isToday ? "today" : "",
                  isSelected ? "selected" : "",
                  outside ? "outside" : "",
                ].join(" ")}
                key={`${date.toISOString()}-${index}`}
                onClick={() => setSelectedDate(date)}
              >
                <span>{date.getDate()}</span>
                {(tasks.length || journal.length) && <i />}
              </button>
            );
          })}
        </div>
      </div>
      <div className="calendar-summary">
        <div>
          <CheckCircle2 size={19} />
          <strong>{data.taskStats.completed}</strong>
          <span>tasks completed</span>
        </div>
        <div>
          <BookOpen size={19} />
          <strong>{daySummary.journal.length + daySummary.tasks.length}</strong>
          <span>items for selected day</span>
        </div>
        <div>
          <Flame size={19} />
          <strong>{data.streak.current_count}</strong>
          <span>day streak</span>
        </div>
      </div>
      <div className="panel calendar-detail">
        <div className="panel-head">
          <h3>{selectedDate.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</h3>
          <span className="soft-label">Schedule</span>
        </div>
        {daySummary.tasks.length || daySummary.journal.length ? (
          <div className="calendar-day-list">
            {daySummary.tasks.map((task) => (
              <div className="history-item" key={task.id}>
                <span className="history-icon">✓</span>
                <div>
                  <strong>{task.title}</strong>
                  <small>{task.category} · {task.priority}</small>
                </div>
              </div>
            ))}
            {daySummary.journal.map((entry) => (
              <div className="history-item" key={entry.id}>
                <span className="history-icon">✎</span>
                <div>
                  <strong>{entry.title}</strong>
                  <small>{entry.mood}</small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No tasks or journal entries are scheduled for this day.</p>
        )}
      </div>
    </PageTitle>
  );
}
function Progress({ data }) {
  const total = Number(data?.taskStats?.total || 0);
  const completed = Number(data?.taskStats?.completed || 0);
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const journalCount = data?.journal ? 1 : 0;
  const activeGoals = Number(data?.goals?.length || 0);
  const roadmapCount = Number(data?.roadmaps?.length || 0);
  return (
    <PageTitle eyebrow="Notice what is growing" title="Progress">
      <div className="progress-cards">
        <div className="panel big-progress">
          <div className="ring" style={{ "--progress": `${percent * 3.6}deg` }}>
            <div>
              {percent}
              <small>%</small>
            </div>
          </div>
          <div>
            <span className="eyebrow">Today's progress</span>
            <h2>Momentum looks good.</h2>
            <p className="muted">
              You completed {completed} of {total} planned tasks.
            </p>
          </div>
        </div>
        <div className="panel metric-card">
          <Flame size={19} />
          <strong>{data.streak.current_count}</strong>
          <span>Current streak</span>
        </div>
        <div className="panel metric-card">
          <Target size={19} />
          <strong>{activeGoals}</strong>
          <span>Active goals</span>
        </div>
      </div>
      <div className="panel chart-panel">
        <div className="panel-head">
          <h3>Progress overview</h3>
          <span className="soft-label">Across your space</span>
        </div>
        <div className="progress-stats-grid">
          <div>
            <strong>{completed}/{total}</strong>
            <span>Tasks</span>
          </div>
          <div>
            <strong>{journalCount}</strong>
            <span>Journal entries</span>
          </div>
          <div>
            <strong>{roadmapCount}</strong>
            <span>Roadmaps</span>
          </div>
        </div>
      </div>
    </PageTitle>
  );
}
function History() {
  const [items, setItems] = useState([]);
  const load = () => api("/history").then(setItems);
  useEffect(() => {
    load();
  }, []);
  const remove = async (id, type) => {
    if (!window.confirm("Delete this history entry?")) return;
    if (type === "task_completed") {
      try {
        await api(`/tasks/${id}`, { method: "DELETE" });
      } catch {
        await api(`/history/${id}`, { method: "DELETE" });
      }
    } else {
      await api(`/history/${id}`, { method: "DELETE" });
    }
    await load();
  };
  return (
    <PageTitle eyebrow="Your little wins, collected" title="History">
      <div className="panel history-list">
        {items.length ? (
          items.map((day) => (
            <section className="history-day" key={day.date}>
              <div className="panel-head"><h3>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</h3><span className="soft-label">{day.items.length} activities</span></div>
              {day.items.map((item) => <div className="history-item" key={`${day.date}-${item.id}-${item.type}`}><span className="history-icon">{item.type.includes("mood") ? "♡" : item.type.includes("journal") ? "✎" : "✓"}</span><div><strong>{item.description}</strong><small>{new Date(item.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small></div><button className="icon-button delete-button" onClick={() => remove(item.id, item.type)}><X size={15} /></button></div>)}
            </section>
          ))
        ) : (
          <Empty
            icon={NotebookPen}
            title="Your history is waiting"
            body="The things you do here will gather into a lovely record."
          />
        )}
      </div>
    </PageTitle>
  );
}
function Settings({ user, notify }) {
  const [form, setForm] = useState({
    fullName: user.full_name || "",
    username: user.username || "",
    bio: user.bio || "",
    productivityStyle: user.productivity_style || "Gentle and focused",
  });
  const [avatar, setAvatar] = useState(null);
  const save = async (e) => {
    e.preventDefault();
    const data = await api("/me", {
      method: "PATCH",
      body: JSON.stringify(form),
    });
    Object.assign(user, data.user);
    notify("Profile saved");
  };
  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append("image", file);
    const token = localStorage.getItem("ivy_token");
    const response = await fetch("/api/me/avatar", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    user.avatar_url = data.avatarUrl;
    setAvatar(data.avatarUrl);
    notify("Profile image updated");
  };
  return (
    <PageTitle eyebrow="Make it yours" title="Settings">
      <div className="panel settings-card">
        <form className="modal-form" onSubmit={save}>
          <div className="settings-profile">
            <div className="avatar large">
              {avatar || user.avatar_url ? (
                <img src={avatar || user.avatar_url} alt="Profile" />
              ) : (
                form.fullName?.[0] || "I"
              )}
            </div>
            <div>
              <h3>{form.fullName || "Your profile"}</h3>
              <p className="muted">{user.email}</p>
            </div>
            <label className="upload-button">
              Change photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={upload}
              />
            </label>
          </div>
          <label>
            Full name
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </label>
          <label>
            Username
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </label>
          <label>
            Bio
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="A sentence about the life you're building..."
            />
          </label>
          <label>
            Productivity style
            <select
              value={form.productivityStyle}
              onChange={(e) =>
                setForm({ ...form, productivityStyle: e.target.value })
              }
            >
              <option>Gentle and focused</option>
              <option>Structured and steady</option>
              <option>Creative and flexible</option>
            </select>
          </label>
          <Button>
            Save profile <Check size={16} />
          </Button>
        </form>
        <div className="settings-row">
          <div>
            <strong>Daily reminders</strong>
            <p>Keep gentle nudges close when you need them.</p>
          </div>
          <input type="checkbox" defaultChecked />
        </div>
        <div className="settings-row">
          <div>
            <strong>Private by default</strong>
            <p>Your journal and personal progress stay yours.</p>
          </div>
          <input type="checkbox" defaultChecked />
        </div>
      </div>
    </PageTitle>
  );
}
function VisionBoard({ notify }) {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const load = () => api("/vision").then(setBoards);
  useEffect(() => {
    load();
  }, []);
  const inspire = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      setIdeas(
        await api("/vision/ideas", {
          method: "POST",
          body: JSON.stringify({ title, description }),
        }),
      );
    } finally {
      setLoading(false);
    }
  };
  const save = async () => {
    await api("/vision", {
      method: "POST",
      body: JSON.stringify({ title, description, items: ideas }),
    });
    setIdeas([]);
    setTitle("");
    setDescription("");
    await load();
    notify("Vision board saved");
  };
  const remove = async (id) => {
    await api(`/vision/${id}`, { method: "DELETE" });
    await load();
    notify("Vision board removed");
  };
  const uploadCover = async (id, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append("image", file);
    setUploadingId(id);
    try {
      const response = await fetch(`/api/vision/${id}/cover`, { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("ivy_token")}` }, body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setBoards((items) => items.map((item) => item.id === id ? { ...item, cover_url: data.coverUrl } : item));
      notify("Your vision image was added");
    } finally { setUploadingId(null); }
  };
  return (
    <PageTitle eyebrow="Make the future feel visible" title="Vision board">
      <div className="vision-create">
        <form onSubmit={inspire} className="panel">
          <span className="ai-badge">
            <Sparkles size={14} /> Ivy AI
          </span>
          <h2>What are you calling in?</h2>
          <label>
            Board title
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Dream 2027"
            />
          </label>
          <label>
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="The feeling, goals, and places you want more of..."
            />
          </label>
          <Button disabled={loading}>
            {loading ? "Gathering ideas..." : "Generate inspiration"}{" "}
            <Sparkles size={16} />
          </Button>
        </form>
        {ideas.length > 0 && (
          <div className="panel inspiration">
            <div className="panel-head">
              <h3>Your inspiration</h3>
              <Button onClick={save}>
                Create board <Check size={15} />
              </Button>
            </div>
            {ideas.map((idea, index) => (
              <div
                className="inspiration-item"
                key={`${idea.content}-${index}`}
              >
                <span>{idea.kind}</span>
                <strong>{idea.content}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="vision-grid">
        {boards.length ? (
          boards.map((board) => (
            <div className="vision-card" key={board.id}>
              {board.cover_url && <img className="vision-cover" src={board.cover_url} alt={board.title} />}
              <div className="vision-card-head">
                <div>
                  <span className="eyebrow">Saved vision</span>
                  <h3>{board.title}</h3>
                </div>
                <button
                  className="icon-button"
                  onClick={() => remove(board.id)}
                >
                  <X size={16} />
                </button>
              </div>
              <p>{board.description}</p>
              <label className="upload-button">{uploadingId === board.id ? "Uploading..." : "Add your image"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => uploadCover(board.id, event)} /></label>
              <div className="vision-items">
                {board.items.map((item) => (
                  <span key={item.id}>{item.content}</span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="panel">
            <Empty
              icon={Flower2}
              title="Dream it. Build it. See it."
              body="Create a board to keep your direction close."
            />
          </div>
        )}
      </div>
    </PageTitle>
  );
}
function Notifications({ notify, onRead }) {
  const [items, setItems] = useState([]);
  const load = () => api("/notifications").then(setItems);
  useEffect(() => {
    load();
  }, []);
  const readAll = async () => {
    await api("/notifications/read-all", { method: "POST" });
    await load();
    onRead?.();
    notify("Notifications marked as read");
  };
  const remove = async (id) => {
    await api(`/notifications/${id}`, { method: "DELETE" });
    await load();
    onRead?.();
  };
  const respondToInvitation = async (item, status) => {
    const collaborationId = item.body.match(/^collaboration:(\d+)\|/)?.[1];
    if (!collaborationId) return;
    await api(`/collaborations/${collaborationId}/respond`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await remove(item.id);
    notify(status === "active" ? "You joined the collaboration" : "Invitation declined");
  };
  return (
    <PageTitle
      eyebrow="Little nudges, kept in one place"
      title="Notifications"
      action={
        <Button variant="secondary" onClick={readAll}>
          Mark all read
        </Button>
      }
    >
      <div className="panel notification-list">
        {items.length ? (
          items.map((item) => (
            <div
              className={
                item.is_read ? "notification-row read" : "notification-row"
              }
              key={item.id}
            >
              <div className="notification-symbol">
                <Bell size={16} />
              </div>
              <div>
                <strong>{item.title}</strong>
                <p>{item.body.replace(/^collaboration:\d+\|/, "")}</p>
                {item.title === "Collaboration invitation" && (
                  <div className="collab-actions">
                    <Button onClick={() => respondToInvitation(item, "active")}>Accept</Button>
                    <Button variant="secondary" onClick={() => respondToInvitation(item, "declined")}>Decline</Button>
                  </div>
                )}
                <small>{new Date(item.created_at).toLocaleString()}</small>
              </div>
              <button className="icon-button" onClick={() => remove(item.id)}>
                <X size={16} />
              </button>
            </div>
          ))
        ) : (
          <Empty
            icon={Bell}
            title="All quiet here"
            body="Your reminders and wins will appear in this space."
          />
        )}
      </div>
    </PageTitle>
  );
}
function Collaborations({ notify, user }) {
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({});
  const [invite, setInvite] = useState({});
  const load = () => api("/collaborations").then(setItems);
  useEffect(() => {
    load();
  }, []);
  const create = async (e) => {
    e.preventDefault();
    await api("/collaborations", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setForm({});
    await load();
    notify("Collaboration created");
  };
  const searchUsers = async (value) => {
    setInvite({ ...invite, username: value });
    if (value.length > 1)
      setUsers(await api(`/users/search?q=${encodeURIComponent(value)}`));
  };
  const sendInvite = async (id) => {
    await api(`/collaborations/${id}/invite`, {
      method: "POST",
      body: JSON.stringify({ username: invite.username }),
    });
    setInvite({});
    setUsers([]);
    notify("Invitation sent");
  };
  const respond = async (id, status) => {
    await api(`/collaborations/${id}/respond`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load();
    notify(
      status === "active"
        ? "You joined the collaboration"
        : "Invitation declined",
    );
  };
  const updateProgress = async (id, progress) => {
    await api(`/collaborations/${id}/progress`, {
      method: "PATCH",
      body: JSON.stringify({ progress }),
    });
    await load();
    notify("Shared progress updated");
  };
  return (
    <PageTitle eyebrow="Grow together" title="Collaborations">
      <div className="collab-create panel">
        <form onSubmit={create}>
          <div>
            <span className="eyebrow">Start an accountability space</span>
            <h2>Who are you growing with?</h2>
          </div>
          <input
            required
            value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="30-Day Coding Challenge"
          />
          <input
            value={form.combinedGoal || ""}
            onChange={(e) => setForm({ ...form, combinedGoal: e.target.value })}
            placeholder="Our shared goal"
          />
          <Button>
            <Plus size={16} /> Create collaboration
          </Button>
        </form>
      </div>
      {items.length ? (
        items.map((item) => (
          <div className="collab-card panel" key={item.id}>
            <div className="collab-head">
              <div>
                <span className="eyebrow">
                  {item.status === "pending"
                    ? "Invitation waiting"
                    : "Shared space"}
                </span>
                <h2>{item.name}</h2>
                <p>
                  {item.combined_goal ||
                    item.description ||
                    "A goal worth showing up for together."}
                </p>
              </div>
              {item.status === "pending" ? (
                <div className="collab-actions">
                  <Button onClick={() => respond(item.id, "active")}>
                    Accept
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => respond(item.id, "declined")}
                  >
                    Decline
                  </Button>
                </div>
              ) : (
                <div className="team-progress">
                  <strong>
                    {Math.round(
                      (item.members || []).reduce(
                        (sum, member) => sum + Number(member.progress || 0),
                        0,
                      ) / Math.max(item.members?.length || 1, 1),
                    )}
                    %
                  </strong>
                  <small>team progress</small>
                </div>
              )}
            </div>
            {item.status === "active" && (
              <>
                <div className="member-list">
                  {(item.members || []).map((member) => (
                    <div className="member-row" key={member.user_id}>
                      <div className="avatar">{member.full_name?.[0]}</div>
                      <div>
                        <strong>
                          {member.user_id === user.id
                            ? "You"
                            : member.full_name}
                        </strong>
                        <small>@{member.username}</small>
                      </div>
                      <span>{member.progress}%</span>
                    </div>
                  ))}
                </div>
                <div className="collab-controls">
                  <input
                    value={invite.username || ""}
                    onChange={(e) => searchUsers(e.target.value)}
                    placeholder="Invite by username"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => sendInvite(item.id)}
                  >
                    Invite
                  </Button>
                  {users.length > 0 && (
                    <div className="user-results">
                      {users.map((found) => (
                        <button
                          key={found.id}
                          onClick={() => {
                            setInvite({ username: found.username });
                            setUsers([]);
                          }}
                        >
                          @{found.username}
                        </button>
                      ))}
                    </div>
                  )}
                  <label className="progress-control">
                    Your progress{" "}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue={
                        item.members.find(
                          (member) => member.user_id === user.id,
                        )?.progress || 0
                      }
                      onChange={(e) => updateProgress(item.id, e.target.value)}
                    />
                  </label>
                </div>
              </>
            )}
          </div>
        ))
      ) : (
        <div className="panel">
          <Empty
            icon={UserRound}
            title="Invite someone and grow together"
            body="Create a shared goal, then make progress visible to the people you trust."
          />
        </div>
      )}
    </PageTitle>
  );
}
function Habits({ notify }) {
  const [habits, setHabits] = useState([]);
  const [title, setTitle] = useState("");
  const load = () => api("/habits").then(setHabits);
  useEffect(() => {
    load();
  }, []);
  const add = async (e) => {
    e.preventDefault();
    await api("/habits", { method: "POST", body: JSON.stringify({ title }) });
    setTitle("");
    await load();
    notify("Habit added");
  };
  const complete = async (id) => {
    await api(`/habits/${id}/complete`, { method: "POST" });
    await load();
    notify("Habit checked off");
  };
  const remove = async (id) => {
    await api(`/habits/${id}`, { method: "DELETE" });
    await load();
    notify("Habit removed");
  };
  return (
    <PageTitle eyebrow="Small rituals, steady change" title="Habits">
      <div className="goal-create panel">
        <form onSubmit={add}>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a habit you want to keep close"
          />
          <Button>
            <Plus size={16} /> Add habit
          </Button>
        </form>
      </div>
      <div className="habit-grid">
        {habits.length ? (
          habits.map((habit) => (
            <div className="habit-card" key={habit.id}>
              <button
                className={
                  habit.completed_today ? "habit-check checked" : "habit-check"
                }
                onClick={() => complete(habit.id)}
              >
                {habit.completed_today ? <Check size={17} /> : <span />}
              </button>
              <div>
                <h3>{habit.title}</h3>
                <small>
                  {habit.frequency} ·{" "}
                  {habit.completed_today ? "Done today" : "Still time today"}
                </small>
              </div>
              <button className="icon-button" onClick={() => remove(habit.id)}>
                <X size={16} />
              </button>
            </div>
          ))
        ) : (
          <div className="panel">
            <Empty
              icon={CheckCircle2}
              title="Build a gentle rhythm"
              body="Add one habit that helps future-you feel supported."
            />
          </div>
        )}
      </div>
    </PageTitle>
  );
}
function Rewards() {
  const [rewards, setRewards] = useState([]);
  useEffect(() => {
    api("/badges").then(setRewards);
  }, []);
  return (
    <PageTitle eyebrow="Notice every win" title="Rewards">
      <div className="badge-grid">
        {rewards.length ? (
          rewards.map((reward) => (
            <div
              className={reward.earned_at ? "badge-card earned" : "badge-card"}
              key={reward.id}
            >
              <div className="badge-icon">{reward.icon}</div>
              <div>
                <h3>{reward.title}</h3>
                <p>{reward.description}</p>
                <small>
                  {reward.earned_at
                    ? `Earned ${new Date(reward.earned_at).toLocaleDateString()}`
                    : "Locked for now"}
                </small>
              </div>
            </div>
          ))
        ) : (
          <div className="panel">
            <Empty
              icon={Sparkles}
              title="Your collection is waiting"
              body="Keep showing up. Your rewards will appear here as you grow."
            />
          </div>
        )}
      </div>
    </PageTitle>
  );
}
function Chat() {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    api("/chat").then((data) => {
      setConversationId(data.conversationId);
      setMessages(data.messages);
    });
  }, []);
  const send = async (e) => {
    e.preventDefault();
    if (!message.trim() || loading) return;
    const text = message;
    setMessage("");
    setMessages((items) => [...items, { role: "user", content: text }]);
    setLoading(true);
    try {
      const reply = await api("/chat", {
        method: "POST",
        body: JSON.stringify({ conversationId, message: text }),
      });
      setConversationId(reply.conversationId);
      setMessages((items) => [...items, reply]);
    } finally {
      setLoading(false);
    }
  };
  return (
    <PageTitle eyebrow="A calm second brain" title="Ivy AI">
      <div className="chat-panel panel">
        <div className="chat-intro">
          <div className="ai-badge">
            <Sparkles size={14} /> Ivy AI
          </div>
          <h2>What are we making space for?</h2>
          <p>
            Ask about a goal, a learning plan, a stuck moment, or simply what
            you need next.
          </p>
        </div>
        <div className="messages">
          {messages.length ? (
            messages.map((item, index) => (
              <div
                className={
                  item.role === "user" ? "message user-message" : "message"
                }
                key={`${item.created_at || "now"}-${index}`}
              >
                {item.content}
              </div>
            ))
          ) : (
            <div className="chat-suggestion">
              <button
                onClick={() =>
                  setMessage("Help me break a big goal into smaller steps.")
                }
              >
                Break down a big goal <ArrowRight size={14} />
              </button>
              <button
                onClick={() =>
                  setMessage("Give me a journaling prompt for today.")
                }
              >
                Give me a reflection prompt <ArrowRight size={14} />
              </button>
            </div>
          )}
          {loading && <div className="message typing">Thinking gently...</div>}
        </div>
        <form className="chat-form" onSubmit={send}>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask Ivy anything about your next step..."
          />
          <button aria-label="Send message">
            <Send size={17} />
          </button>
        </form>
      </div>
    </PageTitle>
  );
}
function PageTitle({ eyebrow, title, action, children }) {
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
        {action}
      </div>
      {children}
    </>
  );
}
function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    if (localStorage.getItem("ivy_token"))
      api("/me")
        .then((data) => setUser(data.user))
        .catch(() => localStorage.removeItem("ivy_token"));
  }, []);
  const logout = () => {
    localStorage.removeItem("ivy_token");
    setUser(null);
  };
  return user ? (
    <Shell user={user} onLogout={logout} />
  ) : (
    <Auth onLogin={setUser} />
  );
}
