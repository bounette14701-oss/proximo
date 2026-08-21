import { redirect } from 'next/navigation';

/**
 * Les signalements sont fusionnés avec les annonces : le choix se fait dans
 * la catégorie. Cette route redirige vers le fil unifié.
 */
export default function SignalementsRedirectPage() {
  redirect('/annonces?categorie=SIGNALEMENT');
}
