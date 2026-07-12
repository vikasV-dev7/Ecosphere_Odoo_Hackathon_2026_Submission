import { redirect } from 'next/navigation';

export default function LeaderboardPage() {
  redirect('/gamification?tab=leaderboard');
}
