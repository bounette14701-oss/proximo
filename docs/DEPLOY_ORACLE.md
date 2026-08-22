# ☁️ Déploiement sur Oracle Cloud Always Free — guide pas à pas

Ce guide vous mène de zéro (compte Oracle) jusqu'à Proximo en ligne,
gratuitement, sur une VM **Always Free** (2 VM AMD 1 OCPU/1 Go RAM ou
4 OCPU ARM Ampere/24 Go RAM, gratuites **pour toujours**).

```
Votre machine ──(SSH)──> VM Oracle ──(Docker)──> Proximo (db+backend+frontend)
                              │
                              └──(cloudflared)──> Tunnel Cloudflare ──> https://votre-domaine
```

---

## 1. Créer le compte Oracle Cloud

1. Allez sur **https://signup.cloud.oracle.com**
2. Renseignez email, pays, mot de passe.
3. **Carte bancaire requise** : elle sert uniquement à vérifier votre identité
   (prélèvement de quelques centimes, remboursé). Vous ne payez RIEN tant que
   vous restez dans l'offre Always Free et que vous ne dépassez pas les quotas.
4. Vérification par téléphone/SMS, puis création du compte (quelques minutes).

> ⚠️ **Gardez précieusement** l'email de confirmation et le nom du
> « tenancy » (ex. `axxxxxx`). Choisissez une région proche de chez vous.

## 2. Générer votre clé SSH (sur votre machine)

```bash
ssh-keygen -t ed25519 -C "proximo-oracle" -f ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
```

Copiez la sortie (la ligne entière commençant par `ssh-ed25519`).

> 📌 Oracle recommande ed25519 ; le script accepte aussi rsa.
> Votre clé privée `~/.ssh/id_ed25519` ne quitte JAMAIS votre machine.

## 3. Créer la VM Always Free

1. Console Oracle → menu ☰ → **Compute → Instances → Create instance**.
2. **Name** : `proximo`.
3. **Placement** : gardez les valeurs proposées (availability domain).
4. **Image** : `Oracle Linux 8` (ou 9) — recommandé pour Always Free AMD.
   *(Ubuntu 22.04/24.04 fonctionne aussi — le script le gère.)*
5. **Shape** : bouton **Change shape** :
   - Onglet **Specialty and legacy** → `VM.Standard.E2.1.Micro`
     (1 OCPU / 1 Go RAM — 2 VM gratuites de ce type) ;
   - ou onglet **Ampere** → `VM.Standard.A1.Flex` (4 OCPU / 24 Go —
     réglez 1 OCPU/6 Go si vous voulez plusieurs VM).
6. **Networking** : gardez le VCN proposé et la sous-réseau publique.
7. **Add SSH keys** : sélectionnez **Paste public keys** → collez la clé
   de l'étape 2.
8. **Boot volume** : 47 Go par défaut (Always Free = 200 Go au total).
9. **Create**.

Attendez que l'instance passe à l'état **Running** (1-2 minutes).

## 4. Récupérer l'IP publique

Sur la page de l'instance : **Instance access → Public IP address**
(ex. `129.146.xx.xx`). Notez-la.

Testez la connexion SSH :

```bash
ssh -i ~/.ssh/id_ed25519 opc@129.146.xx.xx
# Sur Oracle Linux, l'utilisateur est "opc" (Ubuntu : "ubuntu")
```

> Si ça bloque : vérifiez que la clé publique a bien été collée à l'étape 3,
> et que votre IP n'est pas bloquée (Ingress rules, étape 6).

## 5. Lancer le déploiement Proximo

```bash
git clone https://github.com/bounette14701-oss/proximo.git
cd proximo
./scripts/deploy-oracle.sh --host 129.146.xx.xx \
  --user opc \
  --ssh-key ~/.ssh/id_ed25519 \
  --domain proximo.residence.fr \
  --tunnel-token <token-cloudflare>
```

