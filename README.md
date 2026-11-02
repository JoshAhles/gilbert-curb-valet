# Gilbert Curb Valet landing page

The public sign-up page for Gilbert Curb Valet, a trash can valet service in Gilbert, AZ (CodeBucky LLC). Neighbors type their email to join the list. Josh contacts them when service opens. Nothing is charged here.

## How it is built

- **Astro, static.** Plain HTML files, no server to run or pay for. Same base as the DEVS site.
- **One fact file.** `src/data/site.js` holds the name, prices, form address and contact email. Change facts there and the copy, the Google data and the forms all follow.
- **The 3D scene.** `src/scripts/scene/`. Two carts roll down a driveway as you scroll, built in code with three.js, toon shading and ink outlines.
  - `timeline.js` maps scroll progress (0 to 1) to the scene. This is where to change timing.
  - `models.js` builds the carts, yard and truck.
  - `mount.js` wires the scene to the scroll.
  - `boot.js` decides whether a device gets the live scene. Phones with reduced motion, no WebGL, data saver on, or under 4 cores get a still picture instead.
- **Sign-up.**
  - `src/lib/signup.js` holds the bot checks: a hidden trap field, a 1.5-second speed check (timed from page load), and an email check.
  - `src/scripts/signup-form.js` wires the forms.
  - Sign-ups post to Formspree, a free form service that emails each one to you.
  - After a real sign-up, the form offers an optional "What street are you on?" step.

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install once |
| `npm run dev` | Local preview at http://localhost:4321 |
| `npm test` | Unit and build tests. Run `npm run build` first. |
| `npm run render-assets` | Re-render the hero still pictures and the share image from the live scene. Run after changing the scene. |
| `npm run check` | Full page check: phone layout, sticky bar, dark-mode contrast, reduced motion, Lighthouse. Screenshots go to `checks/`. |

## Launch setup

- **Sign-ups:** `formspreeEndpoint` in `src/data/site.js` is the Formspree form that emails each sign-up. Deploys are blocked (`LAUNCH=1 npm test`) if it or `contactEmail` is blank.
- **Hosting:** GitHub Pages. `.github/workflows/deploy.yml` builds and deploys on every push to `main`. `public/CNAME` sets the custom domain.
- **Domain:** gilbertcurbvalet.com (Squarespace Domains). DNS: four `A` records for the apex to GitHub Pages (185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153) and `www` as a `CNAME` to `joshahles.github.io`.
- **Analytics (optional):** set a repo variable `PUBLIC_GA_ID` to a GA4 ID. Without it, no tracking code ships.
- **Owner note (optional):** write a few true sentences in `src/data/owner-note.js`. Empty hides the section.

## Facts checked

- Gilbert's 5 AM set-out rule and the 6 PM to 6 AM window come from the Town's site (gilbertaz.gov), checked 2026-11-01.

## Known issues

- None open. `npm run check` passed 11 of 11 on 2026-11-01. Lighthouse mobile scored 100 on performance, accessibility, best practices and SEO.
