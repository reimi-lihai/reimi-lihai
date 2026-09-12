import { getFeaturedAccommodations, getFeaturedProperties } from "@/lib/data";
import { HomeView } from "@/components/home/HomeView";

export default async function HomePage() {
  const [stays, props] = await Promise.all([
    getFeaturedAccommodations(3),
    getFeaturedProperties(3),
  ]);
  return <HomeView stays={stays} props={props} />;
}
