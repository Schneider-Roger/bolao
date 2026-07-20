import { Link, Outlet, useLocation, Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { BASE_URL } from "../lib/api";

const menuItems = [
    { label: "Jogos", path: "/aovivo", icon: "live_tv" },
    { label: "Palpites", path: "/jogos", icon: "sports_soccer", highlight: true },
    { label: "Ranking", path: "/ranking", icon: "leaderboard" },
];

function AppLayout() {
    const location = useLocation();
    const user = useAuthStore(state => state.user);
    const logout = useAuthStore(state => state.logout);

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <main className="w-full overflow-x-hidden min-h-screen bg-surface text-on-surface font-body-md text-body-md flex flex-col selection:bg-primary-container selection:text-on-primary-container">
            {/* TopAppBar */}
            <header className="bg-[#0b1727] sm:bg-surface/60 w-full top-0 sticky border-b border-white/10 backdrop-blur-none sm:backdrop-blur-xl shadow-sm z-40">
                <div className="flex justify-between items-center px-4 md:px-[100px] py-4 w-full max-w-container-max mx-auto gap-4">
                    {/* Leading: Avatar */}
                    <Link to="/perfil" className="w-10 h-10 rounded-full bg-surface-variant overflow-hidden border border-white/10 cursor-pointer active:scale-95 transition-transform flex-shrink-0 ring-2 ring-primary/30" title="Ver Perfil">
                        {(user?.foto_perfil && user.foto_perfil !== "null" && typeof user.foto_perfil === "string" && user.foto_perfil.trim() !== "") ? (
                            <img alt="User profile photo" className="w-full h-full object-cover" src={user.foto_perfil.startsWith('/uploads') ? `${BASE_URL}${user.foto_perfil}` : `${BASE_URL}/uploads/${user.foto_perfil}`} />
                        ) : (
                            <img alt="Default profile photo" className="w-full h-full object-cover" src="/default-avatar.png" />
                        )}
                    </Link>

                    {/* Headline: Brand */}
                    <h1 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-primary dark:text-primary tracking-tighter text-center flex-grow">
                        Bolão 2026
                    </h1>

                    {/* Trailing: Icons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Link to="/regras" className="w-10 h-10 rounded-full flex items-center justify-center text-primary dark:text-primary hover:bg-white/5 transition-colors cursor-pointer active:scale-95" title="Regulamento e Regras">
                            <span className="material-symbols-outlined">help</span>
                        </Link>
                        <button onClick={logout} className="w-10 h-10 rounded-full flex items-center justify-center text-error dark:text-error hover:text-error transition-colors cursor-pointer active:scale-95">
                            <span className="material-symbols-outlined">logout</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Canvas */}
            <section className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-6 flex flex-col gap-8 pb-32">
                <Outlet />
            </section>

            {/* BottomNavBar */}
            <nav className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 flex justify-around items-center h-20 px-4 pb-safe bg-[#0b1727] sm:bg-surface-container/80 backdrop-blur-none sm:backdrop-blur-lg border-t border-white/10 shadow-[0_-4px_20px_rgba(0,130,55,0.15)] rounded-t-xl z-50">
                {menuItems.map((item) => {
                    const active = location.pathname.startsWith(item.path);

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center justify-center transition-transform active:scale-90 ${
                                item.highlight 
                                    ? "bg-[#FDE01A] text-[#125D10] rounded-xl shadow-lg -translate-y-4 px-6 py-3 border-2 border-[#125D10]/20 z-10 font-bold" 
                                    : `rounded-full px-4 py-1 ${active ? "bg-secondary-container text-on-secondary-container" : "text-on-surface-variant hover:text-primary"}`
                            }`}
                        >
                            <span className={`material-symbols-outlined ${item.highlight ? "text-[28px]" : ""}`} style={{ fontVariationSettings: active || item.highlight ? "'FILL' 1" : "'FILL' 0" }}>
                                {item.icon}
                            </span>
                            <span className={`font-label-caps text-label-caps mt-1 ${item.highlight ? "font-bold text-xs mt-2" : ""}`}>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </main>
    );
}

export default AppLayout;