Le script installe Docker, clone le dépôt, génère un `.env` sécurisé,
démarre la stack et vérifie l'API. En fin : **ouvrez `https://proximo.residence.fr`**
→ l'assistant `/install` crée votre compte admin + le nom de la résidence.

> **Sans domaine ni tunnel** : `./scripts/deploy-oracle.sh --host 129.146.xx.xx`
> → l'app répond en `http://129.146.xx.xx:8080` (HTTP uniquement, pensez HTTPS).

## 6. Tunnel Cloudflare (HTTPS gratuit)

**Option A — token (automatique, recommandé)** :
1. Dashboard Cloudflare → **Zero Trust → Networks → Tunnels → Create a tunnel**.
2. Choisissez le type **Cloudflared**, donnez-lui un nom (ex. `proximo`).
3. Copiez le **token** (commande `cloudflared service install …`).
4. Passez-le au script : `--tunnel-token <token>`.
5. Dans le dashboard, ajoutez un **Public Hostname** :
   - Subdomain : `proximo` · Domain : votre domaine
   - Service : `http://localhost:8080`
   - **Save**. (Pas besoin de relancer cloudflared — hot reload.)

**Option B — réutiliser votre tunnel existant** :
Ajoutez simplement un **Public Hostname** dans votre tunnel actuel
(Zero Trust → Tunnels → votre tunnel → Public Hostname → Add) :
service `http://localhost:8080`.

> 🔒 **Avec tunnel, ne laissez PAS le port 8080 ouvert** dans la Security List :
> tout passe par Cloudflare, seul le port 22 (SSH) reste exposé.

## 7. Security List (pare-feu Oracle)

Console → menu ☰ → **Networking → Virtual Cloud Networks → votre VCN →
Security Lists → Default Security List → Add Ingress Rules** :

| Source | Port | Usage |
|---|---|---|
| `0.0.0.0/0` | **22 TCP** | SSH (obligatoire) |
| `0.0.0.0/0` | **8080 TCP** | uniquement si **pas** de tunnel Cloudflare |

## 8. Vérifications & maintenance

```bash
# État de la stack
ssh opc@129.146.xx.xx 'cd ~/proximo && sudo docker compose ps'

# Logs
ssh opc@129.146.xx.xx 'cd ~/proximo && sudo docker compose logs -f'

# Mise à jour de l'app (nouveau commit poussé sur main)
ssh opc@129.146.xx.xx 'cd ~/proximo && git pull && sudo docker compose up -d --build'

# Redémarrage / arrêt
ssh opc@129.146.xx.xx 'cd ~/proximo && sudo docker compose restart'
ssh opc@129.146.xx.xx 'cd ~/proximo && sudo docker compose down'
```

## 9. Pièges connus (Always Free)

- **Quota ARM indisponible** (« Out of capacity ») : le pool Ampere est
  souvent saturé. Réessayez plus tard, ou prenez la shape AMD
  `VM.Standard.E2.1.Micro` (toujours disponible).
- **Facturation surprise** : vérifiez régulièrement
  **Billing → Usage** que vous restez dans les limites Always Free
  (2 VM AMD **ou** 4 OCPU ARM, 200 Go de stockage, 10 To de sortie/mois).
- **Instance idle** : Oracle peut **stopper** une VM inactive après plusieurs
  mois d'inutilisation totale. Un accès régulier (même un ping) suffit.
- **Région** : choisissez la bonne dès le départ (le tenancy est lié à
  une « home region »).
- **IPv6** : les VCN ont un IPv6 par défaut ; ignorez-le (Proximo n'en a
  pas besoin) ou désactivez-le si vous préférez.

## 10. Aller plus loin (optionnel)

- **Sauvegarde** : `sudo docker compose exec db pg_dump -U proximo proximo > backup.sql`
- **HTTPS direct sans Cloudflare** : installez Certbot sur la VM et
  terminez TLS dans nginx (le compose actuel attend un proxy TLS externe).
- **Emails transactionnels** : configurez `BREVO_API_KEY` (offre gratuite
  300 emails/jour) dans `~/proximo/.env` puis redémarrez le backend.
