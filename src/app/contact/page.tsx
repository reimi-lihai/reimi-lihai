import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { ContactHeading } from "@/components/ContactHeading";

export const metadata: Metadata = {
  title: "お問い合わせ / Contact",
  description: "ご予約・物件・滞在に関するご相談を承ります。サイト内チャットもご利用いただけます。",
};

export default function ContactPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const cat = searchParams.category;
  const initialCategory = Array.isArray(cat) ? cat[0] : cat;
  return (
    <div className="container-page py-10">
      <ContactHeading />
      <div className="mt-6">
        <ContactForm initialCategory={initialCategory} />
      </div>
    </div>
  );
}
