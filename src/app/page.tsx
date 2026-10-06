import { redirect } from "next/navigation";

// En attendant la connexion, l'entrée de l'application mène à l'accueil de la famille.
export default function Racine() {
  redirect("/accueil");
}
