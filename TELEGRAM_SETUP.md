# 📱 Configuration de la Telegram Mini App (Sniper Terminal)

Ce guide explique comment exposer votre serveur local en HTTPS et configurer votre Bot Telegram avec BotFather pour tester l'application en temps réel sur Telegram.

---

## Étape 1 : Lancer le serveur local
Dans votre terminal de projet, lancez le serveur de développement :
```bash
npm run dev
```
Le serveur démarre par défaut sur **`http://localhost:3001`** (géré par le fichier `server.ts` qui intègre l'API Express et le middleware Vite).

---

## Étape 2 : Créer un tunnel HTTPS (Requis par Telegram)
Les Mini Apps Telegram exigent des adresses sécurisées en `https://`. Pour connecter votre serveur local à Telegram sans le déployer en production :

### Option A : Redirection de ports VS Code (Recommandé & Gratuit)
Si vous développez dans VS Code :
1. Allez dans l'onglet **Ports** (à côté du Terminal).
2. Cliquez sur **Forward a Port** (Transférer un port) et ajoutez le port **`3001`**.
3. Faites un clic droit sur l'adresse générée dans la colonne *Port Visibility* (Visibilité du port) et changez-la de **Private** à **Public**.
4. Copiez l'adresse locale générée (qui commence par `https://...`).

### Option B : Localtunnel (Aucune installation requise)
Dans un nouveau terminal, lancez :
```bash
npx localtunnel --port 3001
```
Copiez l'URL HTTPS générée (ex: `https://xxxx.loca.lt`).

### Option C : Ngrok (Très stable)
Si vous avez installé `ngrok` :
```bash
ngrok http 3001
```
Copiez l'URL HTTPS publique générée (ex: `https://xxxx.ngrok-free.app`).

---

## Étape 3 : Configurer le Bot avec BotFather
1. Ouvrez Telegram et recherchez **[@BotFather](https://t.me/BotFather)**.
2. Envoyez la commande : `/newbot`
   - Suivez les instructions pour donner un **Nom** (ex: *Sniper Terminal*) et un **Username** à votre bot (ex: *my_sniper_bot*).
3. Envoyez la commande : `/newapp`
   - Sélectionnez votre bot dans la liste.
   - Entrez un titre pour votre application (ex: *Sniper Terminal*).
   - Entrez une description facultative.
   - Envoyez une image de couverture carrée si demandée (640x640) ou passez cette étape.
4. **Url de l'application (Étape Clé) :**
   - BotFather vous demandera : *"Please send URL for your Web App"*.
   - Collez votre URL HTTPS obtenue à l'Étape 2, **en ajoutant le chemin de votre tenant d'application** à la fin.
   - **Exemple de format :** `https://xxxx.ngrok-free.app/app/default` (ou remplacez `default` par l'identifiant du tenant que vous souhaitez tester).
5. Entrez un nom court pour le lien Web App (ex: *app*).
6. BotFather vous renverra le lien direct vers votre Mini App (ex: **`t.me/my_sniper_bot/app`**).

---

## Étape 4 : Tester et Développer en Direct
1. Cliquez sur le lien fourni par BotFather (`t.me/...`) depuis votre smartphone ou Telegram Desktop.
2. La Mini App Sniper s'ouvrira en plein écran !
3. Toutes les modifications que vous ferez dans le code localement seront instantanément appliquées dans la Mini App grâce au rechargement à chaud (HMR) !
