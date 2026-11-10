import { exigerSession } from "@/lib/auth/garde";
import { FridgePage } from "./frigo";

/** Mon frigo (EF-13 à EF-15). Une personne invitée en lecture seule voit le stock sans pouvoir le changer. */
export default async function StockPage() {
  const session = await exigerSession().catch(() => null);
  return <FridgePage lectureSeule={session?.acces === "view"} />;
}
