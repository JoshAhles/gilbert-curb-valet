import { SITE } from "./site.js";
const p1 = SITE.priceFirstMonth, p = SITE.priceMonthly;

export const FAQ = [
  { q: "What is a trash can valet?", a: "A trash can valet rolls your carts to the curb the night before pickup and back in that evening. You never have to haul them yourself." },
  { q: "How much does it cost?", a: `$${p1} for the first month, then $${p} a month for up to ${SITE.maxCarts} carts. Joining the list is free and we're not charging anyone yet.` },
  { q: "How is this different from my regular trash service?", a: "The Town of Gilbert still picks up and empties your carts. We only move them: out to the curb the night before, and back up after pickup." },
  { q: "What days do you come?", a: "We follow your street's Town pickup days. We roll carts out after 6 PM the evening before, and bring them back in by 6 PM on pickup day." },
  { q: "Do I have to be home?", a: "No. Leave your carts where you normally keep them, as long as we can reach them from outside. You don't need to be there." },
  { q: "What if my cans are full or too heavy?", a: "Normal full carts are fine. If a lid won't close or a cart is too heavy to roll safely, we'll leave it and let you know." },
  { q: "Is this a Town of Gilbert service?", a: "No. Gilbert Curb Valet is a private service run by CodeBucky LLC. It's not part of the Town of Gilbert or any HOA." },
  { q: "When does service start?", a: "We'll email everyone on the list before we start. No date yet." },
  { q: "How does the referral reward work?", a: "Once service starts, refer a neighbor in our Gilbert service area. When they sign up and stay for one month, you get two months free. There's no limit." },
  { q: "Can I cancel anytime?", a: "Yes. Once service starts, you can cancel anytime. There's no contract." },
];
