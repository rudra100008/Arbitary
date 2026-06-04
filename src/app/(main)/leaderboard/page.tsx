import Header from "@/src/components/ui/header";
import Footer from "@/src/components/ui/footer";
import LeaderboardList from "@/src/components/leaderboard/leaderboard-list";
import { getTopUsers } from "@/src/db/user-queries";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/auth";

export default async function LeaderboardPage() {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as any)?.id as number | undefined;
  const users = await getTopUsers(100);

  return (
    <div className="bg-white text-black min-h-screen selection:bg-[#FACC15] selection:text-black">
      <Header />

      <main className="pt-32 pb-20 overflow-hidden">
        {/* Page Header */}
        <section className="container mx-auto px-6 mb-24 animate-fade-in">
          <div className="max-w-4xl">
            <span className="inline-block text-[#FACC15] font-bold uppercase tracking-[0.4em] text-xs mb-6 px-4 py-2 bg-zinc-50 rounded-full border border-black/5">
              Rankings
            </span>
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter uppercase leading-[0.85] mb-10">
              Leader<br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-[#FACC15] to-zinc-800">
                BOARD
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-zinc-500 max-w-2xl leading-relaxed italic">
              "The top 100 arbiters ranked by influence. Rise through the ranks."
            </p>
          </div>
        </section>

        {/* Stats Summary */}
        <section className="container mx-auto px-6 mb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-6 bg-zinc-50 rounded-2xl border border-black/5">
              <p className="text-3xl md:text-4xl font-black text-[#FACC15]">{users.length}</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-1">
                Total Ranked
              </p>
            </div>
            <div className="p-6 bg-zinc-50 rounded-2xl border border-black/5">
              <p className="text-3xl md:text-4xl font-black">
                {users.reduce((s, u) => s + u.points, 0).toLocaleString()}
              </p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-1">
                Total Points
              </p>
            </div>
            <div className="p-6 bg-zinc-50 rounded-2xl border border-black/5">
              <p className="text-3xl md:text-4xl font-black">
                {users.reduce((s, u) => s + u.tasks, 0).toLocaleString()}
              </p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-1">
                Tasks Done
              </p>
            </div>
            <div className="p-6 bg-zinc-50 rounded-2xl border border-black/5">
              <p className="text-3xl md:text-4xl font-black">
                {users.reduce((s, u) => s + u.referrals, 0).toLocaleString()}
              </p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-1">
                Referrals
              </p>
            </div>
          </div>
        </section>

        {/* Leaderboard List */}
        <section className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto bg-white border border-black/5 rounded-[2rem] shadow-sm overflow-hidden">
            <LeaderboardList users={users} currentUserId={currentUserId} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
