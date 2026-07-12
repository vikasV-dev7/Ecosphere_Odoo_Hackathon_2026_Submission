import { redirect } from 'next/navigation';

export default function RewardsPage() {
  redirect('/gamification?tab=store');
}